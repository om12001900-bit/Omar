import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Target, Layers, Briefcase, TrendingUp, Clock, Activity, Presentation } from 'lucide-react';
import { useGoals, useHieas, useProjects, useConferences } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import ProjectIcon from '../../components/ProjectIcon';

export default function Overview() {
  const { profile } = useAuth();
  const { goals } = useGoals();
  const { hieas } = useHieas();
  const { projects } = useProjects();
  const { conferences } = useConferences();
  const navigate = useNavigate();

  const stats = [
    { label: 'الأهداف والمؤشرات', value: goals.length, icon: Target, color: 'text-brand-primary' },
    { label: 'الهيئات الاستراتيجية', value: hieas.length, icon: Layers, color: 'text-emerald-400' },
    { label: 'المشاريع التنفيذية', value: projects.length, icon: Briefcase, color: 'text-teal-400' },
    { label: 'المؤتمرات والفعاليات', value: conferences.length, icon: Presentation, color: 'text-brand-secondary' },
  ];

  const totalProgress = projects.length > 0 
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length) 
    : 0;

  return (
    <div className="p-4 md:p-10 space-y-8 md:space-y-16 text-right pb-24 md:pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-6 border-b border-white/5">
        <div className="space-y-3 w-full md:w-auto">
          <h1 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter leading-tight">مرحباً، {profile?.displayName || 'Strategic Leader'}</h1>
          <div className="flex flex-col md:flex-row items-center md:items-center gap-4 text-right">
            <span className="text-slate-500 font-bold order-2 md:order-1 flex items-center gap-3">
              <span className="w-2 h-2 bg-brand-primary/50 shadow-[0_0_10px_rgba(74,222,128,0.5)] rounded-full hidden md:block" />
              القائد الاستراتيجي للمنصة 
            </span>
            <div className="bg-brand-primary/10 border border-brand-primary/30 px-4 py-1.5 rounded-xl order-1 md:order-2 shadow-2xl shadow-brand-primary/5">
              <span className="text-brand-primary font-black text-[10px] md:text-xs uppercase tracking-[0.2em] leading-none">{profile?.email}</span>
            </div>
          </div>
        </div>
        <div className="hidden md:block text-[10px] font-black uppercase text-slate-700 tracking-[0.8em] border-r-2 border-brand-primary px-8 py-3 bg-white/[0.01]">
          Strategic Overview Hub
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative overflow-hidden"
          >
            <div className="bg-[#0a0a0b] border border-white/5 rounded-3xl p-6 md:p-8 hover:border-brand-primary/30 transition-all cursor-default relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform shadow-2xl`}>
                  <stat.icon size={24} />
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                  <h3 className="text-3xl md:text-4xl font-display font-black text-white">{stat.value}</h3>
                </div>
              </div>
              <div className="h-1 w-0 group-hover:w-full bg-brand-primary/30 transition-all duration-500 rounded-full" />
            </div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* General Progress */}
        <div className="lg:col-span-2 border border-white/5 bg-white/[0.01] rounded-none p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-white/[0.02] pointer-events-none hidden md:block">
            <Activity size={160} />
          </div>
          <div className="relative z-10 w-full">
            <h3 className="text-lg font-black mb-6 flex items-center gap-3 text-white tracking-tight">
              <div className="w-8 h-8 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <TrendingUp size={18} />
              </div>
              نسبة التقدم العامة والمؤشر الاستراتيجي
            </h3>
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              <div className="text-5xl md:text-7xl font-display font-black text-brand-primary tracking-tighter shadow-brand-primary/10">
                {totalProgress}%
              </div>
              <div className="w-full pb-2">
                <div className="h-4 w-full bg-white/5 rounded-none overflow-hidden border border-white/5 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalProgress}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="h-full bg-brand-primary rounded-none neon-glow"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-3 font-bold tracking-tight">تم إنجاز {totalProgress}% من المسار الاستراتيجي للرؤية حالياً.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border border-white/5 bg-white/[0.01] rounded-none p-6 flex flex-col">
          <h3 className="text-base font-black mb-6 flex items-center gap-3 text-slate-100 tracking-tight">
            <div className="w-8 h-8 rounded-none bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
               <Clock size={16} />
            </div>
            آخر الأنشطة والتحركات
          </h3>
          <div className="space-y-5 flex-1">
            {projects.slice(0, 5).map((p, i) => (
              <button 
                key={i} 
                onClick={() => navigate('/dashboard/projects')}
                className="flex gap-4 items-center group w-full text-right bg-white/[0.02] hover:bg-white/[0.05] p-3 transition-all border border-transparent hover:border-white/5"
              >
                <div className="w-10 h-10 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 group-hover:scale-110 transition-transform">
                  <ProjectIcon name={p.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-300 group-hover:text-brand-primary transition-colors leading-relaxed truncate">
                    تم تحديث المشروع: <span className="text-brand-primary/90">{p.name}</span>
                  </p>
                  <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-[0.2em] font-black">Strategic Update • Just now</p>
                </div>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-800">
                <Activity size={32} className="mb-2 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-20">No activity data stream</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
