import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from '../router';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { 
    ArrowLeft, User, BookOpen, AlertCircle, CheckCircle, 
    MessageSquare, Plus, Trash2, TrendingUp, Clock, Award, AlertTriangle, FileX 
} from 'lucide-react';
import { RegistryStudent, TeacherNote, PerformanceRow } from '../types';

// --- Components Gráficos SVG Leves ---

const LineChart = ({ data }: { data: PerformanceRow[] }) => {
    // Process data to get simplified numeric averages for charting
    const chartData = data.map(row => {
        // Safe check for arrays to prevent crashes on legacy data or incomplete records
        const g1 = row.g1 || [];
        const g2 = row.g2 || [];
        const g3 = row.g3 || [];
        const g4 = row.g4 || [];
        const g5 = row.g5 || [];

        // Converte notas '8.0' ou '8,0' para numbers. Ignora strings vazias.
        const grades = [...g1, ...g2, ...g3, ...g4, ...g5]
            .map(v => parseFloat(v?.replace(',', '.') || '0'))
            .filter(n => !isNaN(n) && n > 0);
        
        const avg = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
        return { subject: row.subject || 'Disciplina', value: avg };
    }).filter(d => d.value > 0);

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Ainda não há notas lançadas para este aluno.</p>
                <p className="text-xs mt-1">Utilize o menu "Indicadores" para lançar o boletim.</p>
            </div>
        );
    }

    const padding = 40;
    const height = 300;
    const width = 600; // SVG coordinate system width
    const maxY = 10;
    const stepX = (width - padding * 2) / (Math.max(chartData.length - 1, 1));

    const points = chartData.map((d, i) => {
        const x = padding + i * stepX;
        const y = height - padding - (d.value / maxY) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[500px]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto drop-shadow-sm">
                    {/* Background Grid */}
                    {[0, 2.5, 5, 7.5, 10].map((val) => {
                        const y = height - padding - (val / maxY) * (height - padding * 2);
                        return (
                            <g key={val}>
                                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                                <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500">{val}</text>
                            </g>
                        );
                    })}

                    {/* Area Gradient */}
                    <defs>
                        <linearGradient id="gradeGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {chartData.length > 1 && (
                        <polygon 
                            points={`${padding},${height-padding} ${points} ${padding + (chartData.length - 1) * stepX},${height-padding}`} 
                            fill="url(#gradeGradient)" 
                        />
                    )}

                    {/* The Line */}
                    <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />

                    {/* Data Points */}
                    {chartData.map((d, i) => {
                        const x = padding + i * stepX;
                        const y = height - padding - (d.value / maxY) * (height - padding * 2);
                        return (
                            <g key={i} className="group">
                                {/* Interactive Hit Area */}
                                <circle cx={x} cy={y} r="15" fill="transparent" className="cursor-pointer" />
                                {/* Visible Dot */}
                                <circle cx={x} cy={y} r="5" fill="white" stroke="#3b82f6" strokeWidth="2.5" className="transition-all duration-300 group-hover:r-6 group-hover:stroke-blue-700" />
                                
                                {/* Label (Subject) */}
                                <text 
                                    x={x} 
                                    y={height - 10} 
                                    textAnchor="middle" 
                                    fontSize="9" 
                                    fill="#64748b" 
                                    className="uppercase font-bold tracking-tight" 
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transformBox: 'fill-box', transformOrigin: 'center' }}
                                >
                                    {d.subject.length > 12 ? d.subject.substring(0, 10) + '.' : d.subject}
                                </text>
                                
                                {/* Tooltip on Hover */}
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    <rect x={x - 24} y={y - 45} width="48" height="30" rx="6" fill="#1e293b" />
                                    <path d={`M${x - 6},${y - 15} L${x},${y - 9} L${x + 6},${y - 15}`} fill="#1e293b" />
                                    <text x={x} y={y - 26} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                                        {d.value.toFixed(1)}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

const AttendanceDonut = ({ present, total }: { present: number, total: number }) => {
    if (!total || total === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-32 w-32 rounded-full border-4 border-slate-100 bg-slate-50">
                <FileX className="h-6 w-6 text-slate-300 mb-1" />
                <span className="text-[10px] text-slate-400 font-medium">Sem dados</span>
            </div>
        );
    }

    const percentage = Math.min(100, Math.max(0, (present / total) * 100));
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    let color = '#22c55e'; // Green
    if (percentage < 75) color = '#ef4444'; // Red
    else if (percentage < 85) color = '#eab308'; // Yellow

    return (
        <div className="relative w-32 h-32 flex items-center justify-center group">
            <svg className="transform -rotate-90 w-full h-full drop-shadow-sm">
                <circle cx="50%" cy="50%" r={radius} stroke="#f1f5f9" strokeWidth="8" fill="white" />
                <circle 
                    cx="50%" cy="50%" r={radius} 
                    stroke={color} 
                    strokeWidth="8" 
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-700">{percentage.toFixed(0)}%</span>
                <span className="text-[10px] text-slate-500 uppercase font-medium">Presença</span>
            </div>
        </div>
    );
};

// --- Main Page Component ---

export const StudentMonitoring: React.FC = () => {
    const { students, updateStudents } = useData();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const studentId = params.get('id');

    const [student, setStudent] = useState<RegistryStudent | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'notes'>('overview');
    
    // Note Form State
    const [noteContent, setNoteContent] = useState('');
    const [noteType, setNoteType] = useState<TeacherNote['type']>('Pedagógico');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        setIsAdmin(sessionStorage.getItem('admin_auth') === 'true');
        if (studentId) {
            const found = students.find(s => s.id === studentId);
            if (found) setStudent(found);
        }
    }, [studentId, students]);

    if (!student) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500">Carregando perfil do aluno...</p>
            </div>
        </div>
    );

    // --- Actions ---

    const handleAddNote = async () => {
        if (!noteContent.trim()) return;

        const newNote: TeacherNote = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            type: noteType,
            content: noteContent,
            author: 'Coordenação/Professor' 
        };

        const updatedStudent = {
            ...student,
            teacherNotes: [newNote, ...(student.teacherNotes || [])]
        };

        await updateStudents([updatedStudent]);
        setStudent(updatedStudent);
        setNoteContent('');
        addToast('Anotação registrada.', 'success');
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!window.confirm("Remover esta anotação?")) return;
        
        const updatedStudent = {
            ...student,
            teacherNotes: (student.teacherNotes || []).filter(n => n.id !== noteId)
        };
        
        await updateStudents([updatedStudent]);
        setStudent(updatedStudent);
    };

    const performanceData = student.performanceHistory && student.performanceHistory.length > 0 
        ? student.performanceHistory 
        : []; 

    // Use NULL if no attendance data exists to show empty state instead of fake data
    const attendanceStats = student.attendance || null;

    const getNoteColor = (type: TeacherNote['type']) => {
        switch(type) {
            case 'Elogio': return 'bg-green-100 text-green-700 border-green-200';
            case 'Alerta': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Ocorrência': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    const getNoteIcon = (type: TeacherNote['type']) => {
        switch(type) {
            case 'Elogio': return <Award className="h-4 w-4" />;
            case 'Alerta': return <AlertTriangle className="h-4 w-4" />;
            case 'Ocorrência': return <AlertCircle className="h-4 w-4" />;
            default: return <BookOpen className="h-4 w-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header Profile */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 text-white/90 hover:text-white flex items-center gap-2 text-sm font-bold bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md transition hover:bg-white/30">
                            <ArrowLeft className="h-4 w-4" /> Voltar
                        </button>
                    </div>
                    <div className="px-8 pb-6 relative">
                        <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-6 gap-6">
                            <div className="w-24 h-24 bg-white rounded-2xl p-1.5 shadow-lg rotate-1">
                                <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                                    <User className="h-10 w-10" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl font-bold text-slate-900 truncate">{student.name}</h1>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-slate-600">
                                    <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-blue-500" /> {student.school || 'Escola não definida'}</span>
                                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-orange-500" /> {student.shift || 'Turno ND'}</span>
                                    <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded text-xs font-mono border border-slate-200 text-slate-500">
                                        ID: {student.enrollmentId || 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 self-end md:self-auto">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase shadow-sm border ${
                                    student.status === 'Matriculado' ? 'bg-green-100 text-green-700 border-green-200' : 
                                    student.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                    'bg-blue-100 text-blue-700 border-blue-200'
                                }`}>
                                    {student.status}
                                </span>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-slate-200 gap-6">
                            <button 
                                onClick={() => setActiveTab('overview')}
                                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            >
                                <TrendingUp className="h-4 w-4" /> Visão Geral
                            </button>
                            <button 
                                onClick={() => setActiveTab('notes')}
                                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            >
                                <MessageSquare className="h-4 w-4" /> Diário de Bordo 
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-1 border border-slate-200">{student.teacherNotes?.length || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* LEFT COLUMN (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {activeTab === 'overview' && (
                            <>
                                {/* Academic Performance Chart */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-6 relative z-10">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                            <TrendingUp className="h-5 w-5 text-blue-600" />
                                            Desempenho Acadêmico
                                        </h3>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => navigate(`/performance?studentId=${student.id}`)}
                                                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-blue-200"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Lançar Notas
                                            </button>
                                        )}
                                    </div>
                                    <LineChart data={performanceData} />
                                </div>

                                {/* Attendance Stats Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Faltas Justificadas</p>
                                            <p className="text-3xl font-bold text-indigo-600 mt-1">{attendanceStats ? attendanceStats.justifiedAbsences : '-'}</p>
                                        </div>
                                        <div className="bg-indigo-50 p-3 rounded-full text-indigo-500 group-hover:scale-110 transition-transform">
                                            <CheckCircle className="h-6 w-6" />
                                        </div>
                                     </div>
                                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-colors">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Faltas Injustificadas</p>
                                            <p className="text-3xl font-bold text-orange-600 mt-1">{attendanceStats ? attendanceStats.unjustifiedAbsences : '-'}</p>
                                        </div>
                                        <div className="bg-orange-50 p-3 rounded-full text-orange-500 group-hover:scale-110 transition-transform">
                                            <AlertCircle className="h-6 w-6" />
                                        </div>
                                     </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'notes' && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 text-lg">
                                    <MessageSquare className="h-5 w-5 text-purple-600" />
                                    Anotações Pedagógicas
                                </h3>

                                {isAdmin && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nova Observação</label>
                                        <textarea 
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none resize-none h-24 bg-white"
                                            placeholder="Descreva o comportamento, ocorrência ou elogio..."
                                        />
                                        <div className="flex flex-col sm:flex-row justify-between items-center mt-3 gap-3">
                                            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                                                {['Pedagógico', 'Elogio', 'Alerta', 'Ocorrência'].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setNoteType(type as any)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                                                            noteType === type 
                                                            ? 'bg-slate-800 text-white shadow-md transform scale-105' 
                                                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {getNoteIcon(type as any)}
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={handleAddNote}
                                                disabled={!noteContent.trim()}
                                                className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                            >
                                                <Plus className="h-4 w-4" /> Registrar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/70">
                                    {(student.teacherNotes || []).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                            <BookOpen className="h-10 w-10 mb-2 opacity-20" />
                                            <p className="text-sm italic">Nenhuma anotação registrada.</p>
                                        </div>
                                    ) : (
                                        (student.teacherNotes || []).map((note) => (
                                            <div key={note.id} className="relative pl-12 group animate-in slide-in-from-left-2 duration-300">
                                                {/* Timeline Dot */}
                                                <div className={`absolute left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 transition-transform group-hover:scale-125 ${
                                                    note.type === 'Elogio' ? 'bg-green-500' :
                                                    note.type === 'Ocorrência' ? 'bg-red-500' :
                                                    note.type === 'Alerta' ? 'bg-yellow-500' : 'bg-blue-500'
                                                }`}></div>
                                                
                                                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all hover:border-slate-200">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1.5 border ${getNoteColor(note.type)}`}>
                                                                {getNoteIcon(note.type)}
                                                                {note.type}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(note.date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {isAdmin && (
                                                            <button 
                                                                onClick={() => handleDeleteNote(note.id)} 
                                                                className="text-slate-300 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50"
                                                                title="Excluir anotação"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                        <User className="h-3 w-3" />
                                                        {note.author}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN (1/3) - Sidebar Stats */}
                    <div className="space-y-6">
                        
                        {/* Attendance Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-6 flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Frequência
                            </h3>
                            <AttendanceDonut 
                                present={attendanceStats?.presentDays || 0} 
                                total={attendanceStats?.totalSchoolDays || 0} 
                            />
                            <div className="mt-8 w-full grid grid-cols-2 gap-4 text-xs">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="block font-bold text-slate-700 text-lg">{attendanceStats?.totalSchoolDays || '-'}</span>
                                    <span className="text-slate-400 uppercase font-bold text-[10px]">Dias Letivos</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="block font-bold text-green-600 text-lg">{attendanceStats?.presentDays || '-'}</span>
                                    <span className="text-slate-400 uppercase font-bold text-[10px]">Presenças</span>
                                </div>
                            </div>
                        </div>

                        {/* Guardian Info Mini Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <User className="h-4 w-4" /> Responsável
                             </h3>
                             <div className="space-y-4 text-sm">
                                <div className="flex flex-col gap-1 pb-3 border-b border-slate-50">
                                    <span className="text-xs text-slate-400 font-bold uppercase">Nome</span>
                                    <span className="font-medium text-slate-800">{student.guardianName || 'Não informado'}</span>
                                </div>
                                <div className="flex flex-col gap-1 pb-3 border-b border-slate-50">
                                    <span className="text-xs text-slate-400 font-bold uppercase">Contato</span>
                                    <span className="font-medium text-slate-800 flex items-center gap-2">
                                        <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold">ZAP</span>
                                        {student.guardianContact || '-'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-slate-400 font-bold uppercase">CPF</span>
                                    <span className="font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit text-xs border border-slate-100">
                                        {student.guardianCpf || '-'}
                                    </span>
                                </div>
                             </div>
                        </div>

                        {/* Quick Actions */}
                        {isAdmin && (
                             <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg text-white">
                                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-400">
                                    Ações Rápidas
                                </h3>
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => {
                                            // Open Admin Modal equivalent logic via navigation or context
                                            addToast("Use o menu Gestão de Dados para editar detalhes cadastrais.", "info");
                                            navigate('/admin/data');
                                        }} 
                                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition text-left px-4 flex items-center gap-2"
                                    >
                                        <User className="h-4 w-4 opacity-70" /> Editar Cadastro
                                    </button>
                                    <button 
                                        onClick={() => window.print()}
                                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition text-left px-4 flex items-center gap-2"
                                    >
                                        <TrendingUp className="h-4 w-4 opacity-70" /> Imprimir Ficha
                                    </button>
                                </div>
                             </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};