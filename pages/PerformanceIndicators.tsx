import React, { useState, useEffect, useMemo } from 'react';
import { Printer, ArrowLeft, TrendingUp, Save, Eraser, Calculator, UserCheck, Plus, Trash2, Loader2 } from 'lucide-react';
import { useSearchParams, useNavigate } from '../router';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { PerformanceRow, MovementRow, RegistryStudent, PerformanceHeader } from '../types';

// --- Constants ---

const INITIAL_PERFORMANCE: PerformanceRow[] = [
  { subject: 'LÍNGUA PORTUGUESA', g1: ['','','','',''], g2: ['','','','',''], g3: ['','',''], g4: ['','',''], g5: ['','',''] },
  { subject: 'MATEMÁTICA', g1: ['','','','',''], g2: ['','','','',''], g3: ['','',''], g4: ['','',''], g5: ['','',''] },
  { subject: 'HISTÓRIA', g1: ['','','','',''], g2: ['','','','',''], g3: ['','',''], g4: ['','',''], g5: ['','',''] },
  { subject: 'GEOGRAFIA', g1: ['','','','',''], g2: ['','','','',''], g3: ['','',''], g4: ['','',''], g5: ['','',''] },
  { subject: 'CIÊNCIAS', g1: ['','','','',''], g2: ['','','','',''], g3: ['','',''], g4: ['','',''], g5: ['','',''] },
  { subject: 'EDUCAÇÃO FÍSICA', g1: ['','','','',''], g2: ['','','','',''], g3: ['','',''], g4: ['','',''], g5: ['','',''] },
  { subject: 'ARTE', g1: ['','','','',''], g2: ['','','','',''], g3: ['','',''], g4: ['','',''], g5: ['','',''] },
];

const INITIAL_MOVEMENT: MovementRow[] = [
  { grade: '1º ANO', initial: 0, abandon: '-', transfer: 0, admitted: 0, current: 0 },
  { grade: '2º ANO', initial: 0, abandon: '-', transfer: 0, admitted: 0, current: 0 },
  { grade: '3º ANO', initial: 0, abandon: '-', transfer: 0, admitted: 0, current: 0 },
  { grade: '4º ANO', initial: 0, abandon: '-', transfer: 0, admitted: 0, current: 0 },
  { grade: '5º ANO', initial: 0, abandon: '-', transfer: 0, admitted: 0, current: 0 },
];

const INITIAL_HEADER: PerformanceHeader = {
    unit: 'II TRIMESTRE',
    year: new Date().getFullYear() + 1,
    shift: '',
    director: '', // Nome vazio por padrão conforme solicitado
    coordinator: 'DABRINA SENA GOMES MOURA FIGUEREDO',
    dateDay: new Date().getDate().toString().padStart(2, '0'),
    dateMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    dateYear: (new Date().getFullYear() + 1).toString()
};

// --- Helper Components ---

// InputCell defined OUTSIDE to prevent focus loss re-rendering issues
const InputCell = React.memo(({ 
    value, 
    onChange, 
    className = "text-center", 
    width = "w-full", 
    placeholder = "",
    type = "text"
}: { 
    value: string | number | undefined, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    className?: string, 
    width?: string, 
    placeholder?: string,
    type?: "text" | "number"
}) => (
    <input 
      autoComplete="off"
      type={type}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      className={`bg-transparent outline-none border border-transparent hover:border-blue-200 focus:border-blue-500 focus:bg-blue-50 transition-colors p-0.5 text-inherit font-inherit ${width} ${className} print:border-none print:p-0 print:focus:bg-transparent placeholder:text-slate-300 print:placeholder:text-transparent appearance-none m-0 rounded-sm`}
    />
));

// --- Main Component ---

export const PerformanceIndicators: React.FC = () => {
  const { schools, students, updateStudents } = useData();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const studentId = params.get('studentId');
  
  const [currentStudent, setCurrentStudent] = useState<RegistryStudent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Local State
  const [headerInfo, setHeaderInfo] = useState<PerformanceHeader>(INITIAL_HEADER);
  const [performanceData, setPerformanceData] = useState<PerformanceRow[]>(INITIAL_PERFORMANCE);
  const [movementData, setMovementData] = useState<MovementRow[]>(INITIAL_MOVEMENT);
  const [tempSchoolName, setTempSchoolName] = useState('');
  const [tempStudentName, setTempStudentName] = useState('');

  // Load Student Data
  useEffect(() => {
      if (studentId) {
          const student = students.find(s => s.id === studentId);
          if (student) {
              setCurrentStudent(student);
              setTempStudentName(student.name);
              setTempSchoolName(student.school || '');
              
              // Load saved history if exists
              if (student.performanceHistory?.length) {
                  setPerformanceData(student.performanceHistory);
              }
              if (student.movementHistory?.length) {
                  setMovementData(student.movementHistory);
              }
              
              // Load Saved Header Info or Merge with Defaults
              if (student.performanceHeader) {
                  setHeaderInfo(prev => ({
                      ...prev,
                      ...student.performanceHeader
                  }));
              } else {
                  // If no saved header, try to populate from student basic data
                  setHeaderInfo(prev => ({
                      ...prev,
                      shift: student.shift || prev.shift
                  }));
              }
          } else {
              addToast("Aluno não encontrado.", 'error');
          }
      }
  }, [studentId, students]);

  const handlePrint = () => {
    // Muda o título temporariamente para que o arquivo PDF salvo tenha um nome útil
    const originalTitle = document.title;
    if (currentStudent) {
        document.title = `Boletim_${currentStudent.name.replace(/\s+/g, '_')}_${headerInfo.year}`;
    }
    window.print();
    document.title = originalTitle;
  };

  const handleClear = () => {
      if(confirm('Limpar todos os dados da tabela (notas e movimento)?')) {
          const clearedPerf = performanceData.map(row => ({
              ...row,
              g1: row.g1.map(() => ''), g2: row.g2.map(() => ''), g3: row.g3.map(() => ''), g4: row.g4.map(() => ''), g5: row.g5.map(() => '')
          }));
          const clearedMov = movementData.map(row => ({ ...row, initial: 0, abandon: '-', transfer: 0, admitted: 0, current: 0 }));
          
          setPerformanceData(clearedPerf);
          setMovementData(clearedMov);
          addToast('Dados das tabelas limpos.', 'info');
      }
  };

  const handleSaveToStudent = async () => {
      if (!currentStudent) {
          addToast("Nenhum aluno vinculado.", 'error');
          return;
      }

      setIsSaving(true);
      const updatedStudent: RegistryStudent = {
          ...currentStudent,
          performanceHistory: performanceData,
          movementHistory: movementData,
          performanceHeader: headerInfo, // Save the header fields too
          shift: headerInfo.shift // Update main shift as well
      };

      try {
          await updateStudents([updatedStudent]);
          // Short delay to show the spinner/feedback
          setTimeout(() => {
             setIsSaving(false);
             addToast("Boletim salvo com sucesso!", 'success');
          }, 500);
      } catch (error) {
          setIsSaving(false);
          addToast("Erro ao salvar dados.", 'error');
          console.error(error);
      }
  };

  const handleRecalculateMovement = () => {
      const newMov = movementData.map(row => {
          const abVal = String(row.abandon);
          const ab = row.abandon === '-' ? 0 : Number(abVal) || 0;
          const current = row.initial - ab - row.transfer + row.admitted;
          return { ...row, current };
      });
      setMovementData(newMov);
      addToast('Totais recalculados.', 'success');
  };

  // --- Dynamic Rows Handlers ---

  const handleAddSubject = () => {
      setPerformanceData(prev => [
          ...prev,
          { subject: '', g1: ['','','','',''], g2: ['','','','',''], g3: ['','',''], g4: ['','',''], g5: ['','',''] }
      ]);
  };

  const handleRemoveSubject = (index: number) => {
      if(confirm('Remover esta disciplina?')) {
          setPerformanceData(prev => prev.filter((_, i) => i !== index));
      }
  };

  const handleAddMovementRow = () => {
      setMovementData(prev => [
          ...prev,
          { grade: '', initial: 0, abandon: '-', transfer: 0, admitted: 0, current: 0 }
      ]);
  };

  const handleRemoveMovementRow = (index: number) => {
      if(confirm('Remover esta linha de turma?')) {
          setMovementData(prev => prev.filter((_, i) => i !== index));
      }
  };

  // Totals Calculation
  const movementTotal = useMemo(() => {
      return movementData.reduce((acc, row) => {
          const abVal = String(row.abandon);
          const ab = row.abandon === '-' ? 0 : Number(abVal) || 0;
          return {
              initial: acc.initial + row.initial,
              abandon: acc.abandon + ab,
              transfer: acc.transfer + row.transfer,
              admitted: acc.admitted + row.admitted,
              current: acc.current + row.current
          };
      }, { initial: 0, abandon: 0, transfer: 0, admitted: 0, current: 0 });
  }, [movementData]);

  const handleSchoolSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const schoolId = e.target.value;
      const school = schools.find(s => s.id === schoolId);
      if (school) {
          setTempSchoolName(school.name.toUpperCase());
      }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 print:px-0">
        
        {/* Navigation & Toolbar (Hidden on Print) */}
        <div className="flex flex-col gap-4 mb-6 print:hidden">
            <div className="flex justify-between items-center">
                <div>
                    <button onClick={() => navigate(-1)} className="inline-flex items-center text-slate-500 hover:text-blue-600 mb-1 transition text-sm">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                        {currentStudent ? `Histórico de ${currentStudent.name.split(' ')[0]}` : 'Gerador de Indicadores'}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleClear} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
                        <Eraser className="h-4 w-4" /> Limpar Tabelas
                    </button>
                    <button onClick={handleRecalculateMovement} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium">
                        <Calculator className="h-4 w-4" /> Calcular
                    </button>
                    {currentStudent && (
                        <button 
                            onClick={handleSaveToStudent} 
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-sm disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    )}
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm">
                        <Printer className="h-4 w-4" /> Imprimir
                    </button>
                </div>
            </div>

            {/* Context Selectors */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
                {!currentStudent && (
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Carregar Dados da Escola</label>
                        <select onChange={handleSchoolSelect} className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                            <option value="">-- Selecione uma Escola para Preencher o Cabeçalho --</option>
                            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}
                {currentStudent && (
                    <div className="flex-1 flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="bg-white p-2 rounded-full text-blue-600">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-500 uppercase">Editando Aluno</p>
                            <p className="font-bold text-slate-800">{currentStudent.name}</p>
                        </div>
                    </div>
                )}
                <div className="flex gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ano Letivo</label>
                        <input type="number" value={headerInfo.year} onChange={e => setHeaderInfo({...headerInfo, year: Number(e.target.value)})} className="w-24 p-2 border border-slate-300 rounded-lg text-sm" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Unidade Letiva</label>
                        <select value={headerInfo.unit} onChange={e => setHeaderInfo({...headerInfo, unit: e.target.value})} className="w-32 p-2 border border-slate-300 rounded-lg text-sm">
                            <option>I TRIMESTRE</option>
                            <option>II TRIMESTRE</option>
                            <option>III TRIMESTRE</option>
                        </select>
                     </div>
                </div>
            </div>
        </div>

        {/* Report Paper - A4 Simulation */}
        <div className="bg-white p-8 shadow-2xl mx-auto print:shadow-none print:p-0 print:m-0 print:w-full max-w-[297mm] min-h-[210mm] print:landscape origin-top transform scale-100 sm:scale-[0.85] md:scale-100 transition-transform">
            
            {/* Report Header */}
            <div className="border border-black mb-1">
                <div className="flex items-center gap-4 p-2 border-b border-black">
                    <img 
                        src="https://cdn-icons-png.flaticon.com/512/3304/3304567.png" 
                        alt="Brasão" 
                        className="h-16 w-16 object-contain grayscale opacity-80"
                    />
                    <div className="text-center flex-1">
                        <h2 className="font-bold text-lg uppercase leading-tight">Secretaria Municipal de Educação</h2>
                        <h3 className="font-bold text-sm uppercase leading-tight">Coordenação de Gestão do Ensino</h3>
                        <h3 className="font-bold text-sm uppercase mt-1">Indicadores de Desempenho Escolar – Ensino Fundamental / Anos Iniciais – {headerInfo.year}</h3>
                    </div>
                </div>
                
                <div className="grid grid-cols-12 text-xs divide-x divide-black border-b border-black">
                     <div className="col-span-12 p-1 pl-2 flex gap-1 border-b border-black">
                        <span className="font-bold whitespace-nowrap">ALUNO(A):</span>
                        <InputCell value={tempStudentName} onChange={(e) => setTempStudentName(e.target.value.toUpperCase())} className="font-bold text-left" />
                     </div>
                     <div className="col-span-6 p-1 pl-2 flex gap-1">
                        <span className="font-bold whitespace-nowrap">UNIDADE ESCOLAR:</span> 
                        <InputCell value={tempSchoolName} onChange={(e) => setTempSchoolName(e.target.value.toUpperCase())} className="font-bold text-left" />
                     </div>
                     <div className="col-span-3 p-1 pl-2 flex gap-1">
                        <span className="font-bold whitespace-nowrap">UNIDADE LETIVA:</span>
                        <InputCell value={headerInfo.unit} onChange={(e) => setHeaderInfo({...headerInfo, unit: e.target.value.toUpperCase()})} />
                     </div>
                     <div className="col-span-1 p-1 pl-2 text-center flex gap-1 justify-center">
                        <span className="font-bold">ANO:</span> {headerInfo.year}
                     </div>
                     <div className="col-span-2 p-1 pl-2 text-center flex gap-1 justify-center">
                        <span className="font-bold">TURNO:</span>
                        <InputCell value={headerInfo.shift} onChange={(e) => setHeaderInfo({...headerInfo, shift: e.target.value.toUpperCase()})} />
                     </div>
                </div>

                <div className="grid grid-cols-2 text-xs divide-x divide-black">
                     <div className="p-1 pl-2 flex gap-1">
                        <span className="font-bold whitespace-nowrap">GESTOR(A) ESCOLAR:</span>
                        <InputCell value={headerInfo.director} onChange={(e) => setHeaderInfo({...headerInfo, director: e.target.value.toUpperCase()})} placeholder="Nome do(a) Diretor(a)" className="text-left" />
                     </div>
                     <div className="p-1 pl-2 flex gap-1">
                        <span className="font-bold whitespace-nowrap">COORDENADOR(A) PEDAGÓGICO(A):</span>
                        <InputCell value={headerInfo.coordinator} onChange={(e) => setHeaderInfo({...headerInfo, coordinator: e.target.value.toUpperCase()})} />
                     </div>
                </div>
            </div>

            {/* Performance Table */}
            <div className="border border-black mb-1">
                <div className="bg-gray-100 border-b border-black text-center font-bold text-sm p-1 uppercase print:bg-gray-200">
                    Desempenho
                </div>
                <table className="w-full text-[10px] text-center border-collapse table-fixed">
                    <thead>
                        <tr className="bg-gray-50 border-b border-black print:bg-gray-100">
                            <th className="border-r border-black p-1 w-32 uppercase" rowSpan={2}>Componentes<br/>Curriculares</th>
                            <th className="border-r border-black p-1" colSpan={5}>1º ANO</th>
                            <th className="border-r border-black p-1" colSpan={5}>2º ANO</th>
                            <th className="border-r border-black p-1" colSpan={3}>3º ANO</th>
                            <th className="border-r border-black p-1" colSpan={3}>4º ANO</th>
                            <th className="p-1" colSpan={3}>5º ANO</th>
                        </tr>
                        <tr className="bg-gray-50 border-b border-black print:bg-gray-100">
                            {/* 1º ANO */}
                            <th className="border-r border-black w-8">DI</th>
                            <th className="border-r border-black w-8">EP</th>
                            <th className="border-r border-black w-8">DB</th>
                            <th className="border-r border-black w-8">DE</th>
                            <th className="border-r border-black w-8">NA</th>
                            {/* 2º ANO */}
                            <th className="border-r border-black w-8">DI</th>
                            <th className="border-r border-black w-8">EP</th>
                            <th className="border-r border-black w-8">DB</th>
                            <th className="border-r border-black w-8">DE</th>
                            <th className="border-r border-black w-8">NA</th>
                            {/* 3º ANO */}
                            <th className="border-r border-black">APROV</th>
                            <th className="border-r border-black">REPROV</th>
                            <th className="border-r border-black w-8">NA</th>
                            {/* 4º ANO */}
                            <th className="border-r border-black">APROV</th>
                            <th className="border-r border-black">REPROV</th>
                            <th className="border-r border-black w-8">NA</th>
                            {/* 5º ANO */}
                            <th className="border-r border-black">APROV</th>
                            <th className="border-r border-black">REPROV</th>
                            <th className="w-8">NA</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {performanceData.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-blue-50/30 print:hover:bg-transparent group">
                                <td className="border-r border-black p-0 bg-gray-50 print:bg-gray-100 relative">
                                    <InputCell 
                                        value={row.subject} 
                                        onChange={(e) => {
                                            const newData = [...performanceData];
                                            newData[rIdx].subject = e.target.value.toUpperCase();
                                            setPerformanceData(newData);
                                        }}
                                        placeholder="DISCIPLINA"
                                        className="font-bold text-left pl-1 w-full h-full"
                                    />
                                    {/* Delete Button (Hidden on Print) */}
                                    <button 
                                        onClick={() => handleRemoveSubject(rIdx)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 print:hidden p-1 bg-white/50 rounded"
                                        title="Remover disciplina"
                                        tabIndex={-1}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </td>
                                
                                {/* 1º ANO */}
                                {row.g1.map((val, cIdx) => (
                                    <td key={`g1-${cIdx}`} className="border-r border-black p-0">
                                        <InputCell value={val} onChange={(e) => {
                                            const newData = [...performanceData];
                                            newData[rIdx].g1[cIdx] = e.target.value;
                                            setPerformanceData(newData);
                                        }} />
                                    </td>
                                ))}

                                {/* 2º ANO */}
                                {row.g2.map((val, cIdx) => (
                                    <td key={`g2-${cIdx}`} className="border-r border-black p-0">
                                        <InputCell value={val} onChange={(e) => {
                                            const newData = [...performanceData];
                                            newData[rIdx].g2[cIdx] = e.target.value;
                                            setPerformanceData(newData);
                                        }} />
                                    </td>
                                ))}

                                {/* 3º ANO */}
                                {row.g3.map((val, cIdx) => (
                                    <td key={`g3-${cIdx}`} className="border-r border-black p-0">
                                        <InputCell value={val} onChange={(e) => {
                                            const newData = [...performanceData];
                                            newData[rIdx].g3[cIdx] = e.target.value;
                                            setPerformanceData(newData);
                                        }} />
                                    </td>
                                ))}

                                {/* 4º ANO */}
                                {row.g4.map((val, cIdx) => (
                                    <td key={`g4-${cIdx}`} className="border-r border-black p-0">
                                        <InputCell value={val} onChange={(e) => {
                                            const newData = [...performanceData];
                                            newData[rIdx].g4[cIdx] = e.target.value;
                                            setPerformanceData(newData);
                                        }} />
                                    </td>
                                ))}

                                {/* 5º ANO */}
                                {row.g5.map((val, cIdx) => (
                                    <td key={`g5-${cIdx}`} className={`p-0 ${cIdx < 2 ? 'border-r border-black' : ''}`}>
                                        <InputCell value={val} onChange={(e) => {
                                            const newData = [...performanceData];
                                            newData[rIdx].g5[cIdx] = e.target.value;
                                            setPerformanceData(newData);
                                        }} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="print:hidden bg-slate-50 border-t border-black p-1 text-center">
                    <button onClick={handleAddSubject} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 w-full">
                        <Plus className="h-3 w-3" /> Adicionar Disciplina
                    </button>
                </div>
            </div>

            {/* Bottom Grid: Movement & Legend */}
            <div className="flex border border-black flex-col md:flex-row">
                {/* Movement Table */}
                <div className="flex-1 border-b md:border-b-0 md:border-r border-black">
                    <div className="bg-gray-100 border-b border-black text-center font-bold text-xs p-1 uppercase print:bg-gray-200">
                        Movimento da Matrícula
                    </div>
                    <table className="w-full text-[10px] text-center border-collapse">
                        <thead>
                            <tr className="border-b border-black bg-gray-50 print:bg-gray-100">
                                <th className="border-r border-black p-1 w-20">TURMAS</th>
                                <th className="border-r border-black p-1">MATRÍCULA<br/>INICIAL</th>
                                <th className="border-r border-black p-1">ABANDONO</th>
                                <th className="border-r border-black p-1">TRANSFERÊNCIA</th>
                                <th className="border-r border-black p-1">ADMITIDO</th>
                                <th className="p-1">MATRÍCULA<br/>ATUAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                            {movementData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/30 print:hover:bg-transparent group">
                                    <td className="border-r border-black p-0 bg-gray-50 print:bg-gray-100 relative">
                                        <InputCell 
                                            value={row.grade} 
                                            onChange={(e) => {
                                                const newData = [...movementData];
                                                newData[idx].grade = e.target.value.toUpperCase();
                                                setMovementData(newData);
                                            }}
                                            placeholder="TURMA"
                                            className="font-bold pl-1"
                                        />
                                        <button 
                                            onClick={() => handleRemoveMovementRow(idx)}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 print:hidden p-1 bg-white/50 rounded"
                                            title="Remover linha"
                                            tabIndex={-1}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </td>
                                    <td className="border-r border-black p-0"><InputCell type="number" value={row.initial} onChange={(e) => {
                                        const newData = [...movementData]; newData[idx].initial = Number(e.target.value); setMovementData(newData);
                                    }} /></td>
                                    <td className="border-r border-black p-0"><InputCell value={row.abandon} onChange={(e) => {
                                        const newData = [...movementData]; newData[idx].abandon = e.target.value; setMovementData(newData);
                                    }} /></td>
                                    <td className="border-r border-black p-0"><InputCell type="number" value={row.transfer} onChange={(e) => {
                                        const newData = [...movementData]; newData[idx].transfer = Number(e.target.value); setMovementData(newData);
                                    }} /></td>
                                    <td className="border-r border-black p-0"><InputCell type="number" value={row.admitted} onChange={(e) => {
                                        const newData = [...movementData]; newData[idx].admitted = Number(e.target.value); setMovementData(newData);
                                    }} /></td>
                                    <td className="p-1 font-bold bg-gray-50/50 print:bg-transparent">{row.current}</td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan={6} className="print:hidden bg-slate-50 border-t border-black p-0">
                                    <button onClick={handleAddMovementRow} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 w-full py-1">
                                        <Plus className="h-3 w-3" /> Adicionar Turma
                                    </button>
                                </td>
                            </tr>
                            <tr className="bg-gray-100 font-bold border-t border-black print:bg-gray-200">
                                <td className="border-r border-black p-1">TOTAL</td>
                                <td className="border-r border-black p-1">{movementTotal.initial}</td>
                                <td className="border-r border-black p-1">{movementTotal.abandon}</td>
                                <td className="border-r border-black p-1">{movementTotal.transfer}</td>
                                <td className="border-r border-black p-1">{movementTotal.admitted}</td>
                                <td className="p-1">{movementTotal.current}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="flex-1 flex flex-col">
                    <div className="bg-gray-100 border-b border-black text-center font-bold text-xs p-1 uppercase print:bg-gray-200">
                        Legenda
                    </div>
                    <div className="flex-1 p-4 text-[10px] space-y-3 flex flex-col justify-center">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                             <div><strong>DI</strong> – Desempenho Insatisfatório</div>
                             <div><strong>EP</strong> – Em Processo</div>
                             <div><strong>DB</strong> – Desempenho Bom</div>
                             <div><strong>DE</strong> – Desempenho Excelente</div>
                             <div><strong>NA</strong> – Não Avaliado</div>
                        </div>
                    </div>
                    
                    {/* Signatures */}
                    <div className="mt-4 p-4 flex justify-around items-end text-[10px]">
                        <div className="text-center w-1/2">
                             <div className="mb-1 font-script text-xl transform -rotate-2 relative h-8 flex items-end justify-center">
                                <InputCell value={headerInfo.director} onChange={(e) => setHeaderInfo({...headerInfo, director: e.target.value.toUpperCase()})} placeholder="Nome do(a) Diretor(a)" className="font-script text-center text-lg italic w-full bg-transparent placeholder:text-gray-300" />
                             </div>
                             <div className="border-t border-black w-40 mx-auto pt-1">
                                ASSINATURA DO(A) DIRETOR(A)
                             </div>
                        </div>
                        <div className="text-center w-1/2 flex justify-center items-end gap-1">
                             <span>DATA</span>
                             <InputCell value={headerInfo.dateDay} onChange={(e) => setHeaderInfo({...headerInfo, dateDay: e.target.value})} width="w-6" className="border-b border-black text-center" />
                             <span>/</span>
                             <InputCell value={headerInfo.dateMonth} onChange={(e) => setHeaderInfo({...headerInfo, dateMonth: e.target.value})} width="w-6" className="border-b border-black text-center" />
                             <span>/</span>
                             <InputCell value={headerInfo.dateYear} onChange={(e) => setHeaderInfo({...headerInfo, dateYear: e.target.value})} width="w-10" className="border-b border-black text-center" />
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};