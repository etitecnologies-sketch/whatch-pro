import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ASAAS_CONFIG = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://www.asaas.com/api/v3'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role to bypass RLS and get tokens
    )

    // 1. Get User from Auth Header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Get User's Asaas Integration from Database
    const { data: integration, error: dbError } = await supabaseClient
      .from('user_integrations')
      .select('asaas_token, asaas_env')
      .eq('user_id', user.id)
      .single()

    if (dbError || !integration || !integration.asaas_token) {
      return new Response(JSON.stringify({ error: 'Configuração do Asaas não encontrada para este usuário' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse request
    const { endpoint, method = 'GET', body } = await req.json()
    const baseUrl = ASAAS_CONFIG[integration.asaas_env as 'sandbox' | 'production'] || ASAAS_CONFIG.production

    // 4. Proxy to Asaas with User's Token
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': integration.asaas_token,
        'User-Agent': 'WhatchPro-MultiTenantProxy'
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
