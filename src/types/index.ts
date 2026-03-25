export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sub-user';
  adminId?: string; // Link to the main admin (Multi-tenant hierarchy)
  avatar?: string;
  password?: string;
  permissions?: string[]; // Array of allowed modules (e.g., ['clients', 'inventory', 'quotations', 'appearance'])
}

export interface Quotation {
  id: string;
  userId: string; // ID of the user who created it
  adminId: string; // ID of the admin (for multi-tenancy)
  clientId: string;
  items: QuotationItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
  validUntil: string;
  createdAt: string;
  notes?: string;
}

export interface QuotationItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
  asaasId?: string; // ID do cliente no Asaas
}

export interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  startDate: string;
  cpf: string;
  phone: string;
  age: string;
  address: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  clientId: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  budget: number;
  deadline: string;
}

export interface Product {
  id: string;
  userId: string;
  adminId: string; // ID do admin (para multi-tenancy)
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  costPrice: number; // Preço de custo
  margin: number;    // Margem de lucro (%)
  taxRate: number;   // Impostos (%)
  price: number;     // Preço final de venda
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  status: 'completed' | 'pending';
  documentId?: string; // Link to FiscalDocument
  clientId?: string; // Link to Client for billing
}

export interface FiscalDocument {
  id: string;
  userId: string;
  transactionId: string;
  type: 'NF-e' | 'NFC-e' | 'Cupom' | 'SPED';
  number: string;
  series: string;
  accessKey: string;
  issueDate: string;
  amount: number;
  status: 'issued' | 'cancelled' | 'pending' | 'enviado' | 'rejeitado' | 'autorizado';
  xml?: string;
  json?: string; // Para dados em JSON
  protocoloAutorizacao?: string; // Protocolo de autorização SEFAZ
  dataAutorizacao?: string;
  motivo_rejeicao?: string;
  chaveRFC?: string; // Para SPED
  nuvemfiscalId?: string; // ID no Nuvemfiscal (para rastreamento)
}

/**
 * Configuração de Certificado Digital (e-CNPJ)
 */
export interface CertificadoDigital {
  id: string;
  userId: string;
  nomeArquivo: string;
  base64Data: string; // Arquivo .pfx em Base64
  senha: string; // Criptografada
  cnpjTitular: string;
  nomeTitular: string;
  dataVencimento: string; // ISO
  dataInstalacao: string;
  ativo: boolean;
  ambiente: 'homologacao' | 'producao';
}

/**
 * Configurações SEFAZ da Empresa
 */
export interface ConfiguracaoSEFAZ {
  id: string;
  userId: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  uf: string;
  municipio: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  
  // Configurações de emissão
  modeloNFe: '55' | '65'; // 55=NF-e, 65=NFC-e
  serieNFe: string;
  proximoNumeroNFe: number;
  
  // API/Integrador escolhido
  tipoIntegracao: 'sefaz' | 'nuvemfiscal' | 'hibrido';
  nuvemfiscalApiKey?: string;
  
  // Ambiente
  ambiente: 'homologacao' | 'producao';
  
  // Certificado
  certificadoDigitalAtivo: boolean;
  certificadoDigitalId?: string;
  
  // Configurações de SPED
  naturezaAtividade: '00' | '01' | '02'; // Comércio, Indústria, Prestação
  tipoEscrituracao: 'COMPLETA' | 'SIMPLIFICADA';
  
  // Contato para nota fiscal
  emailNotaFiscal?: string;
  telefone?: string;
  
  // Limites
  limiteNFeMensal?: number;
  nfeEmitidasMes?: number;
  
  dataCriacao: string;
  dataAtualizacao: string;
}
