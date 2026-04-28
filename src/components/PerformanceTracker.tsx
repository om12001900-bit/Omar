import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  MessageSquare,
  User,
  X,
  PlusCircle,
  AlertCircle,
  Activity,
  Trash2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { PerformanceLog } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface PerformanceTrackerProps {
  entityId: string;
  collectionName: 'projects' | 'hieas' | 'goals';
  logs?: PerformanceLog[];
  accentColor?: string;
}

export default function PerformanceTracker({ 
  entityId, 
  collectionName, 
  logs = [], 
  accentColor = '#2dd4bf' 
}: PerformanceTrackerProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    value: 0,
    note: '',
    date: new Date().toISOString().split('T')[0],
    isCumulative: false,
    impact: 'positive' as 'positive' | 'negative'
  });

  const logsTotal = logs.reduce((sum, log) => {
    // If we mix types, we need to be careful. 
    // If they are all stored as relative deltas (calculated from cumulative input), we just sum.
    return sum + log.value;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let valueToSave = Number(formData.value);
      
      if (formData.isCumulative) {
        // Calculate the delta: newTotal - currentTotal
        valueToSave = valueToSave - logsTotal;
      } else {
        // Apply impact multiplier for relative changes
        valueToSave = formData.impact === 'negative' ? -Math.abs(valueToSave) : Math.abs(valueToSave);
      }

      const newLog: Partial<PerformanceLog> = {
        id: Math.random().toString(36).substr(2, 9),
        value: valueToSave,
        type: formData.isCumulative ? 'cumulative' : 'relative',
        impact: formData.isCumulative 
          ? (valueToSave >= 0 ? 'positive' : 'negative')
          : formData.impact,
        note: formData.note,
        date: formData.date,
        recordedBy: user.displayName || user.email || 'مستخدم غير معروف',
        recordedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, collectionName, entityId), {
        performanceLogs: arrayUnion(newLog),
        updatedAt: serverTimestamp()
      });

      setIsAdding(false);
      setFormData({ 
        value: 0, 
        note: '', 
        date: new Date().toISOString().split('T')[0], 
        isCumulative: false,
        impact: 'positive'
      });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${entityId}`);
    }
  };

  const handleDelete = async (log: PerformanceLog) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, collectionName, entityId), {
        performanceLogs: arrayRemove(log),
        updatedAt: serverTimestamp()
      });
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${entityId}`);
    }
  };

  const getStatusInfo = (val: number) => {
    if (val > 0) return { 
      label: 'تغيير إيجابي', 
      icon: TrendingUp, 
      color: '#4ade80', 
      bg: 'bg-green-500/10',
      border: 'border-green-500/20'
    };
    if (val < 0) return { 
      label: 'تغيير سلبي', 
      icon: TrendingDown, 
      color: '#f43f5e', 
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    };
    return { 
      label: 'لا يوجد تغيير', 
      icon: Minus, 
      color: '#94a3b8', 
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/20'
    };
  };

  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 text-right">
      <div className="flex items-center justify-between flex-row-reverse mb-2">
        <div className="flex items-center gap-3 flex-row-reverse">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
            style={{ backgroundColor: `${accentColor}1a`, borderColor: `${accentColor}33`, color: accentColor }}
          >
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">معيار قياس الأداء</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Performance Measurement Index</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => setShowHistory(!showHistory)}
             className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${showHistory ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'}`}
             title="سجل التغييرات"
           >
             <History size={18} />
             <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">History</span>
           </button>
           <button 
             onClick={() => setIsAdding(true)}
             className="bg-brand-primary text-brand-dark px-5 py-3 rounded-xl font-black text-xs flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
           >
             <PlusCircle size={18} />
             <span>رصد جديد</span>
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0a0a0b] border border-white/10 p-6 rounded-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 -translate-x-12 -translate-y-12 rotate-45" />
            
            <button 
              onClick={() => setIsAdding(false)}
              className="absolute top-4 left-4 text-slate-600 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              <div className="flex gap-4 p-1.5 bg-[#020617] rounded-xl border border-white/5 mb-6">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isCumulative: false, value: 0 })}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    !formData.isCumulative ? 'bg-brand-primary text-brand-dark shadow-lg shadow-brand-primary/10' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  رصد نسبي (+/-)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isCumulative: true, value: logsTotal })}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.isCumulative ? 'bg-brand-primary text-brand-dark shadow-lg shadow-brand-primary/10' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  مقياس تراكمي (إجمالي)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">
                    {formData.isCumulative ? 'القيمة التراكمية الإجمالية' : 'قيمة التغيير'}
                  </label>
                  
                  {!formData.isCumulative && (
                    <div className="flex gap-2 p-1 bg-[#020617] rounded-lg border border-white/5 mb-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, impact: 'positive' })}
                        className={`flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all ${
                          formData.impact === 'positive' ? 'bg-green-500 text-white' : 'text-slate-500'
                        }`}
                      >
                        إيجابي (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, impact: 'negative' })}
                        className={`flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all ${
                          formData.impact === 'negative' ? 'bg-red-500 text-white' : 'text-slate-500'
                        }`}
                      >
                        سلبي (-)
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-4 bg-[#020617] border border-white/10 rounded-xl p-4">
                    <input 
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                      className="flex-1 bg-transparent border-none outline-none text-white font-black text-lg text-center"
                      autoFocus
                    />
                    {!formData.isCumulative && (
                      <div className={`w-12 text-center font-black text-lg ${formData.impact === 'positive' ? 'text-green-500' : 'text-red-500'}`}>
                        {formData.impact === 'positive' ? `+${formData.value}` : `-${formData.value}`}
                      </div>
                    )}
                  </div>
                  {!formData.isCumulative && (
                    <div className="flex justify-center text-[10px] font-bold px-2">
                       <span className={formData.impact === 'positive' ? 'text-green-500/80' : 'text-red-500/80 uppercase'}>
                        {formData.impact === 'positive' ? 'تحسن في مؤشر الأداء' : 'تراجع أو تحدي في الأداء'}
                       </span>
                    </div>
                  )}
                  {formData.isCumulative && (
                    <div className="flex justify-between text-[10px] font-bold px-2">
                      <span className="text-slate-600 uppercase">الإجمالي الحالي: {logsTotal}</span>
                      <span className="text-brand-primary uppercase">الرصد الجديد: {formData.value}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">تاريخ الرصد</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pr-11 pl-4 text-sm text-white font-bold outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">ملاحظات التحول / التغيير</label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute right-4 top-4 text-slate-600" />
                  <textarea 
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="اشرح أسباب التغيير أو التقدم المرصود..."
                    rows={3}
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pr-11 pl-4 text-sm text-white font-bold outline-none focus:border-brand-primary transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-start">
                <button 
                  type="submit"
                  className="bg-brand-primary text-brand-dark px-10 py-3 rounded-xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-primary/10"
                >
                  حفظ الرصد
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedLogs.slice(0, 3).map((log) => {
          const status = getStatusInfo(log.value);
          const StatusIcon = status.icon;
          
          return (
            <motion.div 
              key={log.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-5 rounded-2xl border ${status.border} ${status.bg} backdrop-blur-sm relative overflow-hidden group`}
            >
              <div className="flex items-start justify-between mb-3 flex-row-reverse">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{ borderColor: `${status.color}33`, color: status.color }}
                >
                  <StatusIcon size={16} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 flex-row-reverse mb-0.5">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{log.date}</p>
                    {log.type === 'cumulative' && (
                      <span className="text-[8px] font-black bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20 uppercase tracking-tighter">Cumulative</span>
                    )}
                    {log.impact === 'negative' && (
                      <span className="text-[8px] font-black bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-tighter">تغيير سلبي</span>
                    )}
                  </div>
                  
                  {deletingId === log.id ? (
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => handleDelete(log)}
                        className="text-[9px] font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-2 py-1 rounded"
                      >
                        تأكيد
                      </button>
                      <button 
                        onClick={() => setDeletingId(null)}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-400 bg-white/5 px-2 py-1 rounded"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeletingId(log.id)}
                      className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-right mb-3">
                <p className={`text-lg font-black ${log.value > 0 ? 'text-green-500' : log.value < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                  {log.value > 0 ? `+${log.value}` : log.value}
                </p>
              </div>
              <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-4 group-hover:line-clamp-none transition-all">{log.note}</p>
              <div className="flex items-center gap-2 justify-end text-[9px] font-bold text-slate-500">
                <span>{log.recordedBy}</span>
                <User size={10} className="text-slate-600" />
              </div>
            </motion.div>
          );
        })}
        {logs.length === 0 && !isAdding && (
          <div className="md:col-span-3 py-10 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-slate-700">
            <AlertCircle size={32} className="opacity-20 mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">لم يتم رصد أي معايير أداء بعد</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
            onClick={() => setShowHistory(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#0a0a0b] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between flex-row-reverse bg-white/[0.02]">
                <div className="flex items-center gap-4 flex-row-reverse">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
                    <History size={24} />
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-black text-white tracking-tight">سجل الرصد التاريخي</h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Full Performance History Log</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                {sortedLogs.map((log, idx) => {
                  const status = getStatusInfo(log.value);
                  const StatusIcon = status.icon;
                  
                  return (
                    <div key={log.id} className="relative flex gap-6 flex-row-reverse">
                      {idx !== logs.length - 1 && (
                        <div className="absolute top-12 bottom-[-24px] right-[23px] w-px bg-white/5" />
                      )}
                      
                      <div 
                        className="w-12 h-12 rounded-xl border shrink-0 flex items-center justify-center relative z-10"
                        style={{ backgroundColor: status.bg, borderColor: status.border, color: status.color }}
                      >
                        <StatusIcon size={20} />
                      </div>

                      <div className="flex-1 bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                        <div className="flex justify-between items-start mb-3 flex-row-reverse">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xl font-display font-black ${log.value > 0 ? 'text-green-500' : log.value < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                              {log.value > 0 ? `+${log.value}` : log.value}
                            </span>
                            
                            {deletingId === log.id ? (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleDelete(log)}
                                  className="text-[9px] font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-2 py-1 rounded"
                                >
                                  تأكيد الحذف
                                </button>
                                <button 
                                  onClick={() => setDeletingId(null)}
                                  className="text-[9px] font-bold text-slate-500 hover:text-slate-400 bg-white/10 px-2 py-1 rounded"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setDeletingId(log.id)}
                                className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                title="حذف الرصد"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">{log.date}</span>
                            {log.type === 'cumulative' && (
                              <span className="text-[8px] font-black bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20 uppercase tracking-tighter">Cumulative Input</span>
                            )}
                            {log.impact === 'negative' && (
                              <span className="text-[8px] font-black bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-tighter">تغيير سلبي</span>
                            )}
                            <Calendar size={12} className="text-slate-700" />
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed text-right mb-4">{log.note}</p>
                        <div className="flex items-center gap-2 justify-end">
                           <span className="text-[10px] font-bold text-slate-500">{log.recordedBy}</span>
                           <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                              <User size={12} className="text-slate-600" />
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {logs.length === 0 && (
                   <div className="py-20 text-center">
                      <AlertCircle size={48} className="mx-auto text-slate-800 opacity-20 mb-4" />
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest opacity-30">No history records found</p>
                   </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                <button 
                  onClick={() => setShowHistory(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 transition-all border border-white/5"
                >
                  إغلاق السجل
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Add CSS-like styles if needed
