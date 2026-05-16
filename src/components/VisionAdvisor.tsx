import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { useGoals, useProjects, useHieas } from '../hooks/useData';

export default function VisionAdvisor() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { goals } = useGoals();
  const { projects } = useProjects();
  const { hieas } = useHieas();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/strategy/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals,
          projects,
          hieas,
          userInput: userMessage
        })
      });

      const data = await response.json();
      if (data.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، واجهت مشكلة في تحليل البيانات. حاول مرة أخرى.' }]);
      }
    } catch (_error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'فشل الاتصال بمستشار الرؤية. تأكد من إعداد مفتاح API الخاص بـ Gemini.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 md:bottom-10 left-6 md:left-10 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-emerald-500 text-brand-dark shadow-[0_0_30px_rgba(45,212,191,0.4)] flex items-center justify-center z-[100] border-2 border-white/20 overflow-hidden ${isOpen ? 'hidden' : 'flex'}`}
      >
        <motion.div
           animate={{ opacity: [1, 0.5, 1] }}
           transition={{ duration: 2, repeat: Infinity }}
           className="absolute inset-0 bg-white/20"
        />
        <Sparkles size={28} className="relative z-10" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50, x: -50 }}
            className={`fixed bottom-6 left-6 z-[110] bg-[#0a0a0b] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-3xl flex flex-col overflow-hidden backdrop-blur-3xl transition-all duration-300 ${
              isExpanded ? 'w-[calc(100vw-48px)] h-[calc(100vh-48px)] md:w-[600px] md:h-[800px]' : 'w-[calc(100vw-48px)] h-[500px] md:w-[400px] md:h-[600px]'
            }`}
          >
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-l from-brand-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-none">مستشار الرؤية الذكي</h3>
                  <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mt-1">O.V.9 Strategic AI</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors"
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth text-right no-scrollbar"
              dir="rtl"
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 px-10 pt-10">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-brand-primary mb-2">
                    <Sparkles size={40} />
                  </div>
                  <h4 className="text-lg font-black text-white">كيف يمكنني مساعدتك اليوم؟</h4>
                  <p className="text-xs font-medium leading-relaxed">
                    أنا مستشارك الاستراتيجي. يمكنني تحليل أهدافك ومشروعاتك وتقديم نصائح لتحسين الأداء وتحقيق الرؤية.
                  </p>
                  <div className="grid grid-cols-1 gap-2 w-full mt-4">
                     <button onClick={() => setInput('كيف يمكنني تسريع تقدم أهدافي؟')} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-brand-primary/5 hover:border-brand-primary/20 text-[10px] font-bold transition-all text-right">كيف يمكنني تسريع تقدم أهدافي؟</button>
                     <button onClick={() => setInput('حلل التوازن بين المشاريع والهيئات.')} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-brand-primary/5 hover:border-brand-primary/20 text-[10px] font-bold transition-all text-right">حلل التوازن بين المشاريع والهيئات.</button>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                    msg.role === 'assistant' ? 'bg-brand-primary/20 text-brand-primary' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className={`flex-1 p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'assistant' ? 'bg-white/5 text-slate-200 rounded-tr-none' : 'bg-brand-primary/10 text-white rounded-tl-none font-bold'
                  }`}>
                    <div className="markdown-body prose-invert prose-sm">
                       <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <div className="flex-1 p-4 bg-white/5 text-slate-400 rounded-2xl rounded-tr-none italic text-xs">
                     جارٍ تحليل البيانات الاستراتيجية...
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-5 border-t border-white/5 bg-[#050506]">
              <div className="relative group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="اسأل مستشار الرؤية..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pr-5 pl-14 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 transition-all resize-none min-h-[60px] max-h-[200px]"
                  dir="rtl"
                  rows={1}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`absolute left-3 bottom-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() && !isLoading ? 'bg-brand-primary text-brand-dark' : 'bg-white/5 text-slate-600'
                  }`}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="-rotate-90 rtl:rotate-90" />}
                </button>
              </div>
              <p className="text-[8px] text-slate-600 text-center mt-3 font-black uppercase tracking-widest">Powered by Gemini Strategic Artificial Intelligence</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
