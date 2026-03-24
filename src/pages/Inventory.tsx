import { useState } from 'react'
import { Plus, Search, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Edit2, Trash2, X, DollarSign, Layers } from 'lucide-react'
import type { Product } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Inventory() {
  const { products, setProducts, saveData } = useData()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Informática',
    quantity: 0,
    minQuantity: 0,
    price: 0
  })

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
      updatedProducts = products.map(p => p.id === editingProduct.id ? { ...editingProduct, ...formData, status } : p)
    } else {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        userId: user.id,
        ...formData,
        status
      }
      updatedProducts = [...products, newProduct]
    }
    
    saveData('products', updatedProducts)
    setIsModalOpen(false)
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
        price: product.price
      })
    } else {
      setEditingProduct(null)
      setFormData({ name: '', sku: '', category: 'Informática', quantity: 0, minQuantity: 0, price: 0 })
    }
    setIsModalOpen(true)
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
        <div className="glass p-8 rounded-[32px] border border-white/40 dark:border-slate-800/50 card-hover">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Valor Total em Estoque</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
            </h3>
        </div>
        <div className="glass p-8 rounded-[32px] border border-white/40 dark:border-slate-800/50 card-hover">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Itens cadastrados</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{products.length}</h3>
        </div>
        <div className={cn(
            "glass p-8 rounded-[32px] border border-white/40 dark:border-slate-800/50 card-hover",
            lowStockCount > 0 ? "border-red-500/20" : ""
        )}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Alertas de Reposição</p>
            <h3 className={cn("text-3xl font-black", lowStockCount > 0 ? "text-red-500" : "text-green-500")}>
                {lowStockCount} Itens
            </h3>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass p-6 rounded-[32px] border border-white/40 dark:border-slate-800/50 flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-700/50 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium shadow-inner"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass rounded-[40px] shadow-2xl border border-white/40 dark:border-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Produto</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Categoria</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Qtd / Mínima</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Preço Unit.</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Ações</th>
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
                  <td className="px-8 py-6 text-sm font-mono font-bold text-slate-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preço Unitário</label>
                  <input 
                    type="number" 
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Qtd Atual</label>
                  <input 
                    type="number" 
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>
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
    </div>
  )
}
