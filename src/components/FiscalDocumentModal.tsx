import { X, Printer, Download, Share2, CheckCircle2, ShieldCheck, Zap, Loader2 } from 'lucide-react'
import type { Transaction, FiscalDocument } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface FiscalDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction
  document: FiscalDocument
}

export default function FiscalDocumentModal({ isOpen, onClose, transaction, document }: FiscalDocumentModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return
    
    try {
      setIsExporting(true)
      const content = contentRef.current
      const dataUrl = await toPng(content, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#020617', // Match dark theme slate-950
      })
      
      const width = content.offsetWidth
      const height = content.offsetHeight

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [width, height]
      })
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)
      pdf.save(`Fiscal_${document.number}_${document.type}.pdf`)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o PDF do documento fiscal.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md print:hidden" onClick={onClose} />
      
      <div 
        ref={contentRef}
        className="relative w-full max-w-4xl glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col bg-slate-950 print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5 print:bg-white print:border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center glow-primary shadow-lg shadow-primary/20 print:shadow-none">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest leading-none mb-1 print:text-slate-900">
                {document.type} <span className="text-primary">Digital</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Autenticação Fiscal Whatch Pro OS</p>
            </div>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button onClick={handlePrint} className="p-3 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all border border-transparent hover:border-primary/20">
              <Printer size={20} />
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={isExporting}
              className="p-3 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all border border-transparent hover:border-primary/20 disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            </button>
            <div className="w-px h-8 bg-white/10 mx-2" />
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-6 rounded-3xl bg-green-500/10 border border-green-500/20 relative overflow-hidden group">
            <div className="absolute inset-0 shimmer opacity-10"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white glow-primary">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-green-500 uppercase tracking-widest leading-none mb-1">Documento Autorizado</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Protocolo de Autorização: 135240001827364</p>
              </div>
            </div>
            <div className="text-right relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Data de Emissão</p>
              <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{new Date(document.issueDate).toLocaleString()}</p>
            </div>
          </div>

          {/* Fiscal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número do Documento</p>
              <p className="text-lg font-black text-slate-900 dark:text-white font-mono">{document.number}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Série</p>
              <p className="text-lg font-black text-slate-900 dark:text-white font-mono">{document.series}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo</p>
              <p className="text-lg font-black text-slate-900 dark:text-white font-mono">55 (Eletrônico)</p>
            </div>
          </div>

          {/* Access Key */}
          <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chave de Acesso</p>
            <p className="text-sm font-bold font-mono tracking-widest text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {document.accessKey.match(/.{1,4}/g)?.join(' ')}
            </p>
            <div className="flex justify-center pt-4">
              <div className="p-4 bg-white rounded-2xl shadow-inner">
                {/* Mock QR Code */}
                <div className="w-32 h-32 bg-slate-900 flex items-center justify-center relative group">
                    <div className="absolute inset-0 shimmer opacity-20"></div>
                    <Zap size={48} className="text-primary animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Items / Values */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Detalhes da Transação</h3>
              <div className="h-px flex-1 bg-white/10 mx-6"></div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{transaction.description}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Categoria: {transaction.category}</p>
                </div>
                <p className="text-sm font-black font-mono">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 pt-6">
                <div className="flex items-center gap-12 text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                    <span className="text-sm font-bold font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}</span>
                </div>
                <div className="flex items-center gap-12 text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-widest">Tributos (Aprox. 14.5%)</span>
                    <span className="text-sm font-bold font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount * 0.145)}</span>
                </div>
                <div className="h-px w-64 bg-white/10 my-2"></div>
                <div className="flex items-center gap-12">
                    <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Total Líquido</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono glow-text">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                    </span>
                </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-950/40 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse glow-primary"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Whatch Pro Secure Fiscal Engine v2.4</span>
          </div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter italic">Documento emitido eletronicamente. Dispensa assinatura manuscrita.</p>
        </div>
      </div>
    </div>
  )
}
