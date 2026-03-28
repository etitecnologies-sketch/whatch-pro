export type CompanyTypeId =
  | 'supermercado'
  | 'borracharia'
  | 'oficina'
  | 'vendas'
  | 'provedor'
  | 'todos'

export type FeatureId =
  | 'dashboard'
  | 'pdv'
  | 'crm'
  | 'clients'
  | 'employees'
  | 'inventory'
  | 'warehouse'
  | 'service-orders'
  | 'projects'
  | 'quotations'
  | 'finance'
  | 'documents'
  | 'plans'
  | 'contracts'
  | 'users'
  | 'settings'

export type PermissionId =
  | FeatureId
  | 'appearance'
  | 'service-orders-tech'
  | 'service-orders-admin'
  | 'finance-billing'

export type UserProfileId =
  | 'admin'
  | 'gestor'
  | 'financeiro'
  | 'atendimento'
  | 'vendedor'
  | 'caixa'
  | 'estoque'
  | 'almoxarifado'
  | 'tecnico-campo'
  | 'todos'

export const companyTypeOptions: Array<{ id: CompanyTypeId; label: string }> = [
  { id: 'supermercado', label: 'Supermercado' },
  { id: 'borracharia', label: 'Borracharia' },
  { id: 'oficina', label: 'Oficina Automotiva' },
  { id: 'vendas', label: 'Empresa de Vendas' },
  { id: 'provedor', label: 'Provedor de Internet' },
  { id: 'todos', label: 'Todos os Segmentos (ativa tudo)' },
]

export const featureLabel: Record<FeatureId, string> = {
  dashboard: 'Dashboard',
  pdv: 'PDV (Caixa)',
  crm: 'CRM (Vendas)',
  clients: 'Clientes',
  employees: 'Funcionários',
  inventory: 'Estoque',
  warehouse: 'Almoxarifado',
  'service-orders': 'Chamados',
  projects: 'Projetos',
  quotations: 'Orçamentos',
  finance: 'Financeiro',
  documents: 'Documentos',
  plans: 'Planos',
  contracts: 'Contratos',
  users: 'Usuários',
  settings: 'Configurações',
}

export const getDefaultFeaturesByCompanyType = (type: CompanyTypeId): FeatureId[] => {
  const base: FeatureId[] = ['dashboard', 'clients', 'employees', 'documents', 'users', 'settings']
  if (type === 'todos') {
    return [
      ...base,
      'pdv',
      'crm',
      'inventory',
      'warehouse',
      'service-orders',
      'projects',
      'quotations',
      'finance',
      'plans',
      'contracts',
    ]
  }
  if (type === 'supermercado') {
    return [...base, 'pdv', 'inventory', 'quotations', 'finance']
  }
  if (type === 'borracharia') {
    return [...base, 'inventory', 'service-orders', 'quotations', 'finance']
  }
  if (type === 'oficina') {
    return [...base, 'inventory', 'service-orders', 'quotations', 'finance', 'projects']
  }
  if (type === 'vendas') {
    return [...base, 'crm', 'quotations', 'finance', 'plans']
  }
  return [...base, 'service-orders', 'finance', 'plans', 'contracts', 'warehouse']
}

export const profileOptionsByCompanyType = (type: CompanyTypeId): Array<{ id: UserProfileId; label: string }> => {
  const base = [
    { id: 'gestor' as const, label: 'Gestor' },
    { id: 'financeiro' as const, label: 'Financeiro' },
    { id: 'atendimento' as const, label: 'Atendimento/Recepção' },
    { id: 'todos' as const, label: 'Todos (tudo)' },
  ]
  if (type === 'supermercado') {
    return [
      ...base,
      { id: 'caixa', label: 'Caixa (PDV)' },
      { id: 'estoque', label: 'Estoque' },
    ]
  }
  if (type === 'vendas') {
    return [
      ...base,
      { id: 'vendedor', label: 'Vendedor (CRM)' },
    ]
  }
  if (type === 'provedor') {
    return [
      ...base,
      { id: 'almoxarifado', label: 'Almoxarifado' },
      { id: 'tecnico-campo', label: 'Técnico (Campo)' },
    ]
  }
  return [
    ...base,
    { id: 'estoque', label: 'Estoque' },
  ]
}

export const getDefaultPermissionsByProfile = (profile: UserProfileId, companyType: CompanyTypeId): PermissionId[] => {
  if (profile === 'todos') return getDefaultFeaturesByCompanyType(companyType)
  if (profile === 'gestor') {
    return [
      'dashboard',
      'clients',
      'employees',
      'documents',
      'quotations',
      'finance',
      'inventory',
      'warehouse',
      'crm',
      'pdv',
      'service-orders',
      'projects',
      'plans',
      'contracts',
    ].filter(p => getDefaultFeaturesByCompanyType(companyType).includes(p as FeatureId)) as PermissionId[]
  }
  if (profile === 'financeiro') {
    const base: PermissionId[] = ['dashboard', 'clients', 'documents', 'finance', 'finance-billing']
    if (companyType === 'vendas' || companyType === 'provedor' || companyType === 'todos') base.push('plans')
    if (companyType === 'provedor' || companyType === 'todos') base.push('contracts')
    return base
  }
  if (profile === 'atendimento') {
    const base: PermissionId[] = ['dashboard', 'clients', 'documents', 'quotations', 'service-orders']
    if (companyType === 'vendas' || companyType === 'todos') base.push('crm')
    if (companyType === 'provedor' || companyType === 'todos') base.push('plans', 'contracts')
    return base
  }
  if (profile === 'vendedor') {
    return ['dashboard', 'crm', 'clients', 'quotations', 'plans']
  }
  if (profile === 'caixa') {
    return ['dashboard', 'pdv', 'clients']
  }
  if (profile === 'estoque') {
    return ['dashboard', 'inventory']
  }
  if (profile === 'almoxarifado') {
    return ['dashboard', 'warehouse', 'service-orders']
  }
  if (profile === 'tecnico-campo') {
    return ['dashboard', 'service-orders-tech', 'service-orders', 'warehouse', 'clients']
  }
  return getDefaultFeaturesByCompanyType(companyType)
}

export const normalizeCompanyType = (raw: unknown): CompanyTypeId | undefined => {
  const v = typeof raw === 'string' ? raw : ''
  const found = companyTypeOptions.find(o => o.id === v)
  return found?.id
}

export const normalizeFeatures = (raw: unknown): FeatureId[] | undefined => {
  if (!Array.isArray(raw)) return undefined
  const allowed = new Set<FeatureId>(Object.keys(featureLabel) as FeatureId[])
  const out: FeatureId[] = []
  for (const v of raw) {
    if (typeof v === 'string' && allowed.has(v as FeatureId)) out.push(v as FeatureId)
  }
  return out.length > 0 ? out : undefined
}
