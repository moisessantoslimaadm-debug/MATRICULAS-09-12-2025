import React, { useState } from 'react';
import { useLog, AppLog } from '../contexts/LogContext';
import { X, AlertTriangle, Info, AlertCircle, Trash2, Copy, Bug, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';

export const LogViewer: React.FC = () => {
  const { logs, isViewerOpen, setIsViewerOpen, clearLogs } = useLog();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (!isViewerOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  const copyLog = (log: AppLog) => {
    const text = `[${log.timestamp.toLocaleString()}] ${log.type.toUpperCase()}: ${log.message}\n${log.details || ''}`;
    navigator.clipboard.writeText(text);
    alert('Log copiado para a área de transferência.');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsViewerOpen(false)}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col relative animate-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
               <Bug className="h-6 w-6 text-red-600" />
            </div>
            <div>
               <h3 className="text-lg font-bold text-slate-800">Logs do Sistema</h3>
               <p className="text-xs text-slate-500">{logs.length} registros encontrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearLogs}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Limpar todos os logs"
            >
              <Trash2 className="h-4 w-4" />
              Limpar
            </button>
            <button 
              onClick={() => setIsViewerOpen(false)}
              className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <CheckCircle className="h-12 w-12 mb-3 opacity-20" />
              <p>Nenhum log registrado na sessão atual.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div 
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition ${expandedLogId === log.id ? 'bg-slate-50' : ''}`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="shrink-0">{getIcon(log.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded border ${
                            log.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
                            log.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                            'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-xs text-slate-400">{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="truncate text-slate-700 font-medium">{log.message}</p>
                    </div>
                    <div className="shrink-0">
                      {expandedLogId === log.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {expandedLogId === log.id && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200">
                      {log.details && (
                        <div className="mb-3">
                          <p className="text-xs font-bold text-slate-500 mb-1">Stack Trace / Detalhes:</p>
                          <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                            {log.details}
                          </pre>
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); copyLog(log); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
                        >
                          <Copy className="h-3 w-3" /> Copiar Log
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};