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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 text-right">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-black text-white">مرحباً، {profile?.displayName || 'Omar'}</h1>
          <p className="text-slate-500 font-bold flex items-center gap-2 justify-end">
            <span className="text-brand-primary/60">{profile?.email}</span>
            <span>- القائد الاستراتيجي للمنصة</span>
          </p>
        </div>
        <div className="text-[10px] font-black uppercase text-slate-700 tracking-[0.4em] border-r-2 border-brand-primary px-4">
          Strategic Overview Hub
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/[0.02] border border-white/5 rounded-none p-5 flex flex-row lg:flex-md xl:flex-row items-center lg:items-start xl:items-center justify-between group cursor-default shadow-sm hover:shadow-brand-primary/5 transition-all"
          >
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl md:text-3xl font-display font-black">{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-none bg-white/5 ${stat.color} group-hover:scale-110 transition-transform shadow-inner`}>
              <stat.icon size={20} />
            </div>
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
