import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Target, Layers, Briefcase, TrendingUp, Clock, Activity, Presentation, Layout } from 'lucide-react';
import { useGoals, useHieas, useProjects, useConferences, usePlans } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import ProjectIcon from '../../components/ProjectIcon';
import DailyWizard from '../../components/DailyWizard';
import DailyReviewManager from '../../components/DailyReviewManager';

export default function Overview() {
  const { profile } = useAuth();
  const { goals } = useGoals();
  const { hieas } = useHieas();
  const { projects } = useProjects();
  const { conferences } = useConferences();
  const { plans } = usePlans();
  const navigate = useNavigate();

  // Calculate overall progress across all strategic pillars
  const allEntities = [
    ...(goals || []).map(g => g.progress || 0),
    ...(hieas || []).map(h => h.progress || 0),
    ...(projects || []).map(p => p.progress || 0),
    ...(plans || []).map(pl => pl.progress || 0)
  ].filter(v => typeof v === 'number' && !isNaN(v));

  const totalProgress = allEntities.length > 0 
    ? Math.round(allEntities.reduce((acc, val) => acc + val, 0) / allEntities.length) 
    : 0;

  const stats = [
    { label: 'الأهداف والمؤشرات', value: goals.length, icon: Target, color: 'text-brand-primary' },
    { label: 'المشاريع التنفيذية', value: projects.length, icon: Briefcase, color: 'text-teal-400' },
    { label: 'الخطط الاستراتيجية', value: plans.length, icon: Layout, color: 'text-brand-secondary' },
    { label: 'الهيئات الاستراتيجية', value: hieas.length, icon: Layers, color: 'text-emerald-400' },
  ];

  return (
    <div className="p-4 md:p-10 space-y-8 md:space-y-12 text-right pb-24 md:pb-10 max-w-[1600px] mx-auto">
      <DailyWizard />
      <DailyReviewManager />
      {/* Dynamic Welcome Header */}
      <div className="relative group p-8 md:p-12 overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0a0a0b] to-[#111112] border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-primary/5 blur-[120px] -translate-y-1/2 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-brand-secondary/5 blur-[100px] translate-y-1/2 rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-widest">
              <Activity size={12} />
              النظام نشط ومستقر
            </div>
            <h1 className="text-4xl md:text-7xl font-display font-black text-white tracking-tighter leading-none mb-2">
              مرحباً، <span className="text-transparent bg-clip-text bg-gradient-to-l from-brand-primary to-emerald-400">{profile?.displayName || 'Strategic Leader'}</span>
            </h1>
            <p className="text-slate-500 font-bold max-w-xl leading-relaxed text-sm">
              أهلاً بك في غرفة القيادة الاستراتيجية. تابع تقدم الأهداف، وتحرّك المشاريع، ونشاط الهيئات في منصة واحدة متكاملة تعتمد على البيانات اللحظية لتحقيق الرؤية.
            </p>
          </div>

        </div>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Progress Card (Large) */}
        <div className="md:col-span-2 lg:col-span-2 group relative p-8 md:p-10 rounded-[3rem] bg-[#0a0a0b] border border-white/5 overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="absolute top-0 right-0 p-8 text-white/[0.03] pointer-events-none">
            <TrendingUp size={200} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/10">
                <Target size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white leading-none">مؤشر التقدم العام</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Strategic Realization Index</p>
              </div>
            </div>

            <div className="flex items-end gap-4 mb-8">
              <span className="text-7xl md:text-9xl font-display font-black text-white tracking-tighter leading-none">{totalProgress}%</span>
              <div className="pb-3 space-y-1">
                 <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <TrendingUp size={14} />
                    <span>+2.4% متوقع هذا الشهر</span>
                 </div>
                 <p className="text-slate-600 font-bold text-[10px] uppercase">Based on current task velocity</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${totalProgress}%` }}
                  transition={{ duration: 2, ease: "circOut" }}
                  className="h-full bg-gradient-to-l from-brand-primary to-emerald-400 rounded-full shadow-[0_0_20px_rgba(45,212,191,0.3)]"
                />
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">
                <span>المستهدف: 100%</span>
                <span>المسار الحالي: {totalProgress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Small Stats Cards */}
        <div className="md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0a0a0b] border border-white/5 rounded-[2.5rem] p-6 group hover:border-brand-primary/20 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-all`}>
                  <stat.icon size={20} />
                </div>
                <div className="text-right">
                  <h4 className="text-3xl font-display font-black text-white leading-none">{stat.value}</h4>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">{stat.label}</p>
                </div>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                 <div className={`h-full w-2/3 ${stat.color.replace('text', 'bg')} opacity-20`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Activity & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detailed Insights / Quick Metrics */}
        <div className="lg:col-span-2 bg-[#0a0a0b] border border-white/5 rounded-[3rem] p-10 overflow-hidden relative group">
           <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-primary/5 rounded-full blur-3xl" />
           
           <div className="relative z-10 flex flex-col md:flex-row gap-10">
              <div className="flex-1 space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                       <Activity size={20} />
                    </div>
                    <h3 className="text-lg font-black text-white">توزيع الكيانات والمسؤوليات</h3>
                 </div>
                 <div className="space-y-6">
                    {hieas.slice(0, 3).map((h, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">{h.name}</span>
                          <span className="text-brand-primary">{h.progress || 0}% تحقق</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-brand-primary/30 rounded-full" style={{ width: `${h.progress || 0}%` }} />
                        </div>
                      </div>
                    ))}
                    {hieas.length === 0 && (
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest text-center py-4">No entities active</p>
                    )}
                 </div>
              </div>

              <div className="w-full md:w-[2px] bg-white/5 hidden md:block" />

              <div className="flex-1 space-y-8 text-center md:text-right">
                 <div className="flex items-center gap-3 justify-center md:justify-start">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                       <Presentation size={20} />
                    </div>
                    <h3 className="text-lg font-black text-white">الفعاليات القادمة</h3>
                 </div>
                 <div className="space-y-3">
                    {conferences.slice(0, 2).map((c, idx) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
                         <div className="text-right">
                            <p className="text-xs font-bold text-white">{c.name}</p>
                            <p className="text-[9px] text-brand-primary font-black uppercase mt-1">{c.date}</p>
                         </div>
                         <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                      </div>
                    ))}
                    {conferences.length === 0 && (
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest text-center py-4">No events scheduled</p>
                    )}
                    <button className="w-full py-3 rounded-2xl border border-dashed border-white/10 text-[9px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest">عرض التقويم الاستراتيجي</button>
                 </div>
              </div>
           </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-[#0a0a0b] border border-white/5 rounded-[3rem] p-8 flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-black flex items-center gap-3 text-slate-100 tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                 <Clock size={16} />
              </div>
              النشاط المباشر
            </h3>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Real-time Stream</span>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] no-scrollbar pr-1">
            {projects.slice(0, 6).map((p, i) => (
              <motion.button 
                key={i} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate('/dashboard/projects')}
                className="flex gap-4 items-center group w-full text-right bg-white/[0.01] hover:bg-white/[0.03] p-4 rounded-2xl transition-all border border-transparent hover:border-brand-primary/10"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-dark transition-all">
                  <ProjectIcon name={p.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-[11px] font-black text-slate-200 group-hover:text-brand-primary transition-colors truncate">
                      {p.name}
                    </p>
                    <span className="text-[8px] text-slate-600 font-bold">12m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-brand-primary/40" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400">{p.progress}%</span>
                  </div>
                </div>
              </motion.button>
            ))}
            {projects.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-800">
                <Activity size={40} className="mb-4 opacity-5" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">Monitoring Data Stream...</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/dashboard/analytics')}
            className="mt-8 py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-300 hover:bg-brand-primary hover:text-brand-dark hover:border-brand-primary transition-all uppercase tracking-widest shadow-xl shadow-brand-primary/5"
          >
            استكشاف التحليلات المعمقة
          </button>
        </div>
      </div>
    </div>
  );
}
