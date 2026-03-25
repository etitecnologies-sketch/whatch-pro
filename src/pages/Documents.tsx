import { useState } from 'react'
import { Search, FileText, ShieldCheck, Zap, Download, Printer, ExternalLink, Calendar, Filter, X } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import type { FiscalDocument } from '../types'
import FiscalDocumentModal from '../components/FiscalDocumentModal'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Documents() {
  const { fiscalDocuments, transactions } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'NF-e' | 'Cupom'>('all')
  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<FiscalDocument | null>(null)

  const filteredDocs = fiscalDocuments.filter(doc => {
    const matchesSearch = doc.number.includes(searchTerm) || 
                         doc.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || doc.type === filterType
    return matchesSearch && matchesType
  })

  const openDocument = (doc: FiscalDocument) => {
    setSelectedDoc(doc)
    setIsFiscalModalOpen(true)
  }

  const getTransaction = (id: string) => {
    return transactions.find(t => t.id === id)
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Central de <span className="text-primary glow-text">Documentos</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Histórico e gestão de todos os documentos fiscais emitidos.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60 card-hover">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">NFC-e</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{fiscalDocuments.filter(d => d.type === 'NF-e').length}</h3>
        </div>
        <div className="glass p-8 rounded-[32px] border border-white/40 dark:border-slate-800/50 card-hover">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total de Cupons</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{fiscalDocuments.filter(d => d.type === 'Cupom').length}</h3>
        </div>
        <div className="glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60 card-hover">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Cupom Fiscal</p>
            <h3 className="text-3xl font-black text-primary glow-text">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fiscalDocuments.reduce((acc, d) => acc + d.amount, 0))}
            </h3>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
        <div className="p-8 border-b border-white/20 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={() => setFilterType('all')}
              className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
              filterType === 'all' ? "bg-primary text-white glow-primary" : "bg-white/10 text-slate-400 hover:bg-white/20")}
            >Todos</button>
            <button 
              onClick={() => setFilterType('NF-e')}
              className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
              filterType === 'NF-e' ? "bg-primary text-white glow-primary" : "bg-white/10 text-slate-400 hover:bg-white/20")}
            >NF-e</button>
            <button 
              onClick={() => setFilterType('Cupom')}
              className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
              filterType === 'Cupom' ? "bg-primary text-white glow-primary" : "bg-white/10 text-slate-400 hover:bg-white/20")}
            >Cupons</button>
          </div>

          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
            <input
              type="text"
              placeholder="Número ou tipo..."
              className="w-full pl-12 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-700/50 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Documento</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Descrição</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Valor</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Emissão</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Visualizar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
              {filteredDocs.map((doc) => {
                const transaction = getTransaction(doc.transactionId)
                return (
                  <tr key={doc.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                          doc.type === 'NF-e' ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"
                        )}>
                          {doc.type === 'NF-e' ? <ShieldCheck size={20} /> : <Zap size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{doc.type} #{doc.number}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Série: {doc.series}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                        {transaction?.description || 'N/A'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black font-mono tracking-tightest">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.amount)}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={14} />
                        <span className="text-sm font-bold">{new Date(doc.issueDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => openDocument(doc)}
                        className="p-3 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all border border-transparent hover:border-primary/20"
                      >
                        <ExternalLink size={20} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDoc && (
        <FiscalDocumentModal 
          isOpen={isFiscalModalOpen}
          onClose={() => setIsFiscalModalOpen(false)}
          document={selectedDoc}
          transaction={getTransaction(selectedDoc.transactionId)!}
        />
      )}
    </div>
  )
}
