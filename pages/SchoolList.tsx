
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useSearchParams } from '../router';
import { MapPin, Search, School as SchoolIcon, Filter, Users, X, ChevronRight, Navigation, Layout, List, Map as MapIcon, GraduationCap, CheckCircle2, AlertCircle, Clock, ChevronLeft, Image, Plus, Edit, Save, Loader2, RefreshCw, ChevronDown, Eye, Sun, Baby, Shapes, Activity } from 'lucide-react';
import { SchoolType, School, RegistryStudent } from '../types';

// Declare Leaflet globally since it's imported via CDN
declare const L: any;

// --- Helper: Levenshtein Distance for Fuzzy Search ---
const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// --- Helper: Availability Logic ---
const getAvailabilityStatus = (school: School, totalEnrolled: number) => {
  const capacity = school.availableSlots; // Capacity is the total slots
  const remaining = Math.max(0, capacity - totalEnrolled);
  
  // Percentage of remaining slots relative to capacity
  const percentage = capacity === 0 ? 0 : (remaining / capacity) * 100;

  if (percentage > 50) return { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', label: 'Vagas Sobrando', icon: CheckCircle2, value: 'high' };
  if (percentage > 10) return { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', label: 'Últimas Vagas', icon: Clock, value: 'medium' };
  return { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Lotada', icon: AlertCircle, value: 'low' };
};

const formatShiftDisplay = (shift: string | undefined) => {
    if (!shift) return '-';
    const s = shift.toLowerCase();
    if (s.includes('matutino')) return 'Manhã';
    if (s.includes('vespertino')) return 'Tarde';
    return shift;
};

// --- Component: School Logo Generator ---
const SchoolLogo: React.FC<{ name: string }> = ({ name }) => {
  // Simple logo generator logic for specific school
  if (normalizeText(name).includes('paraiso da crianca')) {
    return (
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-yellow-200">
        <div className="relative w-10 h-10 flex items-center justify-center bg-blue-50 rounded-full border-2 border-yellow-400 overflow-hidden">
             <Sun className="absolute -top-1 -right-1 h-5 w-5 text-yellow-500 fill-yellow-500 animate-pulse" />
             <Baby className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex flex-col">
           <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider leading-none">Creche</span>
           <span className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 leading-tight font-serif">
             Paraíso da Criança
           </span>
        </div>
      </div>
    );
  }
  return null;
};

// --- Component: School Filters (Reusable) ---
interface SchoolFiltersProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    selectedType: string;
    onTypeChange: (val: string) => void;
    selectedStatus: string;
    onStatusChange: (val: string) => void;
    viewMode: 'list' | 'map';
    onViewModeChange: (mode: 'list' | 'map') => void;
}

const SchoolFilters: React.FC<SchoolFiltersProps> = ({ 
    searchTerm, onSearchChange, 
    selectedType, onTypeChange,
    selectedStatus, onStatusChange,
    viewMode, onViewModeChange 
}) => {
    const schoolTypes = ['Todas', ...Object.values(SchoolType)];
    
    // Local state for debounce
    const [localSearch, setLocalSearch] = useState(searchTerm);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== searchTerm) {
                onSearchChange(localSearch);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [localSearch, onSearchChange, searchTerm]);

    // Sync local state if parent updates searchTerm (e.g. clear filters)
    useEffect(() => {
        setLocalSearch(searchTerm);
    }, [searchTerm]);

    const statusOptions = [
        { value: 'Todos', label: 'Todos' },
        { value: 'high', label: 'Vagas Sobrando' },
        { value: 'medium', label: 'Últimas Vagas' },
        { value: 'low', label: 'Lotada' }
    ];

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Search - Full width on mobile, flexible on desktop */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input 
                    type="text" 
                    placeholder="Buscar por nome, endereço (ex: 'creche centro')..." 
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                </div>
                
                {/* Mobile View Toggle */}
                <div className="lg:hidden flex bg-slate-100 p-1 rounded-lg shrink-0">
                    <button 
                    onClick={() => onViewModeChange('list')}
                    className={`flex-1 px-4 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                    >
                    <List className="h-4 w-4" /> Lista
                    </button>
                    <button 
                    onClick={() => onViewModeChange('map')}
                    className={`flex-1 px-4 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'map' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                    >
                    <MapIcon className="h-4 w-4" /> Mapa
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                 {/* Status Filter Pills */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 mr-2 text-sm text-slate-500 font-medium">
                        <Activity className="h-4 w-4" />
                        Situação:
                    </div>
                    {statusOptions.map(opt => (
                        <button
                        key={opt.value}
                        onClick={() => onStatusChange(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                            selectedStatus === opt.value
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                        >
                        {opt.label}
                        </button>
                    ))}
                </div>

                {/* Type Filter Pills */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 mr-2 text-sm text-slate-500 font-medium">
                        <GraduationCap className="h-4 w-4" />
                        Etapa:
                    </div>
                    {schoolTypes.map(t => (
                        <button
                        key={t}
                        onClick={() => onTypeChange(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                            selectedType === t
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                        >
                        {t}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Subcomponent: Image Carousel ---
interface SchoolCarouselProps {
  images: string[];
  name: string;
  logo?: React.ReactNode;
}

const SchoolCarousel: React.FC<SchoolCarouselProps> = ({ images, name, logo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fallback generic images if none provided
  const displayImages = images && images.length > 0 ? images : [
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1577896334698-13c1eed48814?auto=format&fit=crop&q=80'
  ];

  const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full h-48 bg-slate-200 group overflow-hidden">
        <img 
          src={displayImages[currentIndex]} 
          alt={`${name} - Imagem ${currentIndex + 1}`} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
        
        {/* Custom Logo Overlay */}
        {logo && (
           <div className="absolute top-3 left-3 z-10 animate-in fade-in slide-in-from-top-4 duration-700">
              {logo}
           </div>
        )}

        {/* Navigation Controls (Visible on Hover) */}
        <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
           <button 
             onClick={prevImage}
             className="pointer-events-auto p-1.5 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm text-white transition shadow-sm"
           >
             <ChevronLeft className="h-5 w-5" />
           </button>
           <button 
             onClick={nextImage}
             className="pointer-events-auto p-1.5 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm text-white transition shadow-sm"
           >
             <ChevronRight className="h-5 w-5" />
           </button>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
           {displayImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${currentIndex === idx ? 'bg-white w-3' : 'bg-white/50'}`}
              />
           ))}
        </div>
        
        {/* Photo Count Badge */}
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-300">
            <Image className="h-3 w-3" />
            {currentIndex + 1}/{displayImages.length}
        </div>
    </div>
  );
};

// --- Subcomponent: School Form Modal (Create/Edit) ---
interface SchoolFormModalProps {
  school?: School | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (school: School) => void;
}

const SchoolFormModal: React.FC<SchoolFormModalProps> = ({ school, isOpen, onClose, onSave }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Partial<School>>({
    name: '',
    address: '',
    availableSlots: 0,
    types: [],
    image: '',
    lat: 0,
    lng: 0,
    rating: 5
  });
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (school) {
      setFormData({ ...school });
    } else {
      setFormData({
        name: '',
        address: '',
        availableSlots: 100,
        types: [SchoolType.INFANTIL],
        image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80',
        lat: -12.5253, // Default center
        lng: -40.2917,
        rating: 5
      });
    }
  }, [school, isOpen]);

  if (!isOpen) return null;

  const handleTypeToggle = (type: SchoolType) => {
    setFormData(prev => {
      const currentTypes = prev.types || [];
      if (currentTypes.includes(type)) {
        return { ...prev, types: currentTypes.filter(t => t !== type) };
      } else {
        return { ...prev, types: [...currentTypes, type] };
      }
    });
  };

  const handleGeocode = async () => {
    if (!formData.address) return;
    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }));
        addToast('Coordenadas atualizadas com sucesso!', 'success');
      } else {
        addToast('Endereço não encontrado no mapa.', 'error');
      }
    } catch (e) {
      addToast('Erro ao buscar coordenadas.', 'error');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      addToast('Preencha os campos obrigatórios.', 'warning');
      return;
    }
    onSave(formData as School);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {school ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-green-600" />}
            {school ? 'Editar Escola' : 'Nova Escola'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Escola <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Escola Municipal..."
                />
              </div>

              <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-slate-700 mb-1">Endereço <span className="text-red-500">*</span></label>
                 <div className="flex gap-2">
                   <input 
                    type="text" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Rua, Número, Bairro, Cidade"
                   />
                   <button 
                     type="button" 
                     onClick={handleGeocode}
                     disabled={isGeocoding || !formData.address}
                     className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                     title="Buscar Coordenadas"
                   >
                     {isGeocoding ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapIcon className="h-5 w-5" />}
                   </button>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Capacidade Total</label>
                <input 
                  type="number" 
                  value={formData.availableSlots} 
                  onChange={e => setFormData({...formData, availableSlots: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">URL da Imagem</label>
                 <input 
                  type="text" 
                  value={formData.image} 
                  onChange={e => setFormData({...formData, image: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  placeholder="https://..."
                 />
              </div>

              <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-slate-700 mb-2">Etapas de Ensino</label>
                 <div className="flex flex-wrap gap-2">
                    {Object.values(SchoolType).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeToggle(type)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                          formData.types?.includes(type) 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                 </div>
              </div>
              
              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                     <label className="block text-xs font-bold text-slate-500">Latitude</label>
                     <input 
                      type="number" 
                      step="any"
                      value={formData.lat}
                      onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500">Longitude</label>
                     <input 
                      type="number" 
                      step="any"
                      value={formData.lng}
                      onChange={e => setFormData({...formData, lng: parseFloat(e.target.value)})}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm"
                     />
                  </div>
              </div>
           </div>
           
           <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2">
                <Save className="h-4 w-4" /> Salvar
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};


// --- Subcomponent: Student List Modal ---
interface StudentListModalProps {
  school: School;
  students: RegistryStudent[];
  onClose: () => void;
  onEdit: () => void; // New Prop
}

const StudentListModal: React.FC<StudentListModalProps> = ({ school, students, onClose, onEdit }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  
  // Safe authentication check inside component
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
      setIsAdmin(sessionStorage.getItem('admin_auth') === 'true');
  }, []);
  
  const enrolledStudents = useMemo(() => {
    return students.filter(s => normalizeText(s.school || '') === normalizeText(school.name));
  }, [students, school]);

  const filteredStudents = useMemo(() => {
    // Optimization: normalize query only once
    const normSearch = normalizeText(search);
    const cleanSearch = search.replace(/\D/g, ''); // For strict CPF search
    
    const queryWords = normSearch.split(/\s+/).filter(Boolean);

    return enrolledStudents.filter(s => {
      // Logic: Search by text OR strict CPF
      let matchesSearch = true;
      const studentNameText = normalizeText(s.name);
      const studentCpfClean = (s.cpf || '').replace(/\D/g, '');
      
      if (queryWords.length > 0) {
           // 1. Direct CPF Match
           if (cleanSearch.length > 0 && studentCpfClean.includes(cleanSearch)) {
               matchesSearch = true;
           } else {
               // 2. Fuzzy Name Search
               matchesSearch = queryWords.every(qWord => {
                  if (studentNameText.includes(qWord)) return true;
                  const nameWords = studentNameText.split(/\s+/);
                  return nameWords.some(tWord => {
                      if (Math.abs(tWord.length - qWord.length) > 2) return false;
                      const dist = getLevenshteinDistance(qWord, tWord);
                      return dist <= (qWord.length > 4 ? 2 : 1);
                  });
               });
           }
      }

      const matchesStatus = statusFilter === 'Todos' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enrolledStudents, search, statusFilter]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div>
             <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
               <SchoolIcon className="h-5 w-5 text-blue-600" />
               {school.name}
             </h3>
             <p className="text-sm text-slate-500 mt-1">Lista de alunos matriculados</p>
          </div>
          <div className="flex items-center gap-2">
             {isAdmin && (
               <button 
                  onClick={onEdit} 
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition text-sm font-medium shadow-sm"
               >
                  <Edit className="h-4 w-4" />
                  Editar Escola
               </button>
             )}
             <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
                <X className="h-5 w-5 text-slate-500" />
             </button>
          </div>
        </div>

        {/* Filter */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar aluno por nome ou CPF..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>
           <div className="relative shrink-0 sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none cursor-pointer"
              >
                  <option value="Todos">Todos</option>
                  <option value="Matriculado">Matriculado</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em Análise">Em Análise</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90" />
           </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
           {filteredStudents.length > 0 ? (
             <div className="space-y-3">
               {filteredStudents.map(student => (
                 <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-blue-300 transition">
                    <div>
                       <h4 className="font-bold text-slate-800">{student.name}</h4>
                       <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded">Matrícula: {student.enrollmentId || 'N/A'}</span>
                          <span>•</span>
                          <span>Nasc: {student.birthDate || 'N/A'}</span>
                          <span>•</span>
                          <span>Turma: {student.className || 'Não definida'}</span>
                          <span>•</span>
                          <span>Turno: {formatShiftDisplay(student.shift)}</span>
                       </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                      student.status === 'Matriculado' ? 'bg-green-100 text-green-700' : 
                      student.status === 'Em Análise' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {student.status}
                    </span>
                 </div>
               ))}
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Users className="h-12 w-12 mb-3 opacity-20" />
                <p>Nenhum aluno encontrado com os filtros atuais.</p>
             </div>
           )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center bg-white rounded-b-2xl">
           <span>Total na escola: {enrolledStudents.length}</span>
           <span>Exibindo: {filteredStudents.length}</span>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponent: Optimized Map ---
interface SchoolMapProps {
  schools: School[];
  allStudents: RegistryStudent[];
  center: { lat: number; lng: number };
  onSelectSchool: (school: School) => void;
  onEditSchool: (school: School) => void;
  onViewDetails: (school: School) => void; // New Prop for Scrolling
  viewMode: 'list' | 'map';
}

const SchoolMap: React.FC<SchoolMapProps> = ({ schools, allStudents, center, onSelectSchool, onEditSchool, onViewDetails, viewMode }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [visibleBounds, setVisibleBounds] = useState<any>(null);

  // 1. Initialize Map
  useEffect(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
          zoomControl: false // Custom controls or just cleaner look
      }).setView([center.lat, center.lng], 13);
      
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      
      mapInstanceRef.current = map;
      markersLayerRef.current = markersLayer;

      // Lazy Loading: Function to update bounds with a buffer
      const updateBounds = () => {
         // Check if map instance exists before accessing bounds
         if (mapInstanceRef.current) {
             // Pad 0.5 adds 50% buffer around viewport to preload markers outside immediate view
             setVisibleBounds(mapInstanceRef.current.getBounds().pad(0.5));
         }
      };

      // Initial bounds - delayed slightly to ensure map container has size
      setTimeout(updateBounds, 100);

      // Update bounds on move/zoom (Lazy Loading Trigger)
      map.on('moveend', updateBounds);
      map.on('zoomend', updateBounds);

      return () => {
          if(mapInstanceRef.current) {
              mapInstanceRef.current.remove();
              mapInstanceRef.current = null;
          }
      };
  }, []);

  // 1.5 Handle View Mode Resize (Critical Fix for Leaflet in Tabs)
  useEffect(() => {
      if(mapInstanceRef.current && viewMode === 'map') {
          setTimeout(() => {
              mapInstanceRef.current.invalidateSize();
              // Force update bounds after resize so markers load for the new viewport size
              setVisibleBounds(mapInstanceRef.current.getBounds().pad(0.5));
          }, 200);
      }
  }, [viewMode]);

  // 2. Update Markers based on Viewport & Data
  useEffect(() => {
      if (!mapInstanceRef.current || !markersLayerRef.current) return;

      const layerGroup = markersLayerRef.current;
      layerGroup.clearLayers();

      // Viewport Culling Optimization:
      // Only render markers that are physically inside the current map viewport (+buffer)
      const schoolsToRender = visibleBounds 
          ? schools.filter(s => visibleBounds.contains(L.latLng(s.lat, s.lng)))
          : schools;

      schoolsToRender.forEach(school => {
          // IMPORTANT: Count only 'Matriculado' students for accurate availability calculation
          const enrolledCount = allStudents.filter(s => 
              normalizeText(s.school || '') === normalizeText(school.name) && 
              s.status === 'Matriculado'
          ).length;

          const status = getAvailabilityStatus(school, enrolledCount);
          
          // Custom Marker using DivIcon for colored indicators
          const customIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background-color: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                      <div class="${status.color}" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;"></div>
                     </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
              popupAnchor: [0, -12]
          });

          const marker = L.marker([school.lat, school.lng], { icon: customIcon });

          // Non-intrusive smaller popup
          const popupContent = document.createElement('div');
          popupContent.innerHTML = `
              <div class="p-2 text-center min-w-[160px]">
                  <h3 class="font-bold text-xs text-slate-900 mb-1 truncate max-w-[150px] mx-auto">${school.name}</h3>
                  <div class="flex justify-center mb-2">
                     <span class="text-[9px] px-1.5 py-0.5 rounded ${status.bg} ${status.text} font-bold border border-current opacity-80">
                        ${status.label}
                     </span>
                  </div>
                  <button id="view-details-${school.id}" class="w-full bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-blue-700 transition">
                      Ver na Lista
                  </button>
              </div>
          `;

          // Event delegation for popup button
          popupContent.querySelector(`#view-details-${school.id}`)?.addEventListener('click', (e) => {
              e.preventDefault();
              onViewDetails(school);
          });
          
          marker.bindPopup(popupContent, { closeButton: false, offset: [0, -10] });
          marker.addTo(layerGroup);
      });

  }, [schools, visibleBounds, allStudents, onSelectSchool, onViewDetails]);

  return <div ref={mapContainerRef} className="w-full h-full z-10" />;
};


// --- Main Component ---
export const SchoolList: React.FC = () => {
  const { schools, students, addSchool, updateSchools } = useData();
  const { addToast } = useToast();
  // Safe destructuring with new dummy router support
  const [searchParams] = useSearchParams();

  // Auth State for UI Protection
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
      setIsAdmin(sessionStorage.getItem('admin_auth') === 'true');
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos'); // New status filter
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // Mobile toggle
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Management State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  
  // --- Deep Linking Effect ---
  useEffect(() => {
    const schoolIdParam = searchParams.get('schoolId');
    const actionParam = searchParams.get('action');

    if (schoolIdParam && schools.length > 0) {
        const targetSchool = schools.find(s => s.id === schoolIdParam || s.inep === schoolIdParam);
        if (targetSchool) {
            setSelectedSchool(targetSchool);
        }
    }

    if (actionParam === 'new' && isAdmin) {
        handleCreateSchool();
    }
  }, [searchParams, schools, isAdmin]);

  // Filtering Logic - OPTIMIZED
  const filteredSchools = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

    return schools.filter(school => {
      let matchesSearch = true;
      
      if (queryWords.length > 0) {
          const schoolText = normalizeText(`${school.name} ${school.address}`);
          const schoolWords = schoolText.split(/\s+/);

          matchesSearch = queryWords.every(qWord => {
              if (schoolText.includes(qWord)) return true;
              return schoolWords.some(tWord => {
                  if (Math.abs(tWord.length - qWord.length) > 2) return false;
                  const dist = getLevenshteinDistance(qWord, tWord);
                  const tolerance = qWord.length > 4 ? 2 : 1;
                  return dist <= tolerance;
              });
          });
      }
      
      const matchesType = selectedType === 'Todas' || school.types.includes(selectedType as SchoolType);

      // Status Check Logic
      let matchesStatus = true;
      if (selectedStatus !== 'Todos') {
           const enrolledCount = students.filter(s => 
               normalizeText(s.school || '') === normalizeText(school.name) && 
               s.status === 'Matriculado'
           ).length;
           const status = getAvailabilityStatus(school, enrolledCount);
           matchesStatus = status.value === selectedStatus;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [schools, searchTerm, selectedType, selectedStatus, students]);

  // Pagination Logic
  const paginatedSchools = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredSchools.slice(start, start + itemsPerPage);
  }, [filteredSchools, currentPage]);
  
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);

  // Reset pagination on filter change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedType, selectedStatus]);

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setIsFormOpen(true);
  };

  const handleCreateSchool = () => {
    setEditingSchool(null);
    setIsFormOpen(true);
  };

  const handleSaveSchool = async (data: School) => {
    try {
      if (editingSchool) {
        // Edit Mode
        const updated = { ...editingSchool, ...data };
        await updateSchools([updated]);
        addToast('Escola atualizada com sucesso!', 'success');
      } else {
        // Create Mode
        const newSchool: School = {
          ...data,
          id: data.id || Date.now().toString(),
          gallery: []
        };
        await addSchool(newSchool);
        addToast('Nova escola cadastrada!', 'success');
      }
      setIsFormOpen(false);
      setEditingSchool(null);
    } catch (error) {
      console.error(error);
      addToast('Erro ao salvar dados da escola.', 'error');
    }
  };

  // Logic to scroll to the specific card in the list
  const handleScrollToCard = (school: School) => {
     // Ensure we are in list view (mainly for mobile)
     setViewMode('list');
     
     // Find the page this school belongs to
     const schoolIndex = filteredSchools.findIndex(s => s.id === school.id);
     if (schoolIndex !== -1) {
         const targetPage = Math.ceil((schoolIndex + 1) / itemsPerPage);
         if (targetPage !== currentPage) {
             setCurrentPage(targetPage);
         }
         
         // Slight delay to allow render
         setTimeout(() => {
             const element = document.getElementById(`school-card-${school.id}`);
             if (element) {
                 element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 // Optional highlight effect
                 element.classList.add('ring-2', 'ring-blue-500');
                 setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 2000);
             }
         }, 100);
     }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-100px)] flex flex-col">
        
        {/* Header & Controls */}
        <div className="mb-6 space-y-4 shrink-0">
           <div className="flex justify-between items-end">
             <div>
               <h1 className="text-3xl font-bold text-slate-900">Escolas Municipais</h1>
               <p className="text-slate-600">Encontre e gerencie as unidades escolares.</p>
             </div>
             {isAdmin && (
               <button 
                 onClick={handleCreateSchool}
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200"
               >
                 <Plus className="h-5 w-5" />
                 Nova Escola
               </button>
             )}
           </div>

           {/* Reusable Filter Component */}
           <SchoolFilters 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedType={selectedType}
                onTypeChange={setSelectedType}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
           />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
           
           {/* List View */}
           <div className={`flex-1 flex flex-col ${viewMode === 'map' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                 {paginatedSchools.length > 0 ? (
                   paginatedSchools.map(school => {
                     // Count only 'Matriculado' students for availability
                     const enrolledCount = students.filter(s => 
                        normalizeText(s.school || '') === normalizeText(school.name) && 
                        s.status === 'Matriculado'
                     ).length;
                     
                     const status = getAvailabilityStatus(school, enrolledCount);
                     
                     return (
                       <div 
                         key={school.id} 
                         id={`school-card-${school.id}`} // Added ID for scroll targeting
                         onClick={() => setSelectedSchool(school)}
                         className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group overflow-hidden animate-in slide-in-from-bottom-2 duration-500 cursor-pointer scroll-mt-24"
                        >
                          
                          {/* Top Image Carousel with Custom Logo Support */}
                          <SchoolCarousel 
                            images={school.gallery || [school.image]} 
                            name={school.name} 
                            logo={<SchoolLogo name={school.name} />}
                          />

                          <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-3">
                                  {/* Replaced Icon logic with content */}
                                  <div>
                                      <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{school.name}</h3>
                                      <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
                                        <MapPin className="h-3 w-3" />
                                        {school.address}
                                      </div>
                                  </div>
                                </div>
                                <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status.bg} ${status.text} border-current opacity-90`}>
                                    <status.icon className="h-3 w-3" />
                                    {status.label}
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                                {school.types.map(type => (
                                  <span key={type} className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                                    {type}
                                  </span>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="text-xs text-slate-500 font-medium">
                                    <span className="text-slate-900 font-bold text-sm">{school.availableSlots}</span> vagas totais
                                </div>
                                <div className="flex gap-2">
                                  {isAdmin && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditSchool(school); }}
                                      className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition text-xs font-bold uppercase"
                                      title="Editar informações"
                                    >
                                      <Edit className="h-3.5 w-3.5" /> Editar
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedSchool(school); }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-xs font-bold uppercase shadow-sm"
                                    title="Visualizar lista de alunos matriculados"
                                  >
                                      <Users className="h-3.5 w-3.5" />
                                      Ver Alunos ({enrolledCount})
                                  </button>
                                </div>
                            </div>
                          </div>
                       </div>
                     );
                   })
                 ) : (
                   <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                      <SchoolIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-900">Nenhuma escola encontrada</h3>
                      <p className="text-slate-500">Tente ajustar os filtros ou termo de busca.</p>
                   </div>
                 )}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                  <div className="pt-4 border-t border-slate-200 flex justify-center gap-2">
                      <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                      >
                          <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg">
                          Página {currentPage} de {totalPages}
                      </span>
                      <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                      >
                          <ChevronRight className="h-4 w-4" />
                      </button>
                  </div>
              )}
           </div>

           {/* Map View */}
           <div className={`lg:w-1/2 xl:w-5/12 h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative ${viewMode === 'list' ? 'hidden lg:block' : 'block'}`}>
              <SchoolMap 
                 schools={filteredSchools} // Map always shows filtered results (viewport optimization handles performance)
                 allStudents={students}
                 center={{ lat: -12.5253, lng: -40.2917 }} 
                 onSelectSchool={setSelectedSchool}
                 onEditSchool={handleEditSchool}
                 onViewDetails={handleScrollToCard}
                 viewMode={viewMode}
              />
              
              {/* Floating Legend */}
              <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg z-[400] text-xs border border-slate-200">
                 <h4 className="font-bold mb-2 text-slate-700">Disponibilidade</h4>
                 <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm"></span>
                       <span>Vagas Sobrando ({'>'}50%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-yellow-500 border border-white shadow-sm"></span>
                       <span>Últimas Vagas (10-50%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></span>
                       <span>Lotada ({'<'}10%)</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Student List Modal */}
      {selectedSchool && (
        <StudentListModal 
          school={selectedSchool}
          students={students}
          onClose={() => setSelectedSchool(null)}
          onEdit={() => {
              setSelectedSchool(null);
              handleEditSchool(selectedSchool);
          }}
        />
      )}

      {/* Create/Edit School Modal */}
      <SchoolFormModal 
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingSchool(null); }}
        onSave={handleSaveSchool}
        school={editingSchool}
      />
    </div>
  );
};