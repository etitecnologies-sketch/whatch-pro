import { useState, useMemo, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, FileText, X, ChevronDown, Check, ShoppingCart, User as UserIcon, Printer, Send, DollarSign, CheckCircle2, XCircle } from 'lucide-react'
import type { Quotation, QuotationItem, Client, Product, ConfiguracaoSEFAZ } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Quotations() {
  const { quotations, setQuotations, clients, products, saveData } = useData()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedItems, setSelectedItems] = useState<QuotationItem[]>([])
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  // UI state
  const [isClientSelectOpen, setIsClientSelectOpen] = useState(false)
  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [pdfQuotation, setPdfQuotation] = useState<Quotation | null>(null)
  const [pdfCompanyLines, setPdfCompanyLines] = useState<{
    name: string
    cnpj: string
    ie: string
    phone: string
    email: string
    addr1: string
    addr2: string
    site: string
    logoUrl: string
  } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const client = clients.find(c => c.id === q.clientId)
      return client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             q.id.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [quotations, clients, searchTerm])

  const totalAmount = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + item.total, 0)
  }, [selectedItems])

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
      const updated = quotations.filter(q => q.id !== id)
      saveData('quotations', updated)
    }
  }

  const handleUpdateStatus = (id: string, status: Quotation['status']) => {
    const updated = quotations.map(q => q.id === id ? { ...q, status } : q)
    saveData('quotations', updated)
  }

  const getCompany = (): ConfiguracaoSEFAZ | null => {
    if (!user) return null
    const tId = user.adminId || user.id
    const saved = localStorage.getItem(`sefaz_config_${tId}`)
    return saved ? JSON.parse(saved) : null
  }

  const buildCompanyLines = (company: ConfiguracaoSEFAZ | null) => {
    const name = company?.nomeFantasia || company?.razaoSocial || 'Empresa'
    const cnpj = company?.cnpj ? `CNPJ: ${company.cnpj}` : ''
    const ie = company?.inscricaoEstadual ? `IE: ${company.inscricaoEstadual}` : ''
    const phone = company?.telefone || company?.whatsapp || ''
    const email = company?.emailComercial || company?.emailNotaFiscal || ''
    const addr1 = company?.logradouro ? `${company.logradouro}${company.numero ? `, ${company.numero}` : ''}${company.complemento ? ` - ${company.complemento}` : ''}` : ''
    const addr2 = `${company?.bairro ? company.bairro : ''}${company?.municipio ? `, ${company.municipio}` : ''}${company?.uf ? ` - ${company.uf}` : ''}${company?.cep ? ` CEP ${company.cep}` : ''}`.trim()
    const site = company?.site || ''
    return { name, cnpj, ie, phone, email, addr1, addr2, site, logoUrl: company?.logoUrl || '' }
  }

  const generateQuotationPDF = async (quotation: Quotation) => {
    setPdfCompanyLines(buildCompanyLines(getCompany()))
    setPdfQuotation(quotation)
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    await new Promise(resolve => setTimeout(resolve, 100))

    if (!pdfRef.current) {
      alert('Não foi possível gerar o PDF (componente não carregou). Atualize a página e tente novamente.')
      return
    }

    try {
      setIsExporting(true)
      const dataUrl = await toPng(pdfRef.current, {
        quality: 1,
        pixelRatio: 4,
        backgroundColor: '#ffffff',
        width: 794,
        height: Math.max(1123, pdfRef.current.scrollHeight),
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      })

      const imgProps = pdf.getImageProperties(dataUrl)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Orcamento_${quotation.id}.pdf`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(
        'Erro ao gerar o PDF do orçamento.\n\n' +
        'Dica: se você colocou a logo por URL e ela não permite CORS, o PDF pode falhar.\n' +
        'Use "Selecionar Logo do PC" nas Configurações ou remova a logo.\n\n' +
        `Detalhes: ${msg}`
      )
      throw err
    } finally {
      setIsExporting(false)
    }
  }

  const handleSendWhatsApp = (quotation: Quotation) => {
    const client = clients.find(c => c.id === quotation.clientId)
    if (!client || !client.phone) {
      alert('Cliente não possui telefone cadastrado.')
      return
    }

    const itemsText = quotation.items.map(i => `- ${i.quantity}x ${i.name}`).join('\n')
    const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quotation.totalAmount)
    
    const message = `Olá, ${client.name}!\n\nSegue orçamento (Ref: ${quotation.id}).\n\n*Itens:*\n${itemsText}\n\n*Valor Total:* ${total}\n*Válido até:* ${new Date(quotation.validUntil).toLocaleDateString('pt-BR')}\n\nVou anexar o PDF em seguida.`
    
    const phone = client.phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`

    window.open(whatsappUrl, '_blank')
    void generateQuotationPDF(quotation)
    handleUpdateStatus(quotation.id, 'sent')
  }

  const handleAddItem = (product: Product) => {
    const existing = selectedItems.find(i => i.productId === product.id)
    if (existing) {
      setSelectedItems(selectedItems.map(i => 
        i.productId === product.id 
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } 
          : i
      ))
    } else {
      setSelectedItems([...selectedItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      }])
    }
  }

  const handleUpdateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter(i => i.productId !== productId))
      return
    }
    setSelectedItems(selectedItems.map(i => 
      i.productId === productId 
        ? { ...i, quantity, total: quantity * i.price } 
        : i
    ))
  }

  const handleSave = () => {
    if (!user || !selectedClientId || selectedItems.length === 0) {
        alert('Selecione um cliente e pelo menos um item.')
        return
    }

    const effectiveAdminId = user.adminId || user.id
    
    let updated: Quotation[]
    if (editingQuotation) {
      updated = quotations.map(q => q.id === editingQuotation.id ? {
        ...q,
        clientId: selectedClientId,
        items: selectedItems,
        totalAmount,
        notes,
        validUntil
      } : q)
    } else {
      const newQuotation: Quotation = {
        id: `QT-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: user.id,
        adminId: effectiveAdminId,
        clientId: selectedClientId,
        items: selectedItems,
        totalAmount,
        status: 'draft',
        validUntil,
        createdAt: new Date().toISOString().split('T')[0],
        notes
      }
      updated = [...quotations, newQuotation]
    }
    
    saveData('quotations', updated)
    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setEditingQuotation(null)
    setSelectedClientId('')
    setSelectedItems([])
    setNotes('')
    setValidUntil(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  }

  const openModal = (quotation: Quotation | null = null) => {
    if (quotation) {
      setEditingQuotation(quotation)
      setSelectedClientId(quotation.clientId)
      setSelectedItems(quotation.items)
      setNotes(quotation.notes || '')
      setValidUntil(quotation.validUntil)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

  return (
    <div className="space-y-10 pb-20">
      <div className="absolute -left-[99999px] top-0 w-[794px] min-h-[1123px] bg-white text-slate-900 pointer-events-none" aria-hidden="true">
        <div
          ref={pdfRef}
          className="p-10 w-full h-full"
          style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'geometricPrecision' }}
        >
          {(() => {
            const quotation = pdfQuotation
            if (!quotation) return null
            const companyLines = pdfCompanyLines || buildCompanyLines(getCompany())
            const client = clients.find(c => c.id === quotation.clientId)
            return (
              <div className="space-y-8">
                <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                  <div className="flex items-center gap-4">
                    {companyLines.logoUrl ? (
                      <img src={companyLines.logoUrl} className="w-14 h-14 object-contain" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600">
                        {companyLines.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-black">{companyLines.name}</h1>
                      <p className="text-xs text-slate-600">{[companyLines.cnpj, companyLines.ie].filter(Boolean).join(' • ')}</p>
                      <p className="text-xs text-slate-600">{[companyLines.phone, companyLines.email, companyLines.site].filter(Boolean).join(' • ')}</p>
                      <p className="text-xs text-slate-600">{[companyLines.addr1, companyLines.addr2].filter(Boolean).join(' • ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black">Orçamento {quotation.id}</h2>
                    <p className="text-xs text-slate-600">Data: {new Date(quotation.createdAt).toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-slate-600">Validade: {new Date(quotation.validUntil).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Cliente</p>
                    <p className="text-sm font-black">{client?.name || 'Cliente'}</p>
                    <p className="text-xs text-slate-600">{[client?.email, client?.phone].filter(Boolean).join(' • ')}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Status</p>
                    <p className="text-sm font-black uppercase">{quotation.status}</p>
                    <p className="text-xs text-slate-600">Ref: {quotation.id}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Item</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Qtd</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Preço</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items.map((item, idx) => (
                        <tr key={`${item.productId}-${idx}`} className="border-t border-slate-200">
                          <td className="px-4 py-3 text-sm font-bold">{item.name}</td>
                          <td className="px-4 py-3 text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</td>
                          <td className="px-4 py-3 text-sm font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-start justify-between">
                  <div className="text-xs text-slate-600 whitespace-pre-wrap">{quotation.notes || ''}</div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total</p>
                    <p className="text-2xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quotation.totalAmount)}</p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Gestão de <span className="text-primary glow-text">Orçamentos</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Crie e gerencie propostas comerciais dinâmicas.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Novo Orçamento
        </button>
      </div>

      {/* Filters */}
      <div className="glass p-6 rounded-[32px] border border-white/50 dark:border-slate-600/60">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente ou código do orçamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-700/50 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium shadow-inner"
          />
        </div>
      </div>

      {/* Quotations Table */}
      <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Orçamento</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Valor Total</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Validade</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
              {filteredQuotations.map((q) => {
                const client = clients.find(c => c.id === q.clientId)
                return (
                  <tr key={q.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{q.id}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{q.createdAt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{client?.name || 'Cliente Removido'}</p>
                      <p className="text-[10px] font-medium text-slate-500">{client?.email}</p>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(q.totalAmount)}
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        q.status === 'draft' ? "bg-slate-100 dark:bg-slate-800 text-slate-500" :
                        q.status === 'sent' ? "bg-blue-500/10 text-blue-500" :
                        q.status === 'approved' ? "bg-green-500/10 text-green-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-slate-500">
                      {q.validUntil}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {q.status === 'draft' && (
                          <button onClick={() => handleUpdateStatus(q.id, 'sent')} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Marcar como Enviado"><Send size={18} /></button>
                        )}
                        {q.status === 'sent' && (
                          <>
                            <button onClick={() => handleUpdateStatus(q.id, 'approved')} className="p-2 text-slate-400 hover:text-green-500 transition-colors" title="Aprovar"><CheckCircle2 size={18} /></button>
                            <button onClick={() => handleUpdateStatus(q.id, 'rejected')} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Rejeitar"><XCircle size={18} /></button>
                          </>
                        )}
                        <button onClick={() => void generateQuotationPDF(q)} disabled={isExporting} className="p-2 text-slate-400 hover:text-primary transition-colors disabled:opacity-50" title="Gerar PDF"><Printer size={18} /></button>
                        <button onClick={() => handleSendWhatsApp(q)} className="p-2 text-slate-400 hover:text-green-500 transition-colors" title="Enviar WhatsApp"><Send size={18} /></button>
                        <button onClick={() => openModal(q)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Editar"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(q.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-500">
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Orçamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-4xl glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest">
                {editingQuotation ? 'Editar' : 'Novo'} <span className="text-primary">Orçamento</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
              {/* Left Side: Client and Info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente</label>
                  <div className="relative">
                    <button 
                      onClick={() => setIsClientSelectOpen(!isClientSelectOpen)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner flex items-center justify-between"
                    >
                      {selectedClient ? selectedClient.name : 'Selecione um cliente'}
                      <ChevronDown size={18} className={cn("transition-transform", isClientSelectOpen && "rotate-180")} />
                    </button>
                    {isClientSelectOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-20 max-h-48 overflow-y-auto p-2">
                        {clients.map(c => (
                          <button 
                            key={c.id}
                            onClick={() => {
                              setSelectedClientId(c.id)
                              setIsClientSelectOpen(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-primary/10 hover:text-primary rounded-xl transition-colors flex items-center justify-between"
                          >
                            {c.name}
                            {selectedClientId === c.id && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Validade</label>
                  <input 
                    type="date" 
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observações</label>
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner h-24 resize-none"
                    placeholder="Notas internas ou para o cliente..."
                  />
                </div>
              </div>

              {/* Right Side: Items */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Itens do Orçamento</label>
                    <button 
                        onClick={() => setIsProductSelectOpen(!isProductSelectOpen)}
                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                        <Plus size={12} /> Adicionar Item
                    </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {selectedItems.map(item => (
                        <div key={item.productId} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl group">
                            <div className="flex-1">
                                <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{item.name}</p>
                                <p className="text-[10px] font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleUpdateItemQuantity(item.productId, item.quantity - 1)}
                                    className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
                                >-</button>
                                <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
                                <button 
                                    onClick={() => handleUpdateItemQuantity(item.productId, item.quantity + 1)}
                                    className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg text-slate-500 hover:text-primary transition-colors"
                                >+</button>
                            </div>
                            <div className="w-20 text-right">
                                <p className="text-xs font-black text-slate-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}</p>
                            </div>
                            <button 
                                onClick={() => handleUpdateItemQuantity(item.productId, 0)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    {selectedItems.length === 0 && (
                        <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 flex flex-col items-center gap-2">
                            <ShoppingCart size={24} className="opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Carrinho Vazio</p>
                        </div>
                    )}
                </div>

                {/* Product Search Selection */}
                {isProductSelectOpen && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-primary/20 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text"
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                                placeholder="Buscar produto..."
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border-0 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                            {filteredProducts.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => handleAddItem(p)}
                                    className="w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-tighter hover:bg-primary hover:text-white rounded-lg transition-colors flex items-center justify-between"
                                >
                                    <span>{p.name}</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</span>
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setIsProductSelectOpen(false)}
                            className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Fechar Busca
                        </button>
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                        <span className="text-xs font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-primary">
                        <span className="text-xs font-black uppercase tracking-widest">Total Geral</span>
                        <span className="text-xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}</span>
                    </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-4 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all text-sm shadow-lg shadow-primary/20 uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Salvar Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
