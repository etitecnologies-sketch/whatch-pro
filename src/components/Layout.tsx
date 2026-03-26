import { useState, ReactNode, useEffect, useRef } from 'react'
import { 
  LayoutDashboard, 
  Building2, 
  Users as UsersIcon, 
  Briefcase, 
  DollarSign, 
  Settings as SettingsIcon, 
  Menu, 
  X, 
  Bell, 
  Search, 
  Package, 
  LogOut, 
  ShieldCheck,
  RefreshCw,
  Cloud,
  CloudOff,
  Clock as ClockIcon,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText as FileTextIcon,
  ShoppingCart,
  Wrench,
  Target
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '../hooks/useAuth'
import { useData } from '../hooks/useData'
import CommandPalette from './CommandPalette'
import Logo from './Logo'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface LayoutProps {
  children: ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [showSyncToast, setShowSyncToast] = useState(false)
  const { user, logout, canAccess } = useAuth()
  const { isSyncing, lastSync, syncFromCloud, products, transactions } = useData()
  const [currentTime, setCurrentTime] = useState(new Date())
  const notificationRef = useRef<HTMLDivElement>(null)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const isOnline = !!supabaseUrl && !supabaseUrl.includes('SUA_URL');

  // Listen for sync completion to show toast
  useEffect(() => {
    if (isSyncing) {
        setShowSyncToast(true)
    } else {
        const timer = setTimeout(() => setShowSyncToast(false), 3000)
        return () => clearTimeout(timer)
    }
  }, [isSyncing])

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const sidebarItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'pdv', icon: ShoppingCart, label: 'PDV (Caixa)' },
    { id: 'crm', icon: Target, label: 'CRM (Vendas)' },
    { id: 'clients', icon: Building2, label: 'Clientes' },
    { id: 'employees', icon: UsersIcon, label: 'Funcionários' },
    { id: 'inventory', icon: Package, label: 'Estoque' },
    { id: 'service-orders', icon: Wrench, label: 'Ordens de Serviço' },
    { id: 'projects', icon: Briefcase, label: 'Projetos' },
    { id: 'quotations', icon: FileTextIcon, label: 'Orçamentos' },
    { id: 'finance', icon: DollarSign, label: 'Financeiro' },
    { id: 'documents', icon: FileTextIcon, label: 'Documentos' },
  ].filter(item => {
    if (item.id === 'dashboard') return true;
    return canAccess(item.id);
  })

  if (user?.role === 'admin' || user?.email === 'mestre@whatchpro.com') {
    sidebarItems.push({ id: 'users', icon: ShieldCheck, label: 'Usuários' })
  }

  sidebarItems.push({ id: 'settings', icon: SettingsIcon, label: 'Configurações' })

  // Derived Notifications
  const stockAlerts = products.filter(p => p.quantity <= (p.minQuantity || 0))
  const pendingTransactions = transactions.filter(t => t.status === 'pending')
  const totalNotifications = stockAlerts.length + pendingTransactions.length

  const handleSync = async () => {
    await syncFromCloud()
  }

  return (
    <div className="min-h-screen bg-[#020617] dark:bg-[#020205] flex transition-colors duration-500 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-white transition-all duration-500 flex flex-col fixed h-screen z-20 md:static border-r border-slate-800 shadow-2xl shadow-blue-900/20",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/5 shrink-0 bg-slate-950/20">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              <Logo size={40} className="relative z-10" />
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tightest leading-none text-white glow-text">WHATCH PRO</span>
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em] leading-none mt-1">Enterprise OS</span>
              </div>
            </div>
          ) : (
            <Logo size={32} className="mx-auto" />
          )}
        </div>

        <nav className="flex-1 py-8 overflow-y-auto px-4 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center px-4 py-3.5 gap-4 transition-all duration-500 rounded-2xl group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-xl shadow-primary/20" 
                  : "text-slate-300 hover:text-slate-100 hover:bg-white/5"
              )}
            >
              {activeTab === item.id && (
                <div className="absolute inset-0 shimmer opacity-20"></div>
              )}
              <item.icon size={22} className={cn(
                "transition-all duration-500 shrink-0",
                activeTab === item.id ? "scale-110 text-white" : "group-hover:scale-110 group-hover:text-primary"
              )} />
              {isSidebarOpen && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="font-black text-xs uppercase tracking-widest truncate">{item.label}</span>
                  {activeTab === item.id && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 shrink-0 bg-slate-950/40 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative shrink-0 group">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center font-black uppercase text-slate-300 border border-white/10 group-hover:border-primary/50 transition-colors">
                  {user?.name.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-slate-950 shadow-lg glow-primary"></div>
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-sm font-black truncate text-slate-100 tracking-tight">{user?.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-primary font-black uppercase tracking-widest truncate">{user?.role}</span>
                    <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">ID: {user?.id.slice(-4)}</span>
                  </div>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button 
                onClick={logout}
                className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all border border-transparent hover:border-red-400/20"
                title="Encerrar Sessão"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] -right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-float"></div>

        {/* Header */}
        <header className="h-20 glass border-b border-white/20 dark:border-slate-800/50 flex items-center justify-between px-8 shrink-0 z-10 mx-6 mt-6 rounded-3xl shadow-2xl transition-all duration-500 hover:border-primary/30">
          <div className="flex items-center gap-8 flex-1">
            <div className="hidden xl:flex items-center gap-4 text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/60 px-5 py-2.5 rounded-2xl border border-white/50 dark:border-slate-600/60 shadow-inner backdrop-blur-md">
              <div className="flex flex-col items-center justify-center border-r border-slate-300 dark:border-slate-700 pr-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none mb-1">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 animate-pulse glow-primary" : "bg-amber-500")} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{isOnline ? 'Active' : 'Offline'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-1">
                <ClockIcon size={18} className="text-primary animate-pulse-slow" />
                <div className="flex flex-col">
                  <span className="text-sm font-black font-mono tracking-widest leading-none">
                    {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    <span className="text-[10px] opacity-50 ml-1">
                      {currentTime.toLocaleTimeString('pt-BR', { second: '2-digit' })}
                    </span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                    {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative max-w-xl w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" size={20} />
              <input
                readOnly
                onClick={() => setIsCommandPaletteOpen(true)}
                type="text"
                placeholder="Busca global inteligente (Ctrl+K)..."
                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/60 border border-white/50 dark:border-slate-600/60 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium placeholder:text-slate-600 dark:placeholder:text-slate-400 shadow-inner cursor-pointer"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 opacity-40 group-focus-within:opacity-100 transition-opacity">
                <kbd className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-white/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm">⌘</kbd>
                <kbd className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-white/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm">K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 ml-4 relative">
            {/* Sync Status Toast */}
            {showSyncToast && (
              <div className="absolute top-16 right-0 bg-primary/20 backdrop-blur-xl border border-primary/30 px-4 py-2 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 z-50 whitespace-nowrap">
                {isSyncing ? (
                    <RefreshCw size={14} className="text-primary animate-spin" />
                ) : (
                    <CheckCircle2 size={14} className="text-green-500" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                    {isSyncing ? 'Sincronizando Nuvem...' : 'Dados Sincronizados'}
                </span>
              </div>
            )}

            <button 
              onClick={handleSync}
              className={cn(
                "p-3 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all duration-300 border border-transparent hover:border-primary/20",
                isSyncing && "animate-spin text-primary"
              )}
              title="Sincronizar dados"
            >
              <RefreshCw size={20} />
            </button>
            
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                    "p-3 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all duration-300 border border-transparent hover:border-primary/20 relative group",
                    isNotificationsOpen && "text-primary bg-primary/10 border-primary/20"
                )}
              >
                <Bell size={20} />
                {totalNotifications > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 text-[8px] font-black text-white flex items-center justify-center rounded-full border-2 border-slate-900 glow-primary group-hover:scale-125 transition-transform animate-in zoom-in">
                    {totalNotifications}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {isNotificationsOpen && (
                <div className="absolute top-16 right-0 w-80 glass border border-white/20 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-white/20 flex items-center justify-between bg-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notificações</span>
                        {totalNotifications > 0 && <span className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">{totalNotifications} Alertas</span>}
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2 space-y-2">
                        {totalNotifications === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
                                <Info size={32} className="opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma notificação</p>
                            </div>
                        ) : (
                            <>
                                {stockAlerts.map(product => (
                                    <div key={product.id} className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4 hover:bg-amber-500/20 transition-colors cursor-pointer">
                                        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{product.name}</p>
                                            <p className="text-[10px] font-medium text-amber-500/80">Estoque Crítico: {product.quantity} unidades restantes.</p>
                                        </div>
                                    </div>
                                ))}
                                {pendingTransactions.map(transaction => (
                                    <div key={transaction.id} className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-4 hover:bg-primary/20 transition-colors cursor-pointer">
                                        <div className="p-2 bg-primary/20 rounded-xl text-primary">
                                            <DollarSign size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{transaction.description}</p>
                                            <p className="text-[10px] font-medium text-primary/80">Aguardando Recebimento: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                    {totalNotifications > 0 && (
                        <button 
                            onClick={() => setIsNotificationsOpen(false)}
                            className="w-full p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all text-center border-t border-white/10"
                        >
                            Fechar Painel
                        </button>
                    )}
                </div>
              )}
            </div>

            <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800/50 mx-1"></div>

            <div className="flex items-center gap-3 pl-1">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-xs font-black tracking-tight leading-none mb-0.5">{user?.name.split(' ')[0]}</span>
                <span className="text-[9px] font-bold text-primary uppercase tracking-[0.1em]">{user?.role}</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-[2px] shadow-lg shadow-primary/20 group cursor-pointer">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white font-black text-sm transition-transform group-hover:scale-95">
                  {user?.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>

        <CommandPalette 
          isOpen={isCommandPaletteOpen} 
          setIsOpen={setIsCommandPaletteOpen} 
          onSelect={setActiveTab} 
        />
      </main>
    </div>
  )
}
