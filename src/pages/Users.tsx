import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, User as UserIcon, Shield, ShieldCheck, X, Mail, Lock, UserCheck, Check, Loader2, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import type { User, Transaction } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '../hooks/useAuth'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase'
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { companyTypeOptions, featureLabel, getDefaultFeaturesByCompanyType, getDefaultPermissionsByProfile, normalizeCompanyType, profileOptionsByCompanyType, type CompanyTypeId, type UserProfileId } from '../lib/access'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Users() {
  const { user: currentUser, createSubUser } = useAuth()
  const { transactions, employees } = useData()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false)
  const [selectedUserForReports, setSelectedUserForReports] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'sub-user' as 'sub-user' | 'admin',
    password: '',
    permissions: [] as string[],
    tenantId: '',
    companyType: 'todos' as CompanyTypeId,
    profile: 'todos' as UserProfileId,
    employeeId: '',
    companyName: '',
    companyLegalName: '',
    companyDocument: '',
    companyIE: '',
    companyPhone: '',
    companyEmail: '',
    companyCEP: '',
    companyAddress: '',
    companyNumber: '',
    companyComplement: '',
    companyNeighborhood: '',
    companyCity: '',
    companyState: '',
  })

  const availablePermissions = [
    { id: 'pdv', label: 'PDV (Caixa)' },
    { id: 'crm', label: 'CRM (Vendas)' },
    { id: 'clients', label: 'Clientes' },
    { id: 'inventory', label: 'Estoque / Itens' },
    { id: 'warehouse', label: 'Almoxarifado' },
    { id: 'service-orders', label: 'Chamados (Acesso)' },
    { id: 'service-orders-tech', label: 'Chamados (Técnico)' },
    { id: 'service-orders-admin', label: 'Chamados (Admin)' },
    { id: 'quotations', label: 'Gerar Orçamentos' },
    { id: 'plans', label: 'Planos' },
    { id: 'contracts', label: 'Contratos' },
    { id: 'appearance', label: 'Mudar Aparência' },
    { id: 'employees', label: 'Funcionários' },
    { id: 'projects', label: 'Projetos' },
    { id: 'finance', label: 'Financeiro (Acesso)' },
    { id: 'finance-billing', label: 'Financeiro (Cobrança/Baixa)' },
    { id: 'documents', label: 'Documentos' },
  ]

  const isMaster = currentUser?.email === 'mestre@whatchpro.com'
  const currentTenantId = currentUser ? (currentUser.adminId || currentUser.id) : null
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const hasSupabase = !!supabaseUrl && !!supabaseKey && !supabaseUrl.includes('SUA_URL') && !supabaseUrl.includes('YOUR_URL')
  const userAdminUrl = `${(supabaseUrl || '').replace(/\/$/, '')}/functions/v1/user-admin`

  const callUserAdmin = async (body: any) => {
    const getJwtIssuer = (jwt: string | null | undefined) => {
      if (!jwt) return null
      const parts = jwt.split('.')
      if (parts.length < 2) return null
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
      try {
        const json = JSON.parse(atob(padded))
        return typeof json?.iss === 'string' ? json.iss : null
      } catch {
        return null
      }
    }

    const readErr = async (err: unknown) => {
      const anyErr = err as any
      if (typeof anyErr?.__http_status === 'number') {
        return { status: anyErr.__http_status as number, text: String(anyErr.__http_text || anyErr.message || '') }
      }
      if (err instanceof FunctionsHttpError) {
        const status = err.context?.status
        const cloned = err.context?.clone?.()
        try {
          const json = cloned ? await cloned.json() : null
          return { status, text: json ? JSON.stringify(json) : '' }
        } catch {
          try {
            const text = cloned ? await cloned.text() : ''
            return { status, text }
          } catch {
            return { status, text: String((err as any)?.message || '') }
          }
        }
      }
      if (err instanceof FunctionsRelayError) return { status: undefined, text: err.message }
      if (err instanceof FunctionsFetchError) return { status: undefined, text: err.message }
      return { status: undefined, text: String((err as any)?.message || err || '') }
    }

    const invokeOnce = async () => {
      const getAccessToken = async () => {
        let { data: sessionData } = await supabase.auth.getSession()
        let accessToken = sessionData.session?.access_token
        if (accessToken) return accessToken
        await supabase.auth.refreshSession()
        sessionData = (await supabase.auth.getSession()).data
        accessToken = sessionData.session?.access_token
        if (accessToken) return accessToken
        await supabase.auth.signOut().catch(() => null)
        localStorage.removeItem('whatch_pro_user')
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      try {
        const accessToken = await getAccessToken()
        const res = await fetch(userAdminUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: String(supabaseKey || ''),
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          let text = ''
          try {
            text = JSON.stringify(await res.json())
          } catch {
            try {
              text = await res.text()
            } catch {
              text = ''
            }
          }
          const err: any = new Error(text || res.statusText)
          err.__http_status = res.status
          err.__http_text = text
          return { data: null, error: err }
        }
        return { data: await res.json(), error: null }
      } catch (error) {
        return { data: null, error }
      }
    }

    const first = await invokeOnce()
    if (!first.error) return first.data

    const firstDetails = await readErr(first.error)
    const msg = String((first.error as any)?.message || '')
    const lower = (firstDetails.text || msg).toLowerCase()
    if (firstDetails.status === 401 && lower.includes('protected header')) {
      throw new Error('Supabase: token inválido. Verifique VITE_SUPABASE_ANON_KEY no Vercel (use a anon key sem "Bearer" e sem aspas).')
    }
    const shouldRetry = firstDetails.status === 401 && (lower.includes('invalid jwt') || lower.includes('jwt expired'))
    if (shouldRetry) {
      await supabase.auth.refreshSession()
      const second = await invokeOnce()
      if (!second.error) return second.data
      const secondDetails = await readErr(second.error)
      const msg2 = String((second.error as any)?.message || '')
      const lower2 = (secondDetails.text || msg2).toLowerCase()
      if (secondDetails.status === 401 && lower2.includes('protected header')) {
        throw new Error('Supabase: token inválido. Verifique VITE_SUPABASE_ANON_KEY no Vercel (use a anon key sem "Bearer" e sem aspas).')
      }
      if (secondDetails.status === 401 && (lower2.includes('invalid jwt') || lower2.includes('jwt expired'))) {
        const { data: sessionData } = await supabase.auth.getSession()
        const iss = getJwtIssuer(sessionData.session?.access_token || null)
        const expected = `${String(supabaseUrl || '').replace(/\/$/, '')}/auth/v1`
        await supabase.auth.signOut()
        throw new Error(`Sessão inválida (HTTP 401). Detalhes: ${secondDetails.text || msg2 || 'Unauthorized'}. Token iss: ${iss || 'desconhecido'}. Esperado: ${expected}`)
      }
      console.error('Edge function error:', second.error)
      throw new Error(secondDetails.status ? `HTTP ${secondDetails.status}: ${secondDetails.text || msg2}` : (secondDetails.text || msg2 || 'Erro ao chamar função user-admin'))
    }

    console.error('Edge function error:', first.error)
    throw new Error(firstDetails.status ? `HTTP ${firstDetails.status}: ${firstDetails.text || msg}` : (firstDetails.text || msg || 'Erro ao chamar função user-admin'))
  }

  const buildUserIndex = (list: User[]) => new Map(list.map(u => [u.id, u]))

  const resolveRootTenantId = (u: User, idx: Map<string, User>) => {
    if (u.role === 'admin' && !u.adminId) return u.id
    let cur = u.adminId
    const visited = new Set<string>()
    while (cur && idx.has(cur) && !visited.has(cur)) {
      visited.add(cur)
      const parent = idx.get(cur)!
      if (parent.role === 'admin' && !parent.adminId) return parent.id
      cur = parent.adminId
    }
    return u.adminId || u.id
  }

  const filterVisibleUsers = (list: User[], cu: User | null) => {
    if (!cu) return []
    if (cu.email === 'mestre@whatchpro.com') return list
    if (cu.role === 'admin') {
      const tId = cu.adminId || cu.id
      const idx = buildUserIndex(list)
      return list.filter(u => resolveRootTenantId(u, idx) === tId)
    }
    return list.filter(u => u.id === cu.id)
  }

  const companyAdmins = allUsers
    .filter(u => u.role === 'admin' && u.email !== 'mestre@whatchpro.com' && !u.adminId)
    .sort((a, b) => a.name.localeCompare(b.name))

  const getTenantCompanyType = () => {
    if (isMaster) {
      if (formData.role === 'admin' && !formData.tenantId) return formData.companyType
      const tenant = companyAdmins.find(a => a.id === formData.tenantId)
      return normalizeCompanyType(tenant?.companyType) || 'todos'
    }
    const rootId = currentUser ? (currentUser.adminId || currentUser.id) : ''
    const root = allUsers.find(u => u.id === rootId)
    return normalizeCompanyType(root?.companyType) || normalizeCompanyType(currentUser?.companyType) || 'todos'
  }

  const tenantCompanyType = getTenantCompanyType()
  const employeeOptions = employees
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  const loadUsers = async () => {
    if (!currentUser) return
    setIsLoadingUsers(true)
    try {
      if (hasSupabase) {
        const data = await callUserAdmin({ action: 'list' })
        const list = Array.isArray(data?.users) ? (data.users as User[]) : []
        setAllUsers(list)
        setUsers(filterVisibleUsers(list, currentUser))
        return
      }

      const localUsers: User[] = JSON.parse(localStorage.getItem('whatch_pro_all_users') || '[]')
      setAllUsers(localUsers)
      setUsers(filterVisibleUsers(localUsers, currentUser))
    } catch (e: any) {
      if (hasSupabase) {
        const details = e?.message || String(e)
        alert(`Erro ao carregar usuários do Supabase.\n\nDetalhes: ${details}`)
      }

      const localUsers: User[] = JSON.parse(localStorage.getItem('whatch_pro_all_users') || '[]')
      setAllUsers(localUsers)
      setUsers(filterVisibleUsers(localUsers, currentUser))
    } finally {
      setIsLoadingUsers(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [currentUser, hasSupabase])

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
        alert('Você não pode excluir seu próprio usuário')
        return
    }
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      void (async () => {
        try {
          if (hasSupabase) {
            await callUserAdmin({ action: 'delete', userId: id })
            await loadUsers()
            return
          }

          const allUsers: User[] = JSON.parse(localStorage.getItem('whatch_pro_all_users') || '[]')
          const updatedAllUsers = allUsers.filter(u => u.id !== id)
          localStorage.setItem('whatch_pro_all_users', JSON.stringify(updatedAllUsers))
          setAllUsers(updatedAllUsers)
          setUsers(filterVisibleUsers(updatedAllUsers, currentUser))
        } catch (error: any) {
          alert(error?.message || 'Não foi possível excluir o usuário.')
        }
      })()
    }
  }

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }))
  }

  const handleSave = async () => {
    if (!currentUser) {
      alert('Sua sessão ainda está carregando. Aguarde 2 segundos e tente novamente.')
      return
    }
    setIsSavingUser(true)

    try {
      if (editingUser) {
        const { tenantId, ...safeFormData } = formData
        const adminId = safeFormData.role === 'admin'
          ? (isMaster ? (tenantId || undefined) : (currentTenantId || undefined))
          : (isMaster ? (tenantId || undefined) : (currentTenantId || undefined))
        const permissions = safeFormData.role === 'sub-user' ? safeFormData.permissions : undefined
        const updates: any = { name: safeFormData.name, role: safeFormData.role, adminId, permissions }
        if (safeFormData.role === 'sub-user') updates.profile = safeFormData.profile
        if (safeFormData.role === 'sub-user') updates.employeeId = safeFormData.employeeId

        if (hasSupabase) {
          const payload: any = { action: 'update', userId: editingUser.id, updates }
          if (formData.password) payload.password = formData.password
          await callUserAdmin(payload)
          await loadUsers()
        } else {
          const allUsers: User[] = JSON.parse(localStorage.getItem('whatch_pro_all_users') || '[]')
          const updatedAllUsers = allUsers.map(u => u.id === editingUser.id ? { ...u, ...updates } : u)
          localStorage.setItem('whatch_pro_all_users', JSON.stringify(updatedAllUsers))
          setAllUsers(updatedAllUsers)
          setUsers(filterVisibleUsers(updatedAllUsers, currentUser))
        }
      } else {
        if (!formData.name.trim()) {
          alert('Informe o nome do usuário.')
          return
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
          alert('Informe um e-mail válido.')
          return
        }
        if (!formData.password || formData.password.length < 6) {
          alert('Informe uma senha com pelo menos 6 caracteres.')
          return
        }
        if (formData.role === 'sub-user' && isMaster && !formData.tenantId) {
          alert('Selecione a empresa (admin master) para vincular este sub-usuário.')
          return
        }
        if (isMaster && formData.role === 'admin' && !formData.tenantId && !formData.companyName.trim()) {
          alert('Informe o nome da empresa para concluir o cadastro.')
          return
        }

        const tenant =
          isMaster && formData.role === 'admin' && !formData.tenantId
            ? {
                name: formData.companyName,
                legalName: formData.companyLegalName,
                document: formData.companyDocument,
                ie: formData.companyIE,
                phone: formData.companyPhone,
                email: formData.companyEmail,
                cep: formData.companyCEP,
                address: formData.companyAddress,
                number: formData.companyNumber,
                complement: formData.companyComplement,
                neighborhood: formData.companyNeighborhood,
                city: formData.companyCity,
                state: formData.companyState,
              }
            : undefined

        const createdUser = await createSubUser(
          formData.name, 
          formData.email, 
          formData.password, 
          formData.role,
          formData.permissions,
          isMaster ? (formData.tenantId || undefined) : undefined,
          isMaster && formData.role === 'admin' && !formData.tenantId ? formData.companyType : undefined,
          formData.role === 'sub-user' ? formData.profile : undefined,
          tenant,
          formData.role === 'sub-user' ? (formData.employeeId || undefined) : undefined
        )

        if (createdUser) {
          await loadUsers()
          alert(`✅ Usuário criado com sucesso! O acesso já está liberado.`)
        }
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar usuário: ' + (error as any).message)
    } finally {
      setIsSavingUser(false)
    }
  }

  const openModal = (user: User | null = null) => {
    const idx = buildUserIndex(allUsers)
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role as 'sub-user' | 'admin',
        password: '',
        permissions: user.permissions || [],
        tenantId: user.adminId ? resolveRootTenantId(user, idx) : '',
        companyType: normalizeCompanyType(user.companyType) || 'todos',
        profile: (typeof user.profile === 'string' ? (user.profile as UserProfileId) : 'todos'),
        employeeId: (typeof (user as any).employeeId === 'string' ? (user as any).employeeId : ''),
        companyName: '',
        companyLegalName: '',
        companyDocument: '',
        companyIE: '',
        companyPhone: '',
        companyEmail: '',
        companyCEP: '',
        companyAddress: '',
        companyNumber: '',
        companyComplement: '',
        companyNeighborhood: '',
        companyCity: '',
        companyState: '',
      })
    } else {
      setEditingUser(null)
      setFormData({ 
        name: '', 
        email: '', 
        role: 'sub-user', 
        password: '',
        permissions: ['pdv', 'clients', 'inventory'],
        tenantId: isMaster ? (companyAdmins[0]?.id || '') : (currentTenantId || ''),
        companyType: 'todos',
        profile: 'todos',
        employeeId: '',
        companyName: '',
        companyLegalName: '',
        companyDocument: '',
        companyIE: '',
        companyPhone: '',
        companyEmail: '',
        companyCEP: '',
        companyAddress: '',
        companyNumber: '',
        companyComplement: '',
        companyNeighborhood: '',
        companyCity: '',
        companyState: '',
      })
    }
    setIsModalOpen(true)
  }

  const openReportsModal = (user: User) => {
    setSelectedUserForReports(user)
    setIsReportsModalOpen(true)
  }

  const calculateUserStats = (userId: string) => {
    const userTransactions = transactions.filter(t => t.userId === userId && t.type === 'income' && t.status === 'completed')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    const daily = userTransactions
      .filter(t => new Date(t.date) >= today)
      .reduce((acc, t) => acc + t.amount, 0)

    const monthly = userTransactions
      .filter(t => new Date(t.date) >= startOfMonth)
      .reduce((acc, t) => acc + t.amount, 0)

    const yearly = userTransactions
      .filter(t => new Date(t.date) >= startOfYear)
      .reduce((acc, t) => acc + t.amount, 0)

    return { daily, monthly, yearly, totalSales: userTransactions.length }
  }

  if (!(currentUser?.role === 'admin' || currentUser?.email === 'mestre@whatchpro.com')) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Shield size={64} className="text-red-500/20" />
            <p className="text-red-500 font-black uppercase tracking-widest text-sm">Acesso Restrito ao Administrador</p>
        </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Controle de <span className="text-primary glow-text">Acessos</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gerencie permissões e usuários do sistema.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      {/* Search */}
      <div className="glass p-6 rounded-[32px] border border-white/50 dark:border-slate-600/60">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-700/50 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium shadow-inner"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nível de Acesso</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">ID do Sistema</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Gerenciar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-[1px] shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center text-primary font-black">
                            {u.name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{u.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 lowercase tracking-tighter">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        u.role === 'admin' ? "bg-primary/10 text-primary shadow-[0_0_10px_rgba(var(--primary-color-rgb),0.1)]" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    )}>
                        {u.role === 'admin' ? <ShieldCheck size={14} /> : <UserIcon size={14} />}
                        {u.role}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-mono font-bold text-slate-400">
                    {u.id.replace('user_', '')}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openReportsModal(u)}
                        className="p-3 text-slate-500 hover:text-green-500 hover:bg-green-500/10 rounded-2xl transition-all border border-transparent hover:border-green-500/20"
                        title="Ver Faturamento e Vendas"
                      >
                        <TrendingUp size={18} />
                      </button>
                      <button 
                        onClick={() => openModal(u)}
                        className="p-3 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all border border-transparent hover:border-blue-500/20"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="p-3 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest">
                {editingUser ? 'Editar' : 'Novo'} <span className="text-primary">Usuário</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
                <div className="relative group">
                    <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="Ex: Carlos Magno"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail de Acesso</label>
                <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="carlos@email.com"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Senha</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="password" 
                        required={!editingUser}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cargo</label>
                  <div className="relative group">
                    <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none" />
                    <select 
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value as 'sub-user' | 'admin' })}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                    >
                        <option value="sub-user">Sub-usuário (Limitado)</option>
                        {(currentUser?.email === 'mestre@whatchpro.com' || currentUser?.role === 'admin') && (
                          <option value="admin">Administrador (Completo)</option>
                        )}
                    </select>
                  </div>
                </div>
              </div>

              {isMaster && !editingUser && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Empresa (Admin Master)</label>
                  <div className="relative group">
                    <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none" />
                    <select
                      value={formData.tenantId}
                      onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                    >
                      {formData.role === 'admin' && <option value="">Nova Empresa (Admin Master)</option>}
                      {companyAdmins.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {isMaster && !editingUser && formData.role === 'admin' && !formData.tenantId && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Empresa</label>
                    <div className="relative group">
                      <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none" />
                      <select
                        value={formData.companyType}
                        onChange={e => setFormData({ ...formData, companyType: e.target.value as CompanyTypeId })}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                      >
                        {companyTypeOptions.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome da Empresa</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="Ex: Loja Exemplo LTDA"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Razão Social (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyLegalName}
                        onChange={e => setFormData({ ...formData, companyLegalName: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="Ex: Loja Exemplo Comércio e Serviços LTDA"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CNPJ/CPF</label>
                      <input
                        type="text"
                        value={formData.companyDocument}
                        onChange={e => setFormData({ ...formData, companyDocument: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">IE (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyIE}
                        onChange={e => setFormData({ ...formData, companyIE: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="Inscrição Estadual"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyPhone}
                        onChange={e => setFormData({ ...formData, companyPhone: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail (opcional)</label>
                      <input
                        type="email"
                        value={formData.companyEmail}
                        onChange={e => setFormData({ ...formData, companyEmail: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CEP (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyCEP}
                        onChange={e => setFormData({ ...formData, companyCEP: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">UF (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyState}
                        onChange={e => setFormData({ ...formData, companyState: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="SP"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Endereço (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyAddress}
                        onChange={e => setFormData({ ...formData, companyAddress: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="Rua/Avenida"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyNumber}
                        onChange={e => setFormData({ ...formData, companyNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Complemento (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyComplement}
                        onChange={e => setFormData({ ...formData, companyComplement: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="Sala, Bloco, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bairro (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyNeighborhood}
                        onChange={e => setFormData({ ...formData, companyNeighborhood: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="Centro"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cidade (opcional)</label>
                      <input
                        type="text"
                        value={formData.companyCity}
                        onChange={e => setFormData({ ...formData, companyCity: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="São Paulo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Módulos Ativos</label>
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                      {getDefaultFeaturesByCompanyType(formData.companyType).map(f => (
                        <span key={f} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 text-slate-500 border border-white/10">
                          {featureLabel[f]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {formData.role === 'sub-user' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Permissões do Usuário</label>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Perfil de Acesso</label>
                    <div className="relative group">
                      <UserCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none" />
                      <select
                        value={formData.profile}
                        onChange={e => {
                          const nextProfile = e.target.value as UserProfileId
                          const nextPerms = getDefaultPermissionsByProfile(nextProfile, tenantCompanyType)
                          setFormData(prev => ({ ...prev, profile: nextProfile, permissions: nextPerms }))
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                      >
                        {profileOptionsByCompanyType(tenantCompanyType).map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vincular ao Funcionário</label>
                    <div className="relative group">
                      <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none" />
                      <select
                        value={formData.employeeId}
                        onChange={e => {
                          const id = e.target.value
                          setFormData(prev => {
                            const next: any = { ...prev, employeeId: id }
                            if (!id) return next
                            const emp = employees.find(x => x.id === id)
                            if (!emp) return next
                            if (!editingUser) {
                              if (typeof emp.name === 'string' && emp.name.trim()) next.name = emp.name
                              if (typeof emp.email === 'string' && emp.email.trim() && (!next.email || !String(next.email).includes('@'))) next.email = emp.email
                            }
                            return next
                          })
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                      >
                        <option value="">Sem vínculo (usar nome do usuário)</option>
                        {employeeOptions.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}{emp.status === 'inactive' ? ' (Inativo)' : ''} ({emp.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    {availablePermissions.map(perm => (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={() => togglePermission(perm.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          formData.permissions.includes(perm.id)
                            ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                            : "bg-white dark:bg-slate-800 border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border transition-all",
                          formData.permissions.includes(perm.id) ? "bg-primary border-primary text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        )}>
                          {formData.permissions.includes(perm.id) && <Check size={10} />}
                        </div>
                        {perm.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSavingUser}
                className="flex-1 px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all text-sm shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingUser && <Loader2 className="animate-spin" size={18} />}
                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relatórios do Usuário Modal */}
      {isReportsModalOpen && selectedUserForReports && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsReportsModalOpen(false)} />
          <div className="relative w-full max-w-2xl glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest flex items-center gap-3">
                  <TrendingUp className="text-primary" />
                  Relatório de <span className="text-primary">Vendas</span>
                </h2>
                <p className="text-sm font-bold text-slate-500 mt-1">Desempenho de {selectedUserForReports.name}</p>
              </div>
              <button onClick={() => setIsReportsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {(() => {
                const stats = calculateUserStats(selectedUserForReports.id);
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                          <DollarSign size={20} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendas Hoje</p>
                        <p className="text-2xl font-black text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.daily)}
                        </p>
                      </div>

                      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4">
                          <Calendar size={20} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento Mensal</p>
                        <p className="text-2xl font-black text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthly)}
                        </p>
                      </div>

                      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <div className="w-10 h-10 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-4">
                          <TrendingUp size={20} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento Anual</p>
                        <p className="text-2xl font-black text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.yearly)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-8 p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total de Vendas Realizadas</p>
                            <p className="text-sm font-medium text-slate-400">Quantidade de transações concluídas por este usuário.</p>
                        </div>
                        <div className="text-3xl font-black text-primary">{stats.totalSales}</div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
