export default function Warehouse() {
  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tightest mb-2">
          Gestão de <span className="text-primary glow-text">Almoxarifado</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Módulo em construção. Ideal para provedores controlarem materiais e retirada por OS.
        </p>
      </div>
      <div className="glass p-8 rounded-[32px] border border-white/50 dark:border-slate-600/60">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Em breve: entrada/saída, kits, estoque mínimo, reservas e histórico por técnico.
        </p>
      </div>
    </div>
  )
}
