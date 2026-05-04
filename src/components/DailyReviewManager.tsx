import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Layers, 
  Briefcase, 
  Activity, 
  Plus, 
  Trash2, 
  Search, 
  Settings2, 
  ChevronRight, 
  ChevronDown, 
  Info
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGoals, useHieas, usePlans, useProjects } from '../hooks/useData';
import { Plan } from '../types';

export default function DailyReviewManager() {
  const { profile, user } = useAuth();
  const { goals } = useGoals();
  const { hieas } = useHieas();
  const { plans } = usePlans();
  const { projects } = useProjects();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'goal' | 'hiea' | 'plan_goal' | 'project'>('goal');

  const dailyItems = profile?.dailyReviewItems || [];

  const handleToggleItem = async (itemId: string, type: 'goal' | 'plan_goal' | 'hiea' | 'project', extra: Record<string, string> = {}) => {
    if (!user) return;
    
    const existingIndex = dailyItems.findIndex(i => i.itemId === itemId && i.type === type);
    const newItems = [...dailyItems];

    if (existingIndex > -1) {
      newItems.splice(existingIndex, 1);
    } else {
      newItems.push({
        itemId,
        type,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
        ...extra
      });
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        dailyReviewItems: newItems
      });
    } catch (err) {
      console.error('Error updating review items:', err);
    }
  };

  const handleUpdateDates = async (itemId: string, type: string, start: string, end: string) => {
    if (!user) return;
    
    const newItems = dailyItems.map(item => {
      if (item.itemId === itemId && item.type === type) {
        return { ...item, startDate: start, endDate: end };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        dailyReviewItems: newItems
      });
    } catch (err) {
      console.error('Error updating dates:', err);
    }
  };

  const planGoalItems: { id: string; title: string; planId: string; stageId: string; planTitle: string; stageTitle: string }[] = [];
  (plans || []).forEach((p: Plan) => {
    (p.stages || []).forEach(s => {
      (s.goals || []).forEach(sg => {
        planGoalItems.push({ 
          id: sg.id,
          title: sg.text,
          planId: p.id,
          stageId: s.id,
          planTitle: p.title,
          stageTitle: s.title
        });
      });
    });
  });

  const filteredGoals = goals.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredHieas = hieas.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPlanGoals = planGoalItems.filter(pg => pg.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderItem = (id: string, title: string, type: 'goal' | 'hiea' | 'project' | 'plan_goal', subtitle?: string, extra: Record<string, string> = {}) => {
    const config = dailyItems.find(i => i.itemId === id && i.type === type);
    const isSelected = !!config;

    return (
      <div 
        key={id + type}
        className={`flex flex-col p-4 rounded-2xl border transition-all ${
          isSelected ? 'bg-brand-primary/5 border-brand-primary/30 shadow-lg' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
        }`}
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isSelected ? 'bg-brand-primary text-brand-dark' : 'bg-white/5 text-slate-500'
            }`}>
              {type === 'goal' ? <Target size={20} /> : 
               type === 'hiea' ? <Layers size={20} /> : 
               type === 'project' ? <Briefcase size={20} /> : <Activity size={20} />}
            </div>
            <div>
              <h4 className="text-sm font-black text-white">{title}</h4>
              {subtitle && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{subtitle}</p>}
            </div>
          </div>
          
          <button
            onClick={() => handleToggleItem(id, type, extra)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isSelected ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'
            }`}
          >
            {isSelected ? <Trash2 size={18} /> : <Plus size={18} />}
          </button>
        </div>

        {isSelected && (
          <div className="grid grid-cols-2 gap-3 mt-1 pt-3 border-t border-white/5">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">يبدأ من</label>
              <input 
                type="date"
                value={config.startDate}
                onChange={(e) => handleUpdateDates(id, type, e.target.value, config.endDate)}
                className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-brand-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">ينتهي في</label>
              <input 
                type="date"
                value={config.endDate}
                onChange={(e) => handleUpdateDates(id, type, config.startDate, e.target.value)}
                className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-brand-primary/50"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="relative group p-6 rounded-[2rem] bg-gradient-to-br from-[#0a0a0b] to-[#111112] border border-white/5 shadow-2xl overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-primary/5 blur-[80px] -translate-y-1/2 rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-2xl ring-1 ring-brand-primary/20">
              <Settings2 size={24} />
            </div>
            <div className="text-right">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                تخصيص المراجعة اليومية
                <span className="px-2 py-0.5 bg-brand-primary/20 text-brand-primary text-[10px] font-black rounded-full border border-brand-primary/20">
                  {dailyItems.length} عنصر
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-bold flex items-center gap-2">
                <Info size={12} className="text-brand-primary" />
                اختر الأهداف والمشاريع التي تريد متابعتها يومياً في "Strategy Pulse"
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
          >
            {isExpanded ? 'إغلاق الإعدادات' : 'تعديل قائمة المتابعة'}
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative overflow-hidden"
            >
              <div className="pt-8 mt-8 border-t border-white/5">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                  <div className="flex bg-[#020617] p-1 rounded-2xl border border-white/10 shrink-0">
                    {[
                      { id: 'goal', label: 'الأهداف', icon: Target },
                      { id: 'hiea', label: 'الهيئات', icon: Layers },
                      { id: 'plan_goal', label: 'الخطط', icon: Activity },
                      { id: 'project', label: 'المشاريع', icon: Briefcase },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'goal' | 'hiea' | 'plan_goal' | 'project')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          activeTab === tab.id ? 'bg-brand-primary text-brand-dark shadow-xl' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex-1 group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-brand-primary transition-colors" size={16} />
                    <input 
                      type="text"
                      placeholder="ابحث في العناصر..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#020617] border border-white/5 rounded-2xl pr-12 pl-6 py-4 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                  {activeTab === 'goal' && filteredGoals.map(g => renderItem(g.id, g.name, 'goal'))}
                  {activeTab === 'hiea' && filteredHieas.map(h => renderItem(h.id, h.name, 'hiea'))}
                  {activeTab === 'project' && filteredProjects.map(p => renderItem(p.id, p.name, 'project'))}
                  {activeTab === 'plan_goal' && filteredPlanGoals.map(pg => renderItem(pg.id, pg.title, 'plan_goal', `${pg.planTitle} • ${pg.stageTitle}`, { planId: pg.planId, stageId: pg.stageId }))}
                  
                  {((activeTab === 'goal' && filteredGoals.length === 0) ||
                    (activeTab === 'hiea' && filteredHieas.length === 0) ||
                    (activeTab === 'project' && filteredProjects.length === 0) ||
                    (activeTab === 'plan_goal' && filteredPlanGoals.length === 0)) && (
                    <div className="col-span-full py-12 text-center">
                      <p className="text-slate-600 text-sm font-black italic">لا توجد نتائج مطابقة لبحثك</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
