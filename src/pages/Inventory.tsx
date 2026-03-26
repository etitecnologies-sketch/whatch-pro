import { useState } from 'react'
import { Plus, Search, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Edit2, Trash2, X, DollarSign, Layers, FileText } from 'lucide-react'
import type { Product, Quotation, QuotationItem } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Inventory() {
  const { products, setProducts, saveData, clients, quotations, setQuotations } = useData()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Quotation State
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([])

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Informática',
    quantity: 0,
    minQuantity: 0,
    costPrice: 0,
    margin: 0,
    taxRate: 0,
    price: 0,
    ncm: '82029000' // NCM padrão
  })

  // Calculate final price automatically
  const calculateFinalPrice = (cost: number, margin: number, taxes: number) => {
    // Cálculo: Custo + (Custo * (Margem/100)) + (Custo * (Impostos/100))
    // Ou uma fórmula mais comum: Custo * (1 + (Margem + Impostos)/100)
    const totalPercentage = (margin + taxes) / 100
    return Number((cost * (1 + totalPercentage)).toFixed(2))
  }

  const handlePriceChange = (field: string, value: number) => {
    const newFormData = { ...formData, [field]: value }
    
    // If cost, margin or taxRate changed, recalculate price
    if (['costPrice', 'margin', 'taxRate'].includes(field)) {
      newFormData.price = calculateFinalPrice(
        field === 'costPrice' ? value : formData.costPrice,
        field === 'margin' ? value : formData.margin,
        field === 'taxRate' ? value : formData.taxRate
      )
    }
    
    setFormData(newFormData)
  }

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      const updatedProducts = products.filter(p => p.id !== id)
      saveData('products', updatedProducts)
    }
  }

  const handleSave = () => {
    if (!user) return

    const status = formData.quantity === 0 ? 'out-of-stock' : 
                   formData.quantity <= formData.minQuantity ? 'low-stock' : 'in-stock'

    let updatedProducts: Product[] = []
    if (editingProduct) {
      updatedProducts = products.map(p => p.id === editingProduct.id ? { ...p, ...formData, status } : p)
    } else {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        userId: user.id,
        adminId: user.adminId || user.id,
        ...formData,
        status
      }
      updatedProducts = [...products, newProduct]
    }
    
    saveData('products', updatedProducts)
    setIsModalOpen(false)
    setEditingProduct(null)
    alert('Produto salvo com sucesso!')
  }

  const openModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        sku: product.sku,
        category: product.category,
        quantity: product.quantity,
        minQuantity: product.minQuantity,
        costPrice: product.costPrice || 0,
        margin: product.margin || 0,
        taxRate: product.taxRate || 0,
        price: product.price,
        ncm: product.ncm || '82029000'
      })
    } else {
      setEditingProduct(null)
      setFormData({ 
        name: '', 
        sku: '', 
        category: 'Informática', 
        quantity: 0, 
        minQuantity: 0, 
        costPrice: 0, 
        margin: 0, 
        taxRate: 0, 
        price: 0,
        ncm: '82029000'
      })
    }
    setIsModalOpen(true)
  }

  const handleAddToQuotation = (product: Product) => {
    const existing = quotationItems.find(item => item.productId === product.id)
    if (existing) {
      setQuotationItems(quotationItems.map(item => 
        item.productId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } : item
      ))
    } else {
      setQuotationItems([...quotationItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      }])
    }
    setIsQuotationModalOpen(true)
  }

  const handleSaveQuotation = () => {
    if (!user || !selectedClient || quotationItems.length === 0) return

    const totalAmount = quotationItems.reduce((acc, item) => acc + item.total, 0)
    const newQuotation: Quotation = {
      id: crypto.randomUUID(),
      userId: user.id,
      adminId: user.adminId || user.id,
      clientId: selectedClient,
      items: quotationItems,
      totalAmount,
      status: 'draft',
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }

    saveData('quotations', [...quotations, newQuotation])
    setIsQuotationModalOpen(false)
    setQuotationItems([])
    setSelectedClient('')
    alert('Orçamento gerado com sucesso!')
  }

  const totalValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0)
  const lowStockCount = products.filter(p => p.status !== 'in-stock').length

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Gestão de <span className="text-primary glow-text">Estoque</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Controle de produtos, ativos e movimentações logísticas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => openModal()}
            className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60 card-hover">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Valor Total em Estoque</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
            </h3>
        </div>
        <div className="glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60 card-hover">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Itens cadastrados</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{products.length}</h3>
        </div>
        <div className={cn(
            "glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60 card-hover",
            lowStockCount > 0 ? "border-red-500/20" : ""
        )}>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Alertas de Reposição</p>
            <h3 className={cn("text-3xl font-black", lowStockCount > 0 ? "text-red-500" : "text-green-500")}>
                {lowStockCount} Itens
            </h3>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass p-6 rounded-[32px] border border-white/50 dark:border-slate-600/60 flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/60 border border-white/50 dark:border-slate-600/60 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium placeholder:text-slate-600 dark:placeholder:text-slate-400 shadow-inner"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Produto</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Categoria</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Qtd / Mínima</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Custo / Venda</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Margem</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Package size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{product.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">SKU: {product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{product.quantity} un</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Mín: {product.minQuantity}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-400 line-through decoration-slate-300">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.costPrice || 0)}
                        </span>
                        <span className="text-sm font-mono font-black text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                        </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-green-500">+{product.margin || 0}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Imp: {product.taxRate || 0}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                      product.status === 'in-stock' ? "bg-green-500/10 text-green-500" : 
                      product.status === 'low-stock' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {product.status === 'in-stock' ? 'Em Dia' : 
                       product.status === 'low-stock' ? 'Baixo' : 'Esgotado'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleAddToQuotation(product)}
                        className="p-3 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all border border-transparent hover:border-primary/20"
                        title="Adicionar ao Orçamento"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => openModal(product)}
                        className="p-3 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all border border-transparent hover:border-blue-500/20"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-3 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest">
                {editingProduct ? 'Editar' : 'Novo'} <span className="text-primary">Produto</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Item</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  placeholder="Ex: Macbook Pro M3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preço de Custo (R$)</label>
                  <input 
                    type="number" 
                    value={formData.costPrice}
                    onChange={e => handlePriceChange('costPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Margem de Lucro (%)</label>
                  <input 
                    type="number" 
                    value={formData.margin}
                    onChange={e => handlePriceChange('margin', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Impostos (%)</label>
                  <input 
                    type="number" 
                    value={formData.taxRate}
                    onChange={e => handlePriceChange('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preço Final de Venda</label>
                  <input 
                    type="number" 
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-black text-primary shadow-inner"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Profit Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Bruto Estimado</p>
                  <p className="text-lg font-black text-green-500">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.price - formData.costPrice - (formData.costPrice * formData.taxRate / 100))}
                  </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mark-up Total</p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        {formData.costPrice > 0 ? (((formData.price / formData.costPrice) - 1) * 100).toFixed(1) : 0}%
                    </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">SKU / Código</label>
                  <input 
                    type="text" 
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="PROD-001"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">NCM (Fiscal)</label>
                  <input 
                    type="text" 
                    value={formData.ncm}
                    onChange={e => setFormData({ ...formData, ncm: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="82029000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner appearance-none"
                  >
                    <option value="Informática">Informática</option>
                    <option value="Eletrônicos">Eletrônicos</option>
                    <option value="Acessórios">Acessórios</option>
                    <option value="Serviços">Serviços</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Qtd Atual</label>
                  <input 
                    type="number" 
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Estoque Mínimo</label>
                  <input 
                    type="number" 
                    value={formData.minQuantity}
                    onChange={e => setFormData({ ...formData, minQuantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all text-sm shadow-lg shadow-primary/20"
              >
                Salvar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Modal */}
      {isQuotationModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsQuotationModalOpen(false)} />
          <div className="relative w-full max-w-2xl glass rounded-[40px] border border-white/20 p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                  <FileText size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-2">Novo <span className="text-primary">Orçamento</span></h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Geração de proposta comercial</p>
                </div>
              </div>
              <button onClick={() => setIsQuotationModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecionar Cliente</label>
                <select 
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-900/40 border border-white/5 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-bold text-white shadow-inner appearance-none"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name} - {client.cnpj}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Itens do Orçamento</label>
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {quotationItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group">
                      <div>
                        <p className="text-sm font-black text-white">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">
                          {item.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-mono font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                        </p>
                        <button 
                          onClick={() => setQuotationItems(quotationItems.filter((_, i) => i !== index))}
                          className="p-2 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total do Orçamento</p>
                  <h3 className="text-2xl font-black text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      quotationItems.reduce((acc, item) => acc + item.total, 0)
                    )}
                  </h3>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsQuotationModalOpen(false)}
                    className="px-6 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveQuotation}
                    disabled={!selectedClient || quotationItems.length === 0}
                    className="px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-primary hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Gerar Proposta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
