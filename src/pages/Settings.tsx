import { useState, useEffect, useRef } from 'react'
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  FileText, 
  Download, 
  Calendar,
  Save,
  CheckCircle2,
  Lock,
  Smartphone,
  Mail,
  HelpCircle,
  Loader2,
  RefreshCw,
  Cpu,
  History,
  Zap,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Database,
  ShieldCheck
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '../hooks/useAuth'
import { useAppearance } from '../hooks/useAppearance'
import { useData } from '../hooks/useData'
import { useSEFAZ } from '../hooks/useSEFAZ'
import { supabase } from '../lib/supabase'
import type { AsaasEnvironment } from '../lib/asaas'
import type { ConfiguracaoSEFAZ } from '../types'
import { jsPDF } from 'jspdf'
import { companyTypeOptions, featureLabel, getDefaultFeaturesByCompanyType, normalizeCompanyType, normalizeFeatures } from '../lib/access'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type SettingsSection = 'profile' | 'notifications' | 'company' | 'security' | 'appearance' | 'reports' | 'integrations' | 'receita' | 'system'

export default function Settings() {
  const { user, canAccess, updateUserMetadata } = useAuth()
  const { theme, setTheme, accentColor, setAccentColor } = useAppearance()
  const { syncAllClientsWithAsaas, transactions, projects, products, employees, serviceOrders, quotations } = useData()
  const { configuracaoSEFAZ, certificados, salvarConfiguracaoSEFAZ, carregarCertificado, removerCertificado, ativarCertificado } = useSEFAZ()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [isSaved, setIsSaved] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [configuringIntegration, setConfiguringIntegration] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [selectedReportPeriod, setSelectedReportPeriod] = useState<'Semanal' | 'Mensal' | 'Anual'>('Mensal')
  const [isExportingReports, setIsExportingReports] = useState(false)
  const [isLoadingTenant, setIsLoadingTenant] = useState(false)
  const [isSavingTenant, setIsSavingTenant] = useState(false)
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: string; name: string; companyType: string | null }>>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [tenantOptionsError, setTenantOptionsError] = useState<string>('')
  const [tenantError, setTenantError] = useState<string>('')
  const [tenantForm, setTenantForm] = useState({
    companyType: 'todos',
    features: [] as string[],
    name: '',
    legalName: '',
    document: '',
    ie: '',
    phone: '',
    email: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  })
  
  // SEFAZ State
  const [sefazData, setSefazData] = useState<Partial<ConfiguracaoSEFAZ>>(configuracaoSEFAZ || {
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    site: '',
    emailComercial: '',
    whatsapp: '',
    logoUrl: '',
    uf: 'SP',
    municipio: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    modeloNFe: '55',
    serieNFe: '001',
    proximoNumeroNFe: 1,
    tipoIntegracao: 'hibrido',
    ambiente: 'homologacao',
    naturezaAtividade: '00',
    tipoEscrituracao: 'COMPLETA'
  })

  useEffect(() => {
    if (configuracaoSEFAZ) setSefazData(configuracaoSEFAZ)
  }, [configuracaoSEFAZ])

  useEffect(() => {
    if (!user) return
    if (user.email === 'mestre@whatchpro.com') {
      void (async () => {
        setIsLoadingTenant(true)
        setTenantOptionsError('')
        try {
          const { data, error } = await supabase.functions.invoke('user-admin', {
            body: { action: 'tenants_list' },
          })
          if (error) throw error
          const tenants = Array.isArray((data as any)?.tenants) ? (data as any).tenants : []
          const list = tenants.map((t: any) => ({
            id: String(t.id),
            name: String(t.name || ''),
            companyType: t.company_type ? String(t.company_type) : null,
          }))
          setTenantOptions(list)
          if (!selectedTenantId && list.length > 0) setSelectedTenantId(list[0].id)
        } catch (e) {
          console.error(e)
          setTenantOptions([])
          setTenantOptionsError((e as any)?.message || 'Não foi possível carregar as empresas.')
        } finally {
          setIsLoadingTenant(false)
        }
      })()
      return
    }

    const tenantId = user.adminId || user.id
    setSelectedTenantId(tenantId)
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!selectedTenantId) return
    void (async () => {
      setIsLoadingTenant(true)
      setTenantError('')
      try {
        const isMaster = user.email === 'mestre@whatchpro.com'
        const isRootAdmin = user.role === 'admin' && !user.adminId
        const shouldUseEdge = isMaster || isRootAdmin

        let tenant: any = null
        if (shouldUseEdge) {
          const { data, error } = await supabase.functions.invoke('user-admin', {
            body: { action: 'tenant_get', tenantId: selectedTenantId },
          })
          if (error) throw error
          tenant = (data as any)?.tenant || null
        } else {
          const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', selectedTenantId)
            .maybeSingle()
          if (error) throw error
          tenant = data || null
        }

        if (!tenant) return
        setTenantForm({
          companyType: String(tenant.company_type || 'todos'),
          features: Array.isArray(tenant.features) ? tenant.features : [],
          name: String(tenant.name || ''),
          legalName: String(tenant.legal_name || ''),
          document: String(tenant.document || ''),
          ie: String(tenant.ie || ''),
          phone: String(tenant.phone || ''),
          email: String(tenant.email || ''),
          cep: String(tenant.cep || ''),
          address: String(tenant.address || ''),
          number: String(tenant.number || ''),
          complement: String(tenant.complement || ''),
          neighborhood: String(tenant.neighborhood || ''),
          city: String(tenant.city || ''),
          state: String(tenant.state || ''),
        })
      } catch (e) {
        console.error(e)
        setTenantError((e as any)?.message || 'Não foi possível carregar os dados da empresa.')
      } finally {
        setIsLoadingTenant(false)
      }
    })()
  }, [selectedTenantId, user])

  const handleLogoFileChange = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem (PNG/JPG).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('A logo deve ter no máximo 2MB.')
      return
    }

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
      reader.readAsDataURL(file)
    })

    setSefazData(prev => ({ ...prev, logoUrl: dataUrl }))
  }

  const [certFile, setCertFile] = useState<File | null>(null)
  const [certPass, setCertFilePass] = useState('')
  const [isUploadingCert, setIsUploadingCert] = useState(false)
  const [asaasToken, setAsaasToken] = useState(() => {
    const tId = user?.adminId || user?.id;
    return localStorage.getItem(`whatch_pro_asaas_token_${tId}`) || '';
  })
  const [tempAsaasToken, setTempAsaasToken] = useState(asaasToken)
  const [asaasEnv, setAsaasEnv] = useState<AsaasEnvironment>(() => {
    const tId = user?.adminId || user?.id;
    return (localStorage.getItem(`whatch_pro_asaas_env_${tId}`) as AsaasEnvironment) || 'production';
  })

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const getPeriodRange = (period: 'Semanal' | 'Mensal' | 'Anual') => {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    let start: Date
    if (period === 'Semanal') {
      const s = new Date(end)
      s.setDate(s.getDate() - 6)
      start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0)
    } else if (period === 'Anual') {
      start = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0)
    } else {
      start = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0, 0)
    }
    const label = `${start.toLocaleDateString('pt-BR')} – ${end.toLocaleDateString('pt-BR')}`
    return { start, end, label }
  }

  const withinRange = (isoDate: string, start: Date, end: Date) => {
    const d = new Date(isoDate)
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
  }

  const generateTextPdf = (title: string, periodLabel: string, sections: { title: string; lines: string[] }[]) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 48
    let y = 56

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text(title, margin, y)
    y += 20

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`Período: ${periodLabel}`, margin, y)
    y += 26

    const addLine = (text: string) => {
      const maxWidth = pageWidth - margin * 2
      const lines = pdf.splitTextToSize(text, maxWidth)
      for (const line of lines) {
        if (y > 780) {
          pdf.addPage()
          y = 56
        }
        pdf.text(line, margin, y)
        y += 14
      }
    }

    for (const section of sections) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      addLine(section.title)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      for (const l of section.lines) addLine(`• ${l}`)
      y += 10
    }

    const safeTitle = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
    const stamp = new Date().toISOString().slice(0, 10)
    pdf.save(`${safeTitle}_${stamp}.pdf`)
  }

  const handleGenerateReportPdf = async (type: 'finance' | 'projects' | 'inventory' | 'users') => {
    if (isExportingReports) return
    setIsExportingReports(true)
    try {
      const { start, end, label } = getPeriodRange(selectedReportPeriod)

      const txInRange = transactions.filter(t => withinRange(t.date, start, end))
      const income = txInRange.filter(t => t.type === 'income')
      const expense = txInRange.filter(t => t.type === 'expense')
      const incomeTotal = income.reduce((acc, t) => acc + t.amount, 0)
      const expenseTotal = expense.reduce((acc, t) => acc + t.amount, 0)
      const pending = txInRange.filter(t => t.status === 'pending')

      const projectsCounts = projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const lowStock = products.filter(p => p.quantity <= (p.minQuantity || 0))
      const outStock = products.filter(p => p.quantity <= 0)

      const soInRange = serviceOrders.filter(s => withinRange(s.createdAt, start, end))
      const quotationsInRange = quotations.filter(q => withinRange(q.createdAt, start, end))

      if (type === 'finance') {
        generateTextPdf('Relatório: Fluxo de Caixa', label, [
          {
            title: 'Resumo',
            lines: [
              `Receitas: ${formatMoney(incomeTotal)} (${income.length})`,
              `Despesas: ${formatMoney(expenseTotal)} (${expense.length})`,
              `Saldo: ${formatMoney(incomeTotal - expenseTotal)}`,
              `Pendências: ${pending.length}`
            ]
          }
        ])
        return
      }

      if (type === 'projects') {
        generateTextPdf('Relatório: Desempenho de Projetos', label, [
          {
            title: 'Projetos',
            lines: [
              `Total: ${projects.length}`,
              ...Object.entries(projectsCounts).map(([k, v]) => `${k}: ${v}`)
            ]
          }
        ])
        return
      }

      if (type === 'inventory') {
        generateTextPdf('Relatório: Inventário de Estoque', label, [
          {
            title: 'Estoque',
            lines: [
              `Produtos cadastrados: ${products.length}`,
              `Estoque crítico: ${lowStock.length}`,
              `Sem estoque: ${outStock.length}`
            ]
          },
          {
            title: 'Movimentações do Período',
            lines: [
              `Chamados criados: ${soInRange.length}`,
              `Orçamentos criados: ${quotationsInRange.length}`
            ]
          }
        ])
        return
      }

      generateTextPdf('Relatório: Atividades de Usuários', label, [
        {
          title: 'Usuários',
          lines: [
            `Funcionários cadastrados: ${employees.length}`,
            `Chamados criados: ${soInRange.length}`,
            `Orçamentos criados: ${quotationsInRange.length}`
          ]
        }
      ])
    } finally {
      setIsExportingReports(false)
    }
  }

  const handleGenerateConsolidatedPdf = async () => {
    if (isExportingReports) return
    setIsExportingReports(true)
    try {
      const { start, end, label } = getPeriodRange(selectedReportPeriod)

      const txInRange = transactions.filter(t => withinRange(t.date, start, end))
      const incomeTotal = txInRange.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
      const expenseTotal = txInRange.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
      const pending = txInRange.filter(t => t.status === 'pending').length

      const lowStock = products.filter(p => p.quantity <= (p.minQuantity || 0)).length
      const outStock = products.filter(p => p.quantity <= 0).length

      const projectsCounts = projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const soInRange = serviceOrders.filter(s => withinRange(s.createdAt, start, end))
      const quotationsInRange = quotations.filter(q => withinRange(q.createdAt, start, end))

      generateTextPdf('Relatório Consolidado', label, [
        {
          title: 'Financeiro',
          lines: [
            `Receitas: ${formatMoney(incomeTotal)}`,
            `Despesas: ${formatMoney(expenseTotal)}`,
            `Saldo: ${formatMoney(incomeTotal - expenseTotal)}`,
            `Pendências: ${pending}`
          ]
        },
        {
          title: 'Projetos',
          lines: [
            `Total: ${projects.length}`,
            ...Object.entries(projectsCounts).map(([k, v]) => `${k}: ${v}`)
          ]
        },
        {
          title: 'Estoque',
          lines: [
            `Produtos cadastrados: ${products.length}`,
            `Estoque crítico: ${lowStock}`,
            `Sem estoque: ${outStock}`
          ]
        },
        {
          title: 'Operação',
          lines: [
            `Chamados criados: ${soInRange.length}`,
            `Orçamentos criados: ${quotationsInRange.length}`,
            `Funcionários cadastrados: ${employees.length}`
          ]
        }
      ])
    } finally {
      setIsExportingReports(false)
    }
  }
  const [asaasProxyEnabled, setAsaasProxyEnabled] = useState(() => {
    const tId = user?.adminId || user?.id;
    return localStorage.getItem(`whatch_pro_asaas_proxy_enabled_${tId}`) === 'true';
  })
  
  // NuvemFiscal state
  const [nuvemfiscalToken, setNuvemfiscalToken] = useState(() => {
    const tId = user?.adminId || user?.id;
    return localStorage.getItem(`whatch_pro_nuvemfiscal_token_${tId}`) || '';
  })
  const [tempNuvemfiscalToken, setTempNuvemfiscalToken] = useState(nuvemfiscalToken)
  const [nuvemfiscalEnv, setNuvemfiscalEnv] = useState<'sandbox' | 'producao'>(() => {
    const tId = user?.adminId || user?.id;
    return (localStorage.getItem(`whatch_pro_nuvemfiscal_env_${tId}`) as any) || 'sandbox';
  })
  const [nuvemfiscalProxyEnabled, setNuvemfiscalProxyEnabled] = useState(() => {
    const tId = user?.adminId || user?.id;
    return localStorage.getItem(`whatch_pro_nuvemfiscal_proxy_enabled_${tId}`) === 'true';
  })

  const [showToken, setShowToken] = useState(false)
  const [isSyncingClients, setIsSyncingClients] = useState(false)

  // Load integration config from DB on mount
  useEffect(() => {
    if (user && (asaasProxyEnabled || nuvemfiscalProxyEnabled)) {
      const loadIntegration = async () => {
        const { data, error } = await supabase
          .from('user_integrations')
          .select('asaas_token, asaas_env, nuvemfiscal_token, nuvemfiscal_env')
          .eq('user_id', user.id)
          .single()
        
        if (data && !error) {
          if (asaasProxyEnabled) {
            setAsaasToken(data.asaas_token || '')
            setAsaasEnv(data.asaas_env || 'production')
          }
          if (nuvemfiscalProxyEnabled) {
            setNuvemfiscalToken(data.nuvemfiscal_token || '')
            setNuvemfiscalEnv(data.nuvemfiscal_env || 'sandbox')
          }
        }
      }
      loadIntegration()
    }
  }, [user, asaasProxyEnabled, nuvemfiscalProxyEnabled])
  
  const [integrationStates, setIntegrationStates] = useState({
    'Asaas Gateway': asaasToken || asaasProxyEnabled ? 'Conectado' : 'Pendente',
    'NuvemFiscal NF-e': nuvemfiscalToken || nuvemfiscalProxyEnabled ? 'Conectado' : 'Pendente',
    'WhatsApp Business API': 'Conectado',
    'Supabase Cloud Database': 'Conectado',
    'Banco Inter API': 'Roadmap',
    'Google Calendar': 'Roadmap'
  })

  const handleSaveAsaasConfig = async (token: string, env: AsaasEnvironment, proxy: boolean) => {
    try {
      const tId = user?.adminId || user?.id;
      if (proxy && user) {
        const { error } = await supabase
          .from('user_integrations')
          .upsert({ 
            user_id: user.id,
            admin_id: tId,
            asaas_token: token,
            asaas_env: env,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })

        if (error) throw error
      }

      setAsaasToken(token)
      setAsaasEnv(env)
      setAsaasProxyEnabled(proxy)
      localStorage.setItem(`whatch_pro_asaas_token_${tId}`, token)
      localStorage.setItem(`whatch_pro_asaas_env_${tId}`, env)
      localStorage.setItem(`whatch_pro_asaas_proxy_enabled_${tId}`, proxy.toString())
      setIntegrationStates(prev => ({ ...prev, 'Asaas Gateway': (token || proxy) ? 'Conectado' : 'Pendente' }))
      setConfiguringIntegration(null)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
      
      if (token || proxy) {
          handleManualSync()
      }
    } catch (error: any) {
      console.error('Erro ao salvar configuração do Asaas:', error)
      alert('Erro ao salvar no servidor: ' + (error.message || 'Verifique sua conexão'))
    }
  }

  const handleManualSync = async () => {
    setIsSyncingClients(true)
    try {
        await syncAllClientsWithAsaas()
    } catch (error) {
        console.error('Erro na sincronização manual:', error)
    } finally {
        setIsSyncingClients(false)
    }
  }

  const handleSaveNuvemFiscalConfig = async (token: string, env: 'sandbox' | 'producao', proxy: boolean) => {
    try {
      const tId = user?.adminId || user?.id;
      if (proxy && user) {
        const { error } = await supabase
          .from('user_integrations')
          .upsert({ 
            user_id: user.id,
            admin_id: tId,
            nuvemfiscal_token: token,
            nuvemfiscal_env: env,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })

        if (error) throw error
      }

      setNuvemfiscalToken(token)
      setNuvemfiscalEnv(env)
      setNuvemfiscalProxyEnabled(proxy)
      localStorage.setItem(`whatch_pro_nuvemfiscal_token_${tId}`, token)
      localStorage.setItem(`whatch_pro_nuvemfiscal_env_${tId}`, env)
      localStorage.setItem(`whatch_pro_nuvemfiscal_proxy_enabled_${tId}`, proxy.toString())
      setIntegrationStates(prev => ({ ...prev, 'NuvemFiscal NF-e': (token || proxy) ? 'Conectado' : 'Pendente' }))
      setConfiguringIntegration(null)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (error: any) {
      console.error('Erro ao salvar configuração NuvemFiscal:', error)
      alert('Erro ao salvar no servidor: ' + (error.message || 'Verifique sua conexão'))
    }
  }

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true)
    setTimeout(() => {
      setIsCheckingUpdate(false)
      alert('Sua versão v1.5.0-enterprise está atualizada!\n\nNovidades:\n- PDV (Frente de Caixa) com baixa automática de estoque\n- Ordens de Serviço (O.S) com peças do estoque e mão de obra\n- CRM (Vendas) com funil estilo Kanban\n- Financeiro com marcação rápida de Pago/Recebido\n- Novas categorias de produtos para múltiplos segmentos')
    }, 2000)
  }

  const handleSave = () => {
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const sections = [
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'company', label: 'Empresa', icon: Database },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'integrations', label: 'Integrações', icon: Globe },
    { id: 'receita', label: 'Receita Federal', icon: ShieldCheck },
    { id: 'system', label: 'Sistema & Updates', icon: Cpu },
  ].filter(section => {
    if (section.id === 'profile' || section.id === 'notifications' || section.id === 'company') return true;
    if (section.id === 'appearance') return canAccess('appearance');
    if (section.id === 'receita') return user?.role === 'admin' || user?.email === 'mestre@whatchpro.com';
    return user?.role === 'admin' || user?.email === 'mestre@whatchpro.com';
  })

  const renderSection = () => {
    switch (activeSection) {
      case 'company':
        {
        const isMaster = user?.email === 'mestre@whatchpro.com'
        const isRootAdmin = user?.role === 'admin' && !user?.adminId
        const hasSelectedTenant = Boolean(selectedTenantId)
        const canEditTenant = Boolean((isMaster || isRootAdmin) && hasSelectedTenant)
        const normalizedCompanyType = normalizeCompanyType(tenantForm.companyType) || 'todos'
        const effectiveFeatures = (tenantForm.features && tenantForm.features.length > 0)
          ? tenantForm.features
          : getDefaultFeaturesByCompanyType(normalizedCompanyType)
        const usesDefaultModules = !tenantForm.features || tenantForm.features.length === 0
        const allFeatureIds = Object.keys(featureLabel) as string[]
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Dados da Empresa</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    {user?.email === 'mestre@whatchpro.com'
                      ? (tenantOptions.length > 0 ? 'Selecione uma empresa para editar os dados cadastrais.' : 'Nenhuma empresa cadastrada ainda. Crie um Admin Master em Usuários para gerar a empresa.')
                      : 'Somente Admin pode editar. Sub-usuário visualiza os dados.'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!user) return
                    const isMaster = user.email === 'mestre@whatchpro.com'
                    const isRootAdmin = user.role === 'admin' && !user.adminId
                    if (!(isMaster || isRootAdmin)) {
                      alert('Apenas o Administrador da empresa ou o Mestre podem editar.')
                      return
                    }
                    if (!selectedTenantId) {
                      alert('Nenhuma empresa selecionada. Se você ainda não tem empresas, crie um Admin Master em Usuários (Nova Empresa).')
                      return
                    }
                    setIsSavingTenant(true)
                    try {
                      const nextCompanyType = normalizeCompanyType(tenantForm.companyType) || 'todos'
                      const nextFeatures =
                        tenantForm.features && tenantForm.features.length > 0
                          ? (normalizeFeatures(tenantForm.features) || getDefaultFeaturesByCompanyType(nextCompanyType))
                          : []
                      const payload: Record<string, unknown> = {
                        company_type: nextCompanyType,
                        features: nextFeatures,
                        name: tenantForm.name,
                        legal_name: tenantForm.legalName || null,
                        document: tenantForm.document || null,
                        ie: tenantForm.ie || null,
                        phone: tenantForm.phone || null,
                        email: tenantForm.email || null,
                        cep: tenantForm.cep || null,
                        address: tenantForm.address || null,
                        number: tenantForm.number || null,
                        complement: tenantForm.complement || null,
                        neighborhood: tenantForm.neighborhood || null,
                        city: tenantForm.city || null,
                        state: tenantForm.state || null,
                      }
                      const { data, error } = await supabase.functions.invoke('user-admin', {
                        body: { action: 'tenant_update', tenantId: selectedTenantId, updates: payload },
                      })
                      if (error) throw error
                      if ((data as any)?.tenant) {
                        const t = (data as any).tenant
                        setTenantForm(prev => ({
                          ...prev,
                          companyType: String(t.company_type || prev.companyType),
                          features: Array.isArray(t.features) ? t.features : prev.features,
                          name: String(t.name || prev.name),
                        }))
                      }
                      setIsSaved(true)
                      setTimeout(() => setIsSaved(false), 3000)
                    } catch (e: any) {
                      alert(e?.message || 'Não foi possível salvar a empresa.')
                    } finally {
                      setIsSavingTenant(false)
                    }
                  }}
                  disabled={!canEditTenant || isSavingTenant || isLoadingTenant}
                  className={cn(
                    "px-5 py-3 font-black rounded-2xl transition-all flex items-center gap-2 shadow-lg",
                    !canEditTenant || isSavingTenant || isLoadingTenant
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-primary text-white glow-primary shadow-primary/20 hover:scale-105"
                  )}
                >
                  {isSavingTenant ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Empresa
                </button>
              </div>

              {user?.email === 'mestre@whatchpro.com' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Empresa</label>
                  <div className="relative group">
                    <Database size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none" />
                    <select
                      value={selectedTenantId}
                      onChange={e => setSelectedTenantId(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                    >
                      {tenantOptions.length === 0 && (
                        <option value="">Nenhuma empresa cadastrada</option>
                      )}
                      {tenantOptions.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  {tenantOptionsError && (
                    <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 px-1">
                      {tenantOptionsError}
                    </div>
                  )}
                </div>
              )}

              {tenantError && (
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 px-1">
                  {tenantError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Empresa</label>
                  <select
                    value={tenantForm.companyType}
                    disabled={!canEditTenant}
                    onChange={e => {
                      const nextType = normalizeCompanyType(e.target.value) || 'todos'
                      setTenantForm(prev => ({
                        ...prev,
                        companyType: nextType,
                        features: prev.features && prev.features.length > 0 ? getDefaultFeaturesByCompanyType(nextType) : prev.features,
                      }))
                    }}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  >
                    {companyTypeOptions.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Módulos Ativos</label>
                  {canEditTenant && (
                    <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <input
                        type="checkbox"
                        checked={usesDefaultModules}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setTenantForm(prev => ({
                            ...prev,
                            features: checked ? [] : getDefaultFeaturesByCompanyType(normalizeCompanyType(prev.companyType) || 'todos'),
                          }))
                        }}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                        Usar módulos padrão do segmento
                      </span>
                    </label>
                  )}

                  {canEditTenant && !usesDefaultModules && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allFeatureIds.map((f) => {
                        const checked = effectiveFeatures.includes(f)
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setTenantForm(prev => {
                                const nextType = normalizeCompanyType(prev.companyType) || 'todos'
                                const base = prev.features && prev.features.length > 0 ? prev.features : getDefaultFeaturesByCompanyType(nextType)
                                const has = base.includes(f)
                                const next = has ? base.filter(x => x !== f) : [...base, f]
                                return { ...prev, features: next }
                              })
                            }}
                            className={cn(
                              "px-3 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              checked
                                ? "bg-primary text-white border-primary shadow-primary/20"
                                : "bg-white/70 dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-white"
                            )}
                          >
                            {(featureLabel as Record<string, string>)[f] || f}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    {effectiveFeatures.map((f) => (
                      <span key={String(f)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 text-slate-500 border border-white/10">
                        {(featureLabel as Record<string, string>)[String(f)] || String(f)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome da Empresa</label>
                  <input
                    type="text"
                    value={tenantForm.name}
                    onChange={e => setTenantForm(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Razão Social</label>
                  <input
                    type="text"
                    value={tenantForm.legalName}
                    onChange={e => setTenantForm(prev => ({ ...prev, legalName: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CNPJ/CPF</label>
                  <input
                    type="text"
                    value={tenantForm.document}
                    onChange={e => setTenantForm(prev => ({ ...prev, document: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">IE</label>
                  <input
                    type="text"
                    value={tenantForm.ie}
                    onChange={e => setTenantForm(prev => ({ ...prev, ie: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone</label>
                  <input
                    type="text"
                    value={tenantForm.phone}
                    onChange={e => setTenantForm(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                  <input
                    type="email"
                    value={tenantForm.email}
                    onChange={e => setTenantForm(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CEP</label>
                  <input
                    type="text"
                    value={tenantForm.cep}
                    onChange={e => setTenantForm(prev => ({ ...prev, cep: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">UF</label>
                  <input
                    type="text"
                    value={tenantForm.state}
                    onChange={e => setTenantForm(prev => ({ ...prev, state: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Endereço</label>
                  <input
                    type="text"
                    value={tenantForm.address}
                    onChange={e => setTenantForm(prev => ({ ...prev, address: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número</label>
                  <input
                    type="text"
                    value={tenantForm.number}
                    onChange={e => setTenantForm(prev => ({ ...prev, number: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Complemento</label>
                  <input
                    type="text"
                    value={tenantForm.complement}
                    onChange={e => setTenantForm(prev => ({ ...prev, complement: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bairro</label>
                  <input
                    type="text"
                    value={tenantForm.neighborhood}
                    onChange={e => setTenantForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cidade</label>
                  <input
                    type="text"
                    value={tenantForm.city}
                    onChange={e => setTenantForm(prev => ({ ...prev, city: e.target.value }))}
                    disabled={!canEditTenant}
                    className={cn(
                      "w-full px-4 py-3 border-0 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner",
                      canEditTenant
                        ? "bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-primary/10"
                        : "bg-slate-100 dark:bg-slate-900 opacity-80"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        )
        }
      case 'profile':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-8 p-6 glass rounded-3xl border border-white/10">
              <div className="relative group">
                <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt={user?.name} className="w-24 h-24 rounded-3xl object-cover shadow-2xl border-2 border-primary/20 group-hover:scale-105 transition-transform duration-500" />
                <div onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-primary/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Smartphone size={24} className="text-white" />
                </div>
              </div>
              <div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !user) return
                    if (file.size > 2 * 1024 * 1024) {
                      alert('Arquivo muito grande. Máximo: 2MB.')
                      e.target.value = ''
                      return
                    }
                    if (!['image/png', 'image/jpeg'].includes(file.type)) {
                      alert('Formato inválido. Use JPG ou PNG.')
                      e.target.value = ''
                      return
                    }

                    setIsUploadingAvatar(true)
                    try {
                      const ext = file.name.split('.').pop()?.toLowerCase() || (file.type === 'image/png' ? 'png' : 'jpg')
                      const safeExt = ['png', 'jpg', 'jpeg'].includes(ext) ? ext : 'jpg'
                      const filePath = `${user.id}/${Date.now()}.${safeExt}`
                      const { error: uploadError } = await supabase
                        .storage
                        .from('avatars')
                        .upload(filePath, file, { upsert: true, contentType: file.type })
                      if (uploadError) throw uploadError

                      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
                      const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`

                      await updateUserMetadata({ avatar: publicUrl })
                      alert('Foto de perfil atualizada com sucesso!')
                    } catch (err: any) {
                      alert('Erro ao enviar a foto. Verifique o bucket \"avatars\" no Supabase Storage e as permissões.')
                      console.error(err)
                    } finally {
                      setIsUploadingAvatar(false)
                      e.target.value = ''
                    }
                  }}
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="bg-primary text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all glow-primary shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Alterar Foto
                </button>
                <p className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-tighter">Formatos: JPG, PNG. Máximo: 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
                <input type="text" defaultValue={user?.name} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                <input type="email" defaultValue={user?.email} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cargo</label>
                <input type="text" readOnly defaultValue={user?.role === 'admin' ? 'Administrador Full' : 'Usuário'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner opacity-60" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone</label>
                <input type="text" placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" />
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NotificationToggle label="E-mails de novos clientes" description="Receba um aviso quando um novo cliente for cadastrado." />
            <NotificationToggle label="Alertas de estoque baixo" description="Notificações diárias sobre produtos com estoque crítico." />
            <NotificationToggle label="Relatórios automáticos" description="Receba relatórios de desempenho por e-mail." />
            <NotificationToggle label="Mensagens do sistema" description="Avisos sobre atualizações e manutenção." />
          </div>
        );
      case 'security':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Alterar Senha de Acesso</h4>
              <div className="space-y-4 max-w-md">
                <input type="password" placeholder="Senha atual" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" />
                <input type="password" placeholder="Nova senha" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" />
                <input type="password" placeholder="Confirmar nova senha" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" />
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-3 text-amber-500 mb-2">
                    <HelpCircle size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Dica de Segurança</span>
                </div>
                <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tighter">Use senhas complexas com letras, números e símbolos para proteger seus dados empresariais.</p>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Modo do Sistema</h4>
              <div className="grid grid-cols-2 gap-6 max-w-md">
                <button 
                  onClick={() => setTheme('light')}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group",
                    theme === 'light' ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10" : "bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400"
                  )}
                >
                  <Globe size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Light Mode</span>
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group",
                    theme === 'dark' ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10" : "bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400"
                  )}
                >
                  <Shield size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Dark Mode</span>
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Cores de Destaque (Neon)</h4>
              <div className="flex wrap gap-4">
                {(['blue', 'purple', 'green', 'red', 'orange'] as const).map((color) => (
                  <button
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={cn(
                      "w-12 h-12 rounded-2xl transition-all duration-300 relative group",
                      accentColor === color ? "scale-110 shadow-lg" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color === 'blue' ? '#2563eb' : color === 'purple' ? '#9333ea' : color === 'green' ? '#16a34a' : color === 'red' ? '#dc2626' : '#ea580c' }}
                  >
                    {accentColor === color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <CheckCircle2 size={20} className="text-white drop-shadow-md" />
                        </div>
                    )}
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-20 rounded-2xl"></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <Calendar size={18} className="text-primary" />
                Configuração de Período
              </h4>
              <div className="flex flex-wrap gap-4">
                {(['Semanal', 'Mensal', 'Anual'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedReportPeriod(period)}
                    className={cn(
                      "px-8 py-4 glass rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-95",
                      selectedReportPeriod === period ? "border-primary/50 bg-primary/10 text-primary" : "text-slate-500 hover:text-primary"
                    )}
                    aria-pressed={selectedReportPeriod === period}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReportCard title="Fluxo de Caixa" description="Análise completa de receitas e despesas." type="finance" period={selectedReportPeriod} onGenerate={() => handleGenerateReportPdf('finance')} />
              <ReportCard title="Desempenho de Projetos" description="Status detalhado de horas e custos." type="projects" period={selectedReportPeriod} onGenerate={() => handleGenerateReportPdf('projects')} />
              <ReportCard title="Inventário de Estoque" description="Relatório de ativos e reposição." type="inventory" period={selectedReportPeriod} onGenerate={() => handleGenerateReportPdf('inventory')} />
              <ReportCard title="Atividades de Usuários" description="Log de acessos e modificações." type="users" period={selectedReportPeriod} onGenerate={() => handleGenerateReportPdf('users')} />
            </div>

            <div className="p-8 rounded-[32px] bg-primary/5 border border-primary/10 relative overflow-hidden group">
                <div className="absolute inset-0 shimmer opacity-10"></div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white glow-primary shadow-lg shadow-primary/20">
                            <Download size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-1">Exportar Pacote Completo</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic">Gera um PDF consolidado com todos os dados do período selecionado.</p>
                        </div>
                    </div>
                    <button
                      onClick={handleGenerateConsolidatedPdf}
                      disabled={isExportingReports}
                      className="w-full md:w-auto px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-primary hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
                    >
                        Gerar PDF Consolidado
                    </button>
                </div>
            </div>
          </div>
        );
      case 'integrations':
        const activeIntegrations = Object.entries(integrationStates).filter(([_, status]) => status !== 'Próxima Meta' && status !== 'Roadmap')
        const RoadmapIntegrations = Object.entries(integrationStates).filter(([_, status]) => status === 'Próxima Meta' || status === 'Roadmap')

        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-4 flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                Integrações Ativas
              </h4>
              <div className="space-y-4">
                {activeIntegrations.map(([label, status]) => (
                  <IntegrationItem 
                    key={label} 
                    label={label} 
                    status={status} 
                    onConfigure={() => setConfiguringIntegration(label)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-4 flex items-center gap-2">
                <Calendar size={14} />
                Próximos Passos (Roadmap)
              </h4>
              <div className="space-y-4 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                {RoadmapIntegrations.map(([label, status]) => (
                  <IntegrationItem 
                    key={label} 
                    label={label} 
                    status={status} 
                    onConfigure={() => setConfiguringIntegration(label)}
                  />
                ))}
              </div>
            </div>

            {configuringIntegration && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setConfiguringIntegration(null)} />
                <div className="relative w-full max-w-lg glass rounded-[40px] border border-white/20 p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                      <Globe size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-2">Configurar</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{configuringIntegration}</p>
                    </div>
                  </div>

                  <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {configuringIntegration === 'Asaas Gateway' && (
                      <div className="space-y-6">
                        <div className="p-4 rounded-[32px] bg-primary/5 border border-primary/10 mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Shield size={16} className="text-primary" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Segurança de Servidor (Proxy)</span>
                            </div>
                            <button 
                              onClick={() => setAsaasProxyEnabled(!asaasProxyEnabled)}
                              className={cn(
                                "w-10 h-5 rounded-full transition-all relative p-1 shadow-inner",
                                asaasProxyEnabled ? "bg-primary" : "bg-slate-300 dark:bg-slate-800"
                              )}
                            >
                              <div className={cn(
                                "w-3 h-3 bg-white rounded-full shadow-sm transition-all",
                                asaasProxyEnabled ? "translate-x-5" : "translate-x-0"
                              )} />
                            </button>
                          </div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            Ao ativar, o Token é armazenado no Supabase Vault e nunca chega ao navegador. Recomendado para nível máximo de segurança.
                          </p>
                        </div>

                        {!asaasProxyEnabled ? (
                          <div className="space-y-2 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Asaas API Token
                              </label>
                              <button 
                                onClick={() => setShowToken(!showToken)}
                                className="text-slate-500 hover:text-primary transition-colors"
                              >
                                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                            <input 
                              type={showToken ? "text" : "password"}
                              value={tempAsaasToken}
                              onChange={(e) => setTempAsaasToken(e.target.value)}
                              className="w-full px-6 py-4 bg-slate-900/40 border border-white/5 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-bold text-white shadow-inner"
                            />
                          </div>
                        ) : (
                          <div className="p-6 rounded-3xl bg-slate-950/40 border border-white/5 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95 duration-300">
                            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                              <Lock size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase tracking-widest">Configuração via Servidor Ativa</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">O token será gerenciado pelo Supabase Edge Functions.</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ambiente</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setAsaasEnv('sandbox')}
                              className={cn(
                                "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                asaasEnv === 'sandbox' 
                                  ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                                  : "bg-slate-900/40 border-white/5 text-slate-500 hover:border-white/10"
                              )}
                            >
                              Sandbox (Testes)
                            </button>
                            <button 
                              onClick={() => setAsaasEnv('production')}
                              className={cn(
                                "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                asaasEnv === 'production' 
                                  ? "bg-primary/10 border-primary/50 text-primary shadow-[0_0_15px_rgba(37,99,235,0.2)]" 
                                  : "bg-slate-900/40 border-white/5 text-slate-500 hover:border-white/10"
                              )}
                            >
                              Produção (Real)
                            </button>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                              Certifique-se de que o Token corresponde ao ambiente selecionado. Tokens de Sandbox não funcionam em Produção e vice-versa.
                            </p>
                          </div>
                          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sincronização de Dados</span>
                            <button 
                              onClick={handleManualSync}
                              disabled={isSyncingClients || (!asaasToken && !asaasProxyEnabled)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                            >
                              {isSyncingClients ? <Loader2 size={12} className="animate-spin text-primary" /> : <RefreshCw size={12} className="text-primary" />}
                              <span className="text-[9px] font-black text-white uppercase tracking-widest">Sincronizar Agora</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 italic px-1">
                          O Token de API pode ser gerado no painel do Asaas em <span className="text-slate-400 font-bold">Configurações &amp; Integrações</span>.
                        </p>
                      </div>
                    )}

                    {configuringIntegration === 'NuvemFiscal NF-e' && (
                      <div className="space-y-6">
                        <div className="p-4 rounded-[32px] bg-primary/5 border border-primary/10 mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Shield size={16} className="text-primary" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Segurança de Servidor (Proxy)</span>
                            </div>
                            <button 
                              onClick={() => setNuvemfiscalProxyEnabled(!nuvemfiscalProxyEnabled)}
                              className={cn(
                                "w-10 h-5 rounded-full transition-all relative p-1 shadow-inner",
                                nuvemfiscalProxyEnabled ? "bg-primary" : "bg-slate-300 dark:bg-slate-800"
                              )}
                            >
                              <div className={cn(
                                "w-3 h-3 bg-white rounded-full shadow-sm transition-all",
                                nuvemfiscalProxyEnabled ? "translate-x-5" : "translate-x-0"
                              )} />
                            </button>
                          </div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            Ao ativar, o Token da NuvemFiscal é gerenciado pelo servidor. Recomendado para o modelo SaaS.
                          </p>
                        </div>

                        {!nuvemfiscalProxyEnabled ? (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">NuvemFiscal API Key</label>
                            <input 
                              type="password"
                              value={tempNuvemfiscalToken}
                              onChange={(e) => setTempNuvemfiscalToken(e.target.value)}
                              className="w-full px-6 py-4 bg-slate-900/40 border border-white/5 rounded-2xl outline-none text-sm font-bold text-white shadow-inner"
                            />
                          </div>
                        ) : (
                          <div className="p-6 rounded-3xl bg-slate-950/40 border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
                            <Lock size={24} className="text-primary" />
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Configuração via Servidor Ativa</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ambiente</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setNuvemfiscalEnv('sandbox')}
                              className={cn(
                                "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                nuvemfiscalEnv === 'sandbox' ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-slate-900/40 border-white/5 text-slate-500"
                              )}
                            >
                              Sandbox
                            </button>
                            <button 
                              onClick={() => setNuvemfiscalEnv('producao')}
                              className={cn(
                                "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                nuvemfiscalEnv === 'producao' ? "bg-primary/10 border-primary/50 text-primary" : "bg-slate-900/40 border-white/5 text-slate-500"
                              )}
                            >
                              Produção
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {configuringIntegration === 'Banco Inter API' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Client ID</label>
                          <input type="text" readOnly className="w-full px-6 py-4 bg-slate-900/20 border border-white/5 rounded-2xl outline-none text-white/50 text-sm font-bold" placeholder="Em desenvolvimento..." />
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                          <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-relaxed">Nota Técnica: A integração com o Banco Inter requer a instalação de certificados digitais (.key e .crt) para autenticação mútua (mTLS). Esta funcionalidade será liberada na próxima grande atualização.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-10">
                    <button 
                      onClick={() => setConfiguringIntegration(null)}
                      className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                    >
                      Cancelar
                    </button>
                    {configuringIntegration !== 'Banco Inter API' ? (
                      <button 
                        onClick={() => {
                          if (configuringIntegration === 'Asaas Gateway') {
                            handleSaveAsaasConfig(tempAsaasToken, asaasEnv, asaasProxyEnabled)
                          } else if (configuringIntegration === 'NuvemFiscal NF-e') {
                            handleSaveNuvemFiscalConfig(tempNuvemfiscalToken, nuvemfiscalEnv, nuvemfiscalProxyEnabled)
                          } else {
                            setIntegrationStates(prev => ({ ...prev, [configuringIntegration]: 'Conectado' }))
                            setConfiguringIntegration(null)
                          }
                        }}
                        className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-primary hover:scale-105 transition-all"
                      >
                        Salvar Conexão
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="flex-1 py-4 bg-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed"
                      >
                        Em Breve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'receita':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header / Intro */}
            <div className="p-6 rounded-[32px] bg-primary/5 border border-primary/10 flex items-start gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Módulo Fiscal Brasileiro</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter leading-relaxed">
                  Configure sua empresa para emissão de NF-e, NFC-e e geração de arquivos SPED. 
                  Este sistema possui integração direta com SEFAZ e via API Nuvemfiscal.
                </p>
              </div>
            </div>

            {/* Empresa Info */}
            <div className="space-y-6">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 border-l-2 border-primary ml-1">Dados da Empresa</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CNPJ</label>
                  <input 
                    type="text" 
                    value={sefazData.cnpj}
                    onChange={e => setSefazData({...sefazData, cnpj: e.target.value})}
                    placeholder="00.000.000/0001-00" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Razão Social</label>
                  <input 
                    type="text" 
                    value={sefazData.razaoSocial}
                    onChange={e => setSefazData({...sefazData, razaoSocial: e.target.value})}
                    placeholder="Nome Empresarial Completo" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Fantasia</label>
                  <input 
                    type="text" 
                    value={sefazData.nomeFantasia}
                    onChange={e => setSefazData({...sefazData, nomeFantasia: e.target.value})}
                    placeholder="Nome Comercial" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Inscrição Estadual</label>
                  <input 
                    type="text" 
                    value={sefazData.inscricaoEstadual}
                    onChange={e => setSefazData({...sefazData, inscricaoEstadual: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Inscrição Municipal</label>
                  <input 
                    type="text" 
                    value={sefazData.inscricaoMunicipal || ''}
                    onChange={e => setSefazData({...sefazData, inscricaoMunicipal: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">UF (Estado)</label>
                  <select 
                    value={sefazData.uf}
                    onChange={e => setSefazData({...sefazData, uf: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                  >
                    {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Município</label>
                  <input 
                    type="text" 
                    value={sefazData.municipio}
                    onChange={e => setSefazData({...sefazData, municipio: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 border-l-2 border-blue-500 ml-1">Contato & Identidade</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone</label>
                    <input 
                      type="text" 
                      value={sefazData.telefone || ''}
                      onChange={e => setSefazData({...sefazData, telefone: e.target.value})}
                      placeholder="(00) 0000-0000" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp</label>
                    <input 
                      type="text" 
                      value={sefazData.whatsapp || ''}
                      onChange={e => setSefazData({...sefazData, whatsapp: e.target.value})}
                      placeholder="(00) 00000-0000" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail Comercial</label>
                    <input 
                      type="email" 
                      value={sefazData.emailComercial || ''}
                      onChange={e => setSefazData({...sefazData, emailComercial: e.target.value})}
                      placeholder="contato@empresa.com" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Site</label>
                    <input 
                      type="text" 
                      value={sefazData.site || ''}
                      onChange={e => setSefazData({...sefazData, site: e.target.value})}
                      placeholder="https://suaempresa.com.br" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Logo (URL)</label>
                    <input 
                      type="text" 
                      value={sefazData.logoUrl || ''}
                      onChange={e => setSefazData({...sefazData, logoUrl: e.target.value})}
                      placeholder="https://.../logo.png" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                    <input
                      type="file"
                      id="company-logo-upload"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      onChange={(e) => void handleLogoFileChange(e.target.files?.[0] || null)}
                    />
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="company-logo-upload"
                        className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer"
                      >
                        Selecionar Logo do PC
                      </label>
                      <button
                        type="button"
                        onClick={() => setSefazData(prev => ({ ...prev, logoUrl: '' }))}
                        className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 border-l-2 border-purple-500 ml-1">Endereço da Empresa</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CEP</label>
                    <input 
                      type="text" 
                      value={sefazData.cep}
                      onChange={e => setSefazData({...sefazData, cep: e.target.value})}
                      placeholder="00000-000" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Logradouro</label>
                    <input 
                      type="text" 
                      value={sefazData.logradouro}
                      onChange={e => setSefazData({...sefazData, logradouro: e.target.value})}
                      placeholder="Rua/Av" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número</label>
                    <input 
                      type="text" 
                      value={sefazData.numero}
                      onChange={e => setSefazData({...sefazData, numero: e.target.value})}
                      placeholder="123" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Complemento</label>
                    <input 
                      type="text" 
                      value={sefazData.complemento || ''}
                      onChange={e => setSefazData({...sefazData, complemento: e.target.value})}
                      placeholder="Sala/Apto (Opcional)" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bairro</label>
                    <input 
                      type="text" 
                      value={sefazData.bairro}
                      onChange={e => setSefazData({...sefazData, bairro: e.target.value})}
                      placeholder="Bairro" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Config Emissão */}
            <div className="space-y-6">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 border-l-2 border-purple-500 ml-1">Configuração de Emissão</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo Integração</label>
                  <select 
                    value={sefazData.tipoIntegracao}
                    onChange={e => setSefazData({...sefazData, tipoIntegracao: e.target.value as any})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                  >
                    <option value="sefaz">SEFAZ Direto (Manual)</option>
                    <option value="nuvemfiscal">API Nuvemfiscal</option>
                    <option value="hibrido">Híbrido (Auto + Backup)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ambiente</label>
                  <select 
                    value={sefazData.ambiente}
                    onChange={e => setSefazData({...sefazData, ambiente: e.target.value as any})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                  >
                    <option value="homologacao">Homologação (Testes)</option>
                    <option value="producao">Produção (Real)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Série NF-e</label>
                  <input 
                    type="text" 
                    value={sefazData.serieNFe}
                    onChange={e => setSefazData({...sefazData, serieNFe: e.target.value})}
                    placeholder="001" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Próxima Nota</label>
                  <input 
                    type="number" 
                    value={sefazData.proximoNumeroNFe}
                    onChange={e => setSefazData({...sefazData, proximoNumeroNFe: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                  />
                </div>
              </div>
              
              {sefazData.tipoIntegracao !== 'sefaz' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nuvemfiscal API Key</label>
                  <input 
                    type="password" 
                    value={sefazData.nuvemfiscalApiKey}
                    onChange={e => setSefazData({...sefazData, nuvemfiscalApiKey: e.target.value})}
                    placeholder="Secret Key da Nuvemfiscal" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner" 
                  />
                </div>
              )}
            </div>

            {/* Certificado Digital */}
            <div className="space-y-6">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 border-l-2 border-green-500 ml-1">Certificado Digital (e-CNPJ)</h5>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Certificado Atual */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Certificados Instalados</p>
                  {certificados.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center text-center gap-3">
                      <Lock size={24} className="text-slate-300" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhum certificado instalado</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {certificados.map(cert => (
                        <div key={cert.id} className={cn(
                          "p-4 rounded-3xl border transition-all flex items-center justify-between group",
                          cert.ativo ? "bg-green-500/5 border-green-500/20" : "bg-slate-50 dark:bg-slate-900 border-transparent"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl", cert.ativo ? "bg-green-500/10 text-green-500" : "bg-slate-200 dark:bg-slate-800 text-slate-400")}>
                              <Shield size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white leading-none mb-1">{cert.nomeArquivo}</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Expira em: {new Date(cert.dataVencimento).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!cert.ativo && (
                              <button 
                                onClick={() => ativarCertificado(cert.id)}
                                className="p-2 text-slate-400 hover:text-green-500 transition-colors"
                                title="Ativar este certificado"
                              >
                                <Zap size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => removerCertificado(cert.id)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              title="Remover"
                            >
                              <History size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Novo Certificado */}
                <div className="p-6 rounded-[32px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Instalar Novo Certificado (.pfx / .p12)</p>
                  <div className="space-y-4">
                    <input 
                      type="file" 
                      accept=".pfx,.p12"
                      onChange={e => setCertFile(e.target.files?.[0] || null)}
                      className="w-full text-[10px] text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-white hover:file:bg-primary/80" 
                    />
                    <input 
                      type="password" 
                      placeholder="Senha do Certificado"
                      value={certPass}
                      onChange={e => setCertFilePass(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold" 
                    />
                    <button 
                      onClick={async () => {
                        if (!certFile || !certPass) return alert('Selecione o arquivo e digite a senha');
                        setIsUploadingCert(true);
                        try {
                          await carregarCertificado(certFile, certPass, sefazData.cnpj || '', sefazData.razaoSocial || '');
                          setCertFile(null);
                          setCertFilePass('');
                          alert('✅ Certificado instalado com sucesso!');
                        } catch (err) {
                          alert('❌ Erro ao instalar: ' + (err as Error).message);
                        } finally {
                          setIsUploadingCert(false);
                        }
                      }}
                      disabled={isUploadingCert || !certFile}
                      className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUploadingCert ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Instalar Certificado
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Finais */}
            <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => {
                  salvarConfiguracaoSEFAZ(sefazData as ConfiguracaoSEFAZ);
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 3000);
                }}
                className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-primary hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
              >
                <Save size={18} />
                Salvar Todas as Configurações Fiscais
              </button>
            </div>
          </div>
        );
      case 'system':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -mr-32 -mt-32"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center text-primary shadow-inner">
                        <Cpu size={32} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-2">Whatch Pro OS</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Versão Atual: <span className="text-primary">v1.5.0-enterprise</span></p>
                    </div>
                </div>
                <button 
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    className="relative z-10 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-primary hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    {isCheckingUpdate ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Verificar Atualizações
                </button>
            </div>

            <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                    <History size={18} className="text-primary" />
                    Histórico de Atualizações
                </h4>
                <div className="space-y-4">
                    <ChangelogItem 
                        version="v1.5.0-enterprise" 
                        date="Hoje" 
                        changes={[
                            "PDV (Frente de Caixa) com carrinho e baixa de estoque",
                            "Módulo de Ordens de Serviço (O.S) com peças e mão de obra",
                            "CRM (Vendas) com funil estilo Kanban",
                            "Financeiro: status clicável (Pendente / Pago / Recebido)",
                            "Categorias de produtos ampliadas para múltiplos segmentos"
                        ]}
                    />
                    <ChangelogItem 
                        version="v1.4.0-security" 
                        date="Hoje" 
                        changes={[
                            "Implementação de Multi-tenancy real (Isolamento de dados por Administrador)",
                            "Criação e Autenticação de usuários via Supabase Auth + Resend SMTP",
                            "Remoção de senhas hardcoded e link de auto-registro",
                            "Atualização visual do Dashboard com Ações Inteligentes para Admins",
                            "Melhoria na rolagem do formulário de permissões de sub-usuários"
                        ]}
                    />
                    <ChangelogItem 
                        version="PRÓXIMO PASSO" 
                        date="ROADMAP 2026" 
                        changes={["Integração com Banco Inter (API v2)", "Geração automática de boletos e recebimentos", "Conciliação bancária via mTLS"]}
                    />
                    <ChangelogItem 
                        version="v1.3.0" 
                        date="23/03/2026" 
                        changes={["Integração com Asaas.com (Boleto/Pix)", "Sincronização automática de clientes", "Login Mestre de Emergência"]}
                    />
                    <ChangelogItem 
                        version="v1.2.4" 
                        date="23/03/2026" 
                        changes={["Novo Módulo de Notas Fiscais (NF-e/Cupom)", "Exportação real para PDF", "Sistema de Boletos Integrado"]}
                    />
                    <ChangelogItem 
                        version="v1.2.0" 
                        date="15/03/2026" 
                        changes={["Interface Enterprise OS (Glassmorphism)", "Sincronização Cloud-Local", "Command Palette (Ctrl+K)"]}
                    />
                </div>
            </div>

            <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-3 text-amber-500 mb-2">
                    <Zap size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Segurança de Dados</span>
                </div>
                <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tighter italic">O Whatch Pro OS utiliza uma arquitetura de isolamento de dados. As atualizações do sistema alteram apenas a interface e funcionalidades, mantendo seus bancos de dados e informações de clientes intactos e criptografados.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Configurações do <span className="text-primary glow-text">Sistema</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Personalize sua experiência e gerencie sua conta.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaved}
          className={cn(
            "px-6 py-3 font-black rounded-2xl transition-all flex items-center gap-2 shadow-lg",
            isSaved 
              ? "bg-green-500 text-white shadow-green-500/20 cursor-default"
              : "bg-primary text-white glow-primary shadow-primary/20 hover:scale-105"
          )}
        >
          {isSaved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {isSaved ? 'Alterações Salvas' : 'Salvar Preferências'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as SettingsSection)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 text-left group",
                activeSection === section.id 
                  ? "bg-primary text-white glow-primary shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <section.icon size={20} className={cn(
                "transition-transform group-hover:scale-110",
                activeSection === section.id ? "text-white" : "group-hover:text-primary"
              )} />
              <span className="text-xs font-black uppercase tracking-widest">{section.label}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 glass rounded-[40px] border border-white/50 dark:border-slate-600/60 p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                {(() => {
                  const Icon = sections.find(s => s.id === activeSection)?.icon || User
                  return <Icon size={120} className="text-primary" />
                })()}
            </div>
            <div className="relative z-10">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-10 border-b border-white/10 pb-6 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      {(() => {
                        const Icon = sections.find(s => s.id === activeSection)?.icon || User
                        return <Icon size={20} />
                      })()}
                    </div>
                    {sections.find(s => s.id === activeSection)?.label}
                </h3>
                {renderSection()}
            </div>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ label, description }: { label: string, description: string }) {
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">{label}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{description}</p>
      </div>
      <button 
        onClick={() => setEnabled(!enabled)}
        className={cn(
          "w-12 h-6 rounded-full transition-all relative p-1 shadow-inner",
          enabled ? "bg-primary" : "bg-slate-300 dark:bg-slate-800"
        )}
      >
        <div className={cn(
          "w-4 h-4 bg-white rounded-full shadow-sm transition-all",
          enabled ? "translate-x-6" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

function ReportCard({ title, description, type, period, onGenerate }: { title: string, description: string, type: string, period: string, onGenerate: () => void | Promise<void> }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      await onGenerate()
      alert(`Relatório de ${title} gerado com sucesso (${period}).`)
    } catch (err) {
      alert('Não foi possível gerar o relatório. Verifique sua conexão e tente novamente.')
      throw err
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div 
      onClick={handleGenerate}
      className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all group cursor-pointer relative overflow-hidden"
    >
      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10"></div>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 transition-transform">
          {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            void handleGenerate()
          }}
          className="p-2 text-slate-500 hover:text-primary transition-colors"
          aria-label={`Baixar relatório: ${title}`}
        >
          <Download size={20} />
        </button>
      </div>
      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{title}</p>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{description}</p>
      
      {isGenerating && (
        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-progress shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
        </div>
      )}
    </div>
  );
}

function IntegrationItem({ label, status, onConfigure }: { label: string, status: string, onConfigure: () => void }) {
  const isFuture = status === 'Próxima Meta'
  
  return (
    <div className={cn(
      "flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5 transition-all group",
      isFuture ? "hover:border-white/10" : "hover:border-primary/20"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-2xl transition-colors shadow-inner",
          isFuture ? "bg-slate-800 text-slate-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-primary"
        )}>
          <Globe size={24} />
        </div>
        <span className={cn(
          "text-sm font-black uppercase tracking-widest",
          isFuture ? "text-slate-500" : "text-slate-900 dark:text-white"
        )}>{label}</span>
      </div>
      <div className="flex items-center gap-6">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg",
          status === 'Conectado' ? "bg-green-500/10 text-green-500" : 
          status === 'Pendente' ? "bg-amber-500/10 text-amber-500" : 
          status === 'Próxima Meta' ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500"
        )}>{status}</span>
        <button 
          onClick={onConfigure}
          className={cn(
            "text-[10px] font-black uppercase tracking-widest hover:underline",
            isFuture ? "text-slate-500" : "text-primary"
          )}
        >
          {isFuture ? 'Detalhes' : 'Configurar'}
        </button>
      </div>
    </div>
  );
}

function ChangelogItem({ version, date, changes }: { version: string, date: string, changes: string[] }) {
  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg shadow-lg shadow-primary/20">{version}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{date}</span>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full glow-primary animate-pulse"></div>
      </div>
      <ul className="space-y-2">
        {changes.map((change, i) => (
          <li key={i} className="flex items-center gap-3 text-xs font-medium text-slate-400">
            <div className="w-1 h-1 bg-primary rounded-full"></div>
            {change}
          </li>
        ))}
      </ul>
    </div>
  );
}
