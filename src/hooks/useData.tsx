import { useState, useEffect, useCallback } from 'react';
import type { Client, Employee, Product, Project, Transaction, FiscalDocument } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AsaasService } from '../lib/asaas';

export function useData() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fiscalDocuments, setFiscalDocuments] = useState<FiscalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('whatch_pro_last_sync'));
  const [asaasToken] = useState(() => localStorage.getItem('whatch_pro_asaas_token') || '');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hasSupabase = !!supabaseUrl && !supabaseUrl.includes('SUA_URL') && !supabaseUrl.includes('YOUR_URL');

  // Helper to load local data
  const loadLocalData = useCallback((userId: string) => {
    setClients(JSON.parse(localStorage.getItem(`clients_${userId}`) || '[]'));
    setEmployees(JSON.parse(localStorage.getItem(`employees_${userId}`) || '[]'));
    setProducts(JSON.parse(localStorage.getItem(`products_${userId}`) || '[]'));
    setProjects(JSON.parse(localStorage.getItem(`projects_${userId}`) || '[]'));
    setTransactions(JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]'));
    setFiscalDocuments(JSON.parse(localStorage.getItem(`fiscal_documents_${userId}`) || '[]'));
  }, []);

  // Helper to save local data
  const saveLocalData = useCallback((userId: string, table: string, data: any) => {
    localStorage.setItem(`${table}_${userId}`, JSON.stringify(data));
  }, []);

  // Sync logic: Cloud -> Local (Pull)
  const syncFromCloud = useCallback(async () => {
    if (!hasSupabase || !user) return;
    setIsSyncing(true);
    try {
      const [
        { data: clientsData },
        { data: employeesData },
        { data: productsData },
        { data: projectsData },
        { data: transactionsData },
        { data: fiscalDocumentsData }
      ] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('products').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('fiscal_documents').select('*')
      ]);

      if (clientsData) { setClients(clientsData); saveLocalData(user.id, 'clients', clientsData); }
      if (employeesData) { setEmployees(employeesData); saveLocalData(user.id, 'employees', employeesData); }
      if (productsData) { setProducts(productsData); saveLocalData(user.id, 'products', productsData); }
      if (projectsData) { setProjects(projectsData); saveLocalData(user.id, 'projects', projectsData); }
      if (transactionsData) { setTransactions(transactionsData); saveLocalData(user.id, 'transactions', transactionsData); }
      if (fiscalDocumentsData) { setFiscalDocuments(fiscalDocumentsData); saveLocalData(user.id, 'fiscal_documents', fiscalDocumentsData); }

      const now = new Date().toLocaleString();
      setLastSync(now);
      localStorage.setItem('whatch_pro_last_sync', now);
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [hasSupabase, user, saveLocalData]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Always load local first for speed and offline capability
    loadLocalData(user.id);
    setIsLoading(false);

    // Then attempt to sync from cloud if online
    if (hasSupabase) {
      syncFromCloud();
    }
  }, [user, hasSupabase, loadLocalData, syncFromCloud]);

  const syncClientWithAsaas = useCallback(async (client: Client) => {
    if (!asaasToken) return null;
    
    const asaas = new AsaasService(asaasToken);
    try {
      // Check if client already exists in Asaas by CNPJ/CPF
      const existing = await asaas.listClients({ cpfCnpj: client.cnpj });
      if (existing.data && existing.data.length > 0) {
        return existing.data[0].id;
      }

      // Create new client in Asaas
      const newAsaasClient = await asaas.createClient({
        name: client.name,
        cpfCnpj: client.cnpj,
        email: client.email,
        phone: client.phone,
        externalReference: client.id
      });
      return newAsaasClient.id;
    } catch (error) {
      console.error('Erro ao sincronizar cliente com Asaas:', error);
      return null;
    }
  }, [asaasToken]);

  const saveData = async (table: string, data: any) => {
    if (!user) return;

    // 1. Update local state and storage immediately (Offline-first)
    saveLocalData(user.id, table, data);
    
    // Special handling for Asaas sync when a NEW client is added
    if (table === 'clients' && Array.isArray(data)) {
        const latestClient = data[data.length - 1];
        if (latestClient && !latestClient.asaasId && asaasToken) {
            const asaasId = await syncClientWithAsaas(latestClient);
            if (asaasId) {
                latestClient.asaasId = asaasId;
                saveLocalData(user.id, 'clients', data);
            }
        }
    }

    switch(table) {
        case 'clients': setClients(data); break;
        case 'employees': setEmployees(data); break;
        case 'products': setProducts(data); break;
        case 'projects': setProjects(data); break;
        case 'transactions': setTransactions(data); break;
        case 'fiscal_documents': setFiscalDocuments(data); break;
    }

    // 2. In a real production app, we would queue these for sync.
    // For now, we rely on individual syncItem calls or manual sync.
  };

  const syncItem = async (table: string, item: any, action: 'insert' | 'update' | 'delete') => {
    // This is called by UI components to ensure cloud is updated
    if (!hasSupabase || !user) return;

    try {
      if (action === 'delete') {
        await supabase.from(table).delete().eq('id', item.id);
      } else if (action === 'insert') {
        await supabase.from(table).insert([{ ...item, userId: user.id }]);
      } else {
        await supabase.from(table).update(item).eq('id', item.id);
      }
    } catch (error) {
      console.error(`Erro de sync cloud em ${table}:`, error);
      // We could add to an offline queue here
    }
  };

  const generateAsaasBoleto = useCallback(async (transaction: Transaction, client: Client) => {
    if (!asaasToken) throw new Error('Token do Asaas não configurado');
    
    const asaas = new AsaasService(asaasToken);
    try {
      // 1. Ensure client has asaasId
      let asaasId = client.asaasId;
      if (!asaasId) {
        asaasId = await syncClientWithAsaas(client);
        if (!asaasId) throw new Error('Não foi possível sincronizar o cliente com o Asaas');
      }

      // 2. Create payment
      const payment = await asaas.createPayment({
        customer: asaasId,
        billingType: 'BOLETO',
        value: transaction.amount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        description: transaction.description,
        externalReference: transaction.id
      });

      // 3. Get identification field (linha digitável)
      const identification = await asaas.getIdentificationField(payment.id);
      
      return {
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        identificationField: identification.identificationField
      };
    } catch (error: any) {
      console.error('Erro ao gerar boleto no Asaas:', error);
      throw error;
    }
  }, [asaasToken, syncClientWithAsaas]);

  return {
    clients, setClients: (data: Client[]) => saveData('clients', data),
    employees, setEmployees: (data: Employee[]) => saveData('employees', data),
    products, setProducts: (data: Product[]) => saveData('products', data),
    projects, setProjects: (data: Project[]) => saveData('projects', data),
    transactions, setTransactions: (data: Transaction[]) => saveData('transactions', data),
    isLoading,
    isSyncing,
    lastSync,
    syncFromCloud,
    saveData,
    fiscalDocuments,
    setFiscalDocuments,
    generateAsaasBoleto
  };
}
