import { useState, useCallback } from 'react';
import type { ConfiguracaoSEFAZ, CertificadoDigital } from '../types';
import { useAuth } from './useAuth';

export function useSEFAZ() {
  const { user } = useAuth();
  const [configuracaoSEFAZ, setConfiguracaoSEFAZ] = useState<ConfiguracaoSEFAZ | null>(() => {
    if (!user) return null;
    const saved = localStorage.getItem(`sefaz_config_${user.id}`);
    return saved ? JSON.parse(saved) : null;
  });

  const [certificados, setCertificados] = useState<CertificadoDigital[]>(() => {
    if (!user) return [];
    const saved = localStorage.getItem(`certificados_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Salva configuração SEFAZ
   */
  const salvarConfiguracaoSEFAZ = useCallback((config: Omit<ConfiguracaoSEFAZ, 'id' | 'userId' | 'dataCriacao' | 'dataAtualizacao'>) => {
    if (!user) return;

    const novaConfig: ConfiguracaoSEFAZ = {
      ...config,
      id: configuracaoSEFAZ?.id || crypto.randomUUID(),
      userId: user.id,
      dataCriacao: configuracaoSEFAZ?.dataCriacao || new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
      nfeEmitidasMes: configuracaoSEFAZ?.nfeEmitidasMes || 0,
    };

    setConfiguracaoSEFAZ(novaConfig);
    localStorage.setItem(`sefaz_config_${user.id}`, JSON.stringify(novaConfig));
    setErro(null);
  }, [user, configuracaoSEFAZ]);

  /**
   * Carrega certificado digital (arquivo .pfx)
   */
  const carregarCertificado = useCallback(async (arquivo: File, senha: string, cnpjTitular: string, nomeTitular: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Lê o arquivo como Base64
      const reader = new FileReader();
      
      return new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            
            // Validações básicas
            if (!base64 || base64.length < 100) {
              throw new Error('Arquivo de certificado inválido');
            }

            const novoCertificado: CertificadoDigital = {
              id: crypto.randomUUID(),
              userId: user.id,
              nomeArquivo: arquivo.name,
              base64Data: base64,
              senha: btoa(senha), // Criptografia básica
              cnpjTitular,
              nomeTitular,
              dataVencimento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Válido por 1 ano
              dataInstalacao: new Date().toISOString(),
              ativo: true,
              ambiente: 'homologacao'
            };

            const certsAtualizados = [...certificados, novoCertificado];
            setCertificados(certsAtualizados);
            localStorage.setItem(`certificados_${user.id}`, JSON.stringify(certsAtualizados));
            
            setErro(null);
            resolve();
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erro ao processar certificado';
            setErro(msg);
            reject(error);
          }
        };

        reader.onerror = () => {
          setErro('Erro ao ler arquivo');
          reject(new Error('Erro ao ler arquivo'));
        };

        reader.readAsDataURL(arquivo);
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setErro(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, certificados]);

  /**
   * Remove certificado
   */
  const removerCertificado = useCallback((id: string) => {
    if (!user) return;

    const certsAtualizados = certificados.filter(c => c.id !== id);
    setCertificados(certsAtualizados);
    localStorage.setItem(`certificados_${user.id}`, JSON.stringify(certsAtualizados));
  }, [user, certificados]);

  /**
   * Ativa certificado
   */
  const ativarCertificado = useCallback((id: string) => {
    const certsAtualizados = certificados.map(c => ({
      ...c,
      ativo: c.id === id
    }));
    setCertificados(certsAtualizados);
    
    if (user) {
      localStorage.setItem(`certificados_${user.id}`, JSON.stringify(certsAtualizados));
    }
  }, [user, certificados]);

  /**
   * Obtém certificado ativo
   */
  const getCertificadoAtivo = useCallback(() => {
    return certificados.find(c => c.ativo);
  }, [certificados]);

  /**
   * Valida se configuração SEFAZ está completa
   */
  const validarConfiguracaoCompleta = useCallback(() => {
    if (!configuracaoSEFAZ) return false;

    const validacoes: Record<string, boolean> = {
      cnpj: !!configuracaoSEFAZ.cnpj && configuracaoSEFAZ.cnpj.length >= 14,
      razaoSocial: !!configuracaoSEFAZ.razaoSocial,
      uf: !!configuracaoSEFAZ.uf,
      tipoIntegracao: !!configuracaoSEFAZ.tipoIntegracao,
      ambiente: !!configuracaoSEFAZ.ambiente,
    };

    // Se usar SEFAZ direto, precisa de certificado
    if (configuracaoSEFAZ.tipoIntegracao === 'sefaz' || configuracaoSEFAZ.tipoIntegracao === 'hibrido') {
      validacoes['certificado'] = getCertificadoAtivo() !== undefined;
    }

    // Se usar Nuvemfiscal, precisa de API Key
    if (configuracaoSEFAZ.tipoIntegracao === 'nuvemfiscal' || configuracaoSEFAZ.tipoIntegracao === 'hibrido') {
      validacoes['apiKey'] = !!configuracaoSEFAZ.nuvemfiscalApiKey;
    }

    return Object.values(validacoes).every(v => v);
  }, [configuracaoSEFAZ, getCertificadoAtivo]);

  /**
   * Gera ID único para próxima NF-e
   */
  const proximoNumeroNFe = useCallback(() => {
    if (!user || !configuracaoSEFAZ) return '1';

    const novaConfig = {
      ...configuracaoSEFAZ,
      proximoNumeroNFe: configuracaoSEFAZ.proximoNumeroNFe + 1,
      dataAtualizacao: new Date().toISOString(),
    };

    setConfiguracaoSEFAZ(novaConfig);
    localStorage.setItem(`sefaz_config_${user.id}`, JSON.stringify(novaConfig));

    return novaConfig.proximoNumeroNFe.toString();
  }, [user, configuracaoSEFAZ]);

  return {
    configuracaoSEFAZ,
    certificados,
    isLoading,
    erro,
    salvarConfiguracaoSEFAZ,
    carregarCertificado,
    removerCertificado,
    ativarCertificado,
    getCertificadoAtivo,
    validarConfiguracaoCompleta,
    proximoNumeroNFe,
  };
}

export default useSEFAZ;