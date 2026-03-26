import { X, Printer, Download, Share2, CheckCircle2, ShieldCheck, Zap, Barcode, FileText, Loader2, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react'
import type { Transaction } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useRef, useState, useEffect } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { useData } from '../hooks/useData'

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
  const [isGenerating, setIsGenerating] = useState(false)
  const [asaasData, setAsaasData] = useState<{
    bankSlipUrl?: string;
    invoiceUrl?: string;
    identificationField?: string;
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { generateAsaasBoleto, clients } = useData()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && transaction && !asaasData) {
      handleGenerateRealBoleto()
    }
  }, [isOpen, transaction])

  const handleGenerateRealBoleto = async () => {
    const client = clients.find(c => c.id === transaction.clientId)
    if (!client) {
      setError('Cliente não encontrado para esta transação.')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      const data = await generateAsaasBoleto(transaction, client)
      setAsaasData(data)
    } catch (err: any) {
      console.error('Erro Asaas:', err)
      setError(err.message || 'Ocorreu um erro ao gerar o boleto no Asaas. Verifique sua conexão e o token de API.')
    } finally {
      setIsGenerating(false)
    }
  }

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
        backgroundColor: '#ffffff',
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
      pdf.save(`Boleto_${transaction.id}.pdf`)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o PDF do boleto.')
    } finally {
      setIsExporting(false)
    }
  }

  const boletoLine = asaasData?.identificationField || "00190.00009 02714.450004 00001.910201 5 95640000100000"

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
            {asaasData?.bankSlipUrl && (
              <a 
                href={asaasData.bankSlipUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase"
              >
                <ExternalLink size={16} />
                Link Asaas
              </a>
            )}
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
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4 text-center">
              <Loader2 size={48} className="text-primary animate-spin" />
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">Gerando Boleto</h3>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed">Estamos preparando o seu boleto com segurança via Asaas...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
              <div className="p-4 bg-red-50 text-red-500 rounded-3xl">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">Erro na Geração</h3>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed">{error}</p>
              <button 
                onClick={handleGenerateRealBoleto}
                className="mt-4 px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest glow-primary hover:scale-105 transition-all flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Tentar Novamente
              </button>
            </div>
          ) : (
            <>
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
                    <p className="text-[8px] font-black uppercase mb-1">Nº do Documento</p>
                    <p className="text-xs font-bold uppercase">{transaction.id.split('-')[0]}</p>
                  </div>
                  <div className="border-r-2 border-slate-900 p-3">
                    <p className="text-[8px] font-black uppercase mb-1">Espécie Doc.</p>
                    <p className="text-xs font-bold uppercase">DS</p>
                  </div>
                  <div className="border-r-2 border-slate-900 p-3">
                    <p className="text-[8px] font-black uppercase mb-1">Aceite</p>
                    <p className="text-xs font-bold uppercase">N</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[8px] font-black uppercase mb-1">Data Processamento</p>
                    <p className="text-xs font-bold text-right">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-5 border-b-2 border-slate-900">
                  <div className="border-r-2 border-slate-900 p-3">
                    <p className="text-[8px] font-black uppercase mb-1">Uso do Banco</p>
                    <p className="text-xs font-bold"></p>
                  </div>
                  <div className="border-r-2 border-slate-900 p-3">
                    <p className="text-[8px] font-black uppercase mb-1">Carteira</p>
                    <p className="text-xs font-bold uppercase">109</p>
                  </div>
                  <div className="border-r-2 border-slate-900 p-3">
                    <p className="text-[8px] font-black uppercase mb-1">Espécie</p>
                    <p className="text-xs font-bold uppercase">R$</p>
                  </div>
                  <div className="border-r-2 border-slate-900 p-3">
                    <p className="text-[8px] font-black uppercase mb-1">Quantidade</p>
                    <p className="text-xs font-bold"></p>
                  </div>
                  <div className="p-3">
                    <p className="text-[8px] font-black uppercase mb-1">Valor</p>
                    <p className="text-xs font-bold text-right"></p>
                  </div>
                </div>

                {/* Instructions and Value */}
                <div className="grid grid-cols-4 border-b-2 border-slate-900">
                  <div className="col-span-3 border-r-2 border-slate-900 p-3 space-y-2">
                    <p className="text-[8px] font-black uppercase mb-1">Instruções (Texto de Responsabilidade do Beneficiário)</p>
                    <p className="text-[10px] font-bold uppercase">NÃO RECEBER APÓS O VENCIMENTO</p>
                    <p className="text-[10px] font-bold uppercase">PROCESSO DE COBRANÇA WHATCH PRO OS - EMISSÃO AUTOMÁTICA</p>
                    <p className="text-[10px] font-bold uppercase">REFERENTE A: {transaction.description}</p>
                  </div>
                  <div className="p-0">
                    <div className="border-b-2 border-slate-900 p-3">
                      <p className="text-[8px] font-black uppercase mb-1">(=) Valor do Documento</p>
                      <p className="text-sm font-black text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[8px] font-black uppercase mb-1">(-) Descontos / Abatimentos</p>
                      <p className="text-xs font-bold text-right">0,00</p>
                    </div>
                  </div>
                </div>

                {/* Payer Info */}
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
                    <Barcode size="64" className="text-white" />
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
            </>
          )}
      </div>
    </div>
  </div>
)
}
