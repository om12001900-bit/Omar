import React, { useMemo } from 'react';
import { format, min, max, differenceInDays, eachMonthOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Calendar, AlertCircle } from 'lucide-react';
import ProjectIcon from './ProjectIcon';
import { Project, Milestone, Hiea, ProjectStatus } from '../types';

interface ProjectGanttProps {
  projects: Project[];
  hieas?: Hiea[];
  onProjectClick: (project: Project) => void;
}

export default function ProjectGantt({ projects, hieas = [], onProjectClick }: ProjectGanttProps) {
  const filteredProjects = useMemo(() => 
    projects
      .filter(p => p.startDate && p.endDate)
      .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
    [projects]
  );

  const timelineRange = useMemo(() => {
    if (filteredProjects.length === 0) return null;
    
    const starts = filteredProjects.map(p => parseISO(p.startDate));
    const ends = filteredProjects.map(p => parseISO(p.endDate));
    
    // Add 1 month padding to start and end
    const start = startOfMonth(min(starts));
    const end = endOfMonth(max(ends));
    
    const months = eachMonthOfInterval({ start, end });
    const totalDays = differenceInDays(end, start) + 1;
    
    return { start, end, months, totalDays };
  }, [filteredProjects]);

  if (!timelineRange || filteredProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center opacity-30 border-2 border-dashed border-white/5 mx-6">
        <Calendar size={64} className="mb-6 text-brand-primary" />
        <p className="text-sm font-black uppercase tracking-[0.4em]">لا توجد مشاريع بجدول زمني محدد للعرض</p>
        <p className="text-[10px] mt-4 text-slate-500 font-bold">تأكد من تحديد تاريخ البداية والنهاية للمشاريع</p>
      </div>
    );
  }

  const { start, months, totalDays } = timelineRange;
  const today = new Date();
  const todayPosition = differenceInDays(today, start) / totalDays * 100;
  const showToday = todayPosition >= 0 && todayPosition <= 100;

  const getPosition = (dateStr: string) => {
    const d = parseISO(dateStr);
    const daysFromStart = differenceInDays(d, start);
    return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
  };

  const rowHeight = 56; // h-14 equivalent
  const rowGap = 48; // space-y-12 equivalent

  return (
    <div className="bg-white/[0.01] border border-white/5 p-4 md:p-8 flex flex-col h-full rounded-none relative">
      <div className="flex-1 overflow-auto custom-scrollbar relative px-2">
        <div className="min-w-[1200px] relative pb-20">
          {/* Today Line Indicator */}
          {showToday && (
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-brand-primary/40 z-20 pointer-events-none"
              style={{ left: `calc(20rem + ${todayPosition} * (100% - 20rem) / 100)` }}
            >
              <div className="absolute top-0 -translate-x-1/2 bg-brand-primary text-brand-dark px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">اليوم</div>
            </div>
          )}

          {/* Timeline Header */}
          <div className="flex border-b border-white/10 pb-4 mb-10 sticky top-0 bg-brand-dark/95 backdrop-blur-md z-40">
            <div className="w-[20rem] border-r border-white/10 px-4 shrink-0 font-black text-[10px] text-slate-500 uppercase tracking-widest text-right flex items-center justify-end">الهيكل الزمني للمشاريع</div>
            <div className="flex-1 flex relative">
              {months.map((month, idx) => (
                <div 
                  key={idx} 
                  className="flex-1 border-r border-white/5 last:border-0 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right hover:text-brand-primary transition-colors"
                  style={{ width: `${100 / months.length}%` }}
                >
                  {format(month, 'MMMM yyyy', { locale: ar })}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Dependency Lines Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10 opacity-30">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                </marker>
              </defs>
              {filteredProjects.map((project, idx) => {
                const currentY = idx * (rowHeight + rowGap) + rowHeight / 2;
                const currentX = 320 + (getPosition(project.startDate) * (1200 - 320) / 100);

                return (project.dependencies || []).map((depId) => {
                  const depIdx = filteredProjects.findIndex(p => p.id === depId);
                  if (depIdx === -1) return null;

                  const depProject = filteredProjects[depIdx];
                  const depY = depIdx * (rowHeight + rowGap) + rowHeight / 2;
                  const depX = 320 + (getPosition(depProject.endDate) * (1200 - 320) / 100);

                  // Calculate path with some curvature
                  const cp1x = depX + 50;
                  const cp1y = depY;
                  const cp2x = currentX - 50;
                  const cp2y = currentY;

                  return (
                    <path
                      key={`${project.id}-${depId}`}
                      d={`M ${depX} ${depY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currentX} ${currentY}`}
                      fill="none"
                      stroke="#2dd4bf"
                      strokeWidth="1.5"
                      markerEnd="url(#arrowhead)"
                      className="transition-opacity duration-300"
                    />
                  );
                });
              })}
            </svg>

            {/* Project Rows */}
            <div className="relative z-20 space-y-12">
              {filteredProjects.map((project) => {
                const left = getPosition(project.startDate);
                const right = getPosition(project.endDate);
                const width = Math.max(right - left, 0.5);
                const durationDays = differenceInDays(parseISO(project.endDate), parseISO(project.startDate));
                
                const projectHieaIds = project.hieaIds || (project.hieaId ? [project.hieaId] : []);
                const projectHieas = hieas.filter(h => projectHieaIds.includes(h.id));
                const themeColor = project.color || projectHieas[0]?.color || '#2dd4bf';
                
                const isLate = project.status !== ProjectStatus.COMPLETED && parseISO(project.endDate) < today;

                return (
                  <div key={project.id} className="group flex flex-col h-14">
                    <div className="flex items-center h-full">
                      <div 
                        className="w-[20rem] px-6 shrink-0 group-hover:translate-x-[-8px] transition-all duration-300 ease-out cursor-pointer text-right flex items-center gap-4 justify-end relative z-30"
                        onClick={() => onProjectClick(project)}
                      >
                        <div className="flex flex-col items-end min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isLate && <AlertCircle size={12} className="text-red-500 animate-pulse" />}
                            <span className="font-black text-xs text-slate-200 truncate group-hover:text-brand-primary transition-colors">{project.name}</span>
                          </div>
                          <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">
                            {durationDays} يوم - {format(parseISO(project.startDate), 'dd/MM')} إلى {format(parseISO(project.endDate), 'dd/MM')}
                          </span>
                        </div>
                        <div 
                          className="w-10 h-10 rounded-none bg-white/[0.03] flex items-center justify-center shrink-0 border transition-all shadow-xl"
                          style={{ 
                            borderColor: themeColor ? `${themeColor}33` : 'rgba(255,255,255,0.05)',
                            color: themeColor
                          }}
                        >
                          <ProjectIcon name={project.icon} size={18} className="group-hover:scale-110 transition-all" />
                        </div>
                      </div>

                      <div className="flex-1 h-full relative bg-white/[0.01] border-y border-white/[0.03] hover:bg-white/[0.03] transition-all">
                        {/* Grid Markers */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {months.map((_, idx) => (
                            <div key={idx} className="flex-1 border-r border-white/5 last:border-0" />
                          ))}
                        </div>

                        {/* Project Bar Wrapper */}
                        <div className="absolute inset-0">
                          {/* Planned Bar (Background) */}
                          <motion.div
                            layoutId={`planned-bar-${project.id}`}
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            className={`absolute top-1/2 -translate-y-1/2 h-6 cursor-pointer overflow-hidden group/bar border ${isLate ? 'border-red-500/30' : 'border-white/10'}`}
                            style={{ 
                              left: `${left}%`, 
                              width: `${width}%`,
                              transformOrigin: 'left center',
                              backgroundColor: `${themeColor}1a`
                            }}
                            onClick={() => onProjectClick(project)}
                          >
                            {/* Actual Progress Bar */}
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${project.progress}%` }}
                              transition={{ duration: 1.5, ease: "circOut" }}
                              className="h-full relative shadow-lg"
                              style={{ 
                                background: project.status === ProjectStatus.COMPLETED 
                                  ? '#10b981' 
                                  : `linear-gradient(to left, ${themeColor}, ${themeColor}aa)`
                              }}
                            >
                               {/* Shimmer Effect */}
                               <motion.div 
                                 animate={{ x: ['-200%', '200%'] }}
                                 transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
                               />
                            </motion.div>

                            {/* Progress Text on Bar */}
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                              <span className="text-[7px] font-black text-white mix-blend-difference">{project.progress}%</span>
                            </div>
                          </motion.div>

                          {/* Milestone Markers */}
                          <div className="absolute inset-0 pointer-events-none">
                            {(project.milestones || []).map((m: Milestone, mIdx) => {
                              if (!m.date) return null;
                              const mPos = getPosition(m.date);
                              
                              return (
                                <div 
                                  key={mIdx}
                                  className="absolute top-1/2 -translate-y-11 pointer-events-auto"
                                  style={{ left: `${mPos}%` }}
                                >
                                  <div className="relative group/ms cursor-help">
                                    {/* Connector Line */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-10 bg-white/10 group-hover/ms:bg-brand-primary/40 transition-all" />
                                    
                                    {/* Milestone Glyph */}
                                    <div 
                                      className={`relative z-10 w-2.5 h-2.5 rotate-45 border-2 transition-all hover:scale-150 ${
                                        m.completed 
                                        ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                                        : 'bg-brand-dark border-white/40'
                                      }`}
                                    />

                                    {/* Popover/Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/ms:opacity-100 transition-all scale-90 group-hover/ms:scale-100 min-w-[200px] bg-brand-dark border border-white/10 p-4 shadow-2xl pointer-events-none z-50">
                                      <div className="flex items-center justify-between gap-4 mb-2">
                                         <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 ${m.completed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-slate-500'}`}>
                                           {m.completed ? 'منجز' : 'قيد الانتظار'}
                                         </span>
                                         <span className="text-[8px] font-bold text-slate-500 uppercase">{format(parseISO(m.date), 'd MMM yyyy', { locale: ar })}</span>
                                      </div>
                                      <p className="text-[10px] font-black text-white leading-tight mb-2 text-right">{m.title}</p>
                                      {m.notes && (
                                        <p className="text-[8px] text-slate-400 text-right border-r-2 border-brand-primary/30 pr-2 line-clamp-3 leading-relaxed">{m.notes}</p>
                                      )}
                                      {/* Arrow */}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-brand-dark" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Legend */}
      <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-6 bg-white/[0.01] p-6">
         <div className="flex flex-wrap gap-10 items-center">
            <div className="flex items-center gap-3">
               <div className="w-8 h-2 bg-gradient-to-l from-brand-primary to-brand-secondary" />
               <div className="flex flex-col text-right">
                 <span className="text-[10px] font-black uppercase text-slate-200 tracking-widest leading-none mb-1">التقدم المحرز</span>
                 <span className="text-[7px] text-slate-600 font-bold uppercase">الواقع الميداني</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-8 h-2 bg-white/10 border border-white/20" />
               <div className="flex flex-col text-right">
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">المخطط الزمني</span>
                 <span className="text-[7px] text-slate-600 font-bold uppercase">النطاق الزمني للمبادرة</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-2.5 h-2.5 rotate-45 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
               <div className="flex flex-col text-right">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">محطة إنجاز</span>
                 <span className="text-[7px] text-slate-600 font-bold uppercase">تاريخ محوري</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-8 h-[1px] bg-brand-primary" />
               <div className="flex flex-col text-right">
                 <span className="text-[10px] font-black uppercase text-brand-primary tracking-widest leading-none mb-1">الاعتمادات</span>
                 <span className="text-[7px] text-slate-600 font-bold uppercase">ربط التسلسل التنفيذي</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <AlertCircle size={14} className="text-red-500 animate-pulse" />
               <div className="flex flex-col text-right">
                 <span className="text-[10px] font-black uppercase text-red-500/80 tracking-widest leading-none mb-1">متـأخر روتينياً</span>
                 <span className="text-[7px] text-slate-600 font-bold uppercase">تجاوز الموعد المحدد</span>
               </div>
            </div>
         </div>
         <div className="text-right border-r border-white/10 pr-6">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">نظـام السيطرة الاستراتيجية O.V.9</p>
           <p className="text-[8px] text-slate-600 font-bold tracking-tighter uppercase whitespace-nowrap">Tactical Timeline Audit - Level 1 Clearance</p>
         </div>
      </div>
    </div>
  );
}
