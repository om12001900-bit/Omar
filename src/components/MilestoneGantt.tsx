import React, { useMemo } from 'react';
import { format, min, max, differenceInDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { Milestone } from '../types';

interface MilestoneGanttProps {
  milestones: Milestone[];
  projectStart?: string;
  projectEnd?: string;
  accentColor?: string;
}

export default function MilestoneGantt({ milestones, projectStart, projectEnd }: MilestoneGanttProps) {
  const sortedMilestones = useMemo(() => 
    [...milestones]
      .filter(m => m.date)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    [milestones]
  );

  const timelineRange = useMemo(() => {
    if (sortedMilestones.length === 0 && (!projectStart || !projectEnd)) return null;
    
    const dates = sortedMilestones.map(m => parseISO(m.date));
    if (projectStart) dates.push(parseISO(projectStart));
    if (projectEnd) dates.push(parseISO(projectEnd));
    
    const start = startOfDay(min(dates));
    const end = endOfDay(max(dates));
    
    const totalDays = Math.max(1, differenceInDays(end, start) + 1);
    
    return { start, end, totalDays };
  }, [sortedMilestones, projectStart, projectEnd]);

  if (!timelineRange || sortedMilestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 border-2 border-dashed border-white/5">
        <Clock size={48} className="mb-4 text-slate-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">لا توجد محطات زمنية مرتبطة لعرض المخطط</p>
      </div>
    );
  }

  const { start, totalDays } = timelineRange;

  const getPosition = (dateStr: string) => {
    const d = parseISO(dateStr);
    const daysFromStart = differenceInDays(d, start);
    return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
  };

  return (
    <div className="relative mt-6 overflow-x-auto no-scrollbar pb-10">
      <div className="min-w-[800px] relative">
        {/* Timeline Axis */}
        <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />
        <div className="flex justify-between px-2 pt-2 mb-10">
           <span className="text-[8px] font-black text-slate-600 uppercase">{format(timelineRange.start, 'dd MMM yyyy', { locale: ar })}</span>
           <span className="text-[8px] font-black text-slate-600 uppercase">{format(timelineRange.end, 'dd MMM yyyy', { locale: ar })}</span>
        </div>

        {/* Milestones Visualization */}
        <div className="space-y-4">
          {sortedMilestones.map((m, idx) => {
            const pos = getPosition(m.date);
            return (
              <div key={m.id} className="relative h-12 flex items-center group">
                {/* Horizontal Guide */}
                <div className="absolute inset-x-0 h-[1px] bg-white/[0.02]" />
                
                {/* Milestone Bar/Point */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="absolute"
                  style={{ left: `${pos}%` }}
                >
                  <div className="flex flex-col items-center -translate-x-1/2">
                    {/* Tooltip-like Info */}
                    <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 bg-brand-dark border border-white/10 p-3 shadow-2xl z-20 whitespace-nowrap">
                       <p className="text-[10px] font-black text-white text-right">{m.title}</p>
                       <p className="text-[8px] text-slate-500 text-right mt-1">{format(parseISO(m.date), 'dd MMMM', { locale: ar })}</p>
                    </div>

                    {/* Indicator Icon */}
                    <div className={`w-6 h-6 flex items-center justify-center transition-all ${m.completed ? 'text-green-400 scale-110' : 'text-slate-600 group-hover:text-brand-secondary'}`}>
                       {m.completed ? <CheckCircle2 size={16} /> : <Circle size={12} />}
                    </div>
                    
                    {/* Name Label */}
                    <span className={`text-[9px] font-bold mt-2 whitespace-nowrap max-w-[120px] truncate ${m.completed ? 'text-green-500/80' : 'text-slate-400 group-hover:text-white'}`}>
                      {m.title}
                    </span>
                  </div>
                </motion.div>
                
                {/* Visual Line from project start to this milestone if idx=0? Or just leave it as points. */}
              </div>
            );
          })}
        </div>

        {/* Current Project Duration Bar (Simplified) */}
        {projectStart && projectEnd && (
          <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${getPosition(projectStart)}%`, width: `${getPosition(projectEnd) - getPosition(projectStart)}%` }}>
             <div className="h-full border-x border-white/5 bg-white/[0.01]" />
          </div>
        )}
      </div>
    </div>
  );
}
