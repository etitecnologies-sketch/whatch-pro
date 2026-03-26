import { useState } from 'react'
import { Plus, Search, MoreVertical, Edit2, Trash2, User, X } from 'lucide-react'
import type { Client } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Clients() {
  const { clients, setClients, saveData } = useData()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: ''
  })

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cnpj.includes(searchTerm)
  )

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      const updatedClients = clients.filter(c => c.id !== id)
      saveData('clients', updatedClients)
    }
  }

  const handleSave = () => {
    if (!user) return

    let updatedClients: Client[] = []
    if (editingClient) {
      updatedClients = clients.map(c => c.id === editingClient.id ? { ...editingClient, ...formData } : c)
    } else {
      const newClient: Client = {
        id: crypto.randomUUID(),
        userId: user.id,
        adminId: user.adminId || user.id, // Multi-tenant link
        ...formData,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0]
      }
      updatedClients = [...clients, newClient]
    }
    
    saveData('clients', updatedClients)
    setIsModalOpen(false)
  }

  const openModal = (client: Client | null = null) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        name: client.name,
        cnpj: client.cnpj,
        email: client.email,
        phone: client.phone
      })
    } else {
      setEditingClient(null)
      setFormData({ name: '', cnpj: '', email: '', phone: '' })
    }
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Base de <span className="text-primary glow-text">Clientes</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gerencie o relacionamento e dados dos seus parceiros.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Filters and Search */}
      <div className="glass p-6 rounded-[32px] border border-white/50 dark:border-slate-600/60 flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-700/50 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium shadow-inner"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="glass rounded-[40px] shadow-2xl border border-white/50 dark:border-slate-600/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 dark:bg-slate-950/50 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Documento</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Contato</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 text-right">Gerenciar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-800/50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{client.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Desde {client.createdAt}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-mono font-bold text-slate-600 dark:text-slate-400">{client.cnpj}</td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{client.email}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{client.phone}</div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                      client.status === 'active' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openModal(client)}
                        className="p-3 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all border border-transparent hover:border-blue-500/20"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="p-3 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <User size={48} className="opacity-20" />
                      <p className="font-bold">Nenhum cliente encontrado.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest">
                {editingClient ? 'Editar' : 'Novo'} <span className="text-primary">Cliente</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome / Razão Social</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  placeholder="Ex: João Silva ou Minha Empresa Ltda"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CNPJ / CPF</label>
                  <input 
                    type="text" 
                    value={formData.cnpj}
                    onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all text-sm shadow-lg shadow-primary/20"
              >
                Salvar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
