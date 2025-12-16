import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy } from 'lucide-react';
import { useLog } from '../contexts/LogContext';

interface InnerProps {
  children?: ReactNode;
  logError?: (message: string, details: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryInner extends React.Component<InnerProps, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Send to LogContext if available
    if (this.props.logError) {
        this.props.logError(
            `Erro Crítico de Interface: ${error.message}`, 
            errorInfo.componentStack
        );
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (window.confirm("Isso limpará os dados locais para tentar recuperar o sistema. Deseja continuar?")) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  private handleCopyDetails = () => {
      const { error, errorInfo } = this.state;
      const text = `Erro: ${error?.message}\n\nStack Trace:\n${errorInfo?.componentStack || 'Não disponível'}`;
      navigator.clipboard.writeText(text);
      alert('Detalhes do erro copiados para a área de transferência.');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 mb-6">
              Ocorreu um erro inesperado na aplicação.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-lg text-left mb-6 overflow-hidden border border-slate-200">
                <p className="text-xs font-mono text-slate-600 break-words line-clamp-4">
                    {this.state.error?.message || "Erro desconhecido"}
                </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Recarregar Página
              </button>
              
              <button
                onClick={this.handleCopyDetails}
                className="w-full flex items-center justify-center px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
              >
                <Copy className="h-5 w-5 mr-2 text-slate-500" />
                Copiar Detalhes do Erro
              </button>

              <button
                onClick={() => window.location.hash = '#/'}
                className="w-full flex items-center justify-center px-6 py-3 bg-transparent text-slate-500 rounded-xl font-medium hover:text-slate-700 transition text-sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Início
              </button>
              
               <button
                onClick={this.handleReset}
                className="text-xs text-red-400 hover:text-red-600 underline mt-4 block mx-auto"
              >
                Resetar dados de emergência
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper Funcional para injetar o contexto de Logs
export const ErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
    let logError: ((message: string, details: string) => void) | undefined;
    try {
        const { addLog } = useLog();
        logError = (msg: string, details: string) => addLog(msg, 'error', details);
    } catch (e) {
        console.warn("LogProvider não encontrado para o ErrorBoundary");
    }

    return <ErrorBoundaryInner logError={logError}>{children}</ErrorBoundaryInner>;
};