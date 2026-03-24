import { X, Printer, Download, Share2, CheckCircle2, ShieldCheck, Zap, Barcode, FileText } from 'lucide-react'
import type { Transaction } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface BoletoModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction
}

export default function BoletoModal({ isOpen, onClose, transaction }: BoletoModalProps) {
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
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      })
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save(`Boleto_${transaction.id}.pdf`)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o PDF do boleto.')
    } finally {
      setIsExporting(false)
    }
  }

  const boletoLine = "00190.00009 02714.450004 00001.910201 5 95640000100000"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md print:hidden" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col text-slate-900 print:max-h-none print:shadow-none print:rounded-none">
        {/* Header (Non-printable) */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-black uppercase tracking-widest">Visualização de <span className="text-primary">Boleto</span></h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
              <Printer size={20} />
            </button>
            <button onClick={handleDownloadPDF} disabled={isExporting} className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all disabled:opacity-50">
              {isExporting ? <Zap size={20} className="animate-spin" /> : <Download size={20} />}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Boleto Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-10 bg-white">
          <div className="border-2 border-slate-900 p-8 space-y-8">
            {/* Top Bar */}
            <div className="flex items-center border-b-2 border-slate-900 pb-4">
              <div className="pr-8 border-r-2 border-slate-900">
                <h1 className="text-3xl font-black italic tracking-tighter">BANCO <span className="text-primary">WHATCH</span></h1>
              </div>
              <div className="px-8 border-r-2 border-slate-900">
                <p className="text-2xl font-black">001-9</p>
              </div>
              <div className="flex-1 pl-8 text-right">
                <p className="text-lg font-bold font-mono tracking-tight">{boletoLine}</p>
              </div>
            </div>

            {/* Main Info */}
            <div className="grid grid-cols-4 border-b-2 border-slate-900">
              <div className="col-span-3 border-r-2 border-slate-900 p-3">
                <p className="text-[8px] font-black uppercase mb-1">Local de Pagamento</p>
                <p className="text-xs font-bold uppercase">Pagável em qualquer banco até o vencimento</p>
              </div>
              <div className="p-3">
                <p className="text-[8px] font-black uppercase mb-1">Vencimento</p>
                <p className="text-xs font-bold text-right">15/04/2026</p>
              </div>
            </div>

            <div className="grid grid-cols-4 border-b-2 border-slate-900">
              <div className="col-span-3 border-r-2 border-slate-900 p-3">
                <p className="text-[8px] font-black uppercase mb-1">Beneficiário</p>
                <p className="text-xs font-bold uppercase">WHATCH PRO TECNOLOGIA LTDA - CNPJ: 00.000.000/0001-00</p>
              </div>
              <div className="p-3">
                <p className="text-[8px] font-black uppercase mb-1">Agência/Código Beneficiário</p>
                <p className="text-xs font-bold text-right">0001 / 123456-7</p>
              </div>
            </div>

            <div className="grid grid-cols-5 border-b-2 border-slate-900">
              <div className="border-r-2 border-slate-900 p-3">
                <p className="text-[8px] font-black uppercase mb-1">Data do Documento</p>
                <p className="text-xs font-bold">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="border-r-2 border-slate-900 p-3">
                <p className="text-[8px] font-black uppercase mb-1">No. do Documento</p>
                <p className="text-xs font-bold">{transaction.id.slice(-8)}</p>
              </div>
              <div className="border-r-2 border-slate-900 p-3">
                <p className="text-[8px] font-black uppercase mb-1">Espécie Doc.</p>
                <p className="text-xs font-bold">RC</p>
              </div>
              <div className="border-r-2 border-slate-900 p-3">
                <p className="text-[8px] font-black uppercase mb-1">Aceite</p>
                <p className="text-xs font-bold">N</p>
              </div>
              <div className="p-3">
                <p className="text-[8px] font-black uppercase mb-1">Data Processamento</p>
                <p className="text-xs font-bold text-right">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 border-b-2 border-slate-900">
              <div className="col-span-3 border-r-2 border-slate-900 p-6 space-y-4">
                <p className="text-[8px] font-black uppercase">Instruções (Texto de responsabilidade do beneficiário)</p>
                <div className="text-xs font-bold space-y-1">
                  <p>REFERENTE A: {transaction.description.toUpperCase()}</p>
                  <p>NÃO RECEBER APÓS 30 DIAS DO VENCIMENTO.</p>
                  <p>MULTA DE 2% APÓS O VENCIMENTO + JUROS DE 1% AO MÊS.</p>
                </div>
              </div>
              <div className="divide-y-2 divide-slate-900">
                <div className="p-3">
                  <p className="text-[8px] font-black uppercase mb-1">Valor do Documento</p>
                  <p className="text-sm font-black text-right">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50">
                  <p className="text-[8px] font-black uppercase mb-1">(-) Descontos / Abatimentos</p>
                </div>
                <div className="p-3 bg-slate-50">
                  <p className="text-[8px] font-black uppercase mb-1">(+) Mora / Multa</p>
                </div>
                <div className="p-3">
                  <p className="text-[8px] font-black uppercase mb-1">(=) Valor Cobrado</p>
                  <p className="text-sm font-black text-right">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Pagador */}
            <div className="p-3">
              <p className="text-[8px] font-black uppercase mb-2">Pagador</p>
              <div className="text-xs font-bold ml-10">
                <p>CLIENTE FINAL WHATCH PRO - CPF/CNPJ: 000.000.000-00</p>
                <p>RUA DAS TECNOLOGIAS, 1000 - FUTURO</p>
                <p>SÃO PAULO - SP - 01001-000</p>
              </div>
            </div>

            {/* Barcode Mock */}
            <div className="pt-10 flex flex-col items-center gap-4">
              <div className="w-full h-24 bg-slate-900 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 shimmer opacity-10"></div>
                <Barcode size={64} className="text-white" />
              </div>
              <p className="text-[10px] font-black tracking-[0.5em] text-slate-400">00190000090271445000400001910201595640000100000</p>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-between border-t-2 border-dashed border-slate-200 pt-8">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Autenticação Digital Whatch Pro Billing v1.0</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Recibo do Pagador - Destaque aqui</p>
          </div>
        </div>
      </div>
    </div>
  )
}
