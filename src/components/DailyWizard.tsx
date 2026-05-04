import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Layers, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  X,
  AlertCircle,
  Sparkles,
  Briefcase
} from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGoals, useHieas, usePlans, useProjects } from '../hooks/useData';

interface WizardItem {
  id: string;
  title: string;
  type: 'goal' | 'plan_goal' | 'hiea' | 'project';
  progress?: number;
  planId?: string;
  stageId?: string;
  planTitle?: string;
  stageTitle?: string;
  kpiCurrent?: number;
  kpiTarget?: number;
  completed?: boolean;
}

export default function DailyWizard() {
  const { profile, user } = useAuth();
  const { goals } = useGoals();
  const { hieas } = useHieas();
  const { plans } = usePlans();
  const { projects } = useProjects();
  
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<WizardItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Check if check-in is needed
  useEffect(() => {
    if (!profile || !user || !goals.length || !hieas.length || !plans.length || !projects.length) return;
    
    // YYYY-MM-DD format
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    
    if (profile.lastCheckInDate !== todayStr && !isOpen) {
      const reviewConfig = profile.dailyReviewItems || [];
      
      const filteredGoals: WizardItem[] = goals
        .filter(g => {
          const cfg = reviewConfig.find(i => i.itemId === g.id && i.type === 'goal');
          if (!cfg) return false;
          return today >= new Date(cfg.startDate) && today <= new Date(cfg.endDate);
        })
        .map(g => ({ ...g, type: 'goal', title: g.name }));
      
      const filteredHieas: WizardItem[] = hieas
        .filter(h => {
          const cfg = reviewConfig.find(i => i.itemId === h.id && i.type === 'hiea');
          if (!cfg) return false;
          return today >= new Date(cfg.startDate) && today <= new Date(cfg.endDate);
        })
        .map(h => ({ ...h, type: 'hiea', title: h.name }));

      const filteredProjects: WizardItem[] = projects
        .filter(p => {
          const cfg = reviewConfig.find(i => i.itemId === p.id && i.type === 'project');
          if (!cfg) return false;
          return today >= new Date(cfg.startDate) && today <= new Date(cfg.endDate);
        })
        .map(p => ({ ...p, type: 'project', title: p.name }));

      const filteredPlanGoals: WizardItem[] = [];
      (plans || []).forEach(p => {
        (p.stages || []).forEach(s => {
          (s.goals || []).forEach(sg => {
            const cfg = reviewConfig.find(i => i.itemId === sg.id && i.type === 'plan_goal' && i.planId === p.id);
            if (cfg && today >= new Date(cfg.startDate) && today <= new Date(cfg.endDate)) {
              filteredPlanGoals.push({ 
                id: sg.id,
                title: sg.text,
                type: 'plan_goal', 
                planId: p.id, 
                stageId: s.id, 
                planTitle: p.title, 
                stageTitle: s.title,
                kpiCurrent: sg.kpiCurrent,
                kpiTarget: sg.kpiTarget,
                completed: sg.completed
              });
            }
          });
        });
      });

      const allItems = [...filteredGoals, ...filteredPlanGoals, ...filteredHieas, ...filteredProjects];
      
      if (allItems.length > 0) {
        setItems(allItems);
        setIsOpen(true);
      }
    }
  }, [profile, user, goals, hieas, plans, projects, isOpen]);

  const handleUpdate = async (value: number) => {
    if (!user || items.length === 0) return;
    setIsSaving(true);
    const item = items[step];

    try {
      if (item.type === 'goal') {
        const goalRef = doc(db, 'goals', item.id);
        const newProgress = Math.max(0, Math.min(100, (item.progress || 0) + (value * 5)));
        await updateDoc(goalRef, {
          progress: newProgress,
          performanceLogs: arrayUnion({
            id: Math.random().toString(36).substr(2, 9),
            value: value,
            note: value > 0 ? 'تطور إيجابي' : value < 0 ? 'تحديات تنفيذية' : 'استقرار الموقف',
            date: new Date().toISOString().split('T')[0],
            recordedBy: user.uid,
            recordedAt: new Date().toISOString()
          })
        });
      } else if (item.type === 'plan_goal') {
        const planRef = doc(db, 'plans', item.planId);
        const plan = plans.find(p => p.id === item.planId);
        if (plan) {
          const newStages = plan.stages.map(s => {
            if (s.id === item.stageId) {
              return {
                ...s,
                goals: s.goals.map(g => {
                  if (g.id === item.id) {
                    const newCurrent = Math.max(0, (g.kpiCurrent || 0) + value);
                    return { 
                      ...g, 
                      kpiCurrent: newCurrent, 
                      completed: g.kpiTarget ? newCurrent >= g.kpiTarget : g.completed 
                    };
                  }
                  return g;
                })
              };
            }
            return s;
          });
          await updateDoc(planRef, { stages: newStages });
        }
      } else if (item.type === 'hiea') {
        const hieaRef = doc(db, 'hieas', item.id);
        const newProgress = Math.max(0, Math.min(100, (item.progress || 0) + (value * 2)));
        await updateDoc(hieaRef, {
          progress: newProgress,
          performanceLogs: arrayUnion({
            id: Math.random().toString(36).substr(2, 9),
            value: value,
            note: 'تحديث حالة الهيئة اليومي',
            date: new Date().toISOString().split('T')[0],
            recordedBy: user.uid,
            recordedAt: new Date().toISOString()
          })
        });
      } else if (item.type === 'project') {
        const projectRef = doc(db, 'projects', item.id);
        const newProgress = Math.max(0, Math.min(100, (item.progress || 0) + (value * 3)));
        await updateDoc(projectRef, {
          progress: newProgress,
          performanceLogs: arrayUnion({
            id: Math.random().toString(36).substr(2, 9),
            value: value,
            note: 'متابعة تقدم المشروع اليومية',
            date: new Date().toISOString().split('T')[0],
            recordedBy: user.uid,
            recordedAt: new Date().toISOString()
          })
        });
      }

      if (step < items.length - 1) {
        setStep(prev => prev + 1);
      } else {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { lastCheckInDate: new Date().toISOString().split('T')[0] });
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentItem = items[step];
  if (!currentItem) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#060607]/95 backdrop-blur-3xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0a0a0b] border border-brand-primary/20 rounded-[3rem] p-10 md:p-14 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-12 text-brand-primary/5 pointer-events-none">
          <Activity size={240} />
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">المتابعة اليومية للاستراتيجية</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Strategy Pulse Check-in</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl transition-all"
              >
                تأجيل المراجعة
              </button>
              <span className="text-[10px] font-black text-brand-primary px-3 py-1 bg-brand-primary/10 rounded-full">
                {step + 1} / {items.length}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
            {items.map((_, i) => (
              <div 
                key={i} 
                className={`h-full flex-1 rounded-full transition-all duration-700 ${
                  i < step ? 'bg-brand-primary shadow-[0_0_10px_rgba(45,212,191,0.5)]' : i === step ? 'bg-brand-primary/30 animate-pulse' : 'bg-white/5'
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={currentItem.id + currentItem.type}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-12 relative z-10"
          >
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${
                  currentItem.type === 'goal' ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30' : 
                  currentItem.type === 'plan_goal' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 
                  currentItem.type === 'project' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {currentItem.type === 'goal' ? <Target size={48} /> : 
                   currentItem.type === 'plan_goal' ? <Activity size={48} /> : 
                   currentItem.type === 'project' ? <Briefcase size={48} /> : <Layers size={48} />}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.4em]">
                  {currentItem.type === 'goal' ? 'الهدف الاستراتيجي' : 
                   currentItem.type === 'plan_goal' ? `${currentItem.planTitle} • ${currentItem.stageTitle}` : 
                   currentItem.type === 'project' ? 'المشروع التنفيذي' : 'الهيئة الاستراتيجية'}
                </h4>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight font-display tracking-tight text-center px-4">
                  {currentItem.title}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                disabled={isSaving}
                onClick={() => handleUpdate(1)}
                className="group relative h-40 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-4 transition-all duration-500 active:scale-95 disabled:opacity-50 hover:bg-emerald-500/10 hover:border-emerald-500/40"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                  <TrendingUp size={28} />
                </div>
                <div className="text-center">
                  <span className="text-base font-black text-white block mb-1">تغيير إيجابي</span>
                  <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">+ve Change</span>
                </div>
              </button>

              <button
                disabled={isSaving}
                onClick={() => handleUpdate(0)}
                className="group relative h-40 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-4 transition-all duration-500 active:scale-95 disabled:opacity-50 hover:bg-white/[0.08] hover:border-white/20"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                  <Minus size={28} />
                </div>
                <div className="text-center">
                  <span className="text-base font-black text-white block mb-1">لا يوجد تغيير</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Stable</span>
                </div>
              </button>

              <button
                disabled={isSaving}
                onClick={() => handleUpdate(-1)}
                className="group relative h-40 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-4 transition-all duration-500 active:scale-95 disabled:opacity-50 hover:bg-red-500/10 hover:border-red-500/40"
              >
                <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                  <TrendingDown size={28} />
                </div>
                <div className="text-center">
                  <span className="text-base font-black text-white block mb-1">يوجد تقصير</span>
                  <span className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest">-ve Issues</span>
                </div>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-16 pt-10 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3 text-slate-700 text-[11px] font-bold italic">
              <AlertCircle size={14} />
              سيتم تخزين التحديث تلقائياً فور الاختيار
           </div>
           
           <div className="flex items-center gap-4">
              <button
                disabled={step === 0}
                onClick={() => setStep(prev => prev - 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20"
              >
                السابق
              </button>
              <button
                disabled={step === items.length - 1}
                onClick={() => setStep(prev => prev + 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/10 transition-all disabled:opacity-20"
              >
                التالي
              </button>
           </div>
        </div>
        
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-8 right-8 p-3 text-slate-800 hover:text-white transition-all z-20"
        >
          <X size={24} />
        </button>
      </motion.div>
    </div>
  );
}
