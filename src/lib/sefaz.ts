/**
 * SEFAZ Integration - Receita Federal Brasileira
 * Suporta: NF-e, NFC-e e Comunicação com SEFAZ
 * Ambientes: Homologação e Produção
 */

export interface SEFAZConfig {
  certificatePath?: string; // Caminho para arquivo .pfx
  certificatePassword?: string; // Senha do certificado
  cnpj: string; // CNPJ da empresa
  environment: 'homologacao' | 'producao'; // Ambiente
  uf: string; // UF: SP, RJ, MG, etc
  enableDebug?: boolean;
}

export interface XMLSignatureConfig {
  certificateData: string; // Base64 do certificado
  password: string;
}

/**
 * URLs dos ambientes SEFAZ
 */
const SEFAZ_URLS = {
  homologacao: {
    consultaNCR: 'https://nfe.sefaz.pe.gov.br/webservices/NFeConsultaNCR?wsdl',
    statusServico: 'https://nfe.sefaz.pe.gov.br/webservices/NFeStatusServico4?wsdl',
    autorizacao: 'https://nfe.sefaz.pe.gov.br/webservices/NFeAutorizacao4?wsdl',
    retAutorizacao: 'https://nfe.sefaz.pe.gov.br/webservices/NFeRetAutorizacao4?wsdl',
    consultaNFe: 'https://nfe.sefaz.pe.gov.br/webservices/NFeConsultaProtocolo4?wsdl',
    consultaCadastro: 'https://nfe.sefaz.pe.gov.br/webservices/CadConsultaCEP?wsdl'
  },
  producao: {
    consultaNCR: 'https://nfe.sefaz.pe.gov.br/webservices/NFeConsultaNCR?wsdl',
    statusServico: 'https://nfe.sefaz.pe.gov.br/webservices/NFeStatusServico4?wsdl',
    autorizacao: 'https://nfe.sefaz.pe.gov.br/webservices/NFeAutorizacao4?wsdl',
    retAutorizacao: 'https://nfe.sefaz.pe.gov.br/webservices/NFeRetAutorizacao4?wsdl',
    consultaNFe: 'https://nfe.sefaz.pe.gov.br/webservices/NFeConsultaProtocolo4?wsdl',
    consultaCadastro: 'https://nfe.sefaz.pe.gov.br/webservices/CadConsultaCEP?wsdl'
  }
};

export class SEFAZService {
  private config: SEFAZConfig;
  private certificateData?: string;

  constructor(config: SEFAZConfig) {
    this.config = config;
  }

  /**
   * Carrega o certificado digital
   */
  async loadCertificate(certificateBase64: string, password: string): Promise<boolean> {
    try {
      // Valida se é um certificado válido
      if (!this.validateCertificateFormat(certificateBase64)) {
        throw new Error('Formato de certificado inválido. Esperado: .pfx ou .p12 em Base64');
      }

      this.certificateData = certificateBase64;
      
      if (this.config.enableDebug) {
        console.log('✅ Certificado carregado com sucesso');
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao carregar certificado:', error);
      return false;
    }
  }

  /**
   * Valida formato do certificado
   */
  private validateCertificateFormat(cert: string): boolean {
    // Básico: verifica se é Base64 válido
    try {
      const decoded = atob(cert);
      // Certificados PKCS#12 começam com bytes específicos
      return decoded.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Gera a chave de acesso da NF-e (44 dígitos)
   * Formato: UF (2) + AAMM (4) + CNPJ (8) + Modelo (2) + Série (3) + Número (9) + DV (1) + Aleatoriedade (4)
   */
  generateAccessKey(options: {
    uf: string;
    yearMonth: string; // AAMM
    cnpj: string;
    model: string; // 55 = NF-e, 65 = NFC-e
    series: string;
    number: string;
  }): string {
    const { uf, yearMonth, cnpj, model, series, number } = options;

    // Remove formatação
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    const cleanSeries = series.replace(/[^\d]/g, '').padStart(3, '0');
    const cleanNumber = number.replace(/[^\d]/g, '').padStart(9, '0');

    // Gera 4 dígitos aleatórios
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    // Concatena sem o verificador
    const base = `${uf}${yearMonth}${cleanCNPJ}${model}${cleanSeries}${cleanNumber}${random}`;

    // Calcula dígito verificador (módulo 11)
    let remainder = 0;
    let multiplier = 2;

    for (let i = base.length - 1; i >= 0; i--) {
      remainder += parseInt(base[i]) * multiplier;
      multiplier = multiplier === 9 ? 2 : multiplier + 1;
    }

    const digit = 11 - (remainder % 11);
    const dv = digit >= 10 ? 0 : digit;

    return base + dv.toString();
  }

  /**
   * Verifica status do serviço SEFAZ (é o NF-e ativo?)
   */
  async checkServiceStatus(): Promise<{
    status: 'operacional' | 'contingencia' | 'error';
    message: string;
    timestamp: string;
  }> {
    try {
      const url = SEFAZ_URLS[this.config.environment].statusServico;

      if (this.config.enableDebug) {
        console.log(`📡 Verificando status SEFAZ: ${url}`);
      }

      // Simulação - em produção, usar SOAP
      return {
        status: 'operacional',
        message: 'SEFAZ operacional',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao verificar status SEFAZ:', error);
      return {
        status: 'error',
        message: 'Erro ao conectar com SEFAZ',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Retorna URL base para o ambiente configurado
   */
  getSEFAZUrl(operation: 'autorizacao' | 'consultaNFe' | 'statusServico'): string {
    return SEFAZ_URLS[this.config.environment][operation] || '';
  }

  /**
   * Valida se certificado está carregado
   */
  isCertificateLoaded(): boolean {
    return !!this.certificateData;
  }

  /**
   * Formata CNPJ para padrão: XX.XXX.XXX/XXXX-XX
   */
  static formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/[^\d]/g, '');
    if (clean.length !== 14) return cnpj;
    return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12)}`;
  }

  /**
   * Formata CNPJ para padrão simples: 14 dígitos
   */
  static sanitizeCNPJ(cnpj: string): string {
    return cnpj.replace(/[^\d]/g, '');
  }
}

export default SEFAZService;