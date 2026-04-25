import React, { useMemo } from 'react';
import { format, min, max, differenceInDays, eachMonthOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Calendar } from 'lucide-react';
import ProjectIcon from './ProjectIcon';
import { Project, Milestone } from '../types';

interface ProjectGanttProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

export default function ProjectGantt({ projects, onProjectClick }: ProjectGanttProps) {
  const filteredProjects = useMemo(() => 
    projects.filter(p => p.startDate && p.endDate),
    [projects]
  );

  const timelineRange = useMemo(() => {
    if (filteredProjects.length === 0) return null;
    
    const starts = filteredProjects.map(p => parseISO(p.startDate));
    const ends = filteredProjects.map(p => parseISO(p.endDate));
    
    const start = startOfMonth(min(starts));
    const end = endOfMonth(max(ends));
    
    const months = eachMonthOfInterval({ start, end });
    const totalDays = differenceInDays(end, start) + 1;
    
    return { start, end, months, totalDays };
  }, [filteredProjects]);

  if (!timelineRange || filteredProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center opacity-30">
        <Calendar size={64} className="mb-6" />
        <p className="text-sm font-black uppercase tracking-[0.4em]">لا توجد مبادرات بجدول زمني مكتمل للعرض</p>
      </div>
    );
  }

  const { start, months, totalDays } = timelineRange;

  const getPosition = (dateStr: string) => {
    const d = parseISO(dateStr);
    const daysFromStart = differenceInDays(d, start);
    return (daysFromStart / totalDays) * 100;
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 p-6 md:p-10 overflow-hidden flex flex-col h-full rounded-none">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-w-[800px] relative">
          {/* Timeline Header */}
          <div className="flex border-b border-white/10 pb-4 mb-8 sticky top-0 bg-brand-dark z-20">
            <div className="w-64 border-r border-white/10 px-4 shrink-0 font-black text-[10px] text-slate-600 uppercase tracking-widest text-right">المبادرات</div>
            <div className="flex-1 flex relative">
              {months.map((month, idx) => (
                <div 
                  key={idx} 
                  className="flex-1 border-r border-white/5 last:border-0 px-2 py-1 text-[9px] font-black text-slate-500 uppercase tracking-tighter text-right"
                  style={{ width: `${100 / months.length}%` }}
                >
                  {format(month, 'MMM yyyy', { locale: ar })}
                </div>
              ))}
            </div>
          </div>

          {/* Project Bars */}
          <div className="space-y-6 pb-10">
            {filteredProjects.map((project) => {
              const left = getPosition(project.startDate);
              const right = getPosition(project.endDate);
              const width = right - left;

              return (
                <div key={project.id} className="group flex items-center">
                  <div 
                    className="w-64 px-4 shrink-0 font-bold text-sm text-slate-300 truncate group-hover:text-brand-secondary transition-colors cursor-pointer text-right flex items-center gap-3 justify-end"
                    onClick={() => onProjectClick(project)}
                  >
                    <span>{project.name}</span>
                    <div className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-brand-secondary/30 transition-all">
                      <ProjectIcon name={project.icon} size={14} className="text-slate-500 group-hover:text-brand-secondary" />
                    </div>
                  </div>
                  <div className="flex-1 h-12 relative bg-white/[0.01] border-y border-white/[0.02]">
                    {/* Vertical Markers */}
                    <div className="absolute inset-0 flex pointer-events-none">
                       {months.map((_, idx) => (
                         <div key={idx} className="flex-1 border-r border-white/5 last:border-0" />
                       ))}
                    </div>

                    {/* Project Bar */}
                    <motion.div
                      layoutId={`bar-${project.id}`}
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      className="absolute top-1/2 -translate-y-1/2 h-4 bg-brand-secondary/20 border border-brand-secondary/30 group-hover:bg-brand-secondary/30 transition-all cursor-pointer rounded-none"
                      style={{ 
                        left: `${left}%`, 
                        width: `${Math.max(width, 1)}%`,
                        transformOrigin: 'left center'
                      }}
                      onClick={() => onProjectClick(project)}
                    >
                      {/* Progress Overlay */}
                      <div 
                        className="h-full bg-brand-secondary shadow-[0_0_15px_rgba(45,212,191,0.2)]" 
                        style={{ width: `${project.progress}%` }} 
                      />
                      
                      {/* Milestones on bar */}
                      {(project.milestones || []).map((m: Milestone, mIdx) => {
                        if (!m.date) return null;
                        const mLeft = ((getPosition(m.date) - left) / width) * 100;
                        return (
                          <div 
                            key={mIdx}
                            className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border ${m.completed ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-800 border-white/20'}`}
                            style={{ left: `${mLeft}%` }}
                            title={m.title}
                          />
                        );
                      })}
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
         <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-brand-secondary" />
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">نسبة الإنجاز</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-brand-secondary/20 border border-brand-secondary/30" />
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">الجدول الزمني المخطط</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rotate-45 bg-emerald-500" />
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">مراحل منجزة</span>
            </div>
         </div>
         <p className="text-[9px] font-black uppercase text-slate-700 tracking-widest italic">التسلسل الزمني للمبادرات الاستراتيجية O.V.9</p>
      </div>
    </div>
  );
}
