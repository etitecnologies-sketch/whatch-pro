import { useState, useMemo } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Search, User, CheckCircle2 } from 'lucide-react'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import { Product } from '../types'

export default function PDV() {
  const { products, clients, addTransaction, updateProduct } = useData()
  const { user } = useAuth()
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit' | 'money'>('pix')

  // Filter out products with 0 quantity and match search term
  const availableProducts = useMemo(() => {
    if (!searchTerm) return products.filter(p => p.quantity > 0)
    
    return products.filter(p => {
      const search = searchTerm.toLowerCase()
      const matchesSearch = 
        (p.name && p.name.toLowerCase().includes(search)) || 
        (p.sku && p.sku.toLowerCase().includes(search))
      return matchesSearch && p.quantity > 0
    })
  }, [products, searchTerm])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Se tiver apenas 1 produto no resultado ou houver uma correspondência exata de SKU, adiciona direto
      const exactMatch = availableProducts.find(p => p.sku && p.sku.toLowerCase() === searchTerm.toLowerCase())
      
      if (exactMatch) {
        addToCart(exactMatch)
        setSearchTerm('')
      } else if (availableProducts.length === 1) {
        addToCart(availableProducts[0])
        setSearchTerm('')
      }
    }
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.quantity) return prev // Can't add more than stock
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta
        if (newQuantity > 0 && newQuantity <= item.product.quantity) {
          return { ...item, quantity: newQuantity }
        }
      }
      return item
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)

  const handleCheckout = () => {
    if (cart.length === 0) return

    // 1. Create financial transaction
    const clientName = clients.find(c => c.id === selectedClient)?.name || 'Cliente Balcão'
    addTransaction({
      description: `Venda PDV - ${clientName}`,
      amount: total,
      type: 'income',
      category: 'Vendas',
      date: new Date().toISOString(),
      status: 'completed',
      userId: user?.id // Registra quem fez a venda
    } as any)

    // 2. Update stock
    cart.forEach(item => {
      updateProduct({
        ...item.product,
        quantity: item.product.quantity - item.quantity
      })
    })

    // 3. Clear PDV
    setCart([])
    setSelectedClient('')
    alert('Venda finalizada com sucesso!')
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Products Catalog (Left Side) */}
      <div className="flex-1 flex flex-col glass rounded-3xl p-6 border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <ShoppingCart className="text-primary" />
            Frente de Caixa
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar ou Bipar (SKU/Código)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 xl:grid-cols-3 gap-4 pr-2">
          {availableProducts.map(product => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group flex flex-col h-full"
            >
              <div className="mb-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{product.sku}</span>
                <h3 className="text-sm font-bold text-white leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
              </div>
              <div className="mt-auto pt-4 flex items-end justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Estoque: {product.quantity}</span>
                <span className="text-base font-black text-green-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                </span>
              </div>
            </button>
          ))}
          {availableProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              Nenhum produto encontrado em estoque.
            </div>
          )}
        </div>
      </div>

      {/* Cart and Checkout (Right Side) */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        
        {/* Client Selection */}
        <div className="glass rounded-3xl p-6 border border-white/10 shrink-0">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 flex items-center gap-2">
            <User size={12} /> Cliente (Opcional)
          </label>
          <select 
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-white appearance-none"
          >
            <option value="">Cliente Balcão (Consumidor Final)</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="glass rounded-3xl p-6 border border-white/10 flex-1 flex flex-col overflow-hidden">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Cupom Atual</h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {cart.map(item => (
              <div key={item.product.id} className="p-3 bg-slate-900/40 rounded-xl border border-white/5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{item.product.name}</p>
                  <p className="text-[10px] text-green-400 font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-lg border border-white/10 shrink-0">
                  <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:text-primary transition-colors text-slate-400"><Minus size={12} /></button>
                  <span className="text-xs font-black w-4 text-center text-white">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:text-primary transition-colors text-slate-400"><Plus size={12} /></button>
                </div>
                
                <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-medium uppercase tracking-widest">
                Carrinho Vazio
              </div>
            )}
          </div>

          {/* Payment and Total */}
          <div className="mt-4 pt-4 border-t border-white/10 shrink-0 space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => setPaymentMethod('pix')} className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'pix' ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                <QrCode size={16} /> <span className="text-[8px] font-black uppercase">Pix</span>
              </button>
              <button onClick={() => setPaymentMethod('credit')} className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'credit' ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                <CreditCard size={16} /> <span className="text-[8px] font-black uppercase">Crédito</span>
              </button>
              <button onClick={() => setPaymentMethod('debit')} className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'debit' ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                <CreditCard size={16} /> <span className="text-[8px] font-black uppercase">Débito</span>
              </button>
              <button onClick={() => setPaymentMethod('money')} className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'money' ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                <Banknote size={16} /> <span className="text-[8px] font-black uppercase">Dinheiro</span>
              </button>
            </div>

            <div className="flex items-end justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total a Pagar</span>
              <span className="text-3xl font-black text-white tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </span>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest glow-primary hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
