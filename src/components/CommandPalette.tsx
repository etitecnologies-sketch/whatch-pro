import { useState, useEffect } from 'react'
import { Search, Command, User, Settings, Package, Briefcase, Building2, X, ChevronRight } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CommandPaletteProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  onSelect: (id: string) => void
}

export default function CommandPalette({ isOpen, setIsOpen, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(!isOpen)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, setIsOpen])

  const commands = [
    { id: 'dashboard', label: 'Dashboard', icon: Command, category: 'Navegação' },
    { id: 'clients', label: 'Clientes', icon: Building2, category: 'Navegação' },
    { id: 'employees', label: 'Funcionários', icon: User, category: 'Navegação' },
    { id: 'inventory', label: 'Estoque', icon: Package, category: 'Navegação' },
    { id: 'projects', label: 'Projetos', icon: Briefcase, category: 'Navegação' },
    { id: 'settings', label: 'Configurações', icon: Settings, category: 'Navegação' },
  ]

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl glass rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-white/10">
          <Search size={22} className="text-primary glow-text" />
          <input
            autoFocus
            type="text"
            placeholder="O que você deseja fazer?"
            className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 text-[10px] font-bold text-slate-400 bg-white/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">ESC</kbd>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {filteredCommands.length > 0 ? (
            <div>
              <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Sugestões</p>
              <div className="space-y-1">
                {filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      onSelect(cmd.id)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-primary/10 group transition-all text-left border border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white/50 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                        <cmd.icon size={20} className="text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{cmd.label}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{cmd.category}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-slate-400 font-bold">Nenhum comando encontrado para "{query}"</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm">↑↓</kbd>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Navegar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm">Enter</kbd>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Selecionar</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Whatch Pro OS v1.0</p>
        </div>
      </div>
    </div>
  )
}
