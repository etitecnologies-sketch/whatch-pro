import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type AppUser = {
  id: string
  email: string
  name: string
  role: "admin" | "sub-user"
  adminId?: string
  employeeId?: string
  permissions?: string[]
  avatar?: string
  companyType?: string
  features?: string[]
  profile?: string
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

type CompanyTypeId = "supermercado" | "borracharia" | "oficina" | "vendas" | "provedor" | "todos"
type FeatureId =
  | "dashboard"
  | "pdv"
  | "crm"
  | "clients"
  | "employees"
  | "inventory"
  | "warehouse"
  | "service-orders"
  | "projects"
  | "quotations"
  | "finance"
  | "documents"
  | "plans"
  | "contracts"
  | "users"
  | "settings"

const companyTypes: CompanyTypeId[] = ["supermercado", "borracharia", "oficina", "vendas", "provedor", "todos"]
const featureIds: FeatureId[] = [
  "dashboard",
  "pdv",
  "crm",
  "clients",
  "employees",
  "inventory",
  "warehouse",
  "service-orders",
  "projects",
  "quotations",
  "finance",
  "documents",
  "plans",
  "contracts",
  "users",
  "settings",
]

const normalizeCompanyType = (raw: unknown): CompanyTypeId | undefined => {
  const v = typeof raw === "string" ? raw : ""
  return companyTypes.includes(v as CompanyTypeId) ? (v as CompanyTypeId) : undefined
}

const normalizeFeatures = (raw: unknown): FeatureId[] | undefined => {
  if (!Array.isArray(raw)) return undefined
  const allowed = new Set<FeatureId>(featureIds)
  const out: FeatureId[] = []
  for (const v of raw) {
    if (typeof v === "string" && allowed.has(v as FeatureId)) out.push(v as FeatureId)
  }
  return out.length > 0 ? out : undefined
}

const defaultFeaturesByCompanyType = (type: CompanyTypeId): FeatureId[] => {
  const base: FeatureId[] = ["dashboard", "clients", "employees", "documents", "users", "settings"]
  if (type === "todos") {
    return [
      ...base,
      "pdv",
      "crm",
      "inventory",
      "warehouse",
      "service-orders",
      "projects",
      "quotations",
      "finance",
      "plans",
      "contracts",
    ]
  }
  if (type === "supermercado") return [...base, "pdv", "inventory", "quotations", "finance"]
  if (type === "borracharia") return [...base, "inventory", "service-orders", "quotations", "finance"]
  if (type === "oficina") return [...base, "inventory", "service-orders", "quotations", "finance", "projects"]
  if (type === "vendas") return [...base, "crm", "quotations", "finance", "plans"]
  return [...base, "service-orders", "finance", "plans", "contracts", "warehouse"]
}

const toAppUser = (u: AuthUserRow): AppUser => {
  const meta = (u.user_metadata || {}) as Record<string, unknown>
  const companyType = normalizeCompanyType(meta.companyType)
  const features = normalizeFeatures(meta.features) ?? (companyType ? defaultFeaturesByCompanyType(companyType) : undefined)
  return {
    id: u.id,
    email: u.email,
    name: (typeof meta.name === "string" && meta.name.trim()) ? meta.name : (u.email?.split("@")[0] || "Usuário"),
    role: normalizeRole(meta.role),
    adminId: typeof meta.adminId === "string" ? meta.adminId : undefined,
    employeeId: typeof (meta as any).employeeId === "string" ? String((meta as any).employeeId) : undefined,
    permissions: normalizePermissions(meta.permissions),
    avatar: typeof meta.avatar === "string" ? meta.avatar : undefined,
    companyType,
    features,
    profile: typeof meta.profile === "string" ? meta.profile : undefined,
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

const decodeJwtPayload = (jwt: string): Record<string, unknown> | null => {
  try {
    const parts = jwt.split(".")
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    )

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const token = authHeader.replace("Bearer ", "")
    const tokenPayload = decodeJwtPayload(token)
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData?.user) {
      const tokenRole = typeof (tokenPayload as any)?.role === "string" ? String((tokenPayload as any).role) : null
      const tokenIss = typeof (tokenPayload as any)?.iss === "string" ? String((tokenPayload as any).iss) : null
      const serverExpectedIss = `${String(supabaseUrl || "").replace(/\/$/, "")}/auth/v1`
      return new Response(JSON.stringify({ error: "Unauthorized", tokenRole, tokenIss, serverExpectedIss }), {
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
    console.log(JSON.stringify({ action, requester: requester.email }))

    if (action === "tenants_list") {
      if (!isMasterEmail(requester.email)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const { data, error } = await supabaseAdmin
        .from("tenants")
        .select("id,name,company_type")
        .order("name", { ascending: true })
      if (error) throw error
      return new Response(JSON.stringify({ tenants: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "tenants_sync") {
      if (!isMasterEmail(requester.email)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const all = await listAllUsers(supabaseAdmin)
      const rootAdmins = all.filter(u => u.role === "admin" && !u.adminId)

      const { data: existingRows, error: existingError } = await supabaseAdmin.from("tenants").select("id")
      if (existingError) throw existingError
      const existing = new Set<string>((existingRows || []).map((r: any) => String(r.id)))

      const toCreate = rootAdmins
        .filter(u => !existing.has(u.id))
        .map(u => {
          const ct = normalizeCompanyType(u.companyType) ?? "todos"
          const feats = normalizeFeatures(u.features) ?? defaultFeaturesByCompanyType(ct)
          return {
            id: u.id,
            company_type: ct,
            features: feats,
            name: u.name,
            legal_name: null,
            document: null,
            ie: null,
            phone: null,
            email: null,
            cep: null,
            address: null,
            number: null,
            complement: null,
            neighborhood: null,
            city: null,
            state: null,
          }
        })

      if (toCreate.length > 0) {
        const { error: insertError } = await supabaseAdmin.from("tenants").insert(toCreate as any)
        if (insertError) throw insertError
      }

      return new Response(JSON.stringify({ created: toCreate.length, totalRootAdmins: rootAdmins.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "tenant_get") {
      const tenantId = typeof payload?.tenantId === "string" ? payload.tenantId : ""
      if (!tenantId) {
        return new Response(JSON.stringify({ error: "tenantId é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const allowed = isMasterEmail(requester.email) || (requester.role === "admin" && !requester.adminId && requester.id === tenantId)
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const { data, error } = await supabaseAdmin.from("tenants").select("*").eq("id", tenantId).maybeSingle()
      if (error) throw error
      return new Response(JSON.stringify({ tenant: data || null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "tenant_update") {
      const tenantId = typeof payload?.tenantId === "string" ? payload.tenantId : ""
      const updates = (payload?.updates || {}) as Record<string, unknown>
      if (!tenantId) {
        return new Response(JSON.stringify({ error: "tenantId é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const allowed = isMasterEmail(requester.email) || (requester.role === "admin" && !requester.adminId && requester.id === tenantId)
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const { data, error } = await supabaseAdmin.from("tenants").update(updates as any).eq("id", tenantId).select("*").maybeSingle()
      if (error) throw error
      return new Response(JSON.stringify({ tenant: data || null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

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
      const requestedCompanyType = normalizeCompanyType(payload?.companyType) ?? "todos"
      const requestedFeatures = normalizeFeatures(payload?.features) ?? defaultFeaturesByCompanyType(requestedCompanyType)
      const profile = typeof payload?.profile === "string" ? payload.profile : undefined
      const employeeId = role === "sub-user" && typeof payload?.employeeId === "string" && payload.employeeId.trim()
        ? payload.employeeId.trim()
        : undefined
      const tenant = (payload?.tenant || {}) as Record<string, unknown>

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
      const tenantRoot = adminId ? idx.get(adminId) : undefined
      const nextCompanyType = tenantRoot?.companyType ?? (role === "admin" && !adminId ? requestedCompanyType : undefined)
      const nextFeatures = tenantRoot?.features ?? (role === "admin" && !adminId ? requestedFeatures : undefined)

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
          companyType: nextCompanyType,
          features: nextFeatures,
          profile: role === "sub-user" ? profile : undefined,
          employeeId: role === "sub-user" ? employeeId : undefined,
        },
      })

      if (error) throw error
      const created = toAppUser({ id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata })
      if (role === "admin" && !adminId) {
        const tenantName = String(tenant?.name || "").trim() || created.name
        const insertPayload: Record<string, unknown> = {
          id: created.id,
          company_type: nextCompanyType || "todos",
          features: nextFeatures || defaultFeaturesByCompanyType((nextCompanyType || "todos") as CompanyTypeId),
          name: tenantName,
          legal_name: typeof tenant?.legalName === "string" && tenant.legalName.trim() ? tenant.legalName.trim() : null,
          document: typeof tenant?.document === "string" && tenant.document.trim() ? tenant.document.trim() : null,
          ie: typeof tenant?.ie === "string" && tenant.ie.trim() ? tenant.ie.trim() : null,
          phone: typeof tenant?.phone === "string" && tenant.phone.trim() ? tenant.phone.trim() : null,
          email: typeof tenant?.email === "string" && tenant.email.trim() ? tenant.email.trim() : null,
          cep: typeof tenant?.cep === "string" && tenant.cep.trim() ? tenant.cep.trim() : null,
          address: typeof tenant?.address === "string" && tenant.address.trim() ? tenant.address.trim() : null,
          number: typeof tenant?.number === "string" && tenant.number.trim() ? tenant.number.trim() : null,
          complement: typeof tenant?.complement === "string" && tenant.complement.trim() ? tenant.complement.trim() : null,
          neighborhood: typeof tenant?.neighborhood === "string" && tenant.neighborhood.trim() ? tenant.neighborhood.trim() : null,
          city: typeof tenant?.city === "string" && tenant.city.trim() ? tenant.city.trim() : null,
          state: typeof tenant?.state === "string" && tenant.state.trim() ? tenant.state.trim() : null,
        }
        const { error: tenantError } = await supabaseAdmin.from("tenants").insert(insertPayload as any)
        if (tenantError) {
          await supabaseAdmin.auth.admin.deleteUser(created.id).catch(() => null)
          throw new Error(`Erro ao criar empresa: ${tenantError.message}`)
        }
      }
      return new Response(JSON.stringify({ user: created }), {
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

      const { data: targetUserData, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (targetUserError || !targetUserData?.user) throw (targetUserError || new Error("Usuário não encontrado"))

      const prevMeta = (targetUserData.user.user_metadata || {}) as Record<string, unknown>

      const nextRole = normalizeRole(updates.role ?? target.role)
      const rawAdminId = (updates.adminId as any)
      const nextAdminId =
        typeof rawAdminId === "string"
          ? (rawAdminId.trim() ? rawAdminId.trim() : undefined)
          : target.adminId
      const nextPermissions = nextRole === "sub-user"
        ? normalizePermissions(updates.permissions) ?? target.permissions
        : undefined
      const nextProfile = nextRole === "sub-user"
        ? (typeof updates.profile === "string" && updates.profile.trim() ? updates.profile.trim() : (typeof (target as any).profile === "string" ? (target as any).profile : undefined))
        : undefined
      const hasEmployeeUpdate = Object.prototype.hasOwnProperty.call(updates, "employeeId")
      const rawEmployeeId = (updates as any).employeeId
      const fallbackEmployeeId = (() => {
        const fromPrev = typeof (prevMeta as any)?.employeeId === "string" && String((prevMeta as any).employeeId).trim()
          ? String((prevMeta as any).employeeId).trim()
          : undefined
        if (fromPrev) return fromPrev
        const fromTarget = typeof (target as any).employeeId === "string" && String((target as any).employeeId).trim()
          ? String((target as any).employeeId).trim()
          : undefined
        return fromTarget
      })()
      const nextEmployeeId = nextRole === "sub-user"
        ? (hasEmployeeUpdate
            ? (typeof rawEmployeeId === "string" && String(rawEmployeeId).trim() ? String(rawEmployeeId).trim() : undefined)
            : fallbackEmployeeId)
        : undefined

      const nextMeta: Record<string, unknown> = {
        ...prevMeta,
        name: typeof updates.name === "string" && updates.name.trim() ? updates.name.trim() : (typeof prevMeta.name === "string" ? prevMeta.name : target.name),
        role: nextRole,
        adminId: nextAdminId,
        avatar: typeof updates.avatar === "string" ? updates.avatar : (typeof prevMeta.avatar === "string" ? prevMeta.avatar : target.avatar),
      }
      if (nextRole === "sub-user") {
        nextMeta.permissions = nextPermissions
        nextMeta.profile = nextProfile
        nextMeta.employeeId = nextEmployeeId
      } else {
        delete (nextMeta as any).permissions
        delete (nextMeta as any).profile
        delete (nextMeta as any).employeeId
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
    console.error(error)
    return new Response(JSON.stringify({ error: error?.message || "Erro" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
