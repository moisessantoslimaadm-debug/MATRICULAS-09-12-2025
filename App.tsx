import React, { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Registration } from './pages/Registration';
import { SchoolList } from './pages/SchoolList';
import { Status } from './pages/Status';
import { AdminData } from './pages/AdminData';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
import { PerformanceIndicators } from './pages/PerformanceIndicators'; // Importação
import { NotFound } from './pages/NotFound';
import { Login } from './pages/Login';
import { ExternalApp } from './pages/ExternalApp';
import { ChatAssistant } from './components/ChatAssistant';
import { HashRouter, Routes, Route, useLocation, useNavigate } from './router';
import { DataProvider, useData } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import { LogProvider } from './contexts/LogContext'; 
import { LogViewer } from './components/LogViewer'; 
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, GraduationCap } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
        <div>
          <h4 className="text-white font-bold text-lg mb-4">EducaMunicípio</h4>
          <p className="text-sm">
            Transformando a educação pública através da tecnologia e acessibilidade.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Links Rápidos</h4>
          <ul className="space-y-2 text-sm">
            <li>Portal da Transparência</li>
            <li>Calendário Escolar</li>
            <li>Cardápio da Merenda</li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Contato</h4>
          <ul className="space-y-2 text-sm">
            <li>Central: 156</li>
            <li>Email: contato@educacao.gov.br</li>
            <li>Av. Educação, 1000 - Centro</li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Horário de Atendimento</h4>
          <p className="text-sm">
            Segunda a Sexta<br/>
            08:00 às 17:00
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
        &copy; {new Date().getFullYear()} Secretaria Municipal de Educação. Todos os direitos reservados.
      </div>
    </footer>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const AppContent: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useData();
  
  // --- LÓGICA DE PROTEÇÃO DE ROTAS E DIRECIONAMENTO (SECURITY GUARD) ---
  useEffect(() => {
    const isAuth = sessionStorage.getItem('admin_auth') === 'true';
    
    // Lista de rotas públicas (acessíveis sem senha)
    const publicRoutes = ['/', '/login', '/registration', '/status', '/schools', '/external'];
    
    // Verifica se o caminho atual começa com alguma rota pública
    const isPublicPath = publicRoutes.some(route => 
        pathname === route || pathname.startsWith(route + '/')
    );

    if (!isAuth) {
        // [VISITANTE]
        // Se tentar acessar rota restrita -> Manda para a Raiz (Hub)
        if (!isPublicPath) {
            navigate('/');
        }
    } else {
        // [ADMIN]
        // Se estiver logado e acessar a Raiz ou Login -> Manda direto para o Dashboard
        if (pathname === '/' || pathname === '/login') {
            navigate('/dashboard');
        }
    }
  }, [pathname, navigate]);
  
  // Adiciona '/performance' aos caminhos válidos
  const validPaths = ['/', '/dashboard', '/registration', '/schools', '/status', '/admin/data', '/reports', '/login', '/external', '/performance'];
  const isNotFound = !validPaths.includes(pathname);
  
  // Oculta Navbar e Footer na tela de Login/Hub
  const isLoginPage = pathname === '/' || pathname === '/login';
  
  // Oculta o Footer na tela externa para dar mais espaço ao App embutido
  const isExternalPage = pathname === '/external';
  
  const showLayout = !isNotFound && !isLoginPage;

  // Global Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
         <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="bg-blue-600 p-3 rounded-xl mb-4 shadow-lg shadow-blue-200">
               <GraduationCap className="h-8 w-8 text-white animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Carregando Sistema...</h2>
            <p className="text-slate-500 text-sm flex items-center gap-2">
               <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
               Inicializando banco de dados local
            </p>
         </div>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        {showLayout && <Navbar />}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/performance" element={<PerformanceIndicators />} /> {/* Nova Rota */}
            <Route path="/schools" element={<SchoolList />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="/status" element={<Status />} />
            <Route path="/admin/data" element={<AdminData />} />
            <Route path="/external" element={<ExternalApp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {showLayout && !isExternalPage && <Footer />}
      </div>
      
      <LogViewer />
      {!isNotFound && <ChatAssistant />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <LogProvider>
        <ToastProvider>
          <DataProvider>
            <HashRouter>
              <AppContent />
            </HashRouter>
          </DataProvider>
        </ToastProvider>
      </LogProvider>
    </ErrorBoundary>
  );
};

export default App;