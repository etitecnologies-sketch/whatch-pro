import { useState, useEffect, useCallback } from 'react';
import type { Client, Employee, Product, Project, Transaction, FiscalDocument, Quotation } from '../types';
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
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('whatch_pro_last_sync'));
  const [asaasToken] = useState(() => localStorage.getItem('whatch_pro_asaas_token') || '');
  const [asaasEnv] = useState(() => (localStorage.getItem('whatch_pro_asaas_env') as any) || 'production');
  const [asaasProxyEnabled] = useState(() => localStorage.getItem('whatch_pro_asaas_proxy_enabled') === 'true');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hasSupabase = !!supabaseUrl && !supabaseUrl.includes('SUA_URL') && !supabaseUrl.includes('YOUR_URL');

  // Tenant logic: The "Tenant ID" is always the Admin's ID.
  // This ensures isolation between different companies/admins.
  const getTenantId = useCallback(() => {
    if (!user) return null;
    if (user.id === 'master-id-000') return 'master';
    return user.adminId || user.id;
  }, [user]);

  const tenantId = getTenantId();

  // Helper to load local data - Uses tenantId for isolation
  const loadLocalData = useCallback((tId: string | null) => {
    if (!tId) return;
    setClients(JSON.parse(localStorage.getItem(`clients_${tId}`) || '[]'));
    setEmployees(JSON.parse(localStorage.getItem(`employees_${tId}`) || '[]'));
    setProducts(JSON.parse(localStorage.getItem(`products_${tId}`) || '[]'));
    setProjects(JSON.parse(localStorage.getItem(`projects_${tId}`) || '[]'));
    setTransactions(JSON.parse(localStorage.getItem(`transactions_${tId}`) || '[]'));
    setFiscalDocuments(JSON.parse(localStorage.getItem(`fiscal_documents_${tId}`) || '[]'));
    setQuotations(JSON.parse(localStorage.getItem(`quotations_${tId}`) || '[]'));
  }, []);

  // Helper to save local data - Uses tenantId for isolation
  const saveLocalData = useCallback((tId: string | null, table: string, data: any) => {
    if (!tId) return;
    localStorage.setItem(`${table}_${tId}`, JSON.stringify(data));
  }, []);

  // Sync logic: Cloud -> Local (Pull)
  const syncFromCloud = useCallback(async () => {
    if (!hasSupabase || !user) return;
    setIsSyncing(true);
    try {
      // 1. Determine effective filtering
      let queryClients = supabase.from('clients').select('*');
      let queryEmployees = supabase.from('employees').select('*');
      let queryProducts = supabase.from('products').select('*');
      let queryProjects = supabase.from('projects').select('*');
      let queryTransactions = supabase.from('transactions').select('*');
      let queryFiscal = supabase.from('fiscal_documents').select('*');
      let queryQuotations = supabase.from('quotations').select('*');

      // Strict isolation: Filter by admin_id (Tenant ID)
      // Master user sees everything (no filter)
      if (user.id !== 'master-id-000' && tenantId) {
        queryClients = queryClients.eq('admin_id', tenantId);
        queryEmployees = queryEmployees.eq('admin_id', tenantId);
        queryProducts = queryProducts.eq('admin_id', tenantId);
        queryProjects = queryProjects.eq('admin_id', tenantId);
        queryTransactions = queryTransactions.eq('admin_id', tenantId);
        queryFiscal = queryFiscal.eq('admin_id', tenantId);
        queryQuotations = queryQuotations.eq('admin_id', tenantId);
      }

      const [
        { data: clientsData },
        { data: employeesData },
        { data: productsData },
        { data: projectsData },
        { data: transactionsData },
        { data: fiscalDocumentsData },
        { data: quotationsData }
      ] = await Promise.all([
        queryClients,
        queryEmployees,
        queryProducts,
        queryProjects,
        queryTransactions,
        queryFiscal,
        queryQuotations
      ]);

      const mapFromDB = (item: any, table: string) => {
          const mapped: any = { ...item };
          if (mapped.user_id) {
            mapped.userId = mapped.user_id;
            delete mapped.user_id;
          }
          if (mapped.admin_id) {
            mapped.adminId = mapped.admin_id;
            delete mapped.admin_id;
          }
          
          if (table === 'clients') {
            if (mapped.asaas_id) mapped.asaasId = mapped.asaas_id;
            if (mapped.created_at) mapped.createdAt = mapped.created_at;
            delete mapped.asaas_id;
            delete mapped.created_at;
          }

          if (table === 'employees') {
            if (mapped.start_date) mapped.startDate = mapped.start_date;
            delete mapped.start_date;
          }

          if (table === 'projects') {
            if (mapped.client_id) mapped.clientId = mapped.client_id;
            delete mapped.client_id;
          }

          if (table === 'inventory' || table === 'products') {
            if (mapped.min_quantity) mapped.minQuantity = mapped.min_quantity;
            if (mapped.cost_price) mapped.costPrice = mapped.cost_price;
            if (mapped.tax_rate) mapped.taxRate = mapped.tax_rate;
            delete mapped.min_quantity;
            delete mapped.cost_price;
            delete mapped.tax_rate;
          }

          if (table === 'fiscal_documents') {
            if (mapped.transaction_id) mapped.transactionId = mapped.transaction_id;
            if (mapped.issue_date) mapped.issueDate = mapped.issue_date;
            if (mapped.access_key) mapped.accessKey = mapped.access_key;
            delete mapped.transaction_id;
            delete mapped.issue_date;
            delete mapped.access_key;
          }

          return mapped;
        };

      if (clientsData && clientsData.length > 0) { 
        const mapped = clientsData.map(d => mapFromDB(d, 'clients'));
        setClients(mapped); 
        saveLocalData(tenantId, 'clients', mapped); 
      }
      if (employeesData && employeesData.length > 0) { 
        const mapped = employeesData.map(d => mapFromDB(d, 'employees'));
        setEmployees(mapped); 
        saveLocalData(tenantId, 'employees', mapped); 
      }
      if (productsData && productsData.length > 0) { 
        const mapped = productsData.map(d => mapFromDB(d, 'products'));
        setProducts(mapped); 
        saveLocalData(tenantId, 'products', mapped); 
      }
      if (projectsData && projectsData.length > 0) { 
        const mapped = projectsData.map(d => mapFromDB(d, 'projects'));
        setProjects(mapped); 
        saveLocalData(tenantId, 'projects', mapped); 
      }
      if (transactionsData && transactionsData.length > 0) { 
        const mapped = transactionsData.map(d => mapFromDB(d, 'transactions'));
        setTransactions(mapped); 
        saveLocalData(tenantId, 'transactions', mapped); 
      }
      if (fiscalDocumentsData && fiscalDocumentsData.length > 0) { 
        const mapped = fiscalDocumentsData.map(d => mapFromDB(d, 'fiscal_documents'));
        setFiscalDocuments(mapped); 
        saveLocalData(tenantId, 'fiscal_documents', mapped); 
      }
      if (quotationsData && quotationsData.length > 0) { 
        const mapped = quotationsData.map(d => mapFromDB(d, 'quotations'));
        setQuotations(mapped); 
        saveLocalData(tenantId, 'quotations', mapped); 
      }

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
    if (!user || !tenantId) {
      setIsLoading(false);
      return;
    }

    // Always load local first for speed and offline capability
    loadLocalData(tenantId);
    setIsLoading(false);

    // Then attempt to sync from cloud if online
    if (hasSupabase) {
      syncFromCloud();
    }
  }, [user, tenantId, hasSupabase, loadLocalData, syncFromCloud]);

  const syncClientWithAsaas = useCallback(async (client: Client) => {
    if (!asaasToken && !asaasProxyEnabled) return null;
    
    const asaas = new AsaasService(asaasToken, asaasEnv, asaasProxyEnabled);
    try {
      // Clean CNPJ/CPF for search
      const cleanCpfCnpj = client.cnpj.replace(/\D/g, '');
      
      // Check if client already exists in Asaas by CNPJ/CPF
      const existing = await asaas.listClients({ cpfCnpj: cleanCpfCnpj });
      if (existing.data && existing.data.length > 0) {
        return existing.data[0].id;
      }

      // Create new client in Asaas
      const newAsaasClient = await asaas.createClient({
        name: client.name,
        cpfCnpj: cleanCpfCnpj,
        email: client.email,
        phone: client.phone,
        externalReference: client.id
      });
      return newAsaasClient.id;
    } catch (error) {
      console.error(`Erro ao sincronizar cliente ${client.name} com Asaas:`, error);
      return null;
    }
  }, [asaasToken, asaasEnv]);

  const syncAllClientsWithAsaas = useCallback(async () => {
     if ((!asaasToken && !asaasProxyEnabled) || clients.length === 0) return;
    
    let hasChanges = false;
    const updatedClients = [...clients];
    
    for (let i = 0; i < updatedClients.length; i++) {
      if (!updatedClients[i].asaasId) {
        const asaasId = await syncClientWithAsaas(updatedClients[i]);
        if (asaasId) {
          updatedClients[i] = { ...updatedClients[i], asaasId };
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges) {
      setClients(updatedClients);
      saveLocalData(tenantId, 'clients', updatedClients);
    }
  }, [asaasToken, clients, syncClientWithAsaas, tenantId]);

  const saveData = async (table: string, data: any) => {
    if (!user || !tenantId) return;

    // 1. Update local state and storage immediately (Offline-first)
    saveLocalData(tenantId, table, data);
    
    // Special handling for Asaas sync when clients are updated
     if (table === 'clients' && Array.isArray(data) && (asaasToken || asaasProxyEnabled)) {
        // Find clients that don't have asaasId yet
        const pendingClients = data.filter(c => !c.asaasId);
        if (pendingClients.length > 0) {
            // We'll sync them in the background to not block the UI
            setTimeout(async () => {
                let changed = false;
                const newData = [...data];
                for (let i = 0; i < newData.length; i++) {
                    if (!newData[i].asaasId) {
                        const asaasId = await syncClientWithAsaas(newData[i]);
                        if (asaasId) {
                            newData[i] = { ...newData[i], asaasId };
                            changed = true;
                        }
                    }
                }
                if (changed) {
                    setClients(newData);
                    saveLocalData(tenantId, 'clients', newData);
                }
            }, 0);
        }
    }

    switch(table) {
        case 'clients': setClients(data); break;
        case 'employees': setEmployees(data); break;
        case 'products': setProducts(data); break;
        case 'projects': setProjects(data); break;
        case 'transactions': setTransactions(data); break;
        case 'fiscal_documents': setFiscalDocuments(data); break;
        case 'quotations': setQuotations(data); break;
    }

    // 2. Sync with Cloud (Supabase) if available
    if (hasSupabase && user && user.id !== 'master-id-000') {
      try {
        // Map frontend camelCase to database snake_case
        const mapToDB = (item: any) => {
          const mapped: any = { ...item };
          
          // Ensure user_id and admin_id (Tenant ID) are set correctly
          mapped.user_id = item.userId || user.id;
          mapped.admin_id = tenantId;
          
          // Clean up redundant fields after mapping
          delete mapped.userId;
          delete mapped.adminId;
          
          // Table specific mappings
          if (table === 'clients') {
            if (mapped.asaasId) {
              mapped.asaas_id = mapped.asaasId;
              delete mapped.asaasId;
            }
            if (mapped.createdAt) {
              mapped.created_at = mapped.createdAt;
              delete mapped.createdAt;
            }
          }
          
          if (table === 'fiscal_documents') {
            if (mapped.transactionId) {
              mapped.transaction_id = mapped.transactionId;
              delete mapped.transactionId;
            }
            if (mapped.issueDate) {
              mapped.issue_date = mapped.issueDate;
              delete mapped.issueDate;
            }
            if (mapped.accessKey) {
              mapped.access_key = mapped.accessKey;
              delete mapped.accessKey;
            }
          }

          if (table === 'employees') {
            if (mapped.startDate) {
              mapped.start_date = mapped.startDate;
              delete mapped.startDate;
            }
          }

          if (table === 'inventory' || table === 'products') {
            if (mapped.minQuantity) {
              mapped.min_quantity = mapped.minQuantity;
              delete mapped.minQuantity;
            }
            if (mapped.costPrice) {
              mapped.cost_price = mapped.costPrice;
              delete mapped.costPrice;
            }
            if (mapped.taxRate) {
              mapped.tax_rate = mapped.taxRate;
              delete mapped.taxRate;
            }
          }

          if (table === 'projects') {
            if (mapped.clientId) {
              mapped.client_id = mapped.clientId;
              delete mapped.clientId;
            }
          }

          if (table === 'quotations') {
            if (mapped.clientId) {
              mapped.client_id = mapped.clientId;
              delete mapped.clientId;
            }
            if (mapped.totalAmount) {
              mapped.total_amount = mapped.totalAmount;
              delete mapped.totalAmount;
            }
            if (mapped.validUntil) {
              mapped.valid_until = mapped.validUntil;
              delete mapped.validUntil;
            }
            if (mapped.createdAt) {
              mapped.created_at = mapped.createdAt;
              delete mapped.createdAt;
            }
          }
          
          return mapped;
        };

        const dataToSync = Array.isArray(data) 
          ? data.map(item => mapToDB(item))
          : mapToDB(data);

        const { error } = await supabase.from(table).upsert(dataToSync, { onConflict: 'id' });
        
        if (error) {
          console.error(`Erro ao sincronizar ${table} com a nuvem:`, error);
        }
      } catch (error) {
        console.error(`Falha crítica no sync de ${table}:`, error);
      }
    }
  };

  const syncItem = async (table: string, item: any, action: 'insert' | 'update' | 'delete') => {
    // This is called by UI components to ensure cloud is updated
    if (!hasSupabase || !user || !tenantId) return;

    try {
      if (action === 'delete') {
        await supabase.from(table).delete().eq('id', item.id);
      } else if (action === 'insert') {
        await supabase.from(table).insert([{ ...item, user_id: user.id, admin_id: tenantId }]);
      } else {
        await supabase.from(table).update({ ...item, admin_id: tenantId }).eq('id', item.id);
      }
    } catch (error) {
      console.error(`Erro de sync cloud em ${table}:`, error);
      // We could add to an offline queue here
    }
  };

  const generateAsaasBoleto = useCallback(async (transaction: Transaction, client: Client) => {
    if (!asaasToken && !asaasProxyEnabled) throw new Error('Token do Asaas não configurado ou Proxy desativado');
    
    const asaas = new AsaasService(asaasToken, asaasEnv, asaasProxyEnabled);
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
  }, [asaasToken, asaasEnv, syncClientWithAsaas]);

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
    quotations,
    setQuotations: (data: Quotation[]) => saveData('quotations', data),
    generateAsaasBoleto,
    syncAllClientsWithAsaas
  };
}
