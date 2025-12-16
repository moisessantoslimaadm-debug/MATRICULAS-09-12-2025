import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { MapPin, Users, School as SchoolIcon, Search, X, Star, Navigation, Phone, Mail } from 'lucide-react';
import { School } from '../types';

export const SchoolList: React.FC = () => {
  const { schools, students } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const filteredSchools = useMemo(() => {
    return schools.filter(school => 
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [schools, searchTerm]);

  const getEnrolledCount = (schoolName: string) => {
    return students.filter(s => s.school === schoolName && s.status === 'Matriculado').length;
  };

  const getSchoolStudents = (schoolName: string) => {
      return students.filter(s => s.school === schoolName);
  };

  const handleViewDetails = (school: School) => {
    setSelectedSchool(school);
  };

  const closeDetails = () => {
    setSelectedSchool(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Escolas Municipais</h1>
          <p className="text-slate-600 mt-2">Conheça nossa rede de ensino e encontre a unidade mais próxima.</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 sticky top-20 z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome da escola ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => {
            const enrolledCount = getEnrolledCount(school.name);
            const occupancy = school.availableSlots > 0 ? (enrolledCount / school.availableSlots) * 100 : 0;
            
            return (
              <div key={school.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="h-48 bg-slate-200 relative overflow-hidden">
                    {school.image ? (
                        <img src={school.image} alt={school.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50">
                            <SchoolIcon className="h-16 w-16 text-blue-200" />
                        </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {school.rating.toFixed(1)}
                    </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 min-h-[3.5rem]">{school.name}</h3>
                    
                    <div className="flex items-start gap-2 text-slate-500 text-sm mb-4 min-h-[2.5rem]">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{school.address}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {school.types.map(type => (
                            <span key={type} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium border border-slate-200">
                                {type}
                            </span>
                        ))}
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Ocupação</span>
                            <span className={`font-bold ${occupancy >= 100 ? 'text-red-600' : occupancy >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {enrolledCount} / {school.availableSlots} vagas
                            </span>
                        </div>
                        
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                             <div 
                                className={`h-full rounded-full ${occupancy >= 100 ? 'bg-red-500' : occupancy >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                                style={{ width: `${Math.min(occupancy, 100)}%` }}
                             ></div>
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); handleViewDetails(school); }}
                            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold rounded-xl transition border border-slate-200 flex items-center justify-center gap-2"
                        >
                            <Users className="h-4 w-4" /> Ver Detalhes
                        </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredSchools.length === 0 && (
            <div className="text-center py-20">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Nenhuma escola encontrada</h3>
                <p className="text-slate-500">Tente buscar por outro termo.</p>
            </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeDetails}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
             
             {/* Modal Header */}
             <div className="relative h-48 sm:h-64 bg-slate-200 shrink-0">
                {selectedSchool.image ? (
                     <img src={selectedSchool.image} alt={selectedSchool.name} className="w-full h-full object-cover" />
                ) : (
                     <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <SchoolIcon className="h-20 w-20 text-blue-200" />
                     </div>
                )}
                <button 
                    onClick={closeDetails}
                    className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition"
                >
                    <X className="h-6 w-6" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                    <h2 className="text-2xl font-bold">{selectedSchool.name}</h2>
                    <p className="opacity-90 flex items-center gap-2 text-sm mt-1">
                        <MapPin className="h-4 w-4" /> {selectedSchool.address}
                    </p>
                </div>
             </div>

             {/* Modal Content */}
             <div className="flex-1 overflow-y-auto p-6 md:p-8">
                 <div className="grid md:grid-cols-3 gap-8">
                     
                     {/* Info Column */}
                     <div className="md:col-span-1 space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2">Modalidades de Ensino</h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedSchool.types.map(t => (
                                    <span key={t} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">{t}</span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 mb-2">Informações</h3>
                            <div className="space-y-3 text-sm text-slate-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg"><Navigation className="h-4 w-4" /></div>
                                    <span>INEP: {selectedSchool.inep || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg"><Users className="h-4 w-4" /></div>
                                    <span>{getEnrolledCount(selectedSchool.name)} Alunos Matriculados</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg"><SchoolIcon className="h-4 w-4" /></div>
                                    <span>{selectedSchool.availableSlots} Vagas Totais</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Fake Contacts for Demo */}
                        <div>
                             <h3 className="font-bold text-slate-900 mb-2">Contato</h3>
                             <div className="space-y-3 text-sm text-slate-600">
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <span>(75) 3251-0000</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span>{selectedSchool.name.toLowerCase().replace(/\s+/g, '.')}@itaberaba.ba.gov.br</span>
                                </div>
                             </div>
                        </div>
                     </div>

                     {/* Gallery & Students (Simplified) */}
                     <div className="md:col-span-2 space-y-8">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-4 border-b pb-2">Galeria de Fotos</h3>
                            {selectedSchool.gallery && selectedSchool.gallery.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedSchool.gallery.slice(0, 4).map((img, i) => (
                                        <img key={i} src={img} alt="" className="rounded-lg h-32 w-full object-cover hover:opacity-90 transition cursor-pointer" />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm italic">Nenhuma foto disponível na galeria.</p>
                            )}
                        </div>

                         {/* Simple Student Stats instead of full list (privacy) */}
                         <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                             <h3 className="font-bold text-slate-800 mb-2">Sobre a Matrícula</h3>
                             <p className="text-sm text-slate-600 mb-4">
                                Esta escola atende alunos da região de {selectedSchool.address.split('-')[0]}. 
                                A alocação é feita via sistema de geolocalização.
                             </p>
                             <div className="flex gap-4">
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-blue-600">{getSchoolStudents(selectedSchool.name).filter(s => s.status === 'Pendente').length}</span>
                                    <span className="text-xs text-slate-500 uppercase font-bold">Fila de Espera</span>
                                </div>
                                <div className="w-px bg-slate-300"></div>
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-green-600">{getSchoolStudents(selectedSchool.name).filter(s => s.status === 'Matriculado').length}</span>
                                    <span className="text-xs text-slate-500 uppercase font-bold">Vagas Preenchidas</span>
                                </div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};