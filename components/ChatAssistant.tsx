import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, HelpCircle, FileText, Calendar, MapPin, GraduationCap } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { useData } from '../contexts/DataContext';

export const ChatAssistant: React.FC = () => {
  const { schools } = useData(); // Busca dados reais do banco local para passar à IA
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: 'Olá! Sou o Edu, seu assistente escolar 🤖.\n\nPosso ajudar a encontrar escolas próximas, verificar vagas ou explicar como fazer a matrícula. O que você precisa?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    const modelMsgId = (Date.now() + 1).toString();
    // Adiciona mensagem placeholder
    setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', isLoading: true }]);

    try {
      // Passa a lista atual de escolas para a IA ter contexto (RAG)
      const stream = await sendMessageToGemini(userMsg.text, schools);
      let fullText = '';
      
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === modelMsgId 
            ? { ...msg, text: fullText, isLoading: false } 
            : msg
        ));
      }
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId 
          ? { ...msg, text: "Desculpe, ocorreu um erro na comunicação. Tente novamente.", isLoading: false } 
          : msg
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    { icon: <MapPin className="h-3 w-3" />, text: "Quais escolas têm vaga?" },
    { icon: <FileText className="h-3 w-3" />, text: "Documentos necessários" },
    { icon: <GraduationCap className="h-3 w-3" />, text: "Lista de escolas infantis" },
    { icon: <Calendar className="h-3 w-3" />, text: "Até quando vai a matrícula?" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end no-print">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 h-[550px] mb-4 flex flex-col border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ring-1 ring-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm border border-white/30">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Edu - Assistente Virtual</h3>
                <span className="text-[10px] text-blue-100 flex items-center gap-1 opacity-90">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_#4ade80]"></span>
                  Online • Base Atualizada
                </span>
              </div>
            </div>
            <button 
                onClick={() => setIsOpen(false)} 
                className="text-blue-100 hover:text-white transition hover:bg-white/10 p-1 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="space-y-4">
               {/* Welcome Suggestions (Only show if few messages) */}
               {messages.length === 1 && (
                 <div className="grid grid-cols-1 gap-2 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                   <p className="text-xs text-slate-500 mb-1 ml-1 font-medium uppercase tracking-wide">Como posso ajudar?</p>
                   <div className="grid grid-cols-2 gap-2">
                     {suggestions.map((s, i) => (
                       <button
                         key={i}
                         onClick={() => handleSend(s.text)}
                         className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-blue-100 rounded-xl text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition shadow-sm hover:shadow text-center h-full"
                       >
                         <div className="text-blue-500 bg-blue-50 p-1.5 rounded-full">{s.icon}</div>
                         {s.text}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                    }`}
                  >
                    {msg.isLoading ? (
                       <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                       </div>
                    ) : (
                      <div className="markdown-body whitespace-pre-wrap">{msg.text}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua dúvida aqui..."
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder:text-slate-400 bg-slate-50 focus:bg-white transition-all"
                disabled={isTyping}
                autoFocus
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm hover:shadow active:scale-95"
              >
                {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex justify-center mt-2">
               <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="h-3 w-3" />
                  IA da Secretaria de Educação (Pode cometer erros)
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        } transition-all duration-500 absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:shadow-blue-500/40 ring-4 ring-white z-50`}
        aria-label="Abrir chat"
      >
        <MessageCircle className="h-7 w-7" />
        
        {/* Notification Badge if closed (Optional enhancement) */}
        {!isOpen && messages.length === 1 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] text-white items-center justify-center font-bold">1</span>
            </span>
        )}
      </button>
      
      {/* Close button that appears when open (overlaps same position) */}
       <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          !isOpen ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        } transition-all duration-500 absolute bottom-0 right-0 bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-full shadow-xl flex items-center justify-center ring-4 ring-white z-50`}
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
};