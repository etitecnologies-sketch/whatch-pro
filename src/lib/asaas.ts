import { supabase } from './supabase';

const ASAAS_CONFIG = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://www.asaas.com/api/v3'
} as const;

export type AsaasEnvironment = 'sandbox' | 'production';

export interface AsaasClient {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
}

export interface AsaasPayment {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}

export class AsaasService {
  private apiKey: string | null;
  private baseUrl: string;
  private useProxy: boolean;

  constructor(apiKey: string | null = null, environment: AsaasEnvironment = 'production', useProxy: boolean = false) {
    this.apiKey = apiKey;
    this.baseUrl = ASAAS_CONFIG[environment];
    this.useProxy = useProxy;
    
    if (!useProxy && !apiKey) {
      throw new Error('API Key do Asaas é obrigatória quando não se utiliza o Proxy de Segurança');
    }
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    try {
      // PROXY MODE (Nível Absurdo de Segurança)
      if (this.useProxy) {
        const { data, error } = await supabase.functions.invoke('asaas-proxy', {
          body: { endpoint, method, body }
        });

        if (error) {
          throw new Error(`Erro no Proxy Supabase: ${error.message}`);
        }

        return data;
      }

      // DIRECT MODE (Nível Padrão)
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.apiKey!,
          'User-Agent': 'WhatchPro-App'
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errors?.[0]?.description || `Erro na comunicação com Asaas (${response.status})`;
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Falha na rede ao conectar com o servidor. Verifique sua conexão.');
      }
      throw error;
    }
  }

  // Clientes
  async createClient(client: AsaasClient) {
    if (!client.name || !client.cpfCnpj) {
      throw new Error('Nome e CPF/CNPJ são obrigatórios para criar um cliente no Asaas');
    }
    return this.request('/customers', 'POST', client);
  }

  async listClients(params: { cpfCnpj?: string; externalReference?: string } = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );
    const query = new URLSearchParams(cleanParams as any).toString();
    return this.request(`/customers?${query}`);
  }

  // Cobranças
  async createPayment(payment: AsaasPayment) {
    if (!payment.customer || !payment.value || !payment.dueDate) {
      throw new Error('Dados incompletos para gerar a cobrança no Asaas');
    }
    return this.request('/payments', 'POST', payment);
  }

  async getPayment(id: string) {
    if (!id) throw new Error('ID da cobrança é obrigatório');
    return this.request(`/payments/${id}`);
  }

  async getIdentificationField(id: string) {
    if (!id) throw new Error('ID da cobrança é obrigatório');
    return this.request(`/payments/${id}/identificationField`);
  }
}
