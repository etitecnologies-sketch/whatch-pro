import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Wrench, CheckCircle2, Clock, AlertTriangle, AlertCircle, FileText, ChevronDown, Check, Send, Smartphone, RotateCcw } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import type { ServiceOrder, Product, Client, ServiceOrderType } from '../types'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function ServiceOrders() {
  const { serviceOrders, setServiceOrders, serviceOrderTypes, addServiceOrderType, updateServiceOrderType, deleteServiceOrderType, clients, products, employees, addServiceOrder, updateServiceOrder, deleteServiceOrder, addTransaction, deductStockForServiceOrder, restockForServiceOrder } = useData()
  const { user } = useAuth()
  const [activeView, setActiveView] = useState<'tickets' | 'flows'>('tickets')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null)
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<ServiceOrderType | null>(null)

  const [formData, setFormData] = useState({
    typeId: '',
    clientId: '',
    technicianId: '',
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

  const [typeForm, setTypeForm] = useState({
    name: '',
    prefix: '',
    statusesText: ''
  })

  const defaultStatuses = useMemo(() => ([
    'Pendente',
    'Em Análise',
    'Aguardando Aprovação',
    'Aprovado',
    'Em Execução',
    'Finalizado',
    'Cancelado'
  ]), [])

  const legacyStatusLabel = useMemo(() => ({
    pending: 'Pendente',
    diagnosing: 'Em Análise',
    'waiting-approval': 'Aguardando Aprovação',
    approved: 'Aprovado',
    'in-progress': 'Em Execução',
    completed: 'Finalizado',
    cancelled: 'Cancelado'
  } as Record<string, string>), [])

  const normalizeStatus = (status: string) => legacyStatusLabel[status] || status

  const canManageFlows = user?.role === 'admin' || user?.email === 'mestre@whatchpro.com'
  const canAdminActions = user?.role === 'admin' || user?.email === 'mestre@whatchpro.com'

  useEffect(() => {
    if (!user) return
    if (serviceOrderTypes.length > 0) return
    addServiceOrderType({
      userId: user.id,
      adminId: user.adminId || user.id,
      name: 'Ordem de Serviço',
      prefix: 'OS',
      statuses: defaultStatuses
    })
  }, [addServiceOrderType, defaultStatuses, serviceOrderTypes.length, user])

  const defaultType = useMemo(() => {
    if (serviceOrderTypes.length === 0) return null
    const found = serviceOrderTypes.find(t => t.name.toLowerCase() === 'ordem de serviço')
    return found || serviceOrderTypes[0]
  }, [serviceOrderTypes])

  useEffect(() => {
    if (!defaultType) return
    const needsUpdate = serviceOrders.some(os => !os.typeId)
    if (!needsUpdate) return
    const updated = serviceOrders.map(os => os.typeId ? os : { ...os, typeId: defaultType.id })
    setServiceOrders(updated)
  }, [defaultType, serviceOrders, setServiceOrders])

  const filteredOS = serviceOrders.filter(os => {
    const clientName = clients.find(c => c.id === os.clientId)?.name || ''
    const typeName = serviceOrderTypes.find(t => t.id === os.typeId)?.name || ''
    const status = normalizeStatus(os.status)
    const s = searchTerm.toLowerCase()
    return (
      os.number.toLowerCase().includes(s) ||
      os.equipment.toLowerCase().includes(s) ||
      clientName.toLowerCase().includes(s) ||
      typeName.toLowerCase().includes(s) ||
      status.toLowerCase().includes(s)
    )
  })

  const activeType = serviceOrderTypes.find(t => t.id === formData.typeId) || defaultType
  const statusOptions = (activeType?.statuses && activeType.statuses.length > 0) ? activeType.statuses : defaultStatuses

  const openModal = (os: ServiceOrder | null = null) => {
    if (os) {
      setEditingOS(os)
      setFormData({
        typeId: os.typeId || defaultType?.id || '',
        clientId: os.clientId,
        technicianId: os.technicianId || '',
        equipment: os.equipment,
        problem: os.problem,
        diagnosis: os.diagnosis || '',
        status: normalizeStatus(os.status),
        laborCost: os.laborCost,
        items: [...os.items]
      })
    } else {
      setEditingOS(null)
      setFormData({
        typeId: defaultType?.id || '',
        clientId: '',
        technicianId: '',
        equipment: '',
        problem: '',
        diagnosis: '',
        status: defaultStatuses[0] || 'Pendente',
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
    const selectedType = serviceOrderTypes.find(t => t.id === formData.typeId) || defaultType
    const prefix = (selectedType?.prefix || 'CH').toUpperCase().replace(/\s+/g, '').slice(0, 6) || 'CH'

    if (editingOS) {
      updateServiceOrder(editingOS.id, {
        ...formData,
        status: normalizeStatus(formData.status),
        totalAmount
      })
    } else {
      addServiceOrder({
        userId: user.id,
        adminId: user.adminId || user.id,
        number: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
        ...formData,
        status: normalizeStatus(formData.status),
        totalAmount
      })
    }
    setIsModalOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este Chamado?')) {
      deleteServiceOrder(id)
    }
  }

  const getTypeForOS = (os: ServiceOrder) => {
    const found = serviceOrderTypes.find(t => t.id === os.typeId)
    return found || defaultType
  }

  const getStatusColor = (status: string) => {
    const s = normalizeStatus(status)
    if (s === 'Pendente') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    if (s === 'Em Análise') return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    if (s === 'Aguardando Aprovação') return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
    if (s === 'Aprovado') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    if (s === 'Em Execução') return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
    if (s === 'Finalizado') return 'text-green-500 bg-green-500/10 border-green-500/20'
    if (s === 'Cancelado') return 'text-red-500 bg-red-500/10 border-red-500/20'
    return 'text-slate-500 bg-slate-500/10 border-slate-500/20'
  }

  const getStatusLabel = (status: string) => {
    return normalizeStatus(status)
  }

  const sendToTechnician = (os: ServiceOrder) => {
    if (!os.technicianId) {
      alert('Nenhum técnico atribuído a este chamado.')
      return
    }
    const technician = employees.find(e => e.id === os.technicianId)
    if (!technician || !technician.phone) {
      alert('Técnico não possui telefone cadastrado.')
      return
    }

    const typeName = getTypeForOS(os)?.name || 'Chamado'
    const message = `Olá, ${technician.name}!\n\nVocê tem um novo ${typeName} atribuído (OS: ${os.number}):\n\n*Equipamento:* ${os.equipment}\n*Defeito Relatado:* ${os.problem}\n\nPor favor, atualize o status quando iniciar o atendimento.`
    
    const phone = technician.phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
    
    window.open(whatsappUrl, '_blank')
  }

  const handleFinishOS = (os: ServiceOrder) => {
    if (!confirm('Deseja finalizar este chamado e baixar os itens do estoque?')) return
    void (async () => {
      const res = await deductStockForServiceOrder(os)
      if (!res.ok) {
        alert(res.error)
        return
      }
      updateServiceOrder(os.id, { status: 'Finalizado' })
      alert('Chamado finalizado com sucesso! Estoque atualizado e registrado.')
    })()
  }

  const handleRestock = (os: ServiceOrder) => {
    if (!confirm('Deseja estornar a baixa de estoque deste chamado?')) return
    void (async () => {
      const res = await restockForServiceOrder(os)
      if (!res.ok) {
        alert(res.error)
        return
      }
      alert('Estorno realizado e estoque atualizado com sucesso!')
    })()
  }

  const handleBillOS = (os: ServiceOrder) => {
    if (os.isBilled) {
      alert('Este chamado já foi faturado.')
      return
    }
    
    const client = clients.find(c => c.id === os.clientId)
    
    addTransaction({
      description: `Faturamento OS: ${os.number} - ${client?.name || 'Cliente'}`,
      amount: os.totalAmount,
      type: 'income',
      category: 'Serviços',
      date: new Date().toISOString(),
      status: 'pending', // Pendente até receber
      clientId: os.clientId
    } as any)

    updateServiceOrder(os.id, {
      ...os,
      isBilled: true
    })
    
    alert('Faturamento gerado com sucesso! Verifique a aba Financeiro.')
  }

  const sendToTechnicianTelegram = (os: ServiceOrder) => {
    if (!os.technicianId) {
      alert('Nenhum técnico atribuído a este chamado.')
      return
    }
    const technician = employees.find(e => e.id === os.technicianId)
    if (!technician || !technician.phone) {
      alert('Técnico não possui telefone cadastrado.')
      return
    }

    const typeName = getTypeForOS(os)?.name || 'Chamado'
    const message = `Olá, ${technician.name}!\n\nVocê tem um novo ${typeName} atribuído (OS: ${os.number}):\n\n*Equipamento:* ${os.equipment}\n*Defeito Relatado:* ${os.problem}\n\nPor favor, atualize o status quando iniciar o atendimento.`
    
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('Novo Chamado - Whatch Pro')}&text=${encodeURIComponent(message)}`
    
    window.open(telegramUrl, '_blank')
  }

  const sendViaWhatsApp = (os: ServiceOrder) => {
    const client = clients.find(c => c.id === os.clientId)
    if (!client || !client.phone) {
      alert('Cliente não possui telefone cadastrado.')
      return
    }

    const typeName = getTypeForOS(os)?.name || 'Chamado'
    const message = `Olá, ${client.name}!\n\nAqui estão os detalhes do seu Chamado (${typeName}: ${os.number}):\n\n*Item/Equipamento:* ${os.equipment}\n*Status:* ${getStatusLabel(os.status)}\n*Solicitação:* ${os.problem}\n${os.diagnosis ? `*Detalhes:* ${os.diagnosis}\n` : ''}\n*Valor Total:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.totalAmount)}\n\nAgradecemos a preferência!`

    const phone = client.phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
    
    window.open(whatsappUrl, '_blank')
  }

  const sendViaTelegram = (os: ServiceOrder) => {
    const client = clients.find(c => c.id === os.clientId)
    if (!client || !client.phone) {
      alert('Cliente não possui telefone cadastrado.')
      return
    }

    const typeName = getTypeForOS(os)?.name || 'Chamado'
    const message = `Olá, ${client.name}!\n\nAqui estão os detalhes do seu Chamado (${typeName}: ${os.number}):\n\n*Item/Equipamento:* ${os.equipment}\n*Status:* ${getStatusLabel(os.status)}\n*Solicitação:* ${os.problem}\n${os.diagnosis ? `*Detalhes:* ${os.diagnosis}\n` : ''}\n*Valor Total:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.totalAmount)}\n\nAgradecemos a preferência!`

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('Chamado - Whatch Pro')}&text=${encodeURIComponent(message)}`
    
    window.open(telegramUrl, '_blank')
  }

  const openTypeModal = (t: ServiceOrderType | null = null) => {
    if (t) {
      setEditingType(t)
      setTypeForm({
        name: t.name,
        prefix: t.prefix,
        statusesText: t.statuses.join('\n')
      })
    } else {
      setEditingType(null)
      setTypeForm({
        name: '',
        prefix: 'CH',
        statusesText: defaultStatuses.join('\n')
      })
    }
    setIsTypeModalOpen(true)
  }

  const handleSaveType = () => {
    if (!user) return
    const statuses = typeForm.statusesText
      .split(/\r?\n|,/g)
      .map(s => s.trim())
      .filter(Boolean)

    const uniqueStatuses = Array.from(new Set(statuses))
    if (!typeForm.name.trim() || uniqueStatuses.length === 0) {
      alert('Informe o nome do tipo e pelo menos 1 status.')
      return
    }

    const prefix = typeForm.prefix.trim() || 'CH'

    if (editingType) {
      updateServiceOrderType(editingType.id, {
        name: typeForm.name.trim(),
        prefix,
        statuses: uniqueStatuses
      })
    } else {
      addServiceOrderType({
        userId: user.id,
        adminId: user.adminId || user.id,
        name: typeForm.name.trim(),
        prefix,
        statuses: uniqueStatuses
      })
    }

    setIsTypeModalOpen(false)
  }

  const handleDeleteType = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este tipo de chamado?')) {
      deleteServiceOrderType(id)
    }
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            <span className="text-primary glow-text">Chamados</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gerencie chamados, O.S e fluxos personalizáveis.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/40 dark:bg-slate-900/40 border border-white/30 dark:border-slate-700/50 rounded-2xl p-1">
            <button
              onClick={() => setActiveView('tickets')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === 'tickets' ? "bg-primary text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Chamados
            </button>
            {canManageFlows && (
              <button
                onClick={() => setActiveView('flows')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeView === 'flows' ? "bg-primary text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Tipos & Fluxos
              </button>
            )}
          </div>
          {activeView === 'tickets' && (
            <button 
              onClick={() => openModal()}
              className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <Plus size={20} />
              Novo Chamado
            </button>
          )}
        </div>
      </div>

      {activeView === 'tickets' && (
      <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
        <div className="p-8 border-b border-white/20 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tightest">Lista de Chamados</h3>
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
            <input
              type="text"
              placeholder="Buscar por número, tipo, status, item ou cliente..."
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
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Tipo</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Técnico</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Status</th>
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
                      {getTypeForOS(os)?.name || 'Tipo removido'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 truncate max-w-[150px]">{os.equipment}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {clients.find(c => c.id === os.clientId)?.name || 'Cliente Removido'}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {employees.find(e => e.id === os.technicianId)?.name || 'Não atribuído'}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest block w-max mb-2", getStatusColor(os.status))}>
                      {getStatusLabel(os.status)}
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.totalAmount)}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canAdminActions && os.stockDeducted && (
                        <button 
                          onClick={() => handleRestock(os)}
                          className="p-2 text-slate-500 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl transition-all"
                          title="Estornar Baixa de Estoque"
                        >
                          <RotateCcw size={18} />
                        </button>
                      )}
                      {os.status !== 'Finalizado' && (
                        <button 
                          onClick={() => handleFinishOS(os)}
                          className="p-2 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                          title="Finalizar Chamado e Baixar Estoque"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      {os.status === 'Finalizado' && !os.isBilled && (
                        <button 
                          onClick={() => handleBillOS(os)}
                          className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
                          title="Gerar Faturamento"
                        >
                          <FileText size={18} />
                        </button>
                      )}
                      {os.technicianId && (
                        <>
                          <button 
                            onClick={() => sendToTechnician(os)}
                            className="p-2 text-slate-500 hover:text-green-500 hover:bg-green-500/10 rounded-xl transition-all"
                            title="Enviar para o Técnico (WhatsApp)"
                          >
                            <Smartphone size={18} />
                          </button>
                          <button 
                            onClick={() => sendToTechnicianTelegram(os)}
                            className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                            title="Enviar para o Técnico (Telegram)"
                          >
                            <Send size={18} />
                          </button>
                        </>
                      )}
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
                  <td colSpan={7} className="px-8 py-12 text-center text-slate-500 font-medium">
                    Nenhum chamado encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal Nova/Editar OS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest flex items-center gap-3">
                <Wrench className="text-primary" />
                {editingOS ? 'Editar' : 'Novo'} <span className="text-primary">Chamado</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente / Solicitante</label>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Técnico / Responsável</label>
                  <select
                    value={formData.technicianId}
                    onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  >
                    <option value="">Sem responsável (Aberto)</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Chamado</label>
                  <select
                    value={formData.typeId}
                    onChange={(e) => {
                      const nextTypeId = e.target.value
                      const nextType = serviceOrderTypes.find(t => t.id === nextTypeId)
                      const nextStatuses = (nextType?.statuses && nextType.statuses.length > 0) ? nextType.statuses : defaultStatuses
                      setFormData({ ...formData, typeId: nextTypeId, status: nextStatuses[0] || 'Pendente' })
                    }}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  >
                    {serviceOrderTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  >
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Item / Serviço / Equipamento</label>
                <input
                  required
                  type="text"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  placeholder="Ex: Equipamento, projeto, pedido, processo..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Solicitação</label>
                <textarea
                  required
                  rows={2}
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  placeholder="Descreva o que precisa ser feito..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Detalhes / Observações</label>
                <textarea
                  rows={2}
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Informações adicionais, laudo, histórico..."
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
                  disabled={!formData.typeId || !formData.clientId || !formData.equipment || !formData.problem}
                  className="px-8 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all text-sm shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  {editingOS ? 'Salvar Chamado' : 'Criar Chamado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'flows' && (
        <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
          <div className="p-8 border-b border-white/20 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tightest">Tipos & Fluxos</h3>
            {canManageFlows && (
              <button
                onClick={() => openTypeModal()}
                className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <Plus size={20} />
                Novo Tipo
              </button>
            )}
          </div>

          {!canManageFlows ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              Acesso restrito para configurar tipos e fluxos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Tipo</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Prefixo</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Fluxo</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
                  {serviceOrderTypes.map((t) => (
                    <tr key={t.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{t.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{t.statuses.length} status</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black font-mono text-primary">{t.prefix}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[420px]">
                          {t.statuses.join(' → ')}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openTypeModal(t)}
                            className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteType(t.id)}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {serviceOrderTypes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-500 font-medium">
                        Nenhum tipo configurado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsTypeModalOpen(false)} />
          <div className="relative w-full max-w-2xl glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest flex items-center gap-3">
                <FileText className="text-primary" />
                {editingType ? 'Editar' : 'Novo'} <span className="text-primary">Tipo</span>
              </h2>
              <button onClick={() => setIsTypeModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Tipo</label>
                  <input
                    type="text"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="Ex: Suporte, Entrega, Reparo..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prefixo</label>
                  <input
                    type="text"
                    value={typeForm.prefix}
                    onChange={(e) => setTypeForm({ ...typeForm, prefix: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="Ex: CH, SUP, ENT"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fluxo (1 por linha)</label>
                <textarea
                  rows={7}
                  value={typeForm.statusesText}
                  onChange={(e) => setTypeForm({ ...typeForm, statusesText: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner resize-none"
                  placeholder="Ex:\nAberto\nEm andamento\nAguardando cliente\nResolvido"
                />
              </div>
            </div>

            <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveType}
                className="flex-1 px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all text-sm shadow-lg shadow-primary/20"
              >
                Salvar Tipo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
