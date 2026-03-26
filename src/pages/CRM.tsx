import { useEffect, useState } from 'react'
import { Plus, GripHorizontal, Phone, Mail, Calendar, MessageSquare, Building2, User, X } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'

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
  const { user } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([
    { id: '1', title: 'Infraestrutura Rede', clientId: clients[0]?.id || '', value: 15000, status: 'proposal', lastContact: 'Hoje', nextFollowUp: 'Amanhã' },
    { id: '2', title: 'Licenças Microsoft', clientId: clients[1]?.id || '', value: 4500, status: 'lead', lastContact: 'Ontem', nextFollowUp: 'Sexta-feira' },
    { id: '3', title: 'Consultoria Segurança', clientId: clients[0]?.id || '', value: 8000, status: 'negotiation', lastContact: 'Há 2 dias', nextFollowUp: 'Hoje' }
  ])
  const tenantId = user?.adminId || user?.id || 'local'
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [dealTitle, setDealTitle] = useState('')
  const [dealClientId, setDealClientId] = useState('')
  const [dealValue, setDealValue] = useState<number | ''>('')
  const [dealNextFollowUp, setDealNextFollowUp] = useState('')
  const [dealStatus, setDealStatus] = useState<DealStatus>('lead')
  const [editingDealId, setEditingDealId] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(`crm_deals_${tenantId}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setDeals(parsed)
      } catch {}
    }
  }, [tenantId])

  useEffect(() => {
    localStorage.setItem(`crm_deals_${tenantId}`, JSON.stringify(deals))
  }, [deals, tenantId])

  useEffect(() => {
    if (!dealClientId && clients.length > 0) setDealClientId(clients[0].id)
  }, [clients, dealClientId])

  const openDealModal = () => {
    setDealTitle('')
    setDealValue('')
    setDealNextFollowUp('')
    setDealStatus('lead')
    setEditingDealId(null)
    if (clients.length > 0) setDealClientId(clients[0].id)
    setIsDealModalOpen(true)
  }

  const handleCreateDeal = () => {
    if (!dealTitle.trim()) {
      alert('Informe o título da negociação.')
      return
    }
    if (!dealClientId) {
      alert('Selecione um cliente.')
      return
    }
    const value = typeof dealValue === 'number' ? dealValue : Number(dealValue)
    if (!Number.isFinite(value) || value <= 0) {
      alert('Informe um valor válido.')
      return
    }
    const normalized: Deal = {
      id: editingDealId || `deal_${Date.now()}`,
      title: dealTitle.trim(),
      clientId: dealClientId,
      value,
      status: dealStatus,
      lastContact: 'Agora',
      nextFollowUp: dealNextFollowUp.trim() || 'A definir'
    }
    if (editingDealId) {
      setDeals(prev => prev.map(d => d.id === editingDealId ? { ...d, ...normalized } : d))
    } else {
      setDeals(prev => [normalized, ...prev])
    }
    setIsDealModalOpen(false)
  }

  const openDealModalForDeal = (deal: Deal) => {
    setEditingDealId(deal.id)
    setDealTitle(deal.title)
    setDealClientId(deal.clientId)
    setDealValue(deal.value)
    setDealNextFollowUp(deal.nextFollowUp)
    setDealStatus(deal.status)
    setIsDealModalOpen(true)
  }

  const columns: { id: DealStatus; label: string; color: string }[] = [
    { id: 'lead', label: 'Leads / Novos', color: 'border-slate-500' },
    { id: 'contacted', label: 'Em Contato', color: 'border-blue-500' },
    { id: 'proposal', label: 'Proposta Enviada', color: 'border-purple-500' },
    { id: 'negotiation', label: 'Negociação', color: 'border-amber-500' },
    { id: 'won', label: 'Ganhos', color: 'border-green-500' },
    { id: 'lost', label: 'Perdidos', color: 'border-red-500' }
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
        <button onClick={openDealModal} className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
          <Plus size={20} />
          Nova Negociação
        </button>
      </div>

      {isDealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsDealModalOpen(false)} />
          <div className="relative w-full max-w-xl glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest">
                {editingDealId ? 'Editar' : 'Nova'} <span className="text-primary">Negociação</span>
              </h2>
              <button onClick={() => setIsDealModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título</label>
                <input
                  value={dealTitle}
                  onChange={e => setDealTitle(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  placeholder="Ex.: Contrato de manutenção"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente</label>
                  <select
                    value={dealClientId}
                    onChange={e => setDealClientId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor</label>
                  <input
                    type="number"
                    value={dealValue}
                    onChange={e => setDealValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                <select
                  value={dealStatus}
                  onChange={e => setDealStatus(e.target.value as DealStatus)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                >
                  <option value="lead">Lead</option>
                  <option value="contacted">Em contato</option>
                  <option value="proposal">Proposta enviada</option>
                  <option value="negotiation">Negociação</option>
                  <option value="won">Ganho</option>
                  <option value="lost">Perdido</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Próximo Follow-up</label>
                <input
                  value={dealNextFollowUp}
                  onChange={e => setDealNextFollowUp(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  placeholder="Ex.: Sexta-feira"
                />
              </div>
            </div>

            <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
              <button
                onClick={() => setIsDealModalOpen(false)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateDeal}
                className="flex-1 px-6 py-4 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all text-sm shadow-lg shadow-primary/20 uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                {editingDealId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div onClick={() => openDealModalForDeal(deal)} key={deal.id} className="glass p-5 rounded-2xl border border-white/10 hover:border-primary/50 transition-all group cursor-pointer relative">
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
