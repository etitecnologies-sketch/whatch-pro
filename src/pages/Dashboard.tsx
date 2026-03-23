import { Building2, Users, Briefcase, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, Sparkles, Plus, FileText, LayoutPanelTop, Activity } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Dashboard() {
  const { clients, employees, projects, transactions } = useData()

  const totalRevenue = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Intelligence <span className="text-primary glow-text">Dashboard</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Análise de dados em tempo real e insights estratégicos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold flex items-center gap-2">
            <Activity size={16} />
            Live Sync
          </div>
        </div>
      </div>

      {/* AI Insights Banner */}
      <div className="relative overflow-hidden p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl group">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
          <Sparkles size={120} className="text-primary" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Zap size={18} className="text-primary" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">AI Business Insights</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Otimização de Faturamento Detectada</h2>
            <p className="text-slate-400 font-medium">Seu fluxo de caixa cresceu 12% nos últimos 7 dias. Recomendamos focar no projeto "Reestruturação de Vendas" para maximizar o ROI do próximo trimestre.</p>
          </div>
          <button className="shrink-0 px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2">
            Ver Detalhes <ArrowUpRight size={18} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Building2} label="Total de Clientes" value={clients.length.toString()} change="+12%" trend="up" />
        <StatCard icon={Users} label="Colaboradores" value={employees.length.toString()} change="+2 novos" trend="up" />
        <StatCard icon={Briefcase} label="Projetos Ativos" value={projects.filter(p => p.status !== 'completed').length.toString()} change="-3" trend="down" />
        <StatCard icon={DollarSign} label="Faturamento" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)} change="+8.4%" trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart Simulation */}
        <div className="lg:col-span-2 glass rounded-3xl p-8 shadow-xl border border-white/40 dark:border-slate-800/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Performance de Receita</h3>
            <select className="bg-white/40 dark:bg-slate-900/40 border-0 rounded-xl px-4 py-2 text-xs font-bold outline-none ring-1 ring-slate-200 dark:ring-slate-700">
              <option>Últimos 30 dias</option>
              <option>Últimos 12 meses</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 pt-4">
            {[45, 60, 40, 80, 55, 90, 75].map((height, i) => (
              <div key={i} className="flex-1 group relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  R$ {height * 120},00
                </div>
                <div 
                  className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t-xl transition-all duration-700 relative overflow-hidden" 
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute inset-0 shimmer opacity-20"></div>
                </div>
                <div className="mt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][i]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="glass rounded-3xl p-8 shadow-xl border border-white/40 dark:border-slate-800/50">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Ações Inteligentes</h3>
            <div className="grid grid-cols-1 gap-4">
              <QuickActionItem icon={Plus} label="Cadastrar Cliente" desc="Novo registro no banco" color="blue" />
              <QuickActionItem icon={FileText} label="Gerar Relatório" desc="PDF Mensal de vendas" color="purple" />
              <QuickActionItem icon={LayoutPanelTop} label="Novo Projeto" desc="Workspace colaborativo" color="orange" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-3xl p-8 border border-primary/20 shadow-xl">
            <h4 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-4">Meta Mensal</h4>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-black">75%</span>
              <span className="text-xs font-bold text-slate-500">R$ 45.000 / R$ 60.000</span>
            </div>
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary glow-primary w-3/4 rounded-full shimmer"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass rounded-3xl shadow-xl border border-white/40 dark:border-slate-800/50 overflow-hidden">
        <div className="p-8 border-b border-white/20 dark:border-slate-800/50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Fluxo de Atividades</h3>
          <button className="text-xs font-bold text-primary hover:underline">Ver tudo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Evento</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Responsável</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
              {clients.slice(0, 5).map((client, i) => (
                <tr key={client.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Building2 size={16} />
                      </div>
                      <span className="text-sm font-bold">Novo Cliente: {client.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-sm font-medium text-slate-500">Admin</td>
                  <td className="px-8 py-4">
                    <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">Sucesso</span>
                  </td>
                  <td className="px-8 py-4 text-sm font-mono text-slate-400">{new Date().toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, change, trend }: StatCardProps) {
  return (
    <div className="glass p-8 rounded-3xl shadow-xl border border-white/40 dark:border-slate-800/50 card-hover group">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 transition-transform duration-500">
          <Icon size={28} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg",
          trend === 'up' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </div>
      </div>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tightest group-hover:glow-text transition-all duration-500">{value}</h3>
    </div>
  )
}

function QuickActionItem({ icon: Icon, label, desc, color }: { icon: any, label: string, desc: string, color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  }

  return (
    <button className="flex items-center gap-4 p-4 rounded-2xl border border-white/40 dark:border-slate-800/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left">
      <div className={cn("p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform", colors[color])}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{label}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{desc}</p>
      </div>
    </button>
  )
}

interface StatCardProps {
  icon: any
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
}
