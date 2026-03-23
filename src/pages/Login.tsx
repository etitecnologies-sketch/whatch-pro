import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, User as UserIcon, Loader2, Zap, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Deep Space Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/5 rounded-full blur-[160px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none animate-float"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.03)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
          <div className="inline-flex items-center justify-center mb-6 relative group">
            <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full group-hover:bg-primary/40 transition-all duration-500"></div>
            <Logo size={96} className="relative z-10" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tightest leading-none mb-3 glow-text">
            WHATCH <span className="text-primary">PRO</span>
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-white/10"></div>
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Enterprise OS v1.0</p>
            <div className="h-px w-8 bg-white/10"></div>
          </div>
        </div>

        <div className="glass p-12 rounded-[48px] shadow-2xl border border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative overflow-hidden">
          {/* Subtle Inner Glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
          
          <h2 className="text-2xl font-black text-white tracking-tight mb-10 flex items-center gap-3">
            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
            {isRegistering ? 'Criar Nova' : 'Autenticar'} <span className="text-primary">Conta</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {isRegistering && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Nome Completo</label>
                <div className="relative group">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-slate-900/40 border border-white/5 rounded-3xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-bold text-white shadow-inner"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-slate-900/40 border border-white/5 rounded-3xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-bold text-white shadow-inner"
                  placeholder="exemplo@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-slate-900/40 border border-white/5 rounded-3xl focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all text-sm font-bold text-white shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/30 glow-primary flex items-center justify-center gap-4 relative overflow-hidden group/btn"
            >
              <div className="absolute inset-0 shimmer opacity-0 group-hover/btn:opacity-30 transition-opacity"></div>
              {loading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <>
                  <Zap size={20} className="group-hover/btn:animate-pulse" />
                  {isRegistering ? 'Registrar Sistema' : 'Acessar Terminal'}
                </>
              )}
            </button>
          </form>

          <div className="mt-12 flex flex-col items-center gap-5">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
                <ShieldCheck size={16} className="text-primary" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/80">Criptografia Militar AES-256</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {isRegistering ? 'Já possui acesso?' : 'Não possui acesso?'} 
                  <button 
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="ml-2 text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
                  >
                    {isRegistering ? 'Login' : 'Solicitar Registro'}
                  </button>
                </p>
                <button className="text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors">
                  Esqueci minha senha
                </button>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 opacity-30">
            <div className="h-px w-12 bg-slate-700"></div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
              Whatch Pro OS
            </p>
            <div className="h-px w-12 bg-slate-700"></div>
        </div>
      </div>
    </div>
  );
}
