import React, { useEffect, useState } from 'react';
import { Link, useLocation } from '../router';
import { GraduationCap, Menu, X, Database, LayoutDashboard, CloudCheck, BarChart3, Lock, LayoutGrid } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Monitor auth status for visual feedback
  useEffect(() => {
    const checkAuth = () => {
        setIsAuthenticated(sessionStorage.getItem('admin_auth') === 'true');
    };
    checkAuth();
  }, [location.pathname]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const isActive = (path: string) => location.pathname === path ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600';

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* O logo redireciona para Dashboard (se logado) ou para Raiz/Hub (se não logado) */}
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex-shrink-0 flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight">Educa<span className="text-blue-600">Município</span></span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {/* Links Visíveis para Todos */}
            <Link to="/schools" className={isActive('/schools')}>Escolas</Link>
            <Link to="/registration" className={isActive('/registration')}>Matrícula</Link>
            <Link to="/status" className={isActive('/status')}>Protocolo</Link>
            
            {/* Novo Link para o App Externo */}
            <Link to="/external" className={`${isActive('/external')} flex items-center gap-1.5`}>
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden lg:inline">Portal</span> Extra
            </Link>

            {/* Links Restritos (Apenas Admin) */}
            {isAuthenticated && (
                <>
                    <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
                    <Link to="/reports" className={`${isActive('/reports')} flex items-center gap-1.5`} title="Visualizar Relatórios e Estatísticas">
                       <BarChart3 className="h-4 w-4" /> Relatórios
                    </Link>
                    <Link to="/admin/data" className={`${isActive('/admin/data')} flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100`}>
                      <Database className="h-3 w-3" />
                      <span className="text-sm">Gestão</span>
                    </Link>
                </>
            )}
          </div>

          <div className="flex items-center gap-4">
             {/* Data Status Indicator */}
             <div className="hidden lg:flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full border border-green-100" title="Dados salvos localmente no navegador">
                <CloudCheck className="h-3.5 w-3.5 text-green-600" />
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Salvo</span>
             </div>
             
             {/* Admin Login Shortcut - Aponta para raiz agora */}
             <Link 
               to="/" 
               className={`hidden md:flex p-2 rounded-full transition ${isAuthenticated ? 'text-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`} 
               title={isAuthenticated ? "Logado como Admin" : "Acesso Administrativo"}
             >
                <Lock className="h-4 w-4" />
             </Link>

             <div className="flex items-center md:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/schools" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50">Escolas</Link>
            <Link to="/registration" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50">Realizar Matrícula</Link>
            <Link to="/status" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50">Consultar Protocolo</Link>
            
            <Link to="/external" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Portal Extra
            </Link>

            {isAuthenticated && (
                <>
                    <Link to="/dashboard" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link to="/reports" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Relatórios
                    </Link>
                    <Link to="/admin/data" onClick={toggleMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Gestão de Dados
                    </Link>
                </>
            )}
            
            <Link to="/" onClick={toggleMenu} className={`block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${isAuthenticated ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}`}>
              <Lock className="h-4 w-4" />
              {isAuthenticated ? 'Painel Admin (Logado)' : 'Login Admin'}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};