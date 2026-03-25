import { useState } from 'react'
import { Plus, Search, TrendingUp, TrendingDown, DollarSign, Wallet, FileText, ArrowUpRight, ArrowDownLeft, Receipt, MessageSquare, Edit2, Trash2, ShieldCheck, Zap, Printer, X, CreditCard } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import { useSEFAZ } from '../hooks/useSEFAZ'
import type { Transaction, FiscalDocument } from '../types'
import FiscalDocumentModal from '../components/FiscalDocumentModal'
import BoletoModal from '../components/BoletoModal'
import SEFAZService from '../lib/sefaz'
import NuvemFiscalService from '../lib/nuvemfiscal'
import generateNFEXML from '../lib/fiscalXML'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Finance() {
  const { transactions, setTransactions, fiscalDocuments, setFiscalDocuments, clients, saveData } = useData()
  const { user } = useAuth()
  const { configuracaoSEFAZ, getCertificadoAtivo } = useSEFAZ()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false)
  const [isBoletoModalOpen, setIsBoletoModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<FiscalDocument | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [gerando, setGerando] = useState(false)

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'income' as 'income' | 'expense',
    category: 'Serviços',
    date: new Date().toISOString().split('T')[0],
    clientId: ''
  })

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const balance = transactions.reduce((acc, t) => {
    return t.type === 'income' ? acc + t.amount : acc - t.amount
  }, 0)

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)

  const handleSave = () => {
    if (!user) return

    let updatedTransactions: Transaction[] = []
    if (editingTransaction) {
      updatedTransactions = transactions.map(t => t.id === editingTransaction.id ? { ...editingTransaction, ...formData } : t)
    } else {
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        userId: user.id,
        ...formData,
        status: 'pending'
      }
      updatedTransactions = [...transactions, newTransaction]
    }
    
    setTransactions(updatedTransactions)
    saveData('transactions', updatedTransactions)
    setIsModalOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      const updatedTransactions = transactions.filter(t => t.id !== id)
      saveData('transactions', updatedTransactions)
    }
  }

  const openModal = (transaction: Transaction | null = null) => {
    if (transaction) {
      setEditingTransaction(transaction)
      setFormData({
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        clientId: transaction.clientId || ''
      })
    } else {
      setEditingTransaction(null)
      setFormData({
        description: '',
        amount: 0,
        type: 'income',
        category: 'Serviços',
        date: new Date().toISOString().split('T')[0],
        clientId: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleGenerateBoleto = (t: Transaction) => {
    setSelectedTransaction(t)
    setIsBoletoModalOpen(true)
  }

  const handleWhatsAppBilling = (t: Transaction) => {
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)
    const message = `🚀 *WHATCH PRO - COBRANÇA DIGITAL*\n\nOlá! Identificamos uma pendência referente a: *${t.description}*\n\n💰 *Valor:* ${formattedAmount}\n📅 *Vencimento:* 15/04/2026\n\n🔗 *Acesse seu boleto aqui:* [LINK_SIMULADO]\n\n_Whatch Pro OS - Gestão Empresarial Futurista_`
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }async (t: Transaction, type: 'NF-e' | 'NFC-e' | 'Cupom') => {
    if (!user || !configuracaoSEFAZ) {
      alert('⚠️ Configure SEFAZ em Configurações → Receita Federal');
      return;
    }

    setGerando(true);
    try {
      // Verifica se já existe documento
      const existingDoc = fiscalDocuments.find(d => d.transactionId === t.id && d.type === type);
      
      if (existingDoc) {
        setSelectedTransaction(t);
        setSelectedDocument(existingDoc);
        setIsFiscalModalOpen(true);
        return;
      }

      // Gera chave de acesso
      const sefazService = new SEFAZService({
        cnpj: configuracaoSEFAZ.cnpj,
        environment: configuracaoSEFAZ.ambiente,
        uf: configuracaoSEFAZ.uf,
        enableDebug: true
      });

      const modelo = type === 'NF-e' ? '55' : type === 'NFC-e' ? '65' : '65';
      const aamm = new Date().toISOString().slice(2, 7).replace('-', '');
      
      const accessKey = sefazService.generateAccessKey({
        uf: configuracaoSEFAZ.uf === 'SP' ? '35' : '30', // Código IBGE
        yearMonth: aamm,
        cnpj: configuracaoSEFAZ.cnpj,
        model: modelo,
        series: configuracaoSEFAZ.serieNFe,
        number: configuracaoSEFAZ.proximoNumeroNFe.toString()
      });

      // Se usar Nuvemfiscal (híbrido ou integrador)
      if (configuracaoSEFAZ.tipoIntegracao === 'nuvemfiscal' || configuracaoSEFAZ.tipoIntegracao === 'hibrido') {
        if (!configuracaoSEFAZ.nuvemfiscalApiKey) {
          alert('❌ API Key Nuvemfiscal não configurada');
          return;
        }

        const nfService = new NuvemFiscalService({
          apiKey: configuracaoSEFAZ.nuvemfiscalApiKey,
          environment: configuracaoSEFAZ.ambiente === 'producao' ? 'producao' : 'sandbox',
          enableDebug: true
        });

        // Prepara dados para enviar
        const nfeData = {
          natureza_operacao: 'VENDA',
          modelo: type === 'NF-e' ? 'nfe' : 'nfce' as any,
          serie: parseInt(configuracaoSEFAZ.serieNFe),
          numero_nf: configuracaoSEFAZ.proximoNumeroNFe,
          data_emissao: t.date,
          tipo_documento: 'SAIDA' as any,
          natureza_operacao_codigo: 5102,
          fornecedor: {
            nome: configuracaoSEFAZ.razaoSocial,
            nome_fantasia: configuracaoSEFAZ.nomeFantasia,
            inscricao_estadual: configuracaoSEFAZ.inscricaoEstadual,
            cnpj: configuracaoSEFAZ.cnpj,
            endereco: {
              logradouro: configuracaoSEFAZ.logradouro,
              numero: configuracaoSEFAZ.numero,
              complemento: configuracaoSEFAZ.complemento,
              bairro: configuracaoSEFAZ.bairro,
              municipio: configuracaoSEFAZ.municipio,
              uf: configuracaoSEFAZ.uf,
              cep: configuracaoSEFAZ.cep
            },
            phone: configuracaoSEFAZ.telefone,
            email: configuracaoSEFAZ.emailNotaFiscal
          },
          itens: [{
            descricao: t.description,
            ncm: '82029000', // NCM padrão para serviços
            cfop: '5102', // CFOP venda
            quantidade: 1,
            unidade: 'UN',
            valor_unitario: t.amount,
            valor_total: t.amount,
            origem: 0,
            tributos: {
              icms_aliquota: 18,
              pis_aliquota: 7.6,
              cofins_aliquota: 7.6
            }
          }],
          valor_produtos: t.amount,
          valor_total: t.amount,
          pagamentos: [{
            tipo_pagamento: 'TRANSFERENCIA' as any,
            valor: t.amount
          }]
        };

        try {
          const resultado = await nfService.emitirNFe(nfeData as any);
          
          const newDoc: FiscalDocument = {
            id: resultado.id,
            userId: user.id,
            transactionId: t.id,
            type,
            number: resultado.numero_nf.toString(),
            series: configuracaoSEFAZ.serieNFe,
            accessKey: resultado.chave_acesso,
            issueDate: new Date().toISOString(),
            amount: t.amount,
            status: resultado.status as any,
            protocoloAutorizacao: resultado.protocolo_autorizacao,
            dataAutorizacao: resultado.data_autorizacao,
            nuvemfiscalId: resultado.id
          };

          const updatedDocs = [...fiscalDocuments, newDoc];
          saveData('fiscal_documents', updatedDocs);
          
          setSelectedTransaction(t);
          setSelectedDocument(newDoc);
          setIsFiscalModalOpen(true);
        } catch (error) {
          console.error('Erro Nuvemfiscal:', error);
          alert(`❌ Erro ao emitir: ${error instanceof Error ? error.message : 'Desconhecido'}`);
        }
      } else {
        // SEFAZ direto - requer certificado
        const cert = getCertificadoAtivo();
        if (!cert) {
          alert('❌ Nenhum certificado digital ativo');
          return;
        }

        // Gera documento mock (em produção, seria assinado e enviado via SOAP)
        const newDoc: FiscalDocument = {
          id: crypto.randomUUID(),
          userId: user.id,
          transactionId: t.id,
          type,
          number: configuracaoSEFAZ.proximoNumeroNFe.toString(),
          series: configuracaoSEFAZ.serieNFe,
          accessKey,
          issueDate: new Date().toISOString(),
          amount: t.amount,
          status: 'enviado'
        };

        const updatedDocs = [...fiscalDocuments, newDoc];
        saveData('fiscal_documents', updatedDocs);
        
        setSelectedTransaction(t);
        setSelectedDocument(newDoc);
        setIsFiscalModalOpen(true);
      }
    } catch (error) {
      console.error('Erro ao gerar NF-e:', error);
      alert(`❌ Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    } finally {
      setGerando(false);
    }
    setSelectedDocument(newDoc)
    setIsFiscalModalOpen(true)
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Gestão <span className="text-primary glow-text">Financeira</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Controle de caixa, emissão fiscal e faturamento.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Nova Transação
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60 card-hover group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <Wallet size={32} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Saldo Consolidado</p>
          <h3 className={cn(
            "text-3xl font-black tracking-tightest transition-all duration-500",
            balance >= 0 ? "text-slate-900 dark:text-white" : "text-red-500"
          )}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
          </h3>
        </div>

        <div className="glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60 card-hover group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-green-500/10 text-green-500 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <TrendingUp size={32} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Total Receitas</p>
          <h3 className="text-3xl font-black text-green-500 tracking-tightest">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income)}
          </h3>
        </div>

        <div className="glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60 card-hover group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <TrendingDown size={32} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Total Despesas</p>
          <h3 className="text-3xl font-black text-red-500 tracking-tightest">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expenses)}
          </h3>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
        <div className="p-8 border-b border-white/20 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tightest">Fluxo de Caixa</h3>
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
            <input
              type="text"
              placeholder="Buscar transação..."
              className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/60 border border-white/50 dark:border-slate-600/60 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium placeholder:text-slate-600 dark:placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Transação</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Categoria</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Valor</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Data</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Ações Fiscais</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                        t.type === 'income' ? "bg-green-50/10 text-green-500 shadow-inner" : "bg-red-50/10 text-red-500 shadow-inner"
                      )}>
                        {t.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{t.description}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Status: {t.status}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className={cn(
                      "text-sm font-black font-mono tracking-tightest",
                      t.type === 'income' ? "text-green-500" : "text-red-500"
                    )}>
                      {t.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-400">{t.date}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleGenerateFiscal(t, 'NF-e')}
                        disabled={gerando}
                        className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 group/btn shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Emitir NF-e (Nota Fiscal Eletrônica)"
                      >
                        {gerando ? <div className="animate-spin" size={14}>⟳</div> : <ShieldCheck size={14} className="group-hover/btn:scale-110 transition-transform" />}
                        {gerando ? 'Processando...' : 'NF-e'}
                      </button>
                      <button 
                        onClick={() => handleGenerateFiscal(t, 'NFC-e')}
                        disabled={gerando}
                        className="px-3 py-1.5 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all flex item gaps-1.5 group/btn shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Emitir NFC-e (Consumidor)"
                      >
                        {gerando ? <div className="animate-spin">⟳</div> : <Zap size={14} className="group-hover/btn:scale-110 transition-transform" />}
                        {gerando ? '...' : 'NFC-e'}
                      </button>
                      <button 
                        onClick={() => handleGenerateFiscal(t, 'Cupom')}
                        disabled={gerando}
                        className="px-3 py-1.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5 group/btn shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Gerar Cupom Fiscal"
                      >
                        {gerando ? <div className="animate-spin">⟳</div> : <Receipt size={14} className="group-hover/btn:scale-110 transition-transform" />}
                        {gerando ? '...' : 'Cupom'}
                      </button>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleGenerateBoleto(t)}
                        className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        title="Gerar Boleto"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => handleWhatsAppBilling(t)}
                        className="p-2 text-slate-500 hover:text-green-500 hover:bg-green-500/10 rounded-xl transition-all"
                        title="Cobranca WhatsApp"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button 
                        onClick={() => openModal(t)}
                        className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Excluir"
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

      {/* Modal Transação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest">
                {editingTransaction ? 'Editar' : 'Nova'} <span className="text-primary">Transação</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    formData.type === 'income' 
                      ? "bg-green-500/10 border-green-500 text-green-500 shadow-lg shadow-green-500/10" 
                      : "bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400"
                  )}
                >
                  <TrendingUp size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Receita</span>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    formData.type === 'expense' 
                      ? "bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-500/10" 
                      : "bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400"
                  )}
                >
                  <TrendingDown size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Despesa</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descrição</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Consultoria Técnica"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Data</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option>Serviços</option>
                    <option>Vendas</option>
                    <option>Aluguel</option>
                    <option>Salários</option>
                    <option>Infraestrutura</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vincular Cliente (Obrigatório para Boleto)</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  >
                    <option value="">Nenhum Cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
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
                Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fiscal */}
      {selectedTransaction && selectedDocument && (
        <FiscalDocumentModal
          isOpen={isFiscalModalOpen}
          onClose={() => {
            setIsFiscalModalOpen(false)
            setSelectedTransaction(null)
            setSelectedDocument(null)
          }}
          transaction={selectedTransaction}
          document={selectedDocument}
        />
      )}

      {/* Modal Boleto */}
      {selectedTransaction && (
        <BoletoModal
          isOpen={isBoletoModalOpen}
          onClose={() => {
            setIsBoletoModalOpen(false)
            setSelectedTransaction(null)
          }}
          transaction={selectedTransaction}
        />
      )}
    </div>
  )
}
