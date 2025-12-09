import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type LogType = 'error' | 'warning' | 'info';

export interface AppLog {
  id: string;
  timestamp: Date;
  message: string;
  details?: string;
  type: LogType;
}

interface LogContextType {
  logs: AppLog[];
  addLog: (message: string, type?: LogType, details?: string) => void;
  clearLogs: () => void;
  isViewerOpen: boolean;
  setIsViewerOpen: (isOpen: boolean) => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const LogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const addLog = useCallback((message: string, type: LogType = 'info', details?: string) => {
    const newLog: AppLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type,
      details
    };

    setLogs(prev => [newLog, ...prev]); // Newest first

    // Auto-open on critical errors (optional, usually annoying, so disabled by default)
    if (type === 'error') {
       console.error(`[App Log] ${message}`, details);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs, isViewerOpen, setIsViewerOpen }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLog = () => {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLog must be used within a LogProvider');
  }
  return context;
};