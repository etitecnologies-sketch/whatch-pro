import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const NUVEMFISCAL_CONFIG = {
  sandbox: 'https://api.sandbox.nuvemfiscal.com.br',
  producao: 'https://api.nuvemfiscal.com.br'
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // 2. Get User's Fiscal Integration from Database
    const { data: integration, error: dbError } = await supabaseClient
      .from('user_integrations')
      .select('nuvemfiscal_token, nuvemfiscal_env')
      .eq('user_id', user.id)
      .single()

    if (dbError || !integration || !integration.nuvemfiscal_token) {
      return new Response(JSON.stringify({ error: 'Configuração da NuvemFiscal não encontrada para este usuário' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse request
    const { endpoint, method = 'GET', body } = await req.json()
    const baseUrl = NUVEMFISCAL_CONFIG[integration.nuvemfiscal_env as 'sandbox' | 'producao'] || NUVEMFISCAL_CONFIG.sandbox

    // 4. Proxy to NuvemFiscal with User's Token
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integration.nuvemfiscal_token}`,
        'User-Agent': 'WhatchPro-FiscalProxy'
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
