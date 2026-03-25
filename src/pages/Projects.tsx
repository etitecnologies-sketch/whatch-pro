import { useState } from 'react'
import { Plus, Search, Calendar, CheckCircle2, Clock, AlertCircle, Edit2, Trash2, X, DollarSign, Building2, Briefcase } from 'lucide-react'
import type { Project } from '../types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useData } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Projects() {
  const { projects, setProjects, clients, saveData } = useData()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    budget: 0,
    deadline: '',
    status: 'planning' as Project['status']
  })

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      const updatedProjects = projects.filter(p => p.id !== id)
      saveData('projects', updatedProjects)
    }
  }

  const handleSave = () => {
    if (!user) return

    let updatedProjects: Project[] = []
    if (editingProject) {
      updatedProjects = projects.map(p => p.id === editingProject.id ? { ...editingProject, ...formData } : p)
    } else {
      const newProject: Project = {
        id: crypto.randomUUID(),
        userId: user.id,
        ...formData
      }
      updatedProjects = [...projects, newProject]
    }
    
    saveData('projects', updatedProjects)
    setIsModalOpen(false)
  }

  const openModal = (project: Project | null = null) => {
    if (project) {
      setEditingProject(project)
      setFormData({
        name: project.name,
        clientId: project.clientId,
        budget: project.budget,
        deadline: project.deadline,
        status: project.status
      })
    } else {
      setEditingProject(null)
      setFormData({ name: '', clientId: clients[0]?.id || '', budget: 0, deadline: '', status: 'planning' })
    }
    setIsModalOpen(true)
  }

  const getStatusInfo = (status: Project['status']) => {
    switch (status) {
      case 'completed': return { icon: CheckCircle2, label: 'Concluído', color: 'text-green-500 bg-green-500/10' }
      case 'in-progress': return { icon: Clock, label: 'Em Andamento', color: 'text-blue-500 bg-blue-500/10' }
      case 'planning': return { icon: Calendar, label: 'Planejamento', color: 'text-slate-500 bg-slate-500/10' }
      case 'on-hold': return { icon: AlertCircle, label: 'Em Espera', color: 'text-amber-500 bg-amber-500/10' }
    }
  }

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Cliente N/A'
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
            Gestão de <span className="text-primary glow-text">Projetos</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Acompanhe cronogramas, orçamentos e entregas.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl glow-primary hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Novo Projeto
        </button>
      </div>

      {/* Filters and Search */}
      <div className="glass p-6 rounded-[32px] border border-white/50 dark:border-slate-600/60 flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 group-focus-within:text-primary transition-all duration-300" size={18} />
          <input
            type="text"
            placeholder="Pesquisar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/60 border border-white/50 dark:border-slate-600/60 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-medium placeholder:text-slate-600 dark:placeholder:text-slate-400 shadow-inner"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProjects.map((project) => {
            const statusInfo = getStatusInfo(project.status)
            return (
                <div key={project.id} className="glass rounded-[40px] border border-white/50 dark:border-slate-600/60 p-8 card-hover group flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-500"></div>
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className={cn("px-4 py-1.5 rounded-xl flex items-center gap-2", statusInfo.color)}>
                            <statusInfo.icon size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{statusInfo.label}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(project)} className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(project.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                        </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                    <div className="flex items-center gap-2 mb-6">
                        <Building2 size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{getClientName(project.clientId)}</span>
                    </div>

                    <div className="mt-auto space-y-6 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orçamento</p>
                                <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget)}
                                </p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prazo Final</p>
                                <div className="flex items-center justify-end gap-2 text-sm font-black text-slate-900 dark:text-white">
                                    <Calendar size={14} className="text-primary" />
                                    <span>{new Date(project.deadline).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Simulation */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span>Progresso</span>
                                <span>{project.status === 'completed' ? '100%' : project.status === 'in-progress' ? '65%' : '0%'}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
                                <div 
                                    className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        project.status === 'completed' ? "bg-green-500 w-full glow-primary" : 
                                        project.status === 'in-progress' ? "bg-primary w-[65%] glow-primary shimmer" : "bg-slate-300 w-0"
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )
        })}
        {filteredProjects.length === 0 && (
            <div className="col-span-full py-20 glass rounded-[40px] flex flex-col items-center gap-4 text-slate-400">
                <Briefcase size={48} className="opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">Nenhum projeto em andamento</p>
            </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg glass rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tightest">
                {editingProject ? 'Editar' : 'Novo'} <span className="text-primary">Projeto</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Projeto</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  placeholder="Ex: Desenvolvimento Web v2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente Responsável</label>
                <select 
                  value={formData.clientId}
                  onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                >
                  <option value="" disabled>Selecionar Cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Orçamento Estimado</label>
                  <input 
                    type="number" 
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prazo Final</label>
                  <input 
                    type="date" 
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status Inicial</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold shadow-inner"
                >
                  <option value="planning">Planejamento</option>
                  <option value="in-progress">Em Andamento</option>
                  <option value="on-hold">Em Espera</option>
                  <option value="completed">Concluído</option>
                </select>
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
                Salvar Projeto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
