import React, { useState, useMemo, useEffect, useRef } from 'react';
import { INITIAL_REGISTRATION_STATE } from '../constants';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { RegistrationFormState, RegistryStudent } from '../types';
import { Check, ChevronRight, ChevronLeft, Upload, School as SchoolIcon, Bus, FileText, MapPin, Navigation, Loader2, Search, RefreshCw, Crosshair, User, Move, Trash2, Paperclip } from 'lucide-react';
import { useNavigate } from '../router';

// Declare Leaflet globally
declare const L: any;

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const formatCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .substring(0, 9);
};

export const Registration: React.FC = () => {
  const { schools, addStudent } = useData();
  const { addToast } = useToast();
  const [formState, setFormState] = useState<RegistrationFormState>(INITIAL_REGISTRATION_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (section: 'student' | 'guardian' | 'address', field: string, value: any) => {
    let finalValue = value;

    if (field === 'cpf') {
      finalValue = formatCPF(value);
      if (errors[`${section}Cpf`]) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`${section}Cpf`];
            return newErrors;
        });
      }
    }

    if (section === 'guardian' && field === 'phone') {
        finalValue = formatPhone(value);
    }

    if (field === 'zipCode') {
        finalValue = formatCEP(value);
        if (finalValue.length === 9) {
            fetchAddressByCep(finalValue);
        }
    }

    setFormState(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: finalValue
      }
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: PDF or Images only
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      addToast('Formato inválido. Apenas PDF ou Imagens (JPG/PNG) são permitidos.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validation: Max Size 5MB
    if (file.size > 5 * 1024 * 1024) {
      addToast('O arquivo deve ter no máximo 5MB.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormState(prev => ({
        ...prev,
        student: { ...prev.student, medicalReport: reader.result as string }
      }));
      setFileName(file.name);
      addToast('Documento anexado com sucesso!', 'success');
    };
    reader.onerror = () => {
       addToast('Erro ao ler o arquivo.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
      setFormState(prev => ({
        ...prev,
        student: { ...prev.student, medicalReport: undefined }
      }));
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      addToast('Anexo removido.', 'info');
  };

  const fetchAddressByCep = async (cep: string) => {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) return;

      setIsLoadingCep(true);
      try {
          const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
          const data = await response.json();
          
          if (!data.erro) {
              setFormState(prev => ({
                  ...prev,
                  address: {
                      ...prev.address,
                      street: data.logradouro,
                      neighborhood: data.bairro,
                      city: data.localidade,
                  }
              }));
              addToast('Endereço encontrado!', 'success');
              // Tenta geocodificar o endereço encontrado para mover o pino
              geocodeAddress(true);
          } else {
             addToast('CEP não encontrado.', 'warning');
          }
      } catch (error) {
          console.error("Erro ao buscar CEP:", error);
          addToast('Erro ao buscar o CEP.', 'error');
      } finally {
          setIsLoadingCep(false);
      }
  };

  const geocodeAddress = async (forceUpdateMap = true) => {
    const { street, number, city } = formState.address;
    
    if (!street || !city) {
      if (forceUpdateMap) addToast('Preencha pelo menos a Rua e a Cidade para localizar.', 'warning');
      return null;
    }

    if (forceUpdateMap) setIsGeocoding(true);
    try {
      let query = `${street} ${number}, ${city}`;
      if (!number) query = `${street}, ${city}`;

      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        if (forceUpdateMap) {
            setFormState(prev => ({ ...prev, address: { ...prev.address, lat, lng: lon } }));
            
            if (mapRef.current) {
                mapRef.current.setView([lat, lon], 16);
                if (markerRef.current) {
                    markerRef.current.setLatLng([lat, lon]);
                }
            }
            addToast(number ? 'Endereço exato localizado!' : 'Rua localizada. Arraste o pino se necessário.', 'success');
        }
        return { lat, lng: lon };

      } else {
        if (forceUpdateMap) addToast('Endereço não localizado no mapa. Tente ajustar o pino manualmente.', 'warning');
        return null;
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      if (forceUpdateMap) addToast('Erro ao conectar serviço de mapa.', 'error');
      return null;
    } finally {
      if (forceUpdateMap) setIsGeocoding(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();

      if (data && data.address) {
        const addr = data.address;
        
        // Mapeamento inteligente dos campos do OpenStreetMap para o formulário
        setFormState(prev => ({
          ...prev,
          address: {
            ...prev.address,
            street: addr.road || addr.pedestrian || addr.street || addr.hamlet || prev.address.street,
            neighborhood: addr.suburb || addr.quarter || addr.neighbourhood || addr.residential || prev.address.neighborhood,
            city: addr.city || addr.town || addr.village || addr.municipality || prev.address.city,
            zipCode: addr.postcode || prev.address.zipCode,
            number: addr.house_number || prev.address.number, 
            lat,
            lng
          }
        }));
        
        if (addr.house_number) {
            addToast('Número do endereço atualizado pelo mapa.', 'info');
        }
      } else {
         setFormState(prev => ({
            ...prev,
            address: { ...prev.address, lat, lng }
         }));
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setFormState(prev => ({
        ...prev,
        address: { ...prev.address, lat, lng }
      }));
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      addToast('Seu navegador não suporta geolocalização.', 'error');
      return;
    }

    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormState(prev => ({ ...prev, address: { ...prev.address, lat: latitude, lng: longitude } }));
        
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          }
        }
        reverseGeocode(latitude, longitude);
        addToast('Localização obtida com sucesso!', 'success');
      },
      (error) => {
        console.error("Geolocation error:", error);
        addToast('Não foi possível obter sua localização. Verifique as permissões.', 'error');
        setIsGeocoding(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Inicializa o mapa apenas na Etapa 2 (Endereço)
    if (formState.step === 2 && mapContainerRef.current && !mapRef.current) {
        const defaultLat = -12.5253;
        const defaultLng = -40.2917;
        const initialLat = formState.address.lat || defaultLat;
        const initialLng = formState.address.lng || defaultLng;

        const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapRef.current = map;

        const markerIcon = L.icon({
             iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
             shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
             iconSize: [25, 41],
             iconAnchor: [12, 41],
             popupAnchor: [1, -34],
        });

        const updatePosition = (lat: number, lng: number) => {
            reverseGeocode(lat, lng);
        };

        const markerLat = formState.address.lat || initialLat;
        const markerLng = formState.address.lng || initialLng;

        const marker = L.marker([markerLat, markerLng], { 
             draggable: true,
             icon: markerIcon 
        }).addTo(map);
        markerRef.current = marker;

        marker.on('dragstart', () => {
            setIsGeocoding(true);
        });

        marker.on('dragend', (e: any) => {
             const newPos = e.target.getLatLng();
             // Ao soltar o pino, chama a geocodificação reversa para preencher o form
             updatePosition(newPos.lat, newPos.lng);
        });

        map.on('click', (e: any) => {
            marker.setLatLng(e.latlng);
            updatePosition(e.latlng.lat, e.latlng.lng);
        });
    }

    if (formState.step === 2 && mapRef.current) {
        setTimeout(() => mapRef.current.invalidateSize(), 100);
    }
  }, [formState.step]); 

  const nextStep = async () => {
    // --- Step 1 Validation: Personal Data (Student + Guardian) ---
    if (formState.step === 1) {
         // Student Checks
         if (!formState.student.fullName.trim() || !formState.student.birthDate) {
             addToast('Preencha o nome e data de nascimento do aluno.', 'warning');
             return;
         }
         
         const birthDate = new Date(formState.student.birthDate);
         const today = new Date();
         today.setHours(0, 0, 0, 0);
         if (birthDate > today) {
            addToast('Data de nascimento inválida (futuro).', 'warning');
            return;
         }
         if (birthDate < new Date('1900-01-01')) {
            addToast('Data de nascimento inválida.', 'warning');
            return;
         }
         if (formState.student.needsSpecialEducation && !formState.student.specialEducationDetails) {
            addToast('Descreva a necessidade especial.', 'warning');
            return;
         }

         // Guardian Checks
         if (!formState.guardian.fullName.trim()) {
            addToast('O nome do responsável é obrigatório.', 'warning');
            return;
        }
        if (!formState.guardian.cpf.trim() || formState.guardian.cpf.length < 14) {
             addToast('CPF do responsável inválido.', 'warning');
             return;
        }
        if (!formState.guardian.phone.trim() || formState.guardian.phone.length < 14) {
             addToast('Telefone do responsável inválido.', 'warning');
             return;
        }
    }

    // --- Step 2 Validation: Address & Geo ---
    if (formState.step === 2) {
      if (!formState.address.lat || !formState.address.lng || formState.address.lat === 0) {
          addToast('Por favor, confirme a localização no mapa.', 'error');
          return;
      }
      if(!formState.address.street || !formState.address.city) {
          addToast('Preencha Rua e Cidade.', 'warning');
          return;
      }
    }
    
    setFormState(prev => ({ ...prev, step: prev.step + 1 }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setFormState(prev => ({ ...prev, step: prev.step - 1 }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    const selectedSchool = schools.find(s => s.id === formState.selectedSchoolId);
    
    const newStudent: RegistryStudent = {
        id: Date.now().toString(),
        name: formState.student.fullName.toUpperCase(),
        birthDate: formState.student.birthDate.split('-').reverse().join('/'), 
        cpf: formState.student.cpf || '',
        status: 'Em Análise',
        school: selectedSchool ? selectedSchool.name : 'Não alocada',
        grade: 'Definição Pendente',
        shift: 'Definição Pendente',
        transportRequest: formState.student.needsTransport,
        transportType: formState.student.needsTransport ? 'Solicitado na Matrícula' : undefined,
        specialNeeds: formState.student.needsSpecialEducation,
        medicalReport: formState.student.medicalReport,
        enrollmentId: `PROT-${Math.floor(Math.random() * 100000)}`,
        lat: formState.address.lat, 
        lng: formState.address.lng,
        guardianName: formState.guardian.fullName,
        guardianContact: formState.guardian.phone,
        guardianCpf: formState.guardian.cpf
    };

    try {
        await addStudent(newStudent);
        addToast('Solicitação de matrícula enviada com sucesso!', 'success');
        navigate('/status?success=true');
    } catch (error) {
        addToast('Erro ao salvar matrícula. Tente novamente.', 'error');
        setIsSubmitting(false);
    }
  };

  const sortedSchools = useMemo(() => {
    if (formState.step !== 3 || !formState.address.lat || !formState.address.lng) return schools;

    const schoolsWithDistance = schools.map(school => {
        // Haversine Simples
        const R = 6371; 
        const dLat = (school.lat - formState.address.lat!) * (Math.PI / 180);
        const dLon = (school.lng - formState.address.lng!) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(formState.address.lat! * (Math.PI / 180)) * Math.cos(school.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
        const distance = R * c;
        
        return { ...school, distance };
    });

    return schoolsWithDistance.sort((a, b) => a.distance - b.distance);
  }, [formState.step, formState.address.lat, formState.address.lng, schools]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Ficha de Matrícula</h2>
          
          {/* Progress Bar - 3 Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
              {[1, 2, 3].map((s) => (
                <div 
                  key={s}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    formState.step >= s 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {formState.step > s ? <Check className="h-5 w-5" /> : s}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-slate-500 px-1">
              <span>Dados Pessoais</span>
              <span className="text-center">Localização</span>
              <span className="text-right">Escola</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Data (Merged Student + Guardian) */}
             {formState.step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* --- Student Section --- */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><FileText className="h-5 w-5" /></div>
                        <h3 className="text-lg font-bold text-slate-800">Dados do Aluno</h3>
                    </div>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                            <input type="text" required value={formState.student.fullName} onChange={(e) => handleInputChange('student', 'fullName', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nome igual à certidão" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                                <input type="date" required max={new Date().toISOString().split("T")[0]} value={formState.student.birthDate} onChange={(e) => handleInputChange('student', 'birthDate', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">CPF (Opcional)</label>
                                <input type="text" placeholder="000.000.000-00" value={formState.student.cpf} onChange={(e) => handleInputChange('student', 'cpf', e.target.value)} maxLength={14} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        {/* Special Needs */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="specialNeeds" checked={formState.student.needsSpecialEducation} onChange={(e) => handleInputChange('student', 'needsSpecialEducation', e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                <label htmlFor="specialNeeds" className="text-sm font-medium text-slate-700">Aluno com Deficiência / Necessidades Especiais</label>
                            </div>
                            {formState.student.needsSpecialEducation && (
                                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 border-t border-slate-200 pt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Descreva a necessidade</label>
                                        <input type="text" value={formState.student.specialEducationDetails || ''} onChange={(e) => handleInputChange('student', 'specialEducationDetails', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Autismo, Cadeirante..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Anexar Laudo (PDF/Imagem)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="file" id="medicalReport" ref={fileInputRef} accept="application/pdf,image/*" onChange={handleFileUpload} className="hidden" />
                                            <label htmlFor="medicalReport" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition text-sm text-slate-600 shadow-sm">
                                                <Upload className="h-4 w-4" /> {fileName ? 'Alterar' : 'Selecionar'}
                                            </label>
                                            {fileName && (
                                                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm border border-green-100 flex-1 min-w-0">
                                                    <Paperclip className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{fileName}</span>
                                                    <button type="button" onClick={removeFile} className="ml-auto p-1 hover:bg-green-100 rounded-full transition"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Guardian Section --- */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600"><User className="h-5 w-5" /></div>
                        <h3 className="text-lg font-bold text-slate-800">Dados do Responsável</h3>
                    </div>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                            <input type="text" required value={formState.guardian.fullName} onChange={(e) => handleInputChange('guardian', 'fullName', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                                <input type="text" required placeholder="000.000.000-00" value={formState.guardian.cpf} onChange={(e) => handleInputChange('guardian', 'cpf', e.target.value)} maxLength={14} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco</label>
                                <select value={formState.guardian.relationship} onChange={(e) => handleInputChange('guardian', 'relationship', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option>Mãe</option>
                                    <option>Pai</option>
                                    <option>Avô/Avó</option>
                                    <option>Outro</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                                <input type="tel" required placeholder="(00) 00000-0000" value={formState.guardian.phone} onChange={(e) => handleInputChange('guardian', 'phone', e.target.value)} maxLength={15} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Opcional)</label>
                                <input type="email" value={formState.guardian.email} onChange={(e) => handleInputChange('guardian', 'email', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

              </div>
            )}

            {/* Step 2: Address (Enhanced with Map) */}
            {formState.step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 border-b pb-2">
                    <div className="bg-green-100 p-1.5 rounded-lg text-green-600"><MapPin className="h-5 w-5" /></div>
                    <h3 className="text-lg font-bold text-slate-800">Endereço Residencial</h3>
                </div>
                
                <div className="grid gap-6">
                  {/* Map Picker */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm relative">
                      <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              Localização Exata
                          </span>
                          <span className="text-xs text-blue-600 hidden sm:inline flex items-center gap-1 font-medium bg-blue-50 px-2 py-1 rounded">
                              <Move className="h-3 w-3" /> Arraste o pino
                          </span>
                      </div>
                      <div ref={mapContainerRef} className="w-full h-[300px] bg-slate-200 relative">
                           {!mapRef.current && (
                               <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                   <Loader2 className="h-8 w-8 animate-spin" />
                               </div>
                           )}
                           {/* Visual Feedback Overlay */}
                           {isGeocoding && (
                             <div className="absolute inset-0 z-[400] bg-white/50 backdrop-blur-[1px] flex flex-col items-center justify-center">
                               <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold text-blue-600 animate-in zoom-in-95">
                                 <RefreshCw className="h-4 w-4 animate-spin" />
                                 Atualizando...
                               </div>
                             </div>
                           )}
                           
                           <button
                             type="button"
                             onClick={handleUseCurrentLocation}
                             className="absolute bottom-4 right-4 z-[400] bg-white p-2 rounded-full shadow-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition"
                             title="Minha localização"
                           >
                             <Crosshair className="h-5 w-5" />
                           </button>
                      </div>
                  </div>

                  {/* Campos de Endereço */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rua / Logradouro</label>
                    <input type="text" required value={formState.address.street} onChange={(e) => handleInputChange('address', 'street', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-500" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                      <input type="text" required value={formState.address.number} onChange={(e) => handleInputChange('address', 'number', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-500" />
                    </div>
                    <div className="md:col-span-1">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                      <input type="text" required value={formState.address.neighborhood} onChange={(e) => handleInputChange('address', 'neighborhood', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-500" />
                    </div>
                     <div className="md:col-span-1">
                        <button
                          type="button"
                          onClick={() => geocodeAddress(true)}
                          disabled={isGeocoding || !formState.address.street}
                          className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                           <Search className="h-4 w-4" /> Buscar no Mapa
                        </button>
                    </div>
                  </div>
                  
                  {/* Transport Request */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="transport" checked={formState.student.needsTransport} onChange={(e) => handleInputChange('student', 'needsTransport', e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4 text-blue-700" />
                         <label htmlFor="transport" className="text-sm font-medium text-slate-700">Solicitar Transporte Escolar (Zona Rural)</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: School Selection */}
            {formState.step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 border-b pb-2">
                    <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600"><SchoolIcon className="h-5 w-5" /></div>
                    <h3 className="text-lg font-bold text-slate-800">Seleção de Preferência</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Com base na sua geolocalização, ordenamos as escolas mais próximas.
                </p>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {sortedSchools.map((school, index) => {
                      const isNearest = index < 3 && school.distance !== undefined;
                      return (
                        <div 
                          key={school.id}
                          onClick={() => setFormState(prev => ({ ...prev, selectedSchoolId: school.id }))}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition relative ${
                            formState.selectedSchoolId === school.id 
                              ? 'border-blue-600 bg-blue-50' 
                              : isNearest 
                                ? 'border-green-200 bg-green-50/30 hover:border-green-300 hover:bg-green-50'
                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                          }`}
                        >
                          {isNearest && (
                            <div className="absolute -top-2.5 right-4 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                               <Navigation className="h-3 w-3" /> Recomendada
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg border ${isNearest ? 'bg-white border-green-100' : 'bg-white border-slate-100'}`}>
                                <SchoolIcon className={`h-6 w-6 ${isNearest ? 'text-green-600' : 'text-blue-600'}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900">{school.name}</h4>
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                  {school.distance !== undefined && (
                                    <span className="font-medium text-slate-700 bg-slate-100 px-1.5 rounded flex items-center gap-0.5">
                                      <MapPin className="h-3 w-3" />
                                      {school.distance.toFixed(2)} km
                                    </span>
                                  )}
                                  <span className="truncate max-w-[180px]">{school.address}</span>
                                </p>
                              </div>
                            </div>
                            {formState.selectedSchoolId === school.id && <Check className="h-6 w-6 text-blue-600" />}
                          </div>
                        </div>
                      );
                  })}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={formState.step === 1 || isSubmitting}
                className={`flex items-center px-6 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition ${formState.step === 1 ? 'opacity-0 cursor-default' : ''}`}
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Voltar
              </button>
              
              {formState.step < 3 ? (
                 <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-md shadow-blue-200 transition"
                >
                  Próximo
                  <ChevronRight className="h-5 w-5 ml-1" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!formState.selectedSchoolId || isSubmitting}
                  className="flex items-center px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-md shadow-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : 'Confirmar Matrícula'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};