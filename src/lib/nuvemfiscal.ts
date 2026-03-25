/**
 * NuvemFiscal API Integration - Integrador Híbrido de NF-e
 * Simplifica integração sem necessidade de certificado local
 * Suporta: NF-e, NFC-e, Cupom Fiscal e Homologação
 */

export interface NuvemFiscalConfig {
  apiKey: string;
  environment: 'sandbox' | 'producao';
  enableDebug?: boolean;
}

export interface NuvemFiscalNFe {
  natureza_operacao: string; // ex: "VENDA"
  modelo: 'nfe' | 'nfce'; // 55 = NF-e, 65 = NFC-e
  serie: number;
  numero_nf: number;
  data_emissao: string; // YYYY-MM-DD
  data_saida_entrada?: string;
  tipo_documento: 'ENTRADA' | 'SAIDA';
  natureza_operacao_codigo: number; // 5102 = venda
  
  // Emitente
  fornecedor: {
    nome: string;
    nome_fantasia?: string;
    inscricao_estadual: string;
    cnpj: string;
    endereco: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
    };
    telefone?: string;
    email?: string;
  };

  // Destinatário
  cliente?: {
    nome: string;
    cpf?: string;
    cnpj?: string;
    email?: string;
    endereco?: {
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
    };
  };

  // Itens
  itens: Array<{
    descricao: string;
    ncm: string; // Nomenclatura Comum
    cfop: string; // Código Fiscal
    quantidade: number;
    unidade: string; // UN, KG, M, L
    valor_unitario: number;
    valor_total: number;
    origem: number; // 0=Nac, 1=EstRanc, 2=Importado
    tributos?: {
      icms_aliquota: number;
      pis_aliquota?: number;
      cofins_aliquota?: number;
      ipi_aliquota?: number;
    };
  }>;

  // Totais
  valor_produtos: number;
  valor_frete?: number;
  valor_desconto?: number;
  valor_outras_despesas?: number;
  valor_total: number;

  // Pagamento
  pagamentos: Array<{
    tipo_pagamento: 'DINHEIRO' | 'CHEQUE' | 'TRANSFERENCIA' | 'CREDITO' | 'DEBITO' | 'BOLETO' | 'PIX';
    valor: number;
    parcelas?: number;
    data_vencimento?: string;
  }>;

  informacoes_adicionais_interesse_fisco?: string;
  informacoes_complementares?: string;
}

export interface NuvemFiscalResponse {
  id: string;
  chave_acesso: string;
  numero_nf: number;
  serie: number;
  status: 'pendente' | 'processando' | 'autorizado' | 'rejeitado' | 'cancelado';
  protocolo_autorizacao?: string;
  data_autorizacao?: string;
  xml_envio?: string;
  xml_retorno?: string;
  motivo_rejeicao?: string;
  created_at: string;
}

export class NuvemFiscalService {
  private config: NuvemFiscalConfig;
  private baseURL: string;

  constructor(config: NuvemFiscalConfig) {
    this.config = config;
    this.baseURL = config.environment === 'sandbox' 
      ? 'https://api.sandbox.nuvemfiscal.com.br/v1'
      : 'https://api.nuvemfiscal.com.br/v1';
  }

  /**
   * Cria e emite uma NF-e/NFC-e
   */
  async emitirNFe(nfe: NuvemFiscalNFe): Promise<NuvemFiscalResponse> {
    try {
      const response = await fetch(`${this.baseURL}/nfe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nfe),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro NuvemFiscal: ${error.errors?.[0]?.message || 'Desconhecido'}`);
      }

      const data = await response.json();

      if (this.config.enableDebug) {
        console.log('✅ NF-e emitida com sucesso:', data.chave_acesso);
      }

      return data;
    } catch (error) {
      console.error('❌ Erro ao emitir NF-e:', error);
      throw error;
    }
  }

  /**
   * Cancela uma NF-e autorizada
   */
  async cancelarNFe(chaveAcesso: string, justificativa: string): Promise<{ status: string; protocolo: string }> {
    try {
      const response = await fetch(`${this.baseURL}/nfe/${chaveAcesso}/cancelamento`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ justificativa, sequencial_cancelamento: 1 }),
      });

      const data = await response.json();

      if (this.config.enableDebug) {
        console.log('✅ NF-e cancelada:', chaveAcesso);
      }

      return data;
    } catch (error) {
      console.error('❌ Erro ao cancelar NF-e:', error);
      throw error;
    }
  }

  /**
   * Consulta status de uma NF-e
   */
  async consultarStatus(id: string): Promise<NuvemFiscalResponse> {
    try {
      const response = await fetch(`${this.baseURL}/nfe/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erro ao consultar status:', error);
      throw error;
    }
  }

  /**
   * Descarrega XML da NF-e
   */
  async downloadXML(id: string, tipo: 'envio' | 'retorno'): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/nfe/${id}/download?tipo=${tipo}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) throw new Error('Erro ao descarregar XML');

      const xml = await response.text();
      return xml;
    } catch (error) {
      console.error('❌ Erro ao descarregar XML:', error);
      throw error;
    }
  }

  /**
   * Gera PDF da NF-e
   */
  async gerarDANFE(id: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseURL}/nfe/${id}/danfe`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) throw new Error('Erro ao gerar DANFE');

      return await response.blob();
    } catch (error) {
      console.error('❌ Erro ao gerar DANFE:', error);
      throw error;
    }
  }

  /**
   * Lista todas as NF-es
   */
  async listarNFes(pagina: number = 1, limite: number = 50): Promise<{
    total: number;
    pagina: number;
    dados: NuvemFiscalResponse[];
  }> {
    try {
      const response = await fetch(`${this.baseURL}/nfe?pagina=${pagina}&limite=${limite}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erro ao listar NF-es:', error);
      throw error;
    }
  }

  /**
   * Verifica limite disponível
   */
  async verificarLimite(): Promise<{
    limite_disponivel: number;
    limit_utilizado: number;
    nfes_mês: number;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/account/limite`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erro ao verificar limite:', error);
      throw error;
    }
  }
}

export default NuvemFiscalService;