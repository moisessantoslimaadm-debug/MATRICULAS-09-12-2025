
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { School, RegistryStudent } from '../types';
import { MOCK_SCHOOLS, MOCK_STUDENT_REGISTRY } from '../constants';
import { db } from '../services/db'; // Importando o banco local Dexie
import { useToast } from './ToastContext';

interface DataContextType {
  schools: School[];
  students: RegistryStudent[];
  lastBackupDate: string | null;
  addSchool: (school: School) => Promise<void>;
  addStudent: (student: RegistryStudent) => Promise<void>;
  updateSchools: (newSchools: School[]) => Promise<void>;
  updateStudents: (newStudents: RegistryStudent[]) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;
  removeSchool: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
  registerBackup: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize states
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<RegistryStudent[]>([]);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log("Conectando ao banco de dados local...");
      
      // Verifica se o app já foi inicializado alguma vez neste navegador
      const isInitialized = localStorage.getItem('educa_app_initialized');
      const savedBackup = localStorage.getItem('educa_last_backup');

      if (!isInitialized) {
          console.log("Primeira execução detectada. Configurando banco de dados inicial...");
          
          // Limpa qualquer resíduo anterior para garantir integridade na primeira vez
          await db.schools.clear();
          await db.students.clear();

          // Popula com dados iniciais (Mocks) apenas na primeira vez
          await db.schools.bulkAdd(MOCK_SCHOOLS);
          await db.students.bulkAdd(MOCK_STUDENT_REGISTRY);

          // Marca o sistema como inicializado. 
          // A partir de agora, o sistema SÓ lerá o que está no banco, nunca mais sobrescreverá.
          localStorage.setItem('educa_app_initialized', 'true');
          
          setSchools(MOCK_SCHOOLS);
          setStudents(MOCK_STUDENT_REGISTRY);
      } else {
          // Execuções subsequentes: Carrega EXATAMENTE o que está no banco persistente
          console.log("Carregando dados persistentes...");
          const localSchools = await db.schools.toArray();
          const localStudents = await db.students.toArray();

          setSchools(localSchools);
          setStudents(localStudents);
      }

      setLastBackupDate(savedBackup);
      
    } catch (error) {
      console.error("Erro crítico ao carregar dados:", error);
      addToast('Erro ao acessar o armazenamento local.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addSchool = async (school: School) => {
    try {
        // Persiste no Banco PRIMEIRO
        await db.schools.put(school);
        // Atualiza UI depois
        setSchools(prev => {
            // Remove se já existir (update) e adiciona o novo
            const filtered = prev.filter(s => s.id !== school.id);
            return [...filtered, school];
        });
    } catch (e) {
        console.error("Erro ao salvar escola:", e);
        addToast("Erro ao salvar dados permanentemente.", "error");
    }
  };

  const addStudent = async (student: RegistryStudent) => {
    try {
        // Persiste no Banco PRIMEIRO
        await db.students.put(student);
        // Atualiza UI depois
        setStudents(prev => {
             const filtered = prev.filter(s => s.id !== student.id);
             return [...filtered, student];
        });
    } catch (e) {
        console.error("Erro ao salvar aluno:", e);
        addToast("Erro ao salvar dados permanentemente.", "error");
    }
  };

  const updateSchools = async (newSchools: School[]) => {
    try {
        await db.schools.bulkPut(newSchools);
        setSchools(prev => {
            const map = new Map(prev.map(s => [s.id, s]));
            newSchools.forEach(s => map.set(s.id, s));
            return Array.from(map.values());
        });
    } catch (e) {
         addToast("Erro ao atualizar escolas.", "error");
    }
  };

  const updateStudents = async (newStudents: RegistryStudent[]) => {
    try {
        await db.students.bulkPut(newStudents);
        setStudents(prev => {
            const studentMap = new Map(prev.map(s => [s.id, s]));
            newStudents.forEach(s => studentMap.set(s.id, s));
            return Array.from(studentMap.values());
        });
    } catch (e) {
        addToast("Erro ao atualizar alunos.", "error");
    }
  };

  const removeStudent = async (id: string) => {
    try {
        await db.students.delete(id);
        setStudents(prev => prev.filter(s => s.id !== id));
        addToast("Aluno removido permanentemente.", "success");
    } catch (e) {
        addToast("Erro ao remover aluno.", "error");
    }
  };

  const removeSchool = async (id: string) => {
    try {
        await db.schools.delete(id);
        setSchools(prev => prev.filter(s => s.id !== id));
        addToast("Escola removida permanentemente.", "success");
    } catch (e) {
        addToast("Erro ao remover escola.", "error");
    }
  };

  const resetData = async () => {
    if(!window.confirm("ATENÇÃO: Isso apagará TODOS os dados inseridos manualmente e restaurará os dados de exemplo (Fábrica). Deseja continuar?")) {
        return;
    }

    try {
        setIsLoading(true);
        // Limpa banco local Dexie
        await db.schools.clear();
        await db.students.clear();
        
        // Repopula
        await db.schools.bulkAdd(MOCK_SCHOOLS);
        await db.students.bulkAdd(MOCK_STUDENT_REGISTRY);
        
        localStorage.removeItem('educa_last_backup');
        // Mantém a flag initialized como true, pois acabamos de reinicializar
        localStorage.setItem('educa_app_initialized', 'true');
        
        setSchools(MOCK_SCHOOLS);
        setStudents(MOCK_STUDENT_REGISTRY);
        setLastBackupDate(null);
        addToast("Sistema restaurado para os padrões de fábrica.", "info");
    } catch (e) {
        addToast("Erro ao resetar sistema.", "error");
    } finally {
        setIsLoading(false);
    }
  };

  const registerBackup = () => {
      const now = new Date().toISOString();
      setLastBackupDate(now);
      localStorage.setItem('educa_last_backup', now);
  };

  return (
    <DataContext.Provider value={{ 
      schools, 
      students, 
      lastBackupDate,
      addSchool, 
      addStudent, 
      updateSchools, 
      updateStudents, 
      removeStudent, 
      removeSchool, 
      resetData, 
      registerBackup,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
