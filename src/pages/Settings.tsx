import { useState } from 'react'
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
  Zap
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '../hooks/useAuth'
import { useAppearance } from '../hooks/useAppearance'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type SettingsSection = 'profile' | 'notifications' | 'security' | 'appearance' | 'reports' | 'integrations' | 'system'

export default function Settings() {
  const { user } = useAuth()
  const { theme, setTheme, accentColor, setAccentColor } = useAppearance()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [isSaved, setIsSaved] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [configuringIntegration, setConfiguringIntegration] = useState<string | null>(null)
  const [asaasToken, setAsaasToken] = useState(() => localStorage.getItem('whatch_pro_asaas_token') || '')
  
  // Mock integration states
  const [integrationStates, setIntegrationStates] = useState({
    'WhatsApp Business API': 'Conectado',
    'Supabase Cloud Database': 'Conectado',
    'Gateway de Boletos': asaasToken ? 'Conectado' : 'Pendente',
    'Banco Inter API': 'Próxima Meta',
    'Google Calendar': 'Desconectado'
  })

  const handleSaveAsaasToken = (token: string) => {
    setAsaasToken(token)
    localStorage.setItem('whatch_pro_asaas_token', token)
    setIntegrationStates(prev => ({ ...prev, 'Gateway de Boletos': token ? 'Conectado' : 'Pendente' }))
    setConfiguringIntegration(null)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const handleSave = () => {
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true)
    setTimeout(() => {
      setIsCheckingUpdate(false)
      alert('Seu sistema Whatch Pro OS está na versão mais recente (v1.2.4-stable).')
    }, 2000)
  }

  const sections = [
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'integrations', label: 'Integrações', icon: Globe },
    { id: 'system', label: 'Sistema & Updates', icon: Cpu },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-8 p-6 glass rounded-3xl border border-white/10">
              <div className="relative group">
                <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt={user?.name} className="w-24 h-24 rounded-3xl shadow-2xl border-2 border-primary/20 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-primary/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Smartphone size={24} className="text-white" />
                </div>
              </div>
              <div>
                <button className="bg-primary text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all glow-primary shadow-lg shadow-primary/20">
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
                    className="px-8 py-4 glass rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 hover:bg-primary/5 transition-all text-slate-500 hover:text-primary active:scale-95"
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReportCard title="Fluxo de Caixa" description="Análise completa de receitas e despesas." type="finance" />
              <ReportCard title="Desempenho de Projetos" description="Status detalhado de horas e custos." type="projects" />
              <ReportCard title="Inventário de Estoque" description="Relatório de ativos e reposição." type="inventory" />
              <ReportCard title="Atividades de Usuários" description="Log de acessos e modificações." type="users" />
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
                    <button className="w-full md:w-auto px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-primary hover:scale-105 transition-all">
                        Gerar PDF Consolidado
                    </button>
                </div>
            </div>
          </div>
        );
      case 'integrations':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {Object.entries(integrationStates).map(([label, status]) => (
              <IntegrationItem 
                key={label} 
                label={label} 
                status={status} 
                onConfigure={() => setConfiguringIntegration(label)}
              />
            ))}

            {/* Integration Config Modal */}
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

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        {configuringIntegration === 'Gateway de Boletos' ? 'Asaas API Token' : 'Chave da API / Token'}
                      </label>
                      <input 
                        type="password" 
                        defaultValue={configuringIntegration === 'Gateway de Boletos' ? asaasToken : "••••••••••••••••"}
                        id="integration-token"
                        className="w-full px-6 py-4 bg-slate-900/40 border border-white/5 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-bold text-white shadow-inner"
                      />
                    </div>
                    {configuringIntegration === 'WhatsApp Business API' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número de Telefone</label>
                        <input 
                          type="text" 
                          placeholder="+55 (00) 00000-0000"
                          className="w-full px-6 py-4 bg-slate-900/40 border border-white/5 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-bold text-white shadow-inner"
                        />
                      </div>
                    )}
                    {configuringIntegration === 'Gateway de Boletos' && (
                      <p className="text-[10px] text-slate-500 italic">O Token de API pode ser gerado no painel do Asaas em Configurações > Integrações.</p>
                    )}
                    {configuringIntegration === 'Banco Inter API' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Client ID</label>
                          <input type="text" className="w-full px-6 py-4 bg-slate-900/40 border border-white/5 rounded-2xl outline-none text-white text-sm font-bold" placeholder="ID da sua aplicação no Inter" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Client Secret</label>
                          <input type="password" className="w-full px-6 py-4 bg-slate-900/40 border border-white/5 rounded-2xl outline-none text-white text-sm font-bold" placeholder="••••••••" />
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
                    <button 
                      onClick={() => {
                        const token = (document.getElementById('integration-token') as HTMLInputElement)?.value
                        if (configuringIntegration === 'Gateway de Boletos') {
                          handleSaveAsaasToken(token)
                        } else {
                          setIntegrationStates(prev => ({ ...prev, [configuringIntegration]: 'Conectado' }))
                          setConfiguringIntegration(null)
                        }
                      }}
                      className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-primary hover:scale-105 transition-all"
                    >
                      Salvar Conexão
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Versão Atual: <span className="text-primary">v1.3.0-stable</span></p>
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

        <div className="lg:col-span-3 glass rounded-[40px] border border-white/40 dark:border-slate-800/50 p-10 shadow-2xl relative overflow-hidden">
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

function ReportCard({ title, description, type }: { title: string, description: string, type: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulation of report generation
    setTimeout(() => {
      setIsGenerating(false);
      alert(`Relatório de ${title} gerado com sucesso para o período selecionado!`);
    }, 2000);
  };

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
        <button className="p-2 text-slate-500 hover:text-primary transition-colors">
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
  return (
    <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl group-hover:text-primary transition-colors shadow-inner">
          <Globe size={24} />
        </div>
        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-6">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg",
          status === 'Conectado' ? "bg-green-500/10 text-green-500" : 
          status === 'Pendente' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
        )}>{status}</span>
        <button 
          onClick={onConfigure}
          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
        >
          Configurar
        </button>
      </div>
    </div>
  );
}

function ChangelogItem({ version, date, changes }: { version: string, date: string, changes: string[] }) {
  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/10 transition-all group">
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
