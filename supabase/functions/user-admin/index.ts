import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type AppUser = {
  id: string
  email: string
  name: string
  role: "admin" | "sub-user"
  adminId?: string
  permissions?: string[]
  avatar?: string
}

type AuthUserRow = {
  id: string
  email: string
  user_metadata?: Record<string, unknown>
}

const isMasterEmail = (email: string | null | undefined) => email === "mestre@whatchpro.com"

const normalizeRole = (raw: unknown): "admin" | "sub-user" => (raw === "sub-user" ? "sub-user" : "admin")

const normalizePermissions = (raw: unknown): string[] | undefined =>
  Array.isArray(raw) ? raw.filter(v => typeof v === "string") : undefined

const toAppUser = (u: AuthUserRow): AppUser => {
  const meta = (u.user_metadata || {}) as Record<string, unknown>
  return {
    id: u.id,
    email: u.email,
    name: (typeof meta.name === "string" && meta.name.trim()) ? meta.name : (u.email?.split("@")[0] || "Usuário"),
    role: normalizeRole(meta.role),
    adminId: typeof meta.adminId === "string" ? meta.adminId : undefined,
    permissions: normalizePermissions(meta.permissions),
    avatar: typeof meta.avatar === "string" ? meta.avatar : undefined,
  }
}

const buildIndex = (users: AppUser[]) => new Map(users.map(u => [u.id, u]))

const resolveRootTenantId = (u: AppUser, idx: Map<string, AppUser>) => {
  if (u.role === "admin" && !u.adminId) return u.id
  let cur = u.adminId
  const visited = new Set<string>()
  while (cur && idx.has(cur) && !visited.has(cur)) {
    visited.add(cur)
    const parent = idx.get(cur)!
    if (parent.role === "admin" && !parent.adminId) return parent.id
    cur = parent.adminId
  }
  return u.adminId || u.id
}

const listAllUsers = async (supabaseAdmin: any) => {
  const out: AppUser[] = []
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const batch = (data?.users || []).map((u: any) => toAppUser({ id: u.id, email: u.email, user_metadata: u.user_metadata }))
    out.push(...batch)
    if (!data?.users || data.users.length < perPage) break
    page += 1
  }
  return out
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const requester = toAppUser({
      id: authData.user.id,
      email: authData.user.email || "",
      user_metadata: authData.user.user_metadata,
    })

    if (!isMasterEmail(requester.email) && requester.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const payload = await req.json().catch(() => ({} as any))
    const action = payload?.action as string | undefined

    if (action === "list") {
      const all = await listAllUsers(supabaseAdmin)
      const idx = buildIndex(all)
      const requesterRoot = isMasterEmail(requester.email) ? null : resolveRootTenantId(requester, idx)
      const tenantId = typeof payload?.tenantId === "string" ? payload.tenantId : undefined

      let visible = all
      if (requesterRoot) {
        visible = all.filter(u => resolveRootTenantId(u, idx) === requesterRoot)
      } else if (tenantId) {
        visible = all.filter(u => resolveRootTenantId(u, idx) === tenantId)
      }

      return new Response(JSON.stringify({ users: visible }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "create") {
      const name = String(payload?.name || "").trim()
      const email = String(payload?.email || "").trim().toLowerCase()
      const password = String(payload?.password || "")
      const role = (payload?.role === "sub-user" ? "sub-user" : "admin") as "admin" | "sub-user"
      const permissions = normalizePermissions(payload?.permissions)
      const targetTenantId = typeof payload?.targetTenantId === "string" && payload.targetTenantId ? payload.targetTenantId : undefined

      if (!name || !email || !password) {
        return new Response(JSON.stringify({ error: "Dados incompletos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const all = await listAllUsers(supabaseAdmin)
      const idx = buildIndex(all)
      const requesterRoot = isMasterEmail(requester.email) ? null : resolveRootTenantId(requester, idx)

      let adminId: string | undefined
      if (role === "sub-user") {
        adminId = requesterRoot || targetTenantId
        if (!adminId) {
          return new Response(JSON.stringify({ error: "Selecione a empresa (tenant) para o sub-usuário" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      } else {
        if (isMasterEmail(requester.email)) {
          adminId = targetTenantId || undefined
        } else {
          adminId = requesterRoot || undefined
        }
      }

      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          adminId,
          permissions: role === "sub-user" ? (permissions && permissions.length > 0 ? permissions : ["clients", "inventory", "quotations"]) : undefined,
          avatar,
        },
      })

      if (error) throw error
      return new Response(JSON.stringify({ user: toAppUser({ id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata }) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "update") {
      const userId = String(payload?.userId || "")
      const updates = (payload?.updates || {}) as Record<string, unknown>
      const password = typeof payload?.password === "string" && payload.password ? payload.password : undefined
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const all = await listAllUsers(supabaseAdmin)
      const idx = buildIndex(all)
      const requesterRoot = isMasterEmail(requester.email) ? null : resolveRootTenantId(requester, idx)
      const target = idx.get(userId)
      if (!target) {
        return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (!isMasterEmail(requester.email)) {
        if (resolveRootTenantId(target, idx) !== requesterRoot) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      }

      if (target.id === requester.id) {
        return new Response(JSON.stringify({ error: "Você não pode editar seu próprio usuário aqui" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const nextRole = normalizeRole(updates.role ?? target.role)
      const rawAdminId = (updates.adminId as any)
      const nextAdminId =
        typeof rawAdminId === "string"
          ? (rawAdminId.trim() ? rawAdminId.trim() : undefined)
          : target.adminId
      const nextPermissions = nextRole === "sub-user"
        ? normalizePermissions(updates.permissions) ?? target.permissions
        : undefined

      const { data: targetUserData, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (targetUserError || !targetUserData?.user) throw (targetUserError || new Error("Usuário não encontrado"))

      const prevMeta = (targetUserData.user.user_metadata || {}) as Record<string, unknown>

      const nextMeta: Record<string, unknown> = {
        ...prevMeta,
        name: typeof updates.name === "string" && updates.name.trim() ? updates.name.trim() : (typeof prevMeta.name === "string" ? prevMeta.name : target.name),
        role: nextRole,
        adminId: nextAdminId,
        permissions: nextPermissions,
        avatar: typeof updates.avatar === "string" ? updates.avatar : (typeof prevMeta.avatar === "string" ? prevMeta.avatar : target.avatar),
      }

      const updatePayload: Record<string, unknown> = { user_metadata: nextMeta }
      if (password) updatePayload.password = password

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload as any)
      if (error) throw error

      return new Response(JSON.stringify({ user: toAppUser({ id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata }) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "delete") {
      const userId = String(payload?.userId || "")
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      if (userId === requester.id) {
        return new Response(JSON.stringify({ error: "Você não pode excluir seu próprio usuário" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const all = await listAllUsers(supabaseAdmin)
      const idx = buildIndex(all)
      const requesterRoot = isMasterEmail(requester.email) ? null : resolveRootTenantId(requester, idx)
      const target = idx.get(userId)
      if (!target) {
        return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (isMasterEmail(target.email)) {
        return new Response(JSON.stringify({ error: "Não é permitido excluir o usuário mestre" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const targetRoot = resolveRootTenantId(target, idx)
      if (!isMasterEmail(requester.email) && targetRoot !== requesterRoot) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (target.role === "admin" && !target.adminId && !isMasterEmail(requester.email)) {
        return new Response(JSON.stringify({ error: "Apenas o mestre pode excluir o admin master da empresa" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Erro" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
