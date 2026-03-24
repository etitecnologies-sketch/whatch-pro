const ASAAS_API_URL = 'https://www.asaas.com/api/v3';

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
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.description || 'Erro na comunicação com Asaas');
    }

    return response.json();
  }

  // Clientes
  async createClient(client: AsaasClient) {
    return this.request('/customers', 'POST', client);
  }

  async listClients(params: { cpfCnpj?: string; externalReference?: string } = {}) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/customers?${query}`);
  }

  // Cobranças
  async createPayment(payment: AsaasPayment) {
    return this.request('/payments', 'POST', payment);
  }

  async getPayment(id: string) {
    return this.request(`/payments/${id}`);
  }

  async getIdentificationField(id: string) {
    return this.request(`/payments/${id}/identificationField`);
  }
}
