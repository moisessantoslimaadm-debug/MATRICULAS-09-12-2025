import React, { useState } from 'react';
import { useNavigate, Link } from '../router';
import { useToast } from '../contexts/ToastContext';
import { GraduationCap, Lock, User, ArrowRight, Loader2, ShieldCheck, FileText, Search, School } from 'lucide-react';
import { MUNICIPALITY_NAME } from '../constants';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulação de delay de rede para feedback visual
    setTimeout(() => {
      // Credencial Única (Single User) - Admin / 1234
      if (username === 'admin' && password === '1234') {
        
        // UNIFICAÇÃO: Usa a mesma chave que a página AdminData verifica
        sessionStorage.setItem('admin_auth', 'true');
        
        addToast(`Bem-vindo ao Educa${MUNICIPALITY_NAME}!`, 'success');
        
        // Redireciona diretamente para a gestão de dados, pois é o fluxo natural do admin
        navigate('/admin/data'); 
      } else {
        addToast('Usuário ou senha incorretos.', 'error');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 relative overflow-hidden p-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 opacity-90"></div>
        <img 
          src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        
        {/* Left Side: Public Access Hub */}
        <div className="text-white space-y-6 md:pr-8 animate-in slide-in-from-left-8 duration-700 hidden md:block">
            <div>
                <h1 className="text-4xl font-bold mb-2">Portal da Educação</h1>
                <p className="text-blue-100 text-lg">Bem-vindo ao sistema de matrícula digital de {MUNICIPALITY_NAME}.</p>
            </div>
            
            <div className="space-y-4">
                <p className="font-medium text-sm text-blue-200 uppercase tracking-wider">Acesso para Pais e Alunos</p>
                <div className="grid gap-3">
                    <Link to="/registration" className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl flex items-center gap-4 transition group backdrop-blur-sm">
                        <div className="bg-green-500/20 p-2 rounded-lg text-green-300 group-hover:text-green-200 group-hover:bg-green-500/30 transition">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Realizar Matrícula</h3>
                            <p className="text-xs text-blue-100">Solicite vaga para novos alunos</p>
                        </div>
                        <ArrowRight className="h-5 w-5 ml-auto text-white/50 group-hover:translate-x-1 transition" />
                    </Link>

                    <Link to="/status" className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl flex items-center gap-4 transition group backdrop-blur-sm">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-300 group-hover:text-blue-200 group-hover:bg-blue-500/30 transition">
                            <Search className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Consultar Protocolo</h3>
                            <p className="text-xs text-blue-100">Verifique o status da solicitação</p>
                        </div>
                        <ArrowRight className="h-5 w-5 ml-auto text-white/50 group-hover:translate-x-1 transition" />
                    </Link>

                    <Link to="/schools" className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl flex items-center gap-4 transition group backdrop-blur-sm">
                        <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-300 group-hover:text-indigo-200 group-hover:bg-indigo-500/30 transition">
                            <School className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Ver Escolas</h3>
                            <p className="text-xs text-blue-100">Conheça as unidades da rede</p>
                        </div>
                        <ArrowRight className="h-5 w-5 ml-auto text-white/50 group-hover:translate-x-1 transition" />
                    </Link>
                </div>
            </div>
        </div>

        {/* Right Side: Admin Login */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          {/* Header */}
          <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200 rotate-3 transform hover:rotate-6 transition-transform">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              Área Restrita
            </h2>
            <p className="text-sm text-slate-500 mt-2">Acesso exclusivo para gestores</p>
          </div>

          {/* Form */}
          <div className="p-8 pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Usuário</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Senha</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Acessar Painel
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Mobile Public Links */}
          <div className="md:hidden border-t border-slate-100 p-4 bg-slate-50">
             <p className="text-xs font-bold text-slate-400 uppercase text-center mb-3">Acesso Público</p>
             <div className="flex justify-center gap-4">
                <Link to="/registration" className="text-blue-600 text-sm font-medium hover:underline">Matrícula</Link>
                <span className="text-slate-300">|</span>
                <Link to="/status" className="text-blue-600 text-sm font-medium hover:underline">Protocolo</Link>
             </div>
          </div>

          {/* Security Badge */}
          <div className="bg-slate-100 p-3 border-t border-slate-200 flex items-center justify-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck className="h-3 w-3" />
            <span>Sistema Seguro • Secretaria de Educação</span>
          </div>
        </div>
      </div>
    </div>
  );
};