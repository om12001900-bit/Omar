import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Target, Layers, Briefcase, TrendingUp, Clock, Activity, Presentation, Wallet } from 'lucide-react';
import { useGoals, useHieas, useProjects, useConferences, useStrategicUpdates, useFinance } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import ProjectIcon from '../../components/ProjectIcon';
import DailyWizard from '../../components/DailyWizard';
import DailyReviewManager from '../../components/DailyReviewManager';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function Overview() {
  const { profile } = useAuth();
  const { goals } = useGoals();
  const { hieas } = useHieas();
  const { projects } = useProjects();
  const { conferences } = useConferences();
  const { updates } = useStrategicUpdates();
  const { budget } = useFinance();
  const navigate = useNavigate();

  // Calculate overall progress across all strategic pillars
  const allEntities = [
    ...(goals || []).map(g => g.progress || 0),
    ...(hieas || []).map(h => h.progress || 0),
    ...(projects || []).map(p => p.progress || 0)
  ].filter(v => typeof v === 'number' && !isNaN(v));

  const totalProgress = allEntities.length > 0 
    ? Math.round(allEntities.reduce((acc, val) => acc + val, 0) / allEntities.length) 
    : 0;

  const stats = [
    { label: 'الأهداف والمؤشرات', value: goals.length, icon: Target, color: 'text-brand-primary' },
    { label: 'المشاريع التنفيذية', value: projects.length, icon: Briefcase, color: 'text-teal-400' },
    { label: 'الميزانية العامة', value: budget?.total?.toLocaleString() || 0, icon: Wallet, color: 'text-brand-secondary' },
    { label: 'الهيئات الاستراتيجية', value: hieas.length, icon: Layers, color: 'text-emerald-400' },
  ];

  return (
    <div className="p-4 md:p-10 space-y-8 md:space-y-12 text-right pb-24 md:pb-10 max-w-[1600px] mx-auto">
      <DailyWizard />
      <DailyReviewManager />
      
      {/* 1. Immersive Vision Header */}
      <div className="relative group p-10 md:p-20 overflow-hidden rounded-[3.5rem] bg-gradient-to-br from-[#020617] via-[#0a0a0b] to-[#111827] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(45,212,191,0.08),transparent_50%)]" />
        <div className="absolute top-1/2 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.05),transparent_50%)]" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-primary text-[10px] font-black uppercase tracking-[0.2em]"
            >
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              غرفة العمليات الإستراتيجية نشطة
            </motion.div>
            
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-8xl font-display font-black text-white tracking-tight leading-[0.9]"
              >
                تحقيق <span className="text-transparent bg-clip-text bg-gradient-to-l from-brand-primary to-emerald-400">الرؤية</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 font-medium max-w-xl leading-relaxed text-lg"
              >
                مرحباً بك، <span className="text-white font-black">{profile?.displayName?.split(' ')[0] || 'Strategic Leader'}</span>. 
                أنت الآن تتابع المسار الكامل للرؤية الإستراتيجية. النظام يحلل {projects.length} مشروعاً نشطاً و {goals.length} هدفاً إستراتيجياً لحظياً.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <button 
                onClick={() => navigate('/dashboard/analytics')}
                className="px-8 py-4 rounded-2xl bg-brand-primary text-brand-dark font-black text-sm shadow-[0_15px_30px_rgba(45,212,191,0.3)] hover:scale-105 transition-all"
              >
                استكشاف لوحة البيانات
              </button>
              <button 
                onClick={() => navigate('/dashboard/projects')}
                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-white/10 transition-all"
              >
                إدارة المشاريع الإستراتيجية
              </button>
            </motion.div>
          </div>

          {/* Achievement Ring Area */}
          <div className="relative flex justify-center lg:justify-end">
             <div className="relative w-64 h-64 md:w-80 md:h-80 group">
                {/* Background Rings */}
                <div className="absolute inset-0 border-[20px] border-white/5 rounded-full" />
                <motion.div 
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 2, ease: "circOut" }}
                  className="absolute inset-0 rounded-full border-[20px] border-transparent border-t-brand-primary border-r-brand-primary/80"
                  style={{ rotate: `${(totalProgress / 100) * 360}deg`, opacity: 0.5 }}
                />
                
                {/* Floating Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Index Achievement</span>
                   <span className="text-7xl md:text-9xl font-display font-black text-white leading-none tracking-tighter">
                     {totalProgress}%
                   </span>
                   <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 text-[10px] font-black">
                      <TrendingUp size={12} />
                      +4.2% مؤشر النمو
                   </div>
                </div>

                {/* Decorative Dots */}
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(45,212,191,1)]"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${i * 45}deg) translate(0, -160px)`
                    }}
                  />
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* 2. Strategic Pillars (Refined Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Core Stats Group */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
           {stats.map((stat, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 + 0.4 }}
               className="bg-[#0a0a0b] border border-white/5 rounded-[2.5rem] p-8 group hover:border-brand-primary/20 transition-all flex flex-col justify-between shadow-lg"
             >
               <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{stat.label}</p>
                    <h4 className="text-4xl font-display font-black text-white leading-tight">{stat.value}</h4>
                 </div>
                 <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center ${stat.color} group-hover:bg-brand-primary group-hover:text-brand-dark transition-all duration-500`}>
                   <stat.icon size={24} />
                 </div>
               </div>
               <div className="mt-8 flex items-center justify-between text-[8px] font-black uppercase text-slate-600">
                  <span>تم التحديث مؤخراً</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
               </div>
             </motion.div>
           ))}
        </div>

        {/* Strategic Insight Card */}
        <div className="md:col-span-4 bg-[#0a0a0b] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-full h-full bg-brand-primary opacity-[0.02] translate-x-1/2 translate-y-1/2 rounded-full blur-3xl" />
           
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                    <Sparkles size={20} />
                 </div>
                 <h3 className="text-lg font-black text-white">تحليل المستشار</h3>
              </div>
              <p className="text-xs font-medium text-slate-400 leading-relaxed">
                 استناداً إلى البيانات الحالية، يظهر تقدم ملحوظ في الهيئات الاستراتيجية (+12%). ننصح بالتركيز على تسريع المرحلة الثانية من مشروع "التوسع المركزي" لضمان التوافق مع الرؤية العامة.
              </p>
           </div>

           <button 
             onClick={() => navigate('/dashboard/analytics')}
             className="relative z-10 w-full mt-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-300 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
           >
              طلب تقرير تفصيلي
           </button>
        </div>
      </div>


      {/* 4. Strategic Growth Path (Visual Roadmap) */}
      <div className="bg-[#0a0a0b] border border-white/5 rounded-[3rem] p-10 md:p-14 relative overflow-hidden group shadow-2xl">
         <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_10%_10%,rgba(99,102,241,0.03),transparent_40%)]" />
         
         <div className="relative z-10 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div className="space-y-3">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <TrendingUp size={22} />
                     </div>
                     <h3 className="text-2xl font-display font-black text-white">مسار النمو الإستراتيجي</h3>
                  </div>
                  <p className="text-slate-500 font-bold text-sm max-w-lg leading-relaxed">
                     تمثيل بصري للمسار الحالي للأهداف الإستراتيجية. يوضح هذا المخطط تسلسل تحقيق المؤشرات والترابط بين الكيانات التنفيذية.
                  </p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-brand-primary" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">مكتمل</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-white/10" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">قيد التخطيط</span>
                  </div>
               </div>
            </div>

            {/* The Growth Path Component */}
            <div className="relative pt-20 pb-10 overflow-x-auto no-scrollbar">
               <div className="min-w-[1000px] relative h-40 flex items-center">
                  {/* Connecting Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary/50 via-white/5 to-white/5 -translate-y-1/2 rounded-full" />
                  
                  {/* Strategic Nodes */}
                  <div className="relative w-full flex justify-between px-10">
                     {goals.slice(0, 5).map((goal, i) => {
                        const isCompleted = goal.progress === 100;
                        const isCurrent = goal.progress > 0 && goal.progress < 100;
                        
                        return (
                           <motion.div 
                             key={goal.id} 
                             initial={{ opacity: 0, scale: 0.8 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: i * 0.1 }}
                             className="relative group/node"
                           >
                              {/* Vertical Line */}
                              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 w-[1px] h-12 bg-white/5 ${i % 2 === 0 ? '-translate-y-full mb-6' : 'translate-y-0 mt-6'}`} />
                              
                              {/* Label Area */}
                              <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center ${i % 2 === 0 ? 'bottom-full mb-10' : 'top-full mt-10'}`}>
                                 <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isCompleted ? 'text-brand-primary' : isCurrent ? 'text-white' : 'text-slate-600'}`}>
                                    {goal.category || 'هدف إستراتيجي'}
                                 </p>
                                 <h4 className={`text-sm font-black transition-colors ${isCompleted ? 'text-white' : 'text-slate-400 group-hover/node:text-white'}`}>
                                    {goal.title}
                                 </h4>
                                 <span className="text-[10px] text-slate-600 font-bold block mt-1">{goal.progress}% إكمال</span>
                              </div>

                              {/* Central Node */}
                              <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 ${
                                 isCompleted 
                                    ? 'bg-brand-primary text-brand-dark shadow-[0_0_30px_rgba(45,212,191,0.4)]' 
                                    : isCurrent 
                                       ? 'bg-[#0a0a0b] border-2 border-brand-primary text-brand-primary shadow-[0_0_20px_rgba(45,212,191,0.2)] scale-110'
                                       : 'bg-[#0a0a0b] border border-white/10 text-slate-700'
                              }`}>
                                 <Target size={20} />
                                 {isCurrent && (
                                    <motion.div 
                                       animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                       transition={{ duration: 2, repeat: Infinity }}
                                       className="absolute inset-0 rounded-2xl border-2 border-brand-primary"
                                    />
                                 )}
                              </div>
                           </motion.div>
                        );
                     })}
                     {goals.length === 0 && (
                        <div className="w-full flex flex-col items-center justify-center py-10">
                           <p className="text-slate-700 font-black uppercase tracking-[0.4em] text-xs">لا توجد أهداف إستراتيجية مجدولة لعرض المسار</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
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
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={h.progress || 0} aria-valuemin={0} aria-valuemax={100} aria-label={`تقدم تحقيق ${h.name}`}>
                           <div className="h-full bg-brand-primary/30 rounded-full" style={{ width: `${h.progress || 0}%` }} />
                        </div>
                      </div>
                    ))}
                    {hieas.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                        <Layers size={24} className="text-slate-800 mb-2" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest text-center">لا توجد هيئات استراتيجية نشطة حالياً</p>
                      </div>
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
                      <div 
                        key={idx} 
                        onClick={() => navigate('/dashboard/calendar')}
                        className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group/conf"
                      >
                         <div className="text-right">
                            <p className="text-xs font-bold text-white group-hover/conf:text-brand-primary transition-colors">{c.name}</p>
                            <p className="text-[9px] text-brand-primary font-black uppercase mt-1">{c.date}</p>
                         </div>
                         <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                      </div>
                    ))}
                    {conferences.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                        <Clock size={24} className="text-slate-800 mb-2" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest text-center">لا توجد فعاليات مجدولة</p>
                      </div>
                    )}
                    <button 
                      onClick={() => navigate('/dashboard/calendar')}
                      className="w-full py-3 rounded-2xl border border-dashed border-white/10 text-[9px] font-black text-slate-500 hover:text-white hover:border-brand-primary/30 transition-all uppercase tracking-widest"
                    >
                      عرض التقويم الاستراتيجي بالكامل
                    </button>
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
            {updates.length > 0 ? (
              updates.slice(0, 8).map((upd, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 items-start group w-full text-right bg-white/[0.02] hover:bg-white/[0.04] p-5 rounded-2xl transition-all border border-white/5 hover:border-brand-primary/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                    <ProjectIcon name={upd.icon || 'Activity'} size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                       <div className="text-right">
                          <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-1">{upd.type === 'milestone' ? 'إجمالي الإنجاز' : 'تحديث استراتيجي'}</p>
                          <h4 className="text-sm font-black text-white group-hover:text-brand-primary transition-colors">{upd.title}</h4>
                       </div>
                       <span className="text-[8px] text-slate-600 font-bold uppercase whitespace-nowrap pt-1">
                         {(() => {
                           if (!upd.createdAt) return '...';
                           try {
                             // eslint-disable-next-line @typescript-eslint/no-explicit-any
                             const date = (upd.createdAt as any).toDate ? (upd.createdAt as any).toDate() : new Date(upd.createdAt as any);
                             return format(date, 'HH:mm', { locale: ar });
                           } catch (e) {
                             console.error("Format error:", e);
                             return '...';
                           }
                         })()}
                       </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed line-clamp-2">{upd.content}</p>
                    <div className="mt-3 flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                       <span className="text-slate-500">{upd.entityName}</span>
                       <div className="w-1 h-1 rounded-full bg-white/10" />
                       <span className="hover:text-brand-primary cursor-pointer transition-colors" onClick={() => navigate(upd.type === 'milestone' ? '/dashboard/projects' : '/dashboard/analytics')}>عرض التفاصيل التنفيذية</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : projects.slice(0, 6).map((p, i) => (
              <motion.button 
                key={i} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate('/dashboard/projects')}
                className="flex gap-4 items-center group w-full text-right bg-white/[0.01] hover:bg-white/[0.03] p-4 rounded-2xl transition-all border border-transparent hover:border-brand-primary/10 focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
                aria-label={`عرض مشروع ${p.name}`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-dark transition-all">
                  <ProjectIcon name={p.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[11px] font-black text-slate-200 group-hover:text-brand-primary transition-colors truncate">
                      {p.name}
                    </p>
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">عرض المسار</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100}>
                       <div className="h-full bg-brand-primary/40 group-hover:bg-brand-primary transition-colors" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 group-hover:text-brand-primary transition-colors">{p.progress}%</span>
                  </div>
                </div>
              </motion.button>
            ))}
            {projects.length === 0 && updates.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-700 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Activity size={32} className="opacity-20 animate-pulse" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">بانتظار تدفق البيانات الاستراتيجية...</p>
                <p className="text-[8px] font-bold text-slate-800 mt-2">Strategic Feed Idle</p>
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
