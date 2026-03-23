export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  password?: string; // For mock data management
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
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  price: number;
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
}

export interface FiscalDocument {
  id: string;
  userId: string;
  transactionId: string;
  type: 'NF-e' | 'NFC-e' | 'Cupom';
  number: string;
  series: string;
  accessKey: string;
  issueDate: string;
  amount: number;
  status: 'issued' | 'cancelled' | 'pending';
  xml?: string;
}
