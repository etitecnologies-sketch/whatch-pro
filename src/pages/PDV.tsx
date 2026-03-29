import { useEffect, useMemo, useRef, useState } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Search, User, CheckCircle2, History, Image, ArrowLeft, Printer } from 'lucide-react'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import { Product } from '../types'
import { useSEFAZ } from '../hooks/useSEFAZ'
import { supabase } from '../lib/supabase'

export default function PDV() {
  const { products, clients, sales, employees, addTransaction, addSale, voidSale, addStockMovements, updateProduct } = useData()
  const { user } = useAuth()
  const { configuracaoSEFAZ } = useSEFAZ()
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit' | 'money'>('pix')
  const [cashReceived, setCashReceived] = useState<string>('')
  const [selectedCartIndex, setSelectedCartIndex] = useState<number>(-1)
  const [pdvMessage, setPdvMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [viewMode, setViewMode] = useState<'checkout' | 'history'>('checkout')
  const [historySearch, setHistorySearch] = useState('')
  const [expandedSaleId, setExpandedSaleId] = useState<string>('')
  const [showLogo, setShowLogo] = useState<boolean>(true)
  const [autoPrint, setAutoPrint] = useState<boolean>(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const historyInputRef = useRef<HTMLInputElement>(null)
  const cashInputRef = useRef<HTMLInputElement>(null)

  const tenantId = user ? (user.adminId || user.id) : ''
  const cashierName = useMemo(() => {
    if (!user) return ''
    const empId = String(user.employeeId || '').trim()
    if (empId) {
      const emp = employees.find(e => e.id === empId)
      if (emp?.name) return emp.name
    }
    return user.name
  }, [employees, user])
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string>('')
  const logoUrl = tenantLogoUrl || configuracaoSEFAZ?.logoUrl || ''

  useEffect(() => {
    if (!user) return
    const tId = user.adminId || user.id
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('logo_url')
          .eq('id', tId)
          .maybeSingle()
        if (cancelled) return
        if (error) return
        setTenantLogoUrl(String((data as any)?.logo_url || ''))
      } catch {
        if (cancelled) return
        setTenantLogoUrl('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!tenantId) return
    const saved = localStorage.getItem(`pdv_show_logo_${tenantId}`)
    if (saved === null) return
    setShowLogo(saved === 'true')
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    localStorage.setItem(`pdv_show_logo_${tenantId}`, String(showLogo))
  }, [showLogo, tenantId])

  useEffect(() => {
    if (!tenantId) return
    const saved = localStorage.getItem(`pdv_auto_print_${tenantId}`)
    if (saved === null) return
    setAutoPrint(saved === 'true')
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    localStorage.setItem(`pdv_auto_print_${tenantId}`, String(autoPrint))
  }, [autoPrint, tenantId])

  // Filter out products with 0 quantity and match search term
  const availableProducts = useMemo(() => {
    const normalize = (v: unknown) => String(v || '').trim().toLowerCase()
    const raw = normalize(searchTerm)
    if (!raw) return products.filter(p => p.quantity > 0)

    const search = raw
    const scored = products
      .filter(p => p.quantity > 0)
      .map(p => {
        const name = normalize(p.name)
        const sku = normalize(p.sku)
        let score = 0
        if (sku && sku === search) score += 100
        if (name && name === search) score += 90
        if (sku && sku.startsWith(search)) score += 60
        if (name && name.startsWith(search)) score += 50
        if (sku && sku.includes(search)) score += 30
        if (name && name.includes(search)) score += 20
        return { p, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || String(a.p.name || '').localeCompare(String(b.p.name || '')))

    return scored.map(x => x.p)
  }, [products, searchTerm])

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
  const cashReceivedValue = useMemo(() => {
    const cleaned = String(cashReceived || '').replace(/[^\d.,]/g, '').replace(/\.(?=.*\.)/g, '')
    const normalized = cleaned.replace(',', '.')
    const n = Number(normalized)
    return Number.isFinite(n) ? n : 0
  }, [cashReceived])
  const changeValue = paymentMethod === 'money' ? Math.max(0, cashReceivedValue - total) : 0

  useEffect(() => {
    if (!pdvMessage) return
    const t = setTimeout(() => setPdvMessage(null), 2500)
    return () => clearTimeout(t)
  }, [pdvMessage])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = (target?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || (target?.getAttribute?.('contenteditable') === 'true')
      if (isTyping) return

      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'F4') {
        e.preventDefault()
        setCart([])
        setSelectedCartIndex(-1)
        setSelectedClient('')
        setCashReceived('')
        setPdvMessage({ type: 'success', text: 'Cupom limpo.' })
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'F6') {
        e.preventDefault()
        setViewMode(m => (m === 'checkout' ? 'history' : 'checkout'))
        return
      }

      if (e.key === 'Escape') {
        if (viewMode === 'history') {
          e.preventDefault()
          setExpandedSaleId('')
          setViewMode('checkout')
        }
        return
      }

      if (viewMode === 'history') return

      if (e.key === 'F7') {
        e.preventDefault()
        setPaymentMethod('pix')
        setPdvMessage({ type: 'success', text: 'Pagamento: PIX' })
        return
      }

      if (e.key === 'F8') {
        e.preventDefault()
        setPaymentMethod('money')
        setPdvMessage({ type: 'success', text: 'Pagamento: Dinheiro' })
        setTimeout(() => cashInputRef.current?.focus(), 0)
        return
      }

      if (e.key === 'F10') {
        e.preventDefault()
        setPaymentMethod('credit')
        setPdvMessage({ type: 'success', text: 'Pagamento: Crédito' })
        return
      }

      if (e.key === 'F11') {
        e.preventDefault()
        setPaymentMethod('debit')
        setPdvMessage({ type: 'success', text: 'Pagamento: Débito' })
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        void handleCheckout()
        return
      }

      if (e.key === 'F9') {
        e.preventDefault()
        void handleCheckout()
        return
      }

      if (e.key === 'ArrowDown') {
        if (cart.length === 0) return
        e.preventDefault()
        setSelectedCartIndex(i => {
          const next = Math.min(cart.length - 1, (i < 0 ? 0 : i + 1))
          return next
        })
        return
      }

      if (e.key === 'ArrowUp') {
        if (cart.length === 0) return
        e.preventDefault()
        setSelectedCartIndex(i => {
          const next = Math.max(0, (i < 0 ? 0 : i - 1))
          return next
        })
        return
      }

      if (e.key === 'Delete') {
        if (selectedCartIndex < 0 || selectedCartIndex >= cart.length) return
        e.preventDefault()
        const productId = cart[selectedCartIndex].product.id
        removeFromCart(productId)
        return
      }

      if (e.key === '+' || e.key === '=') {
        if (selectedCartIndex < 0 || selectedCartIndex >= cart.length) return
        e.preventDefault()
        updateQuantity(cart[selectedCartIndex].product.id, 1)
        return
      }

      if (e.key === '-' || e.key === '_') {
        if (selectedCartIndex < 0 || selectedCartIndex >= cart.length) return
        e.preventDefault()
        updateQuantity(cart[selectedCartIndex].product.id, -1)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cart, selectedCartIndex, paymentMethod, cashReceivedValue, total, selectedClient, clients, user, viewMode])

  useEffect(() => {
    if (viewMode === 'checkout') {
      searchInputRef.current?.focus()
    } else {
      historyInputRef.current?.focus()
    }
  }, [viewMode])

  const escapeHtml = (input: unknown) => {
    return String(input ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  const printSaleReceipt = (sale: any) => {
    const saleId = String(sale?.id || '')
    const saleShort = saleId.slice(0, 8).toUpperCase()
    const createdAt = sale?.createdAt ? new Date(sale.createdAt) : new Date()
    const items = Array.isArray(sale?.items) ? sale.items : []
    const companyName = configuracaoSEFAZ?.nomeFantasia || configuracaoSEFAZ?.razaoSocial || ''
    const companyDoc = configuracaoSEFAZ?.cnpj || ''

    const headerLogo = logoUrl && showLogo
      ? `<div style="display:flex;justify-content:center;margin-bottom:10px;"><img src="${escapeHtml(logoUrl)}" style="max-height:70px;max-width:220px;object-fit:contain;" /></div>`
      : ''

    const lineItems = items.map((i: any) => {
      const name = escapeHtml(i?.name || '')
      const sku = i?.sku ? escapeHtml(i.sku) : ''
      const qty = Number(i?.quantity || 0)
      const unit = Number(i?.unitPrice || 0)
      const total = Number(i?.total || 0)
      return `
        <div style="margin:10px 0;">
          <div style="font-weight:700;">${name}</div>
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;">
            <div>${sku ? `${sku} • ` : ''}${qty}x ${unit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div style="font-weight:700;">${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          </div>
        </div>
      `
    }).join('')

    const pm = formatPayment(sale?.paymentMethod)
    const totalValue = Number(sale?.total || 0)
    const cashReceived = Number(sale?.cashReceived || 0)
    const changeAmount = Number(sale?.changeAmount || 0)

    const moneyLines = sale?.paymentMethod === 'money'
      ? `
        <div style="display:flex;justify-content:space-between;font-size:12px;"><div>Recebido</div><div>${cashReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;"><div>Troco</div><div>${changeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div></div>
      `
      : ''

    const status = (sale?.status || 'completed') === 'voided' ? 'ESTORNADA' : 'CONCLUÍDA'

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Cupom PDV #${escapeHtml(saleShort)}</title>
          <style>
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; padding: 18px; color: #111;">
          ${headerLogo}
          <div style="text-align:center;">
            ${companyName ? `<div style="font-weight:900;font-size:14px;">${escapeHtml(companyName)}</div>` : ''}
            ${companyDoc ? `<div style="font-size:12px;">${escapeHtml(companyDoc)}</div>` : ''}
            <div style="font-size:12px;margin-top:6px;">Cupom PDV #${escapeHtml(saleShort)}</div>
            <div style="font-size:12px;">${escapeHtml(createdAt.toLocaleString())}</div>
            <div style="font-size:12px;margin-top:6px;">Status: ${escapeHtml(status)}</div>
          </div>
          <hr style="border:none;border-top:1px dashed #666;margin:14px 0;" />
          ${lineItems || '<div style="font-size:12px;">(Sem itens)</div>'}
          <hr style="border:none;border-top:1px dashed #666;margin:14px 0;" />
          <div style="display:flex;justify-content:space-between;font-size:12px;"><div>Pagamento</div><div>${escapeHtml(pm)}</div></div>
          ${moneyLines}
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin-top:10px;"><div>Total</div><div>${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div></div>
          <div style="text-align:center;font-size:12px;margin-top:16px;">Obrigado e volte sempre!</div>
        </body>
      </html>
    `

    const w = window.open('', '_blank', 'noopener,noreferrer,width=420,height=800')
    if (!w) {
      setPdvMessage({ type: 'error', text: 'Popup bloqueado. Libere para imprimir.' })
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => {
      w.print()
    }, 250)
  }

  const parseSearchLine = (raw: string) => {
    const v = raw.trim()
    const m = v.match(/^\s*(\d+)\s*[*xX]\s*(.+)\s*$/)
    if (!m) return { qty: 1, term: v }
    const qty = Math.max(1, Number(m[1] || 1))
    const term = String(m[2] || '').trim()
    return { qty: Number.isFinite(qty) ? qty : 1, term }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const { qty, term } = parseSearchLine(searchTerm)
      if (!term) return

      const exactMatch = availableProducts.find(p => p.sku && p.sku.toLowerCase() === term.toLowerCase())
      
      if (exactMatch) {
        addToCart(exactMatch, qty)
        setSearchTerm('')
      } else if (availableProducts.length === 1) {
        addToCart(availableProducts[0], qty)
        setSearchTerm('')
      }
    }
  }

  const addToCart = (product: Product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.quantity) {
          setPdvMessage({ type: 'error', text: 'Sem estoque suficiente.' })
          return prev
        }
        const nextQty = Math.min(product.quantity, existing.quantity + qty)
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: nextQty }
            : item
        )
      }
      const nextQty = Math.min(product.quantity, Math.max(1, qty))
      return [...prev, { product, quantity: nextQty }]
    })
    setSelectedCartIndex(() => {
      const idx = cart.findIndex(i => i.product.id === product.id)
      return idx >= 0 ? idx : cart.length
    })
    searchInputRef.current?.focus()
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id !== productId) return item
      const newQuantity = item.quantity + delta
      if (newQuantity <= 0) return item
      if (newQuantity > item.product.quantity) {
        setPdvMessage({ type: 'error', text: 'Sem estoque suficiente.' })
        return item
      }
      return { ...item, quantity: newQuantity }
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === productId)
      if (idx < 0) return prev
      const next = prev.filter(item => item.product.id !== productId)
      setSelectedCartIndex(current => {
        if (next.length === 0) return -1
        if (current < 0) return 0
        if (current > idx) return Math.min(next.length - 1, current - 1)
        if (current === idx) return Math.min(next.length - 1, idx)
        return Math.min(next.length - 1, current)
      })
      return next
    })
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (paymentMethod === 'money' && cashReceivedValue < total) {
      setPdvMessage({ type: 'error', text: 'Valor recebido menor que o total.' })
      return
    }

    const client = clients.find(c => c.id === selectedClient)
    const clientName = client?.name || 'Cliente Balcão'

    const sale = addSale({
      clientId: client?.id,
      clientName,
      paymentMethod,
      cashReceived: paymentMethod === 'money' ? cashReceivedValue : undefined,
      changeAmount: paymentMethod === 'money' ? changeValue : undefined,
      total,
      items: cart.map(item => ({
        productId: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: item.product.price * item.quantity,
      })),
    })

    if (!sale) return
    const saleShort = sale.id.slice(0, 8).toUpperCase()

    addTransaction({
      description: `Venda PDV #${saleShort} - ${clientName} (${paymentMethod.toUpperCase()})`,
      amount: total,
      type: 'income',
      category: 'Vendas',
      date: new Date().toISOString(),
      status: 'completed',
      userId: user?.id // Registra quem fez a venda
    } as any)

    cart.forEach(item => {
      updateProduct({
        ...item.product,
        quantity: item.product.quantity - item.quantity
      })
    })

    await addStockMovements(cart.map(item => ({
      productId: item.product.id,
      quantityChange: -Math.abs(item.quantity),
      reason: `Venda PDV #${saleShort}`,
      referenceType: 'pdv',
      referenceId: sale.id
    })))

    if (autoPrint) {
      printSaleReceipt(sale)
    }

    setCart([])
    setSelectedClient('')
    setCashReceived('')
    setSelectedCartIndex(-1)
    setPdvMessage({ type: 'success', text: 'Venda finalizada!' })
    searchInputRef.current?.focus()
  }

  const visibleSales = useMemo(() => {
    const normalize = (v: unknown) => String(v || '').trim().toLowerCase()
    const q = normalize(historySearch)
    const base = [...sales].sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    if (!q) return base
    return base.filter(s => {
      const clientName = normalize((s as any).clientName)
      const idShort = String((s as any).id || '').slice(0, 8).toLowerCase()
      const matchItems = Array.isArray((s as any).items) ? (s as any).items.some((i: any) => normalize(i.name).includes(q) || normalize(i.sku).includes(q)) : false
      return clientName.includes(q) || idShort.includes(q) || matchItems
    })
  }, [historySearch, sales])

  const formatPayment = (pm: any) => {
    if (pm === 'pix') return 'PIX'
    if (pm === 'credit') return 'CRÉDITO'
    if (pm === 'debit') return 'DÉBITO'
    if (pm === 'money') return 'DINHEIRO'
    return String(pm || '').toUpperCase()
  }

  const handleVoidSale = async (saleId: string) => {
    const ok = window.confirm('Confirmar estorno desta venda? Isso vai devolver o estoque e gerar um lançamento de estorno no financeiro.')
    if (!ok) return
    const reason = window.prompt('Motivo do estorno (opcional):') || undefined
    const res = await voidSale(saleId, reason)
    if (!res.ok) {
      setPdvMessage({ type: 'error', text: res.error || 'Não foi possível estornar.' })
      return
    }
    setPdvMessage({ type: 'success', text: 'Venda estornada.' })
  }

  const handlePrintSale = (saleId: string) => {
    const sale = sales.find((s: any) => String(s.id) === String(saleId))
    if (!sale) {
      setPdvMessage({ type: 'error', text: 'Venda não encontrada.' })
      return
    }
    printSaleReceipt(sale)
  }

  if (viewMode === 'history') {
    return (
      <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
        <div className="glass rounded-3xl p-6 border border-white/10 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('checkout')}
                className="p-3 rounded-2xl border border-white/10 bg-slate-900/40 hover:bg-white/5 transition-all text-slate-200"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <History className="text-primary" />
                Histórico de Vendas (PDV)
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {pdvMessage && (
                <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${pdvMessage.type === 'success' ? 'text-green-300 border-green-500/30 bg-green-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>
                  {pdvMessage.text}
                </div>
              )}
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, item ou #ID"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  ref={historyInputRef}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {visibleSales.map((s: any) => {
              const saleId = String(s.id || '')
              const isExpanded = expandedSaleId === saleId
              const saleShort = saleId.slice(0, 8).toUpperCase()
              const status = (s.status || 'completed') as 'completed' | 'voided'
              const createdAt = s.createdAt ? new Date(s.createdAt) : null
              return (
                <div key={saleId} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-black text-white">#{saleShort}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${status === 'voided' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10' : 'text-green-300 border-green-500/30 bg-green-500/10'}`}>
                          {status === 'voided' ? 'ESTORNADA' : 'CONCLUÍDA'}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-white truncate mt-1">{s.clientName || 'Cliente Balcão'}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {createdAt ? createdAt.toLocaleString() : ''} • {formatPayment(s.paymentMethod)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</div>
                        <div className="text-lg font-black text-green-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.total || 0))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedSaleId(isExpanded ? '' : saleId)}
                          className="px-4 py-2 rounded-xl border border-white/10 bg-slate-950/40 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-white"
                        >
                          {isExpanded ? 'Ocultar Itens' : 'Ver Itens'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintSale(saleId)}
                          className="px-4 py-2 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2"
                        >
                          <Printer size={14} />
                          Imprimir
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleVoidSale(saleId)}
                          disabled={status === 'voided'}
                          className="px-4 py-2 rounded-xl border border-white/10 bg-red-500/10 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest text-red-200 disabled:opacity-50 disabled:hover:bg-red-500/10 disabled:cursor-not-allowed"
                        >
                          Estornar
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      {Array.isArray(s.items) && s.items.map((i: any, idx: number) => (
                        <div key={`${saleId}-${idx}`} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{i.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              {i.sku ? `${i.sku} • ` : ''}{i.quantity}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(i.unitPrice || 0))}
                            </div>
                          </div>
                          <div className="text-xs font-black text-green-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(i.total || 0))}
                          </div>
                        </div>
                      ))}
                      {s.paymentMethod === 'money' && (
                        <div className="mt-2 pt-3 border-t border-white/5 grid grid-cols-2 gap-3">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Recebido: <span className="text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.cashReceived || 0))}</span>
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                            Troco: <span className="text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.changeAmount || 0))}</span>
                          </div>
                        </div>
                      )}
                      {status === 'voided' && (
                        <div className="mt-2 pt-3 border-t border-white/5 text-[10px] font-bold text-amber-300">
                          {(s.voidedAt ? `Estornada em ${new Date(s.voidedAt).toLocaleString()}. ` : '')}{s.voidReason ? `Motivo: ${s.voidReason}` : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {visibleSales.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs font-medium uppercase tracking-widest">
                Nenhuma venda encontrada.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Products Catalog (Left Side) */}
      <div className="flex-1 flex flex-col glass rounded-3xl p-6 border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <ShoppingCart className="text-primary" />
                Frente de Caixa
              </h2>
              {cashierName && (
                <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <User size={14} className="text-slate-500" />
                  Caixa: <span className="text-white">{cashierName}</span>
                </div>
              )}
            </div>
            {logoUrl && showLogo && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-10 w-10 rounded-2xl object-cover border border-white/10 bg-slate-950/40"
              />
            )}
          </div>
          {pdvMessage && (
            <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${pdvMessage.type === 'success' ? 'text-green-300 border-green-500/30 bg-green-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>
              {pdvMessage.text}
            </div>
          )}
          <div className="flex items-center gap-3">
            {logoUrl && (
              <button
                type="button"
                onClick={() => setShowLogo(v => !v)}
                className={`px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${showLogo ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900/50 border-white/5 text-slate-300 hover:bg-white/5'}`}
                title="Mostrar/ocultar logo no PDV"
              >
                <Image size={14} />
                Logo
              </button>
            )}
            <button
              type="button"
              onClick={() => setAutoPrint(v => !v)}
              className={`px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${autoPrint ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900/50 border-white/5 text-slate-300 hover:bg-white/5'}`}
              title="Imprimir automaticamente ao finalizar"
            >
              <Printer size={14} />
              Auto
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className="px-4 py-2 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2"
              title="Histórico (F6)"
            >
              <History size={14} />
              Histórico
            </button>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar ou Bipar (SKU/Código)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
                ref={searchInputRef}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm text-white"
              />
            </div>
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
            {cart.map((item, idx) => (
              <button
                key={item.product.id}
                type="button"
                onClick={() => setSelectedCartIndex(idx)}
                className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all ${idx === selectedCartIndex ? 'bg-primary/10 border-primary/40' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{item.product.name}</p>
                  <p className="text-[10px] text-green-400 font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-lg border border-white/10 shrink-0">
                  <button type="button" onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, -1) }} className="p-1 hover:text-primary transition-colors text-slate-400"><Minus size={12} /></button>
                  <span className="text-xs font-black w-4 text-center text-white">{item.quantity}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, 1) }} className="p-1 hover:text-primary transition-colors text-slate-400"><Plus size={12} /></button>
                </div>
                
                <button type="button" onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id) }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </button>
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

            {paymentMethod === 'money' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Recebido</div>
                  <input
                    type="text"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    ref={cashInputRef}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-white"
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Troco</div>
                  <div className="w-full px-4 py-3 bg-slate-900/30 border border-white/5 rounded-xl text-sm font-black text-white flex items-center justify-between">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(changeValue)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-end justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total a Pagar</span>
              <span className="text-3xl font-black text-white tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </span>
            </div>

            <button 
              onClick={() => void handleCheckout()}
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
