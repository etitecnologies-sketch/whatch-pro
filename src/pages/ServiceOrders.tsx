import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, X, Wrench, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import type { ServiceOrder } from '../types'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function ServiceOrders() {
  const { serviceOrders, clients, products, addServiceOrder, updateServiceOrder, deleteServiceOrder } = useData()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null)

  const [formData, setFormData] = useState({
    clientId: '',
    equipment: '',
    problem: '',
    diagnosis: '',
    status: 'pending' as ServiceOrder['status'],
    laborCost: 0,
    items: [] as Array<{ productId: string, name: string, quantity: number, price: number, total: number }>
  })

  // Mock product selection for this example
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)

  const filteredOS = serviceOrders.filter(os => 
    os.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clients.find(c => c.id === os.clientId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openModal = (os: ServiceOrder | null = null) => {
    if (os) {
      setEditingOS(os)
      setFormData({
        clientId: os.clientId,
        equipment: os.equipment,
        problem: os.problem,
        diagnosis: os.diagnosis || '',
        status: os.status,
        laborCost: os.laborCost,
        items: [...os.items]
      })
    } else {
      setEditingOS(null)
      setFormData({
        clientId: '',
        equipment: '',
        problem: '',
        diagnosis: '',
        status: 'pending',
        laborCost: 0,
        items: []
      })
    }
    setIsModalOpen(true)
  }

  const handleAddItem = () => {
    const product = products.find(p => p.id === selectedProductId)
    if (!product || selectedQuantity <= 0) return

    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: product.id,
          name: product.name,
          quantity: selectedQuantity,
          price: product.price,
          total: product.price * selectedQuantity
        }
      ]
    }))
    setSelectedProductId('')
    setSelectedQuantity(1)
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSave = () => {
    if (!user) return

    const totalItems = formData.items.reduce((acc, item) => acc + item.total, 0)
    const totalAmount = totalItems + formData.laborCost

    if (editingOS) {
      updateServiceOrder(editingOS.id, {
        ...formData,
        totalAmount
      })
    } else {
      addServiceOrder({
        userId: user.id,
        adminId: user.adminId || user.id,
        number: `OS-${Math.floor(1000 + Math.random() * 9000)}`,
        ...formData,
        totalAmount
      })
    }
    setIsModalOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta O.S?')) {
      deleteServiceOrder(id)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-amber-500/20 text-amber-500'
      case 'diagnosing': return 'bg-blue-500/20 text-blue-500'
      case 'waiting-approval': return 'bg-purple-500/20 text-purple-500'
      case 'approved': return 'bg-indigo-500/20 text-indigo-500'
      case 'in-progress': return 'bg-primary/20 text-primary'
      case 'completed': return 'bg-green-500/20 text-green-500'
      case 'cancelled': return 'bg-red-500/20 text-red-500'
      default: return 'bg-slate-500/20 text-slate-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending': return 'Pendente'
      case 'diagnosing': return 'Em Análise'
      case 'waiting-approval': return 'Aguardando Aprovação'
      case 'approved': return 'Aprovado'
      case 'in-progress': return 'Em Execução'
      case 'completed': return 'Finalizado'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Ordens de <span className="text-primary glow-text">Serviço</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gerencie manutenções, consertos e serviços prestados.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Nova O.S
        </button>
      </div>

      <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
        <div className="p-8 border-b border-white/20 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tightest">Lista de O.S</h3>
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
            <input
              type="text"
              placeholder="Buscar por número, equipamento ou cliente..."
              className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/60 border border-white/50 dark:border-slate-600/60 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium placeholder:text-slate-600 dark:placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Número</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Equipamento</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Valor Total</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
              {filteredOS.map((os) => (
                <tr key={os.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-sm font-black font-mono text-primary">{os.number}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {clients.find(c => c.id === os.clientId)?.name || 'Cliente Removido'}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{os.equipment}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", getStatusColor(os.status))}>
                      {getStatusLabel(os.status)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.totalAmount)}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openModal(os)}
                        className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(os.id)}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOS.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-500 font-medium">
                    Nenhuma ordem de serviço encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova/Editar OS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest flex items-center gap-3">
                <Wrench className="text-primary" />
                {editingOS ? 'Editar' : 'Nova'} <span className="text-primary">Ordem de Serviço</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente</label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  >
                    <option value="pending">Pendente</option>
                    <option value="diagnosing">Em Análise</option>
                    <option value="waiting-approval">Aguardando Aprovação</option>
                    <option value="approved">Aprovado</option>
                    <option value="in-progress">Em Execução</option>
                    <option value="completed">Finalizado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Equipamento / Objeto</label>
                <input
                  required
                  type="text"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  placeholder="Ex: Notebook Dell Inspiron 15"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Problema Relatado</label>
                <textarea
                  required
                  rows={2}
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  placeholder="Descreva o problema que o cliente relatou..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Diagnóstico / Laudo Técnico</label>
                <textarea
                  rows={2}
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Laudo do técnico após análise..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner resize-none"
                />
              </div>

              {/* Peças e Mão de Obra */}
              <div className="p-6 bg-slate-900/40 rounded-3xl border border-white/5 space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-widest">Orçamento / Peças</h4>
                
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Produto do Estoque</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    >
                      <option value="">Selecione uma peça...</option>
                      {products.filter(p => p.quantity > 0).map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner text-center"
                    />
                  </div>
                  <button 
                    onClick={handleAddItem}
                    disabled={!selectedProductId}
                    className="h-[44px] px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>

                {formData.items.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
                        <div>
                          <p className="text-xs font-bold text-white">{item.name}</p>
                          <p className="text-[10px] text-slate-400">{item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-green-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                          </span>
                          <button onClick={() => handleRemoveItem(index)} className="text-slate-500 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-white/10 mt-4">
                  <div className="w-1/2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor da Mão de Obra (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.laborCost}
                      onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="p-8 bg-white/5 border-t border-white/10 flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Total</span>
                <span className="text-2xl font-black text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    formData.items.reduce((acc, item) => acc + item.total, 0) + formData.laborCost
                  )}
                </span>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-slate-800 text-slate-300 font-black rounded-2xl hover:bg-slate-700 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.clientId || !formData.equipment || !formData.problem}
                  className="px-8 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all text-sm shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  {editingOS ? 'Salvar O.S' : 'Criar O.S'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}