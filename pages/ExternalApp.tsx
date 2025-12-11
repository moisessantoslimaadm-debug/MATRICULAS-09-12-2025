import React, { useState } from 'react';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';

// --- CONFIGURAÇÃO ---
// COLOQUE AQUI O LINK DO SEU OUTRO APP (Google IDX, Vercel, etc)
// Exemplo: 'https://meu-outro-projeto.idx.google.com'
const EXTERNAL_APP_URL = 'https://www.wikipedia.org'; 

export const ExternalApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Header da Integração */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shrink-0">
        <div>
           <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             Sistema Integrado
             <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 uppercase">Externo</span>
           </h2>
           <p className="text-xs text-slate-500">Visualizando aplicação conectada</p>
        </div>
        <a 
          href={EXTERNAL_APP_URL} 
          target="_blank" 
          rel="noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium hover:underline"
        >
          Abrir em nova janela <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Área do App Externo */}
      <div className="flex-1 relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
            <p className="text-slate-500 text-sm">Carregando sistema externo...</p>
          </div>
        )}

        {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 p-8 text-center">
                <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Não foi possível carregar o sistema</h3>
                <p className="text-slate-500 max-w-md mt-2">
                    O aplicativo externo recusou a conexão ou não permite ser exibido dentro de outra página.
                </p>
                <a 
                    href={EXTERNAL_APP_URL} 
                    target="_blank" 
                    rel="noreferrer"
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Tentar abrir diretamente
                </a>
            </div>
        ) : (
            <iframe
            src={EXTERNAL_APP_URL}
            title="External Application"
            className="w-full h-full border-none bg-white"
            onLoad={handleLoad}
            onError={handleError}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; geolocation; microphone; camera"
            />
        )}
      </div>
    </div>
  );
};