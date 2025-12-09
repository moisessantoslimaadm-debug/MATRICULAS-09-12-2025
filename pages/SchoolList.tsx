
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useSearchParams } from '../router';
import { MapPin, Search, School as SchoolIcon, Filter, Users, X, ChevronRight, Navigation, Layout, List, Map as MapIcon, GraduationCap, CheckCircle2, AlertCircle, Clock, Baby, ChevronLeft, Edit3, User, Plus } from 'lucide-react';
import { School, SchoolType, RegistryStudent } from '../types';

// Declare Leaflet globally
declare const L: any;

const getLevenshteinDistance = (a: string, b: string) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const normalizeText = (text: string) => {
  if (!text) return '';
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// --- School Carousel Component ---
const SchoolCarousel = ({ images, name, onClick }: { images?: string[], name: string, onClick?: () => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Fallback images if no gallery provided
    const gallery = images && images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80'
    ];

    const nextSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % gallery.length);
    };

    const prevSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
    };

    return (
        <div className="relative h-48 overflow-hidden group" onClick={onClick}>
            <div 
                className="absolute inset-0 transition-transform duration-500 ease-out flex" 
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {gallery.map((img, idx) => (
                    <img key={idx} src={img} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover shrink-0" />
                ))}
            </div>
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

            {/* Navigation Controls */}
            {gallery.length > 1 && (
                <>
                    <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {gallery.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/40'}`} 
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// --- School Logo Component ---
const SchoolLogo = ({ name }: { name: string }) => {
    // Generate a consistent pseudo-logo based on school name
    if (name === 'CRECHE PARAISO DA CRIANCA') {
        return (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-yellow-200 flex items-center justify-center">
                    <div className="text-yellow-500 font-bold text-xl">☀️</div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block leading-none">Paraíso da</span>
                    <span className="text-sm font-extrabold text-pink-500 block leading-none">Criança</span>
                </div>
            </div>
        );
    }
    return null;
};

// --- Student List Modal ---
interface StudentListModalProps {
  school: School;
  students: RegistryStudent[];
  isOpen: boolean;
  onClose: () => void;
  onEditSchool?: () => void;
}

const StudentListModal: React.FC<StudentListModalProps> = ({ school, students, isOpen, onClose, onEditSchool }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
      setIsAdmin(sessionStorage.getItem('admin_auth') === 'true');
  }, [isOpen]);

  if (!isOpen) return null;

  const schoolStudents = students.filter(s => s.school === school.name);

  const filteredStudents = schoolStudents.filter(student => {
    const normalizedSearch = normalizeText(searchTerm);
    const searchClean = searchTerm.replace(/\D/g, ''); // Extract only numbers
    
    // Robust search: Student Name, Guardian Name, Student CPF (clean), Guardian CPF (clean)
    const studentCpfClean = (student.cpf || '').replace(/\D/g, '');
    const guardianCpfClean = (student.guardianCpf || '').replace(/\D/g, '');
    
    const matchesSearch = 
        normalizeText(student.name).includes(normalizedSearch) || 
        normalizeText(student.guardianName || '').includes(normalizedSearch) ||
        (searchClean.length > 0 && (studentCpfClean.includes(searchClean) || guardianCpfClean.includes(searchClean)));

    const matchesStatus = statusFilter === 'Todos' || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatShiftDisplay = (shift: string | undefined) => {
    if (!shift) return '-';
    const s = shift.toLowerCase();
    if (s.includes('matutino')) return 'Manhã';
    if (s.includes('vespertino')) return 'Tarde';
    return shift;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{school.name}</h3>
            <p className="text-sm text-slate-500">{school.address} • {schoolStudents.length} alunos totais</p>
          </div>
          <div className="flex gap-2">
             {isAdmin && onEditSchool && (
                 <button 
                    onClick={onEditSchool}
                    className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                 >
                    <Edit3 className="h-4 w-4" /> Editar Dados
                 </button>
             )}
             <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
                <X className="h-5 w-5 text-slate-500" />
             </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por Nome, CPF ou Responsável..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Matriculado">Matriculados</option>
            <option value="Pendente">Pendentes</option>
            <option value="Em Análise">Em Análise</option>
          </select>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 bg-slate-50">
          {filteredStudents.length > 0 ? (
            <div className="grid gap-3">
              {filteredStudents.map(student => (
                <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800">{student.name}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                       <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">CPF: {student.cpf || '-'}</span>
                       <span>Nasc: {student.birthDate}</span>
                       <span>Turma: {student.className || 'Não definida'}</span>
                       <span>Turno: {formatShiftDisplay(student.shift)}</span>
                    </div>
                    {student.guardianName && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">
                            <User className="h-3 w-3 text-slate-400" />
                            <span className="font-medium">Resp:</span> {student.guardianName}
                        </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {student.transportRequest && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold" title="Transporte">
                            🚌
                        </span>
                    )}
                    {student.specialNeeds && (
                        <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-bold" title="AEE">
                            ♿
                        </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        student.status === 'Matriculado' ? 'bg-green-100 text-green-700' : 
                        student.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <Users className="h-10 w-10 mb-2 opacity-20" />
              <p>Nenhum aluno encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Filters Component ---
const SchoolFilters = ({ 
    searchTerm, 
    setSearchTerm, 
    selectedType, 
    setSelectedType, 
    availabilityFilter, 
    setAvailabilityFilter 
}: any) => {
    const schoolTypes = ['Todas', ...Object.values(SchoolType)];
    
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar escola por nome ou endereço..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <div className="flex gap-2">
                        {schoolTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    selectedType === type 
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="flex gap-2 shrink-0 overflow-x-auto pb-2 md:pb-0">
                    <button
                        onClick={() => setAvailabilityFilter('all')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${availabilityFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setAvailabilityFilter('available')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1 transition ${availabilityFilter === 'available' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Vagas
                    </button>
                    <button
                        onClick={() => setAvailabilityFilter('full')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1 transition ${availabilityFilter === 'full' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Lotadas
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- School Map Component ---
const SchoolMap = ({ schools, selectedSchool, onSelectSchool, onViewDetails }: any) => {
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any>(L.layerGroup());
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial Map Setup
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            zoomControl: false 
        }).setView([-12.5253, -40.2917], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        markersRef.current.addTo(map);
        mapRef.current = map;

        // Cleanup on unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update Markers (Lazy Loading Logic)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const updateMarkers = () => {
            const bounds = map.getBounds().pad(0.5); // 50% buffer
            markersRef.current.clearLayers();

            schools.forEach((school: School) => {
                if (bounds.contains([school.lat, school.lng])) {
                    const icon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: ${school.availableSlots > 20 ? '#16a34a' : '#dc2626'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    });

                    const marker = L.marker([school.lat, school.lng], { icon });
                    
                    // Create Popup Content
                    const popupDiv = document.createElement('div');
                    popupDiv.innerHTML = `
                        <div class="text-center p-2 min-w-[160px]">
                            <h3 class="font-bold text-sm text-slate-800 mb-1">${school.name}</h3>
                            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2 ${school.availableSlots > 20 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                ${school.availableSlots > 20 ? 'Vagas Disponíveis' : 'Poucas Vagas'}
                            </span>
                            <button id="btn-details-${school.id}" class="w-full bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition font-medium">
                                Ver Detalhes
                            </button>
                        </div>
                    `;

                    marker.bindPopup(popupDiv);
                    
                    marker.on('popupopen', () => {
                        const btn = document.getElementById(`btn-details-${school.id}`);
                        if (btn) {
                            btn.onclick = () => {
                                onViewDetails(school);
                            };
                        }
                    });

                    marker.on('click', () => onSelectSchool(school));
                    markersRef.current.addLayer(marker);
                }
            });
        };

        map.on('moveend', updateMarkers);
        updateMarkers(); // Initial load

        return () => {
            map.off('moveend', updateMarkers);
        };
    }, [schools, onSelectSchool, onViewDetails]);

    // Fly to selected school
    useEffect(() => {
        if (selectedSchool && mapRef.current) {
            mapRef.current.flyTo([selectedSchool.lat, selectedSchool.lng], 16, { duration: 1.5 });
        }
    }, [selectedSchool]);

    // Fix resize issues
    useEffect(() => {
        if (mapRef.current) {
            setTimeout(() => mapRef.current.invalidateSize(), 200);
        }
    }, [schools]); 

    return <div ref={containerRef} className="h-full w-full z-0" />;
};

// --- Main Component ---
export const SchoolList: React.FC = () => {
  const { schools, students, addSchool, updateSchools } = useData();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Todas');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'full'>('all');
  
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [itemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  
  // Management State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Debounce Search
  useEffect(() => {
      const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
      return () => clearTimeout(timer);
  }, [searchTerm]);

  // Check Admin Status
  useEffect(() => {
      setIsAdmin(sessionStorage.getItem('admin_auth') === 'true');
  }, []);

  // Deep Linking
  useEffect(() => {
    const schoolIdParam = searchParams.get('schoolId');
    const actionParam = searchParams.get('action');

    if (schoolIdParam && schools.length > 0) {
        const targetSchool = schools.find(s => s.id === schoolIdParam || s.inep === schoolIdParam);
        if (targetSchool) {
            setSelectedSchool(targetSchool);
            // Open details immediately
            setIsStudentListOpen(true);
        }
    }

    if (actionParam === 'new' && isAdmin) {
        handleCreateSchool();
    }
  }, [searchParams, schools, isAdmin]);

  const getAvailabilityStatus = (school: School) => {
    // Calcular vagas reais: Capacidade - Alunos Matriculados
    const enrolledCount = students.filter(s => s.school === school.name && s.status === 'Matriculado').length;
    const remainingSlots = school.availableSlots - enrolledCount;
    const occupancyRate = school.availableSlots > 0 ? (enrolledCount / school.availableSlots) : 0;

    let status: 'Disponível' | 'Poucas Vagas' | 'Lotada';
    let color: string;

    if (occupancyRate >= 1) { // 100% ou mais
        status = 'Lotada';
        color = 'bg-red-100 text-red-700 border-red-200';
    } else if (occupancyRate >= 0.9) { // 90% a 99%
        status = 'Poucas Vagas';
        color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    } else {
        status = 'Disponível';
        color = 'bg-green-100 text-green-700 border-green-200';
    }

    return { status, color, remainingSlots, enrolledCount };
  };

  const filteredSchools = useMemo(() => {
    const normalizedQuery = normalizeText(debouncedSearchTerm);
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

    return schools.filter(school => {
      // 1. Fuzzy Search
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
      
      // 2. Type Filter
      const matchesType = selectedType === 'Todas' || school.types.includes(selectedType as SchoolType);

      // 3. Availability Filter
      const { remainingSlots } = getAvailabilityStatus(school);
      let matchesAvailability = true;
      if (availabilityFilter === 'available') matchesAvailability = remainingSlots > 10;
      if (availabilityFilter === 'full') matchesAvailability = remainingSlots <= 0;

      return matchesSearch && matchesType && matchesAvailability;
    });
  }, [schools, debouncedSearchTerm, selectedType, availabilityFilter, students]);

  // Pagination
  const paginatedSchools = useMemo(() => {
      const start = (page - 1) * itemsPerPage;
      return filteredSchools.slice(start, start + itemsPerPage);
  }, [filteredSchools, page, itemsPerPage]);

  const handleEditSchool = (school: School) => {
    if (!isAdmin) return;
    setEditingSchool(school);
    setIsFormOpen(true);
  };

  const handleCreateSchool = () => {
    if (!isAdmin) return;
    setEditingSchool(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (school: School) => {
      setSelectedSchool(school);
      setIsStudentListOpen(true);
  };

  const handleScrollToCard = (school: School) => {
      setViewMode('list');
      setSelectedSchool(school);
      // Wait for view switch render
      setTimeout(() => {
          const el = document.getElementById(`school-card-${school.id}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-4', 'ring-blue-200');
              setTimeout(() => el.classList.remove('ring-4', 'ring-blue-200'), 2000);
          }
      }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* Sidebar / List View */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${viewMode === 'map' ? 'hidden md:flex md:w-1/3 lg:w-2/5' : 'w-full'}`}>
        <div className="p-4 md:p-6 bg-white border-b border-slate-200 z-10 shrink-0">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <SchoolIcon className="h-6 w-6 text-blue-600" />
                    Escolas <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredSchools.length}</span>
                </h1>
                <div className="flex gap-2">
                    {isAdmin && (
                        <button 
                            onClick={handleCreateSchool}
                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                            title="Nova Escola"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-lg md:hidden">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}><List className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('map')} className={`p-2 rounded-md ${viewMode === 'map' ? 'bg-white shadow-sm' : ''}`}><MapIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            <SchoolFilters 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                selectedType={selectedType} 
                setSelectedType={setSelectedType}
                availabilityFilter={availabilityFilter}
                setAvailabilityFilter={setAvailabilityFilter}
            />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" id="school-list-container">
            {paginatedSchools.map(school => {
                const { status, color, remainingSlots, enrolledCount } = getAvailabilityStatus(school);
                return (
                    <div 
                        key={school.id} 
                        id={`school-card-${school.id}`}
                        onClick={() => handleViewDetails(school)}
                        className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group ${selectedSchool?.id === school.id ? 'ring-2 ring-blue-500' : ''}`}
                    >
                        <div className="relative">
                            <SchoolCarousel images={school.gallery} name={school.name} />
                            <SchoolLogo name={school.name} />
                            
                            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm backdrop-blur-md bg-white/90 ${color}`}>
                                    {status}
                                </span>
                                {isAdmin && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditSchool(school); }}
                                        className="p-2 bg-white/90 backdrop-blur-md text-slate-700 hover:text-blue-600 rounded-full shadow-sm hover:bg-white transition"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-5">
                            <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{school.name}</h3>
                            <p className="text-slate-500 text-sm flex items-start gap-1 mb-4">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0" /> 
                                {school.address}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="block text-xs text-slate-400 font-bold uppercase">Capacidade</span>
                                    <span className="font-bold text-slate-700">{school.availableSlots}</span>
                                </div>
                                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                    <span className="block text-xs text-blue-400 font-bold uppercase">Matriculados</span>
                                    <span className="font-bold text-blue-700">{enrolledCount}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {school.types.map(type => (
                                    <span key={type} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium border border-slate-200">
                                        {type}
                                    </span>
                                ))}
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); handleViewDetails(school); }}
                                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold rounded-xl transition border border-slate-200 flex items-center justify-center gap-2"
                            >
                                <Users className="h-4 w-4" /> Ver Alunos
                            </button>
                        </div>
                    </div>
                );
            })}
            
            {paginatedSchools.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <SchoolIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma escola encontrada.</p>
                </div>
            )}
            
            {/* Pagination Controls */}
            {filteredSchools.length > itemsPerPage && (
                <div className="flex justify-center gap-2 pt-4 pb-8">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 border rounded-lg hover:bg-slate-100 disabled:opacity-50"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="px-4 py-2 text-sm font-medium text-slate-600">
                        Página {page} de {Math.ceil(filteredSchools.length / itemsPerPage)}
                    </span>
                    <button 
                        onClick={() => setPage(p => Math.min(Math.ceil(filteredSchools.length / itemsPerPage), p + 1))}
                        disabled={page * itemsPerPage >= filteredSchools.length}
                        className="p-2 border rounded-lg hover:bg-slate-100 disabled:opacity-50"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Map View */}
      <div className={`flex-1 bg-slate-200 relative ${viewMode === 'list' ? 'hidden md:block' : 'block h-full'}`}>
         <SchoolMap 
            schools={filteredSchools} 
            selectedSchool={selectedSchool}
            onSelectSchool={handleScrollToCard}
            onViewDetails={handleViewDetails}
         />
         
         {/* Mobile Toggle Button (Floating) */}
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:hidden z-[400] flex bg-white rounded-full shadow-lg p-1 border border-slate-200">
            <button 
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            >
                <List className="h-4 w-4" /> Lista
            </button>
            <button 
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            >
                <MapIcon className="h-4 w-4" /> Mapa
            </button>
         </div>
      </div>

      {/* Modals */}
      {isStudentListOpen && selectedSchool && (
          <StudentListModal 
            school={selectedSchool}
            students={students}
            isOpen={isStudentListOpen}
            onClose={() => setIsStudentListOpen(false)}
            onEditSchool={() => { setIsStudentListOpen(false); handleEditSchool(selectedSchool); }}
          />
      )}
    </div>
  );
};
