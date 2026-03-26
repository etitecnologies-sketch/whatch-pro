import { useState } from 'react'
import { Plus, GripHorizontal, Phone, Mail, Calendar, MessageSquare, Building2, User } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type DealStatus = 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'

interface Deal {
  id: string
  title: string
  clientId: string
  value: number
  status: DealStatus
  lastContact: string
  nextFollowUp: string
}

export default function CRM() {
  const { clients } = useData()
  const [deals, setDeals] = useState<Deal[]>([
    { id: '1', title: 'Infraestrutura Rede', clientId: clients[0]?.id || '', value: 15000, status: 'proposal', lastContact: 'Hoje', nextFollowUp: 'Amanhã' },
    { id: '2', title: 'Licenças Microsoft', clientId: clients[1]?.id || '', value: 4500, status: 'lead', lastContact: 'Ontem', nextFollowUp: 'Sexta-feira' },
    { id: '3', title: 'Consultoria Segurança', clientId: clients[0]?.id || '', value: 8000, status: 'negotiation', lastContact: 'Há 2 dias', nextFollowUp: 'Hoje' }
  ])

  const columns: { id: DealStatus; label: string; color: string }[] = [
    { id: 'lead', label: 'Leads / Novos', color: 'border-slate-500' },
    { id: 'contacted', label: 'Em Contato', color: 'border-blue-500' },
    { id: 'proposal', label: 'Proposta Enviada', color: 'border-purple-500' },
    { id: 'negotiation', label: 'Negociação', color: 'border-amber-500' },
    { id: 'won', label: 'Ganhos', color: 'border-green-500' }
  ]

  const moveDeal = (dealId: string, newStatus: DealStatus) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: newStatus } : d))
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-10 pb-12 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            CRM <span className="text-primary glow-text">Vendas</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Funil de vendas e relacionamento com clientes.</p>
        </div>
        <button className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
          <Plus size={20} />
          Nova Negociação
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {columns.map(col => {
          const colDeals = deals.filter(d => d.status === col.id)
          const colTotal = colDeals.reduce((acc, d) => acc + d.value, 0)

          return (
            <div key={col.id} className="min-w-[320px] w-[320px] flex flex-col bg-slate-900/20 rounded-[32px] border border-white/5 p-4">
              <div className={cn("border-t-4 pt-4 mb-4", col.color)}>
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-black text-white uppercase tracking-widest text-sm">{col.label}</h3>
                  <span className="text-xs font-bold text-slate-500">{colDeals.length}</span>
                </div>
                <p className="px-2 mt-1 text-xs font-bold text-slate-400">{formatCurrency(colTotal)}</p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {colDeals.map(deal => (
                  <div key={deal.id} className="glass p-5 rounded-2xl border border-white/10 hover:border-primary/50 transition-all group cursor-pointer relative">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripHorizontal size={16} className="text-slate-500" />
                    </div>
                    
                    <h4 className="font-bold text-white mb-1 pr-6">{deal.title}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">
                      {formatCurrency(deal.value)}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                      <Building2 size={12} />
                      <span className="truncate">{clients.find(c => c.id === deal.clientId)?.name || 'Cliente'}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <Calendar size={12} />
                        Follow-up: <span className="text-white">{deal.nextFollowUp}</span>
                      </div>
                    </div>

                    {/* Simulation of Drag and Drop Actions */}
                    <div className="mt-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2 bg-slate-900/90 p-1 rounded-lg border border-white/10">
                       <button onClick={(e) => { e.stopPropagation(); moveDeal(deal.id, 'won') }} className="p-1.5 hover:bg-green-500/20 text-green-500 rounded-md transition-colors" title="Marcar como Ganho"><Plus size={14} /></button>
                       <button onClick={(e) => { e.stopPropagation(); moveDeal(deal.id, 'lost') }} className="p-1.5 hover:bg-red-500/20 text-red-500 rounded-md transition-colors" title="Marcar como Perdido"><X size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}