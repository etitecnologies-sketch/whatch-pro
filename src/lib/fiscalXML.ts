/**
 * Fiscal XML Generator - Gera XMLs para NF-e, NFC-e e Cupom Fiscal
 * Padrão: Layout de NF-e v4.0 (Receita Federal)
 */

import type { Transaction, Client } from '../types';

export interface XMLNFEOptions {
  nfe: {
    numero: string;
    serie: string;
    datEmissao: string;
    chaveAcesso: string;
    modelo: 'NF-e' | 'NFC-e';
    natOp: string; // Natureza da operação (ex: "Venda de Produção do Estabelecimento")
  };
  emit: {
    cnpj: string;
    xNome: string;
    enderDest?: {
      xLgr: string;
      nro: string;
      xCpl?: string;
      xBairro: string;
      cMun: string;
      xMun: string;
      uf: string;
      cep: string;
    };
  };
  dest?: {
    cnpj?: string;
    cpf?: string;
    xNome: string;
    enderDest: {
      xLgr: string;
      nro: string;
      xBairro: string;
      cMun: string;
      xMun: string;
      uf: string;
      cep: string;
    };
    email?: string;
  };
  items: Array<{
    descricao: string;
    ncm: string; // Nomenclatura Comum (ex: "82029000")
    cfop: string; // Código Fiscal (ex: "5102" para venda)
    valor: number;
    quantidade: number;
    unidade: 'UN' | 'KG' | 'M' | 'L' | 'PC'; // UNIDADE TRIBUTÁVEL
    aliqIcms: number; // Alíquota ICMS (%)
    aliqIpi?: number; // Alíquota IPI (%)
  }>;
  total: number;
  pagamento?: {
    tipo: 'dinheiro' | 'cheque' | 'transferencia' | 'credito' | 'debito' | 'vale';
    valor: number;
    parcelas?: number;
  };
}

/**
 * Gera XML da NF-e seguindo layout Receita Federal
 */
export function generateNFEXML(options: XMLNFEOptions): string {
  const {
    nfe,
    emit,
    dest,
    items,
    total,
    pagamento
  } = options;

  // Calcula tributos
  const { icms, ipi, pis, cofins } = calculateTaxes(items, total);

  // Monta dados da NFe
  const xmlNFe = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${nfe.chaveAcesso}" versao="4.00">
    <!-- IDENTIFICAÇÃO -->
    <ide>
      <cUF>35</cUF>
      <natOp>${escapeXML(nfe.natOp)}</natOp>
      <indPag>0</indPag>
      <mod>${nfe.modelo === 'NF-e' ? '55' : '65'}</mod>
      <serie>${nfe.serie}</serie>
      <nNF>${nfe.numero}</nNF>
      <dEmi>${nfe.datEmissao}</dEmi>
      <dSaiEnt>${nfe.datEmissao}</dSaiEnt>
      <hEmi>${new Date().toLocaleTimeString('pt-BR').replace(/:/g, '')}</hEmi>
      <cDV>${nfe.chaveAcesso.slice(-1)}</cDV>
      <tpAmb>2</tpAmb>
      <tpEmit>1</tpEmit>
      <cDV>${nfe.chaveAcesso.slice(-1)}</cDV>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${nfe.chaveAcesso.slice(-1)}</cDV>
      <finNFe>1</finNFe>
      <indFinal>${dest ? '0' : '1'}</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>1.0.0</verProc>
    </ide>

    <!-- EMITENTE -->
    <emit>
      <CNPJ>${emit.cnpj.replace(/[^\d]/g, '')}</CNPJ>
      <xNome>${escapeXML(emit.xNome)}</xNome>
      <xFant>${escapeXML(emit.xNome)}</xFant>
      <enderEmit>
        <xLgr>${emit.enderDest?.xLgr || 'Rua Desconhecida'}</xLgr>
        <nro>${emit.enderDest?.nro || '0'}</nro>
        <xCpl>${emit.enderDest?.xCpl || ''}</xCpl>
        <xBairro>${emit.enderDest?.xBairro || 'Centro'}</xBairro>
        <cMun>${emit.enderDest?.cMun || '3550308'}</cMun>
        <xMun>${emit.enderDest?.xMun || 'São Paulo'}</xMun>
        <UF>${emit.enderDest?.uf || 'SP'}</UF>
        <CEP>${(emit.enderDest?.cep || '').replace(/[^\d]/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
        <fone>1111111111</fone>
      </enderEmit>
      <IE>${generateIE()}</IE>
      <IEST></IEST>
      <IM></IM>
      <CNAE></CNAE>
      <CRT>3</CRT>
    </emit>

    <!-- DESTINATÁRIO -->
    ${dest ? `
    <dest>
      ${dest.cnpj ? `<CNPJ>${dest.cnpj.replace(/[^\d]/g, '')}</CNPJ>` : `<CPF>${dest.cpf?.replace(/[^\d]/g, '')}</CPF>`}
      <xNome>${escapeXML(dest.xNome)}</xNome>
      <enderDest>
        <xLgr>${escapeXML(dest.enderDest.xLgr)}</xLgr>
        <nro>${dest.enderDest.nro}</nro>
        <xBairro>${escapeXML(dest.enderDest.xBairro)}</xBairro>
        <cMun>${dest.enderDest.cMun}</cMun>
        <xMun>${escapeXML(dest.enderDest.xMun)}</xMun>
        <UF>${dest.enderDest.uf}</UF>
        <CEP>${dest.enderDest.cep.replace(/[^\d]/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
      </enderDest>
      ${dest.email ? `<email>${escapeXML(dest.email)}</email>` : ''}
    </dest>
    ` : ''}

    <!-- DETALHES DO PRODUTO/SERVIÇO -->
    <det nItem="1">
      <prod>
        <barcode>SEM GTIN</barcode>
        <descricao>${escapeXML(items[0]?.descricao || 'Serviço')}</descricao>
        <ncm>${items[0]?.ncm || '82029000'}</ncm>
        <cfop>${items[0]?.cfop || '5102'}</cfop>
        <uCom>${items[0]?.unidade || 'UN'}</uCom>
        <qCom>${items[0]?.quantidade || 1}</qCom>
        <vUnCom>${(items[0]?.valor || total).toFixed(2)}</vUnCom>
        <vProd>${total.toFixed(2)}</vProd>
        <uTrib>${items[0]?.unidade || 'UN'}</uTrib>
        <qTrib>${items[0]?.quantidade || 1}</qTrib>
        <vUnTrib>${(items[0]?.valor || total).toFixed(2)}</vUnTrib>
        <indTot>1</indTot>
      </prod>

      <!-- IMPOSTOS -->
      <imposto>
        <!-- ICMS -->
        <ICMS>
          <ICMS00>
            <orig>0</orig>
            <CST>00</CST>
            <modBC>0</modBC>
            <vBC>${total.toFixed(2)}</vBC>
            <pICMS>${items[0]?.aliqIcms || 18}</pICMS>
            <vICMS>${(total * (items[0]?.aliqIcms || 18) / 100).toFixed(2)}</vICMS>
          </ICMS00>
        </ICMS>
        <!-- PIS -->
        <PIS>
          <PISAliq>
            <CST>01</CST>
            <vBC>${total.toFixed(2)}</vBC>
            <pPIS>7.6</pPIS>
            <vPIS>${(total * 0.076).toFixed(2)}</vPIS>
          </PISAliq>
        </PIS>
        <!-- COFINS -->
        <COFINS>
          <COFINSAliq>
            <CST>01</CST>
            <vBC>${total.toFixed(2)}</vBC>
            <pCOFINS>7.6</pCOFINS>
            <vCOFINS>${(total * 0.076).toFixed(2)}</vCOFINS>
          </COFINSAliq>
        </COFINS>
      </imposto>
    </det>

    <!-- TOTAL -->
    <total>
      <ICMSTot>
        <vBC>${total.toFixed(2)}</vBC>
        <vICMS>${icms.toFixed(2)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${total.toFixed(2)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>${ipi.toFixed(2)}</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>${pis.toFixed(2)}</vPIS>
        <vCOFINS>${cofins.toFixed(2)}</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${total.toFixed(2)}</vNF>
      </ICMSTot>
    </total>

    <!-- TRANSPORTE -->
    <transp>
      <modFrete>9</modFrete>
    </transp>

    <!-- PAGAMENTO -->
    <pag>
      <detPag>
        <tPag>${getPagamentoCode(pagamento?.tipo || 'dinheiro')}</tPag>
        <vPag>${(pagamento?.valor || total).toFixed(2)}</vPag>
      </detPag>
      <vTroco>0.00</vTroco>
    </pag>

    <!-- INFORMAÇÕES ADICIONAIS -->
    <infAdic>
      <infAdFisco>Documento emitido pelo Whatch Pro</infAdFisco>
      <infCpl>Operação realizada via Emissão Eletrônica</infCpl>
    </infAdic>
  </infNFe>
</NFe>`;

  return xmlNFe;
}

/**
 * Calcula impostos
 */
function calculateTaxes(items: any[], total: number) {
  const icms = total * 0.18; // 18% ICMS (padrão SP)
  const ipi = items.some(i => i.aliqIpi) ? total * (items[0]?.aliqIpi || 0) / 100 : 0;
  const pis = total * 0.0765; // PIS 7.65%
  const cofins = total * 0.076; // COFINS 7.6%

  return { icms, ipi, pis, cofins };
}

/**
 * Escapa caracteres especiais XML
 */
function escapeXML(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Gera IE (Inscrição Estadual) mockado
 */
function generateIE(): string {
  return Math.random().toString().substring(2, 12);
}

/**
 * Mapeia tipo de pagamento para código SEFAZ
 */
function getPagamentoCode(tipo: string): string {
  const map: Record<string, string> = {
    dinheiro: '01',
    cheque: '02',
    transferencia: '03',
    credito: '04',
    debito: '05',
    vale: '10'
  };
  return map[tipo] || '01';
}

export default generateNFEXML;