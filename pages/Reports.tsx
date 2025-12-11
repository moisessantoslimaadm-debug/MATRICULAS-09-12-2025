import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { 
  BarChart3, PieChart as PieIcon, Printer, Download, Filter, 
  School as SchoolIcon, Users, HeartPulse, Bus, 
  TrendingUp, RefreshCw, Layers, Search, ArrowRight, FileSpreadsheet
} from 'lucide-react';
import { Link } from '../router';
import { SchoolType } from '../types';

// --- Lightweight SVG Chart Components ---

const PieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  if (total === 0) return <div className="text-center text-slate-400 py-10">Sem dados</div>;

  return (
    <div className="flex items-center gap-8 justify-center">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
          {data.map((slice, i) => {
            const startPercent = cumulativePercent;
            const slicePercent = slice.value / total;
            cumulativePercent += slicePercent;
            const [startX, startY] = getCoordinatesForPercent(startPercent);
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
            const pathData = slicePercent === 1 
              ? `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0` // Full circle
              : `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
            
            return <path key={i} d={pathData} fill={slice.color} stroke="white" strokeWidth="0.02" />;
          })}
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
            <span className="text-slate-600 font-medium">{item.label}</span>
            <span className="font-bold text-slate-800">({((item.value/total)*100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const GroupedBarChart = ({ data }: { data: { label: string; v1: number; v2: number; v3: number }[] }) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.v1, d.v2, d.v3)), 1);
    
    return (
        <div className="w-full h-64 flex items-end justify-between gap-2 pt-6 pb-2">
            {data.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <div className="w-full flex justify-center items-end gap-[2px] h-full relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 bg-slate-800 text-white text-[10px] p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                            {item.label}: {item.v1} Total | {item.v2} AEE | {item.v3} Transp.
                        </div>
                        
                        {/* Bars */}
                        <div className="w-1/3 bg-blue-500 rounded-t-sm transition-all duration-500 hover:bg-blue-600" style={{ height: `${(item.v1 / maxVal) * 100}%` }}></div>
                        <div className="w-1/3 bg-pink-500 rounded-t-sm transition-all duration-500 hover:bg-pink-600" style={{ height: `${(item.v2 / maxVal) * 100}%` }}></div>
                        <div className="w-1/3 bg-orange-500 rounded-t-sm transition-all duration-500 hover:bg-orange-600" style={{ height: `${(item.v3 / maxVal) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium truncate w-full text-center" title={item.label}>
                        {item.label.split(' ')[0]}
                    </span>
                </div>
            ))}
        </div>
    );
};

const SimpleCardStat = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
            <div className={`p-2.5 rounded-lg ${colorClass}`}>
                <Icon className="h-5 w-5 opacity-80" />
            </div>
        </div>
        {subtext && <p className="text-xs text-slate-400 mt-3">{subtext}</p>}
    </div>
);

// --- Main Page Component ---

export const Reports: React.FC = () => {
    const { schools, students } = useData();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'overview' | 'individual'>('overview');
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
    const [gradeFilter, setGradeFilter] = useState<string>('Todas');

    // --- Analytics Logic ---

    // 1. General Metrics
    const generalStats = useMemo(() => {
        const totalAEE = students.filter(s => s.specialNeeds).length;
        const totalTransport = students.filter(s => s.transportRequest).length;
        const totalCapacity = schools.reduce((acc, s) => acc + (s.availableSlots || 0), 0);
        const occupancy = totalCapacity > 0 ? (students.length / totalCapacity) * 100 : 0;

        return { totalAEE, totalTransport, totalCapacity, occupancy };
    }, [students, schools]);

    // 2. Status Distribution (Pie Chart)
    const statusDistribution = useMemo(() => {
        const counts = {
            matriculado: 0,
            pendente: 0,
            analise: 0
        };
        students.forEach(s => {
            if (s.status === 'Matriculado') counts.matriculado++;
            else if (s.status === 'Pendente') counts.pendente++;
            else if (s.status === 'Em Análise') counts.analise++;
        });
        return [
            { label: 'Matriculado', value: counts.matriculado, color: '#22c55e' }, // green-500
            { label: 'Em Análise', value: counts.analise, color: '#3b82f6' }, // blue-500
            { label: 'Pendente', value: counts.pendente, color: '#eab308' }, // yellow-500
        ].filter(d => d.value > 0);
    }, [students]);

    // 3. Comparative Data (School vs School)
    const schoolComparison = useMemo(() => {
        const groups: Record<string, { total: number, aee: number, transport: number }> = {};
        
        schools.forEach(school => {
            groups[school.name] = { total: 0, aee: 0, transport: 0 };
        });
        
        students.forEach(s => {
            if(s.school && s.school !== 'Não alocada') {
                const key = s.school;
                if (!groups[key]) groups[key] = { total: 0, aee: 0, transport: 0 };
                
                groups[key].total += 1;
                if (s.specialNeeds) groups[key].aee += 1;
                if (s.transportRequest) groups[key].transport += 1;
            }
        });

        return Object.keys(groups)
            .map(name => {
                const school = schools.find(s => s.name === name);
                const capacity = school?.availableSlots || 0;
                const stats = groups[name];
                return {
                    name,
                    ...stats,
                    capacity,
                    occupancy: capacity > 0 ? (stats.total / capacity) * 100 : 0
                };
            })
            .sort((a, b) => b.total - a.total);

    }, [schools, students]);

    // 4. Top 5 Schools Data (Grouped Bar Chart)
    const top5SchoolsData = useMemo(() => {
        return schoolComparison.slice(0, 5).map(s => ({
            label: s.name,
            v1: s.total,
            v2: s.aee,
            v3: s.transport
        }));
    }, [schoolComparison]);

    // 5. Individual School Data with Grade Filter
    const selectedSchoolData = useMemo(() => {
        if (!selectedSchoolId) return null;
        
        const schoolInfo = schools.find(s => s.id === selectedSchoolId);
        if (!schoolInfo) return null;

        let schoolStudents = students.filter(s => 
            (s.school || '').toLowerCase() === schoolInfo.name.toLowerCase()
        );

        // Apply Grade Filter
        if (gradeFilter !== 'Todas') {
            schoolStudents = schoolStudents.filter(s => s.grade === gradeFilter);
        }

        const stats = {
            total: schoolStudents.length,
            aee: schoolStudents.filter(s => s.specialNeeds).length,
            transport: schoolStudents.filter(s => s.transportRequest).length,
            matriculated: schoolStudents.filter(s => s.status === 'Matriculado').length,
            pending: schoolStudents.filter(s => s.status !== 'Matriculado').length,
        };

        return { info: schoolInfo, students: schoolStudents, stats };
    }, [selectedSchoolId, schools, students, gradeFilter]);

    const handlePrint = () => {
        window.print();
    };

    const handleResetFilters = () => {
        setSelectedSchoolId('');
        setGradeFilter('Todas');
        addToast('Filtros limpos.', 'info');
    };
    
    const handleExportCSV = () => {
        if (activeTab === 'overview') {
            const headers = ["Escola", "Total Alunos", "Capacidade", "Ocupação (%)", "Alunos AEE", "Solic. Transporte"];
            const rows = schoolComparison.map(s => [
                `"${s.name}"`,
                s.total,
                s.capacity,
                s.occupancy.toFixed(1).replace('.', ','),
                s.aee,
                s.transport
            ]);

            const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `relatorio_geral_escolas_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (activeTab === 'individual' && selectedSchoolData) {
            const headers = ["Nome Aluno", "Matrícula", "Etapa", "Turma", "Deficiência", "Transporte", "Status"];
            const rows = selectedSchoolData.students.map(s => [
                `"${s.name}"`,
                s.enrollmentId || '',
                s.grade || '',
                s.className || '',
                s.specialNeeds ? 'Sim' : 'Não',
                s.transportRequest ? 'Sim' : 'Não',
                s.status
            ]);
            
            const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `relatorio_${selectedSchoolData.info.name.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                            <BarChart3 className="h-8 w-8 text-blue-600" />
                            Relatórios e Indicadores
                        </h1>
                        <p className="text-slate-600 mt-1">Análise detalhada da rede municipal de ensino.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                         <button 
                            onClick={handleResetFilters}
                            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
                            title="Limpar todos os filtros"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Limpar
                        </button>
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
                        >
                            <Download className="h-4 w-4" />
                            Exportar CSV
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
                        >
                            <Printer className="h-4 w-4" />
                            Imprimir
                        </button>
                    </div>
                </div>

                {/* Print Header (Visible only when printing) */}
                <div className="hidden print:block mb-8 border-b border-black pb-4 text-center">
                     <h1 className="text-2xl font-bold uppercase">Secretaria Municipal de Educação</h1>
                     <p className="text-sm">Relatório Gerencial de Matrículas</p>
                     <p className="text-xs mt-1">Gerado em: {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
                </div>

                {/* --- NEW FEATURE BANNER --- */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 mb-8 text-white shadow-lg print:hidden flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                            <FileSpreadsheet className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Novo: Gerador de Indicadores Oficiais</h3>
                            <p className="text-indigo-100 text-sm">Crie e imprima o quadro de desempenho e movimento da matrícula conforme modelo oficial da secretaria.</p>
                        </div>
                    </div>
                    <Link to="/performance" className="whitespace-nowrap bg-white text-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition shadow-sm flex items-center gap-2">
                        Acessar Ferramenta <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* Navigation Tabs */}
                <div className="flex p-1 bg-white border border-slate-200 rounded-xl w-full md:w-fit mb-8 shadow-sm print:hidden">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 px-6 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        <PieIcon className="h-4 w-4" />
                        Visão Geral (Rede)
                    </button>
                    <button 
                        onClick={() => setActiveTab('individual')}
                        className={`flex-1 px-6 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'individual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        <SchoolIcon className="h-4 w-4" />
                        Por Escola (Individual)
                    </button>
                </div>

                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                             <SimpleCardStat 
                                title="Total de Alunos" 
                                value={students.length} 
                                icon={Users} 
                                colorClass="bg-blue-100 text-blue-600" 
                                subtext={`${generalStats.occupancy.toFixed(1)}% da capacidade total`}
                             />
                             <SimpleCardStat 
                                title="Educação Especial" 
                                value={generalStats.totalAEE} 
                                icon={HeartPulse} 
                                colorClass="bg-pink-100 text-pink-600" 
                                subtext="Alunos AEE"
                             />
                             <SimpleCardStat 
                                title="Solic. Transporte" 
                                value={generalStats.totalTransport} 
                                icon={Bus} 
                                colorClass="bg-orange-100 text-orange-600" 
                                subtext="Zona rural/Difícil acesso"
                             />
                             <SimpleCardStat 
                                title="Total de Escolas" 
                                value={schools.length} 
                                icon={SchoolIcon} 
                                colorClass="bg-indigo-100 text-indigo-600" 
                                subtext={`${generalStats.totalCapacity} vagas totais`}
                             />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Comparison Chart (Top 5) */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 break-inside-avoid">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                    Comparativo (Top 5 Escolas com mais alunos)
                                </h3>
                                <GroupedBarChart data={top5SchoolsData} />
                                <div className="flex justify-center gap-4 mt-4 text-xs font-medium text-slate-600">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm"></span> Total</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-pink-500 rounded-sm"></span> AEE</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-sm"></span> Transporte</span>
                                </div>
                            </div>

                            {/* Status Distribution Pie Chart */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 break-inside-avoid">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <PieIcon className="h-5 w-5 text-green-600" />
                                    Distribuição por Status
                                </h3>
                                <div className="flex justify-center py-4">
                                    <PieChart data={statusDistribution} />
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden break-inside-avoid">
                            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Quadro Detalhado por Escola</h3>
                                <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                    {schoolComparison.length} unidades
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-700 font-bold">
                                        <tr>
                                            <th className="px-6 py-3">Escola</th>
                                            <th className="px-6 py-3 text-center">Capacidade</th>
                                            <th className="px-6 py-3 text-center">Matriculados</th>
                                            <th className="px-6 py-3 text-center">Ocupação (%)</th>
                                            <th className="px-6 py-3 text-center text-pink-700">Alunos AEE</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {schoolComparison.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-3 font-medium text-slate-800 truncate max-w-xs" title={s.name}>
                                                    {s.name}
                                                </td>
                                                <td className="px-6 py-3 text-center text-slate-500">{s.capacity}</td>
                                                <td className="px-6 py-3 text-center font-bold text-slate-700">{s.total}</td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        s.occupancy > 100 ? 'bg-red-100 text-red-700' :
                                                        s.occupancy > 90 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                        {s.occupancy.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-center text-pink-600 font-medium">{s.aee > 0 ? s.aee : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- INDIVIDUAL TAB --- */}
                {activeTab === 'individual' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        
                        {/* Filters */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 print:hidden flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Unidade Escolar</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <select 
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none cursor-pointer text-slate-700 font-medium"
                                        value={selectedSchoolId}
                                        onChange={(e) => setSelectedSchoolId(e.target.value)}
                                    >
                                        <option value="">-- Selecione uma escola --</option>
                                        {schools.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="w-full md:w-64">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Filtrar por Etapa</label>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <select 
                                        className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none cursor-pointer text-slate-700 font-medium"
                                        value={gradeFilter}
                                        onChange={(e) => setGradeFilter(e.target.value)}
                                        disabled={!selectedSchoolId}
                                    >
                                        <option value="Todas">Todas as Etapas</option>
                                        {/* Typical grades, could be dynamic based on data */}
                                        <option value="Educação Infantil">Educação Infantil</option>
                                        <option value="Fundamental I">Fundamental I</option>
                                        <option value="Fundamental II">Fundamental II</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {selectedSchoolData ? (
                            <div className="space-y-6">
                                {/* School Info Header */}
                                <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-blue-600 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">{selectedSchoolData.info.name}</h2>
                                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                                            <SchoolIcon className="h-4 w-4" /> 
                                            {selectedSchoolData.info.address}
                                        </p>
                                        {gradeFilter !== 'Todas' && (
                                            <span className="mt-2 inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded border border-yellow-200">
                                                Filtrando por: {gradeFilter}
                                            </span>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-200 text-center min-w-[120px]">
                                        <span className="block text-xs text-slate-400 uppercase font-bold tracking-wider">INEP</span>
                                        <span className="block text-xl font-mono font-bold text-slate-800">{selectedSchoolData.info.inep || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Total Listado</p>
                                        <p className="text-2xl font-bold text-blue-600 mt-1">{selectedSchoolData.stats.total}</p>
                                     </div>
                                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Capacidade Escola</p>
                                        <p className="text-2xl font-bold text-slate-700 mt-1">{selectedSchoolData.info.availableSlots}</p>
                                     </div>
                                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase font-bold">AEE (Inclusão)</p>
                                        <p className="text-2xl font-bold text-pink-600 mt-1">{selectedSchoolData.stats.aee}</p>
                                     </div>
                                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Transporte</p>
                                        <p className="text-2xl font-bold text-orange-600 mt-1">{selectedSchoolData.stats.transport}</p>
                                     </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* AEE Student List */}
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 break-inside-avoid">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <HeartPulse className="h-4 w-4 text-pink-500" /> Alunos AEE (Inclusão)
                                        </h3>
                                        {selectedSchoolData.stats.aee > 0 ? (
                                            <div className="overflow-y-auto max-h-[300px] border border-slate-100 rounded-lg">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                                                        <tr>
                                                            <th className="px-3 py-2">Nome</th>
                                                            <th className="px-3 py-2">Turma</th>
                                                            <th className="px-3 py-2">Deficiência?</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {selectedSchoolData.students
                                                            .filter(s => s.specialNeeds)
                                                            .map(s => (
                                                            <tr key={s.id}>
                                                                <td className="px-3 py-2 font-medium">{s.name}</td>
                                                                <td className="px-3 py-2 text-slate-500">{s.className || '-'}</td>
                                                                <td className="px-3 py-2 text-pink-600 font-bold">Sim</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[200px] bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                                <HeartPulse className="h-8 w-8 text-slate-300 mb-2" />
                                                <p className="text-slate-500 text-sm">Nenhum aluno AEE encontrado.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Transport Student List */}
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 break-inside-avoid">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Bus className="h-4 w-4 text-orange-500" /> Alunos com Transporte
                                        </h3>
                                        {selectedSchoolData.stats.transport > 0 ? (
                                            <div className="overflow-y-auto max-h-[300px] border border-slate-100 rounded-lg">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                                                        <tr>
                                                            <th className="px-3 py-2">Nome</th>
                                                            <th className="px-3 py-2">Turma</th>
                                                            <th className="px-3 py-2">Etapa</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {selectedSchoolData.students
                                                            .filter(s => s.transportRequest)
                                                            .map(s => (
                                                            <tr key={s.id}>
                                                                <td className="px-3 py-2 font-medium">{s.name}</td>
                                                                <td className="px-3 py-2 text-slate-500">{s.className || '-'}</td>
                                                                <td className="px-3 py-2">{s.grade || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[200px] bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                                <Bus className="h-8 w-8 text-slate-300 mb-2" />
                                                <p className="text-slate-500 text-sm">Nenhum aluno utiliza transporte.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Empty State
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <SchoolIcon className="h-16 w-16 text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-400">Nenhuma escola selecionada</h3>
                                <p className="text-slate-400">Escolha uma unidade acima para ver o relatório detalhado.</p>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};