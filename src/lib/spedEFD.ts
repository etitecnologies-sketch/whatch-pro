/**
 * SPED EFD Generator - Escrituração Fiscal Digital
 * Gera livro SPED em formato TXT para entrega à Receita Federal
 * Ref: Instrução Normativa RFB Nº 1.143/2011
 */

import type { Transaction, FiscalDocument } from '../types';

export interface SPEDConfig {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  uf: string;
  cpfResponsavel: string;
  nomeResponsavel: string;
  periodoInicio: string; // YYYYMM
  periodoFim: string; // YYYYMM
  tipo: 'COMPLETA' | 'SIMPLIFICADA'; // COMPLETA = escrituração completa
  natividadeAtividade: '00' | '01' | '02'; // 00 = Comércio, 01 = Indústria, 02 = Prestação
}

export interface SPEDRegistro {
  nivel: number;
  codigo: string;
  campos: Record<string, string | number>;
}

export class SPEDEFDService {
  private config: SPEDConfig;
  private registros: SPEDRegistro[] = [];

  constructor(config: SPEDConfig) {
    this.config = config;
  }

  /**
   * Gera arquivo SPED completo
   */
  generateSPED(transactions: Transaction[], fiscalDocs: FiscalDocument[]): string {
    this.registros = [];

    // Bloco 0 - Informações Gerais
    this.generateBloco0();

    // Bloco C - Documentos Fiscais (Entradas)
    this.generateBlocoC(transactions.filter(t => t.type === 'expense'), fiscalDocs);

    // Bloco D - Documentos Fiscais (Saídas)
    this.generateBlocoD(transactions.filter(t => t.type === 'income'), fiscalDocs);

    // Bloco E - Apuração ICMS
    this.generateBlocoE(transactions, fiscalDocs);

    // Bloco H - Inventário
    this.generateBlocoH();

    // Bloco 9 - Controle e Encerramento
    this.generateBloco9();

    return this.formatarArquivo();
  }

  /**
   * Bloco 0 - Abertura, Identificação e Referência de Arquivos
   */
  private generateBloco0(): void {
    // Registro 0000 - Abertura
    this.addRegistro({
      nivel: 0,
      codigo: '0000',
      campos: {
        INDUSTRIA: '0',
        TIPO_ESCRITURACAO: this.config.tipo === 'COMPLETA' ? '1' : '2',
        PJ_NOME: this.config.razaoSocial,
        PJ_CPFCNPJ: this.config.cnpj.replace(/[^\d]/g, ''),
        UF: this.config.uf,
        INSCRICAO_ESTADUAL: this.generateIE(),
        INSCRICAO_MUNICIPAL: '', 
        SUFRAMA: '',
        PERIODO_INICIO: this.config.periodoInicio,
        PERIODO_FIM: this.config.periodoFim,
        VALOR_TOTAL_DEBITO: '0',
        VALOR_TOTAL_CREDITO: '0',
        TIPO_PESSOA: '1'
      }
    });

    // Registro 0050 - Dados do Responsável
    this.addRegistro({
      nivel: 1,
      codigo: '0050',
      campos: {
        NOME_RESPONSAVEL: this.config.nomeResponsavel,
        CPF_RESPONSAVEL: this.config.cpfResponsavel.replace(/[^\d]/g, ''),
        TELEFONE: '',
        EMAIL: ''
      }
    });

    // Registro 0100 - Natureza da Atividade
    this.addRegistro({
      nivel: 1,
      codigo: '0100',
      campos: {
        NATUREZA_ATIVIDADE: this.config.natividadeAtividade
      }
    });

    // Registro 0150 - Informações Cadastrais
    this.addRegistro({
      nivel: 1,
      codigo: '0150',
      campos: {
        UF_ESTABELECIMENTO: this.config.uf,
        ENDERECO_ESTABELECIMENTO: 'Rua Desconhecida, 0',
        NUMERO_ESTABELECIMENTO: '0',
        NUMERO_ADICIONAL_ENDERECO: '',
        COMPLEMENTO_ENDERECO: '',
        BAIRRO: 'Centro',
        CEP: '00000000',
        CIDADE: 'São Paulo',
        TELEFONE: '',
        FAX: '',
        EMAIL: ''
      }
    });
  }

  /**
   * Bloco C - Documentos de Entrada (Compras)
   */
  private generateBlocoC(expenses: Transaction[], docs: FiscalDocument[]): void {
    if (expenses.length === 0) return;

    // Registro C100 - Documentos de Entradas
    expenses.forEach((transaction, index) => {
      this.addRegistro({
        nivel: 1,
        codigo: 'C100',
        campos: {
          IND_OPER: '1', // Entrada
          IND_EMIT: '0', // Terceiros
          NATUREZA_DOC: '08', // NF Regular
          SERIE: '001',
          NUM_DOC: (index + 1).toString(),
          CHV_NFE: docs[index]?.accessKey || this.generateAccessKey(),
          DT_DOC: transaction.date,
          DT_A_E: transaction.date,
          VL_TOTAL_DOC: transaction.amount.toString(),
          VL_DESC: '0',
          VL_MERC: transaction.amount.toString(),
          IND_RECEB: '0'
        }
      });

      // Registro C190 - Totalizações do Documento
      this.addRegistro({
        nivel: 2,
        codigo: 'C190',
        campos: {
          CST_ICMS: '00',
          ALIQ_ICMS: '18',
          VL_BC_ICMS: transaction.amount.toString(),
          VL_ICMS: (transaction.amount * 0.18).toFixed(2),
          VL_BC_ICMS_ST: '0',
          VL_ICMS_ST: '0',
          IND_REC: '0'
        }
      });
    });

    // Registro C990 - Totalização do Bloco C
    const totalC = expenses.reduce((acc, t) => acc + t.amount, 0);
    this.addRegistro({
      nivel: 1,
      codigo: 'C990',
      campos: {
        TOTAL_LINHAS: expenses.length.toString(),
        TOTAL_VALOR: totalC.toFixed(2)
      }
    });
  }

  /**
   * Bloco D - Documentos de Saída (Vendas)
   */
  private generateBlocoD(income: Transaction[], docs: FiscalDocument[]): void {
    if (income.length === 0) return;

    income.forEach((transaction, index) => {
      this.addRegistro({
        nivel: 1,
        codigo: 'D100',
        campos: {
          IND_OPER: '0', // Saída
          IND_EMIT: '0', // Empresa
          NATUREZA_DOC: '08', // NF Regular
          SERIE: '001',
          NUM_DOC: (index + 1).toString(),
          CHV_NFE: docs[index]?.accessKey || this.generateAccessKey(),
          DT_DOC: transaction.date,
          DT_SAIDA: transaction.date,
          VL_TOTAL_DOC: transaction.amount.toString(),
          VL_DESC: '0',
          VL_MERC: transaction.amount.toString(),
          IND_CANC: '0'
        }
      });

      this.addRegistro({
        nivel: 2,
        codigo: 'D190',
        campos: {
          CST_ICMS: '00',
          ALIQ_ICMS: '18',
          VL_BC_ICMS: transaction.amount.toString(),
          VL_ICMS: (transaction.amount * 0.18).toFixed(2),
          IND_REC: '0'
        }
      });
    });

    const totalD = income.reduce((acc, t) => acc + t.amount, 0);
    this.addRegistro({
      nivel: 1,
      codigo: 'D990',
      campos: {
        TOTAL_LINHAS: income.length.toString(),
        TOTAL_VALOR: totalD.toFixed(2)
      }
    });
  }

  /**
   * Bloco E - Apuração do ICMS
   */
  private generateBlocoE(allTransactions: Transaction[], docs: FiscalDocument[]): void {
    const totalDebito = allTransactions.filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + (t.amount * 0.18), 0);
    const totalCredito = allTransactions.filter(t => t.type === 'income')
      .reduce((acc, t) => acc + (t.amount * 0.18), 0);

    this.addRegistro({
      nivel: 1,
      codigo: 'E100',
      campos: {
        TIPO_EMPRESA: '2', // Não Optante Simples
        VL_TO_APUR_ICMS: (totalDebito - totalCredito).toFixed(2),
        VL_AJUSTE_ICMS: '0',
        VL_APUR_LIQUIDO: (totalDebito - totalCredito).toFixed(2),
        VL_TO_PG: (totalDebito - totalCredito).toFixed(2),
        VL_SALDO: '0'
      }
    });

    this.addRegistro({
      nivel: 1,
      codigo: 'E990',
      campos: {
        TOTAL_LINHAS: '1',
        TOTAL_ICMS_DEVIDO: (totalDebito - totalCredito).toFixed(2)
      }
    });
  }

  /**
   * Bloco H - Inventário (opcional)
   */
  private generateBlocoH(): void {
    this.addRegistro({
      nivel: 1,
      codigo: 'H990',
      campos: {
        TOTAL_LINHAS: '0'
      }
    });
  }

  /**
   * Bloco 9 - Controle e Encerramento
   */
  private generateBloco9(): void {
    this.addRegistro({
      nivel: 1,
      codigo: '9001',
      campos: {
        IND_MOV: '0' // Sem movimento
      }
    });

    this.addRegistro({
      nivel: 1,
      codigo: '9990',
      campos: {
        TOTAL_LINHAS: (this.registros.length + 1).toString()
      }
    });

    // Registro 9999 - Encerramento
    this.addRegistro({
      nivel: 0,
      codigo: '9999',
      campos: {
        TOTAL_BLOCOS: '9',
        IND_PERFIL_UA: '0'
      }
    });
  }

  /**
   * Formata arquivo SPED em TXT
   */
  private formatarArquivo(): string {
    return this.registros
      .map(reg => {
        const valores = Object.values(reg.campos).map(v => v.toString());
        return `${reg.codigo}|${valores.join('|')}|`;
      })
      .join('\n') + '\n';
  }

  /**
   * Adiciona registro ao array
   */
  private addRegistro(reg: SPEDRegistro): void {
    this.registros.push(reg);
  }

  /**
   * Gera chave de acesso (mock)
   */
  private generateAccessKey(): string {
    return Math.random().toString().substring(2, 46);
  }

  /**
   * Gera IE (mock)
   */
  private generateIE(): string {
    return Math.random().toString().substring(2, 12);
  }
}

export default SPEDEFDService;