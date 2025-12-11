import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useLog } from '../contexts/LogContext';
import { useNavigate } from '../router';
import { 
  FileSpreadsheet, Upload, Download, Search, ChevronLeft, ChevronRight, 
  Trash2, Edit3, LogOut, Bug, ChevronDown, Plus, X, FileText, Lock, TrendingUp
} from 'lucide-react';
import { RegistryStudent, School, SchoolType } from '../types';

// --- Reusing the SearchableSelect Component with Performance Optimization ---
interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Selecione...", label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
     return options
        .filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 50); 
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white flex justify-between items-center cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
      >
        <span className={`block truncate ${!value || value === 'Todas' ? 'text-slate-500' : 'text-slate-900'}`}>
           {value === 'Todas' ? placeholder : value}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-200 max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-100">
           <div className="p-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-lg">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Filtrar opções..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>
           </div>
           <div className="overflow-y-auto flex-1 p-1">
              <div 
                onClick={() => { onChange('Todas'); setIsOpen(false); setSearchTerm(''); }}
                className={`px-3 py-2 text-sm rounded-md cursor-pointer transition ${value === 'Todas' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                Todas as Escolas
              </div>
              <div 
                onClick={() => { onChange('Não alocada'); setIsOpen(false); setSearchTerm(''); }}
                className={`px-3 py-2 text-sm rounded-md cursor-pointer transition ${value === 'Não alocada' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                Não Alocadas
              </div>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div 
                    key={option}
                    onClick={() => { onChange(option); setIsOpen(false); setSearchTerm(''); }}
                    className={`px-3 py-2 text-sm rounded-md cursor-pointer transition ${value === option ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {option}
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  Nenhuma escola encontrada.
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Functions ---
const normalizeForFuzzy = (str: string | null | undefined) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
};

const formatShiftDisplay = (shift: string | undefined) => {
    if (!shift) return '-';
    const s = shift.toLowerCase();
    if (s.includes('matutino')) return 'Manhã';
    if (s.includes('vespertino')) return 'Tarde';
    return shift;
};

// --- Helper for CPF Formatting ---
const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// --- Admin School Form Modal ---
const AdminSchoolFormModal = ({ school, isOpen, onClose, onSave }: { school: School | null, isOpen: boolean, onClose: () => void, onSave: (s: School) => void }) => {
    const [formData, setFormData] = useState<School | null>(null);

    useEffect(() => {
        if (school) {
            setFormData(school);
        } else if (isOpen) {
            // Default new school
            setFormData({
                id: '',
                name: '',
                address: '',
                availableSlots: 100,
                types: [SchoolType.INFANTIL],
                image: '',
                lat: 0,
                lng: 0,
                rating: 5,
                gallery: []
            } as School);
        }
    }, [school, isOpen]);

    if (!isOpen || !formData) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: formData.id || Date.now().toString()
        });
    };

    const handleTypeToggle = (t: SchoolType) => {
        const types = formData.types.includes(t)
            ? formData.types.filter(type => type !== t)
            : [...formData.types, t];
        setFormData({ ...formData, types });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                     <h3 className="text-xl font-bold text-slate-900">{school ? 'Editar Escola' : 'Nova Escola'}</h3>
                     <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
                 </div>
                 <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                     <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Escola</label>
                         <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                     </div>
                     <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Endereço</label>
                         <input type="text" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Código INEP</label>
                             <input type="text" value={formData.inep || ''} onChange={e => setFormData({...formData, inep: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                         </div>
                         <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Capacidade</label>
                             <input type="number" required value={formData.availableSlots} onChange={e => setFormData({...formData, availableSlots: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                         </div>
                     </div>
                     <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Modalidades de Ensino</label>
                         <div className="flex flex-wrap gap-2">
                             {Object.values(SchoolType).map(type => (
                                 <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleTypeToggle(type)}
                                    className={`px-3 py-1 text-xs font-bold rounded-full border ${formData.types.includes(type) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}
                                 >
                                     {type}
                                 </button>
                             ))}
                         </div>
                     </div>
                     <div className="pt-4 flex justify-end gap-2">
                         <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                         <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Salvar</button>
                     </div>
                 </form>
             </div>
        </div>
    );
};

// --- Admin Student Form Modal ---
interface AdminStudentFormModalProps {
  isOpen: boolean;
  student: RegistryStudent | null;
  onClose: () => void;
  onSave: (student: RegistryStudent) => void;
  schools: School[]; // Need schools for the dropdown
}

const AdminStudentFormModal: React.FC<AdminStudentFormModalProps> = ({ isOpen, student, onClose, onSave, schools }) => {
  const [formData, setFormData] = useState<RegistryStudent | null>(null);
  
  useEffect(() => {
    if (student) {
      setFormData({ ...student });
    } else if (isOpen) {
      setFormData({
        id: `new_${Date.now()}`,
        name: '',
        birthDate: '',
        cpf: '',
        status: 'Matriculado',
        school: '',
        transportRequest: false,
        specialNeeds: false,
        className: '',
        shift: '',
        guardianName: '',
        guardianContact: '',
        guardianCpf: ''
      });
    }
  }, [student, isOpen]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleCpfChange = (field: 'cpf' | 'guardianCpf', value: string) => {
      setFormData({ ...formData, [field]: formatCPF(value) });
  };

  const schoolNames = schools.map(s => s.name);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">{student?.id.startsWith('manual') || student?.id.startsWith('new') ? 'Novo Aluno' : 'Editar Aluno'}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">CPF Aluno</label>
              <input type="text" value={formData.cpf} onChange={e => handleCpfChange('cpf', e.target.value)} maxLength={14} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Data de Nascimento</label>
              <input type="text" placeholder="DD/MM/AAAA" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            {/* Guardian Info */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Responsável</label>
                    <input type="text" value={formData.guardianName || ''} onChange={e => setFormData({ ...formData, guardianName: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Mãe, Pai ou Responsável Legal" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Contato (Tel/Zap)</label>
                    <input type="text" value={formData.guardianContact || ''} onChange={e => setFormData({ ...formData, guardianContact: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="(00) 00000-0000" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CPF Responsável</label>
                    <input type="text" value={formData.guardianCpf || ''} onChange={e => handleCpfChange('guardianCpf', e.target.value)} maxLength={14} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="000.000.000-00" />
                </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Escola</label>
              <SearchableSelect 
                options={schoolNames} 
                value={formData.school || 'Não alocada'} 
                onChange={(val) => setFormData({ ...formData, school: val === 'Todas' ? 'Não alocada' : val })} 
                placeholder="Selecione a Escola"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Turma</label>
              <input type="text" value={formData.className || ''} onChange={e => setFormData({ ...formData, className: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: GRUPO 4 A" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Turno</label>
              <select value={formData.shift || ''} onChange={e => setFormData({ ...formData, shift: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Selecione...</option>
                <option value="Matutino">Manhã</option>
                <option value="Vespertino">Tarde</option>
                <option value="Integral">Integral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Status da Matrícula</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="Matriculado">Matriculado</option>
                <option value="Pendente">Pendente</option>
                <option value="Em Análise">Em Análise</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-6 pt-2">
             <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.transportRequest} onChange={e => setFormData({...formData, transportRequest: e.target.checked})} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Solicita Transporte?</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.specialNeeds} onChange={e => setFormData({...formData, specialNeeds: e.target.checked})} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Aluno AEE (Deficiência)?</span>
             </label>
          </div>

          {/* Medical Report Viewer */}
          {formData.medicalReport && (
            <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg flex items-center justify-between border border-blue-100 mt-2">
                <span className="text-sm text-blue-800 font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Laudo Médico Anexado
                </span>
                <a 
                    href={formData.medicalReport} 
                    download={`Laudo_${formData.name.replace(/\s+/g, '_')}.pdf`} 
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 font-bold flex items-center gap-1 transition shadow-sm"
                >
                    <Download className="h-3 w-3" />
                    Baixar / Visualizar
                </a>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm">Salvar Aluno</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- MAIN COMPONENT ---

export const AdminData: React.FC = () => {
  const { schools, students, updateSchools, updateStudents, addStudent, removeStudent } = useData();
  const { addToast } = useToast();
  const { addLog, setIsViewerOpen } = useLog(); 
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // View State
  const [activeTab, setActiveTab] = useState<'students' | 'schools' | 'classes'>('students');

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('Todas');
  const [classFilter, setClassFilter] = useState('Todas'); 
  const [shiftFilter, setShiftFilter] = useState('Todos'); 
  const [statusFilter, setStatusFilter] = useState('Todos'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'cpf' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // School Management
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Student Management
  const [selectedStudent, setSelectedStudent] = useState<RegistryStudent | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  // --- Auth & Security ---
  useEffect(() => {
      // Dupla verificação: Se App.tsx falhar, este effect garante a expulsão
      const isAuth = sessionStorage.getItem('admin_auth') === 'true';
      if (!isAuth) {
          navigate('/login');
      }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    addToast('Sessão encerrada.', 'info');
    navigate('/login');
  };

  const schoolNames = useMemo(() => {
      return schools.map(s => s.name).sort();
  }, [schools]);

  const distinctClasses = useMemo(() => {
      const classes = students.map(s => s.className).filter(Boolean) as string[];
      return [...new Set(classes)].sort();
  }, [students]);

  // --- Filtering Logic (UPDATED) ---
  const filteredData = useMemo(() => {
    const normalizedSearch = normalizeForFuzzy(searchTerm);

    if (activeTab === 'students') {
        return students.filter(student => {
            const studentCpf = (student.cpf || '').replace(/\D/g, '');
            const guardianCpf = (student.guardianCpf || '').replace(/\D/g, '');
            const searchClean = searchTerm.replace(/\D/g, '');

            // Busca por Nome do Aluno, CPF do Aluno OU CPF do Responsável OU Nome do Responsável
            const matchesSearch = 
                normalizeForFuzzy(student.name).includes(normalizedSearch) || 
                normalizeForFuzzy(student.guardianName || '').includes(normalizedSearch) ||
                (searchClean.length > 0 && (studentCpf.includes(searchClean) || guardianCpf.includes(searchClean)));

            const matchesSchool = schoolFilter === 'Todas' || student.school === schoolFilter;
            const matchesStatus = statusFilter === 'Todos' || student.status === statusFilter;
            const matchesClass = classFilter === 'Todas' || student.className === classFilter;
            
            const matchesShift = shiftFilter === 'Todos' || 
                                 (shiftFilter === 'ND' 
                                    ? (!student.shift || student.shift === '' || student.shift === '-') 
                                    : student.shift === shiftFilter);
            
            return matchesSearch && matchesSchool && matchesStatus && matchesClass && matchesShift;
        });
    } else if (activeTab === 'schools') {
        return schools.filter(school => {
            return normalizeForFuzzy(school.name).includes(normalizedSearch);
        });
    }
    return [];
  }, [students, schools, activeTab, searchTerm, schoolFilter, statusFilter, classFilter, shiftFilter]);

  // --- Sorting Logic ---
  const sortedData = useMemo(() => {
    const data = [...filteredData];
    
    if (activeTab === 'students' && sortField) {
        return data.sort((a: any, b: any) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';
            
            if (sortField === 'name') {
                return sortDirection === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            }
            if (sortField === 'cpf') {
                 valA = valA.replace(/\D/g, '');
                 valB = valB.replace(/\D/g, '');
                 if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                 if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                 return 0;
            }
            return 0;
        });
    }
    
    return data;
  }, [filteredData, activeTab, sortField, sortDirection]);

  // --- Pagination ---
  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (field: 'name' | 'cpf') => {
      if (sortField === field) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDirection('asc');
      }
  };

  // --- Actions ---
  const handleDeleteSchool = (id: string) => {
      const schoolName = schools.find(s => s.id === id)?.name;
      const hasStudents = students.some(s => s.school === schoolName);
      
      if (hasStudents) {
          addToast("Não é possível excluir escola com alunos matriculados.", 'warning');
          return;
      }
      
      if(window.confirm("Deseja realmente excluir esta escola?")) {
          const newSchools = schools.filter(s => s.id !== id);
          updateSchools(newSchools); 
          addToast("Escola removida.", 'success');
      }
  };

  const handleSaveSchool = (school: School) => {
      let newSchools = [...schools];
      const index = newSchools.findIndex(s => s.id === school.id);
      if (index >= 0) {
          newSchools[index] = school;
      } else {
          newSchools.push(school);
      }
      updateSchools(newSchools);
      setIsSchoolModalOpen(false);
      addToast("Escola salva com sucesso.", 'success');
  };

  const handleSaveStudent = (s: RegistryStudent) => {
      if (isCreatingStudent) {
          addStudent(s);
          addToast("Aluno criado.", 'success');
      } else {
          updateStudents([s]);
          addToast("Aluno atualizado.", 'success');
      }
      setIsStudentModalOpen(false);
  };

  const openNewStudentModal = () => {
      setSelectedStudent({
          id: `manual_${Date.now()}`,
          name: '',
          birthDate: '',
          cpf: '',
          status: 'Matriculado',
          school: '',
          transportRequest: false,
          specialNeeds: false
      } as RegistryStudent);
      setIsCreatingStudent(true);
      setIsStudentModalOpen(true);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const text = event.target?.result as string;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            const newStudents: RegistryStudent[] = [];
            
            const firstLine = rows[0] || '';
            const delimiter = firstLine.includes(';') ? ';' : ',';
            const startIndex = rows[0].toLowerCase().includes('nome') ? 1 : 0;

            for (let i = startIndex; i < rows.length; i++) {
                const cols = rows[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length < 2) continue;

                newStudents.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: cols[0]?.toUpperCase() || 'SEM NOME',
                    birthDate: cols[1] || '',
                    cpf: cols[2] || '',
                    school: cols[3] || 'Não alocada',
                    status: (cols[4] as any) || 'Matriculado',
                    className: cols[5] || '',
                    shift: cols[6] || '',
                    transportRequest: cols[7]?.toLowerCase() === 'sim',
                    specialNeeds: cols[8]?.toLowerCase() === 'sim',
                    guardianName: cols[9] || '', // Import Guardian Name
                    guardianContact: cols[10] || '', // Import Guardian Contact
                    guardianCpf: cols[11] || '', // Import Guardian CPF
                    enrollmentId: `IMP-${Math.floor(Math.random() * 100000)}`
                });
            }

            if (newStudents.length > 0) {
                await updateStudents(newStudents);
                addToast(`${newStudents.length} alunos importados com sucesso!`, 'success');
                addLog(`Importação de CSV: ${newStudents.length} registros adicionados.`);
            } else {
                addToast('Nenhum aluno válido encontrado no arquivo.', 'warning');
            }

        } catch (error) {
            console.error(error);
            addToast('Erro ao processar arquivo CSV.', 'error');
            addLog('Erro na importação de CSV', 'error', String(error));
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const handleExportFiltered = () => {
    if (filteredData.length === 0) {
        addToast("Nenhum registro para exportar com os filtros atuais.", 'warning');
        return;
    }

    let headers: string[] = [];
    let rows: string[] = [];

    if (activeTab === 'students') {
        headers = ["Nome", "CPF", "Nascimento", "Status", "Escola", "Turma", "Turno", "Deficiência", "Transporte", "Responsável", "Contato", "CPF Responsável"];
        rows = (filteredData as RegistryStudent[]).map((item) => [
            `"${item.name}"`,
            `"${item.cpf || ''}"`,
            `"${item.birthDate || ''}"`,
            `"${item.status}"`,
            `"${item.school || ''}"`,
            `"${item.className || ''}"`,
            `"${item.shift || ''}"`,
            item.specialNeeds ? "Sim" : "Não",
            item.transportRequest ? "Sim" : "Não",
            `"${item.guardianName || ''}"`,
            `"${item.guardianContact || ''}"`,
            `"${item.guardianCpf || ''}"`
        ].join(';'));
    } else if (activeTab === 'schools') {
         headers = ["Nome", "INEP", "Endereço", "Capacidade", "Modalidades"];
         rows = (filteredData as School[]).map((item) => [
           `"${item.name}"`,
           `"${item.inep || ''}"`,
           `"${item.address}"`,
           item.availableSlots,
           `"${item.types.join(', ')}"`
         ].join(';'));
    }

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `exportacao_${activeTab}_filtrada_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
      // Updated CSV Template to include Guardian Data for full integrity
      const headers = "nome;nascimento;cpf;escola;status;turma;turno;transporte;deficiencia;responsavel;contato;cpf_responsavel";
      const sample = "JOAO SILVA;01/01/2015;000.000.000-00;ESCOLA EXEMPLO;Matriculado;TURMA A;Matutino;Sim;Nao;MARIA SILVA;(00) 00000-0000;000.000.000-00";
      const csvContent = `${headers}\n${sample}`;
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `modelo_importacao_alunos_completo.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-100px)] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
           <div>
               <h1 className="text-3xl font-bold text-slate-900">Gestão de Dados</h1>
               <p className="text-slate-600">Painel administrativo da rede.</p>
           </div>
           <div className="flex gap-2">
               <button 
                 onClick={() => setIsViewerOpen(true)}
                 className="px-4 py-2 text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition flex items-center gap-2 border border-slate-200"
               >
                   <Bug className="h-4 w-4" /> Logs
               </button>
               <button onClick={handleLogout} className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition flex items-center gap-2">
                   <LogOut className="h-4 w-4" /> Sair
               </button>
           </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-2xl border border-b-0 border-slate-200 flex overflow-hidden shrink-0">
            <button 
                onClick={() => { setActiveTab('students'); setCurrentPage(1); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'students' ? 'bg-white text-blue-600 border-t-2 border-t-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
                <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === 'students' ? 'rotate-90' : ''}`} />
                Alunos <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1">{students.length}</span>
            </button>
            <button 
                onClick={() => { setActiveTab('schools'); setCurrentPage(1); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'schools' ? 'bg-white text-blue-600 border-t-2 border-t-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
                <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === 'schools' ? 'rotate-90' : ''}`} />
                Unidades Escolares <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1">{schools.length}</span>
            </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 border border-slate-200 border-t-0 flex flex-col lg:flex-row gap-4 shrink-0 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder={activeTab === 'students' ? "Buscar aluno por Nome, CPF ou Responsável..." : "Buscar escola..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
            </div>
            {activeTab === 'students' && (
                <>
                   <div className="w-full lg:w-64">
                       <SearchableSelect options={schoolNames} value={schoolFilter} onChange={setSchoolFilter} placeholder="Todas as Escolas" />
                   </div>
                   
                   <div className="w-full lg:w-48">
                        <select
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="Todas">Todas as Turmas</option>
                            {distinctClasses.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                   </div>
                   
                   <div className="w-full lg:w-40">
                        <select
                            value={shiftFilter}
                            onChange={(e) => setShiftFilter(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="Todos">Todos os Turnos</option>
                            <option value="Matutino">Manhã</option>
                            <option value="Vespertino">Tarde</option>
                            <option value="Integral">Integral</option>
                            <option value="ND">Não definido / Vazio</option>
                        </select>
                   </div>
                   <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full lg:w-auto border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                        <option value="Todos">Status</option>
                        <option value="Matriculado">Matriculado</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Em Análise">Em Análise</option>
                    </select>
                </>
            )}
            <div className="flex gap-2 w-full lg:w-auto">
                {activeTab === 'students' && (
                    <>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept=".csv,.txt" 
                            onChange={handleImportCSV} 
                        />
                        <button 
                            onClick={handleDownloadTemplate}
                            className="bg-slate-50 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center justify-center gap-2 transition"
                            title="Baixar Modelo de CSV"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2 transition"
                            title="Importar Alunos via CSV"
                        >
                            <Upload className="h-4 w-4" /> <span className="hidden xl:inline">Importar</span>
                        </button>
                    </>
                )}
                <button 
                    onClick={handleExportFiltered}
                    className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center justify-center gap-2 transition"
                    title="Exportar dados filtrados"
                >
                    <Download className="h-4 w-4" /> <span className="hidden xl:inline">Exportar</span>
                </button>
                <button 
                    onClick={() => {
                        if(activeTab === 'students') openNewStudentModal();
                        else { setSelectedSchool(null); setIsSchoolModalOpen(true); }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition whitespace-nowrap flex-1 lg:flex-none"
                >
                    <Plus className="h-4 w-4" /> {activeTab === 'students' ? 'Novo Aluno' : 'Nova Escola'}
                </button>
            </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto bg-white border border-slate-200 border-t-0 relative">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 z-10 shadow-sm">
                    {activeTab === 'students' ? (
                        <tr>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition group"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Nome
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition group"
                                onClick={() => handleSort('cpf')}
                            >
                                <div className="flex items-center gap-1">
                                    CPF
                                </div>
                            </th>
                            <th className="px-6 py-3">Escola</th>
                            <th className="px-6 py-3">Turma</th>
                            <th className="px-6 py-3">Turno</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    ) : (
                        <tr>
                            <th className="px-6 py-3">Nome da Escola</th>
                            <th className="px-6 py-3">INEP</th>
                            <th className="px-6 py-3">Endereço</th>
                            <th className="px-6 py-3">Capacidade</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    )}
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {paginatedData.length > 0 ? (
                        paginatedData.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-3 font-medium text-slate-900">{item.name}</td>
                                {activeTab === 'students' ? (
                                    <>
                                        <td className="px-6 py-3 font-mono text-slate-500">{item.cpf || '-'}</td>
                                        <td className="px-6 py-3 text-slate-600">{item.school || 'Não alocada'}</td>
                                        <td className="px-6 py-3 text-slate-600">{item.className || '-'}</td>
                                        <td className="px-6 py-3 text-slate-600">{formatShiftDisplay(item.shift)}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${item.status === 'Matriculado' ? 'bg-green-100 text-green-700' : item.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-3 font-mono text-slate-500">{item.inep || '-'}</td>
                                        <td className="px-6 py-3 text-slate-600 truncate max-w-xs">{item.address}</td>
                                        <td className="px-6 py-3">{item.availableSlots}</td>
                                    </>
                                )}
                                <td className="px-6 py-3 text-right flex justify-end gap-2">
                                    {activeTab === 'students' && (
                                        <button 
                                            onClick={() => navigate(`/performance?studentId=${item.id}`)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                            title="Ver Boletim / Indicadores"
                                        >
                                            <TrendingUp className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => {
                                            if (activeTab === 'students') {
                                                setSelectedStudent(item);
                                                setIsCreatingStudent(false);
                                                setIsStudentModalOpen(true);
                                            } else {
                                                setSelectedSchool(item);
                                                setIsSchoolModalOpen(true);
                                            }
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                             if (activeTab === 'students') {
                                                if(window.confirm('Excluir aluno?')) removeStudent(item.id);
                                             } else {
                                                handleDeleteSchool(item.id);
                                             }
                                        }}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400">
                                Nenhum registro encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Footer / Pagination */}
        <div className="bg-white p-4 border border-t-0 border-slate-200 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Exibir:</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                    }}
                    className="border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span>itens</span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="text-sm text-slate-500">
                    Página {currentPage} de {totalPages || 1}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Modals */}
      <AdminSchoolFormModal 
         isOpen={isSchoolModalOpen} 
         onClose={() => setIsSchoolModalOpen(false)} 
         school={selectedSchool}
         onSave={handleSaveSchool}
      />
      
      <AdminStudentFormModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        student={selectedStudent}
        onSave={handleSaveStudent}
        schools={schools}
      />
    </div>
  );
};