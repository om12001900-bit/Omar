import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { 
  Target, 
  Layers, 
  Briefcase, 
  Activity,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Settings2,
  Check,
  FileDown,
  LayoutDashboard,
  Box,
  Palette,
  Eye
} from 'lucide-react';
import { useGoals, useHieas, useProjects, useConferences, usePlans } from '../../hooks/useData';
import { ProjectStatus, GoalType } from '../../types';

type ChartType = 'bar' | 'pie' | 'area' | 'line';
type MetricType = 'projects_status' | 'hieas_workload' | 'goals_structure' | 'conferences_impact' | 'performance_trend' | 'projects_completion' | 'hieas_completion' | 'goals_completion';

export default function Analytics() {
  const { goals, loading: goalsLoading } = useGoals();
  const { hieas, loading: hieasLoading } = useHieas();
  const { projects, loading: projectsLoading } = useProjects();
  const { conferences, loading: conferencesLoading } = useConferences();
  const { plans, loading: plansLoading } = usePlans();

  const chartRef = useRef<HTMLDivElement>(null);

  // Dynamic State
  const [activeMetric, setActiveMetric] = useState<MetricType>('projects_status');
  const [activeChartType, setActiveChartType] = useState<ChartType>('bar');
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  
  // Customization
  const [themeMode, setThemeMode] = useState<'vibrant' | 'minimal'>('vibrant');
  const [showGrid, setShowGrid] = useState(true);
  const [chartOpacity, setChartOpacity] = useState(1);
  const [barSize, setBarSize] = useState(30);

  const [chartRadius, setChartRadius] = useState(60);

  const isLoading = goalsLoading || hieasLoading || projectsLoading || conferencesLoading || plansLoading;

  // Data Preparation Logic
  const chartData = useMemo(() => {
    switch (activeMetric) {
      case 'projects_status': {
        const pCounts = {
          [ProjectStatus.UPCOMING]: 0,
          [ProjectStatus.IN_PROGRESS]: 0,
          [ProjectStatus.PENDING_COMPLETION]: 0,
          [ProjectStatus.COMPLETED]: 0,
        };
        projects.forEach(p => { if (p.status in pCounts) pCounts[p.status]++; });
        return [
          { name: 'قيد التخطيط', value: pCounts[ProjectStatus.UPCOMING], color: '#64748b' },
          { name: 'قيد التنفيذ', value: pCounts[ProjectStatus.IN_PROGRESS], color: '#38bdf8' },
          { name: 'بانتظار الاعتماد', value: pCounts[ProjectStatus.PENDING_COMPLETION], color: '#fbbf24' },
          { name: 'مكتمل', value: pCounts[ProjectStatus.COMPLETED], color: '#4ade80' },
        ].filter(v => v.value > 0);
      }

      case 'hieas_workload':
        return hieas.map(h => ({
          name: h.name.length > 12 ? h.name.substring(0, 12) + '...' : h.name,
          value: projects.filter(p => p.hieaId === h.id || (p.hieaIds && p.hieaIds.includes(h.id))).length,
          color: themeMode === 'vibrant' ? (h.color || '#4ade80') : '#38bdf8'
        })).sort((a, b) => b.value - a.value).slice(0, 8);

      case 'goals_structure':
        return [
          { name: 'أهداف استراتيجية', value: goals.filter(g => g.type === GoalType.OBJECTIVE).length, color: '#4ade80' },
          { name: 'مستهدفات رقمية', value: goals.filter(g => g.type === GoalType.TARGET).length, color: '#2dd4bf' },
        ];

      case 'conferences_impact':
        return hieas.map(h => ({
          name: h.name.length > 12 ? h.name.substring(0, 12) + '...' : h.name,
          value: conferences.filter(c => c.hieaId === h.id).length,
          color: themeMode === 'vibrant' ? (h.color || '#fbbf24') : '#fbbf24'
        })).filter(v => v.value > 0).sort((a, b) => b.value - a.value);

      case 'performance_trend': {
        // Aggregate performance as average progress over time
        const monthlyData: Record<string, { total: number, count: number }> = {};
        
        const allItems = [...projects, ...goals, ...hieas, ...plans];
        
        allItems.forEach(item => {
          if (item.performanceLogs && item.performanceLogs.length > 0) {
            item.performanceLogs.forEach(log => {
              const date = new Date(log.date);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              if (!monthlyData[monthKey]) monthlyData[monthKey] = { total: 0, count: 0 };
              monthlyData[monthKey].total += log.value;
              monthlyData[monthKey].count += 1;
            });
          }
        });

        return Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, stats]) => ({
            name: month,
            value: Math.round(stats.total / (stats.count || 1)),
            color: '#2dd4bf'
          }));
      }

      case 'projects_completion':
        return projects
          .map(p => ({
            name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
            value: p.progress || 0,
            color: (p.progress || 0) >= 80 ? '#4ade80' : (p.progress || 0) >= 40 ? '#fbbf24' : '#f87171'
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

      case 'hieas_completion':
        return hieas.map(h => {
          const hieaProjects = projects.filter(p => p.hieaId === h.id || (p.hieaIds && p.hieaIds.includes(h.id)));
          const avgProgress = hieaProjects.length > 0 
            ? Math.round(hieaProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / hieaProjects.length)
            : 0;
          return {
            name: h.name.length > 12 ? h.name.substring(0, 12) + '...' : h.name,
            value: avgProgress,
            color: themeMode === 'vibrant' ? (h.color || '#38bdf8') : '#38bdf8'
          };
        }).filter(v => v.value > 0).sort((a, b) => b.value - a.value);

      case 'goals_completion':
        return goals
          .map(g => ({
            name: g.name.length > 15 ? g.name.substring(0, 15) + '...' : g.name,
            value: g.progress || 0,
            color: g.type === GoalType.OBJECTIVE ? '#4ade80' : '#2dd4bf'
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

      default:
        return [];
    }
  }, [activeMetric, projects, hieas, goals, conferences, themeMode]);

  const downloadChart = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#020617',
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          // html2canvas fails on modern color functions like oklch/oklab.
          // We must aggressively clean the DOOM before it starts parsing.
          
          // 1. Clean all style tags content
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(s => {
            if (s.textContent?.includes('okl')) {
              // Replace oklch/oklab with a standard fallback color to prevent parser crash
              s.textContent = s.textContent
                .replace(/oklch\([^)]+\)/g, '#334155')
                .replace(/oklab\([^)]+\)/g, '#334155')
                .replace(/color-mix\([^)]+\)/g, 'currentColor');
            }
          });

          // 2. Clear external links that might contain Tailwind 4 compiled CSS with oklch
          const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
          links.forEach(l => l.remove());

          // 3. Inject a robust, static fallback theme for the export
          const safeStyle = clonedDoc.createElement('style');
          safeStyle.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            :root {
              --background: #020617 !important;
              --foreground: #ffffff !important;
              --brand-primary: #2dd4bf !important;
            }
            * {
              color-scheme: dark !important;
              font-family: 'Inter', system-ui, sans-serif !important;
              border-color: rgba(255,255,255,0.1) !important;
            }
            .analytics-container, body { 
              background-color: #020617 !important; 
              color: #ffffff !important; 
            }
            svg { overflow: visible !important; }
          `;
          clonedDoc.head.appendChild(safeStyle);

          // 4. Deep sanitize every element
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            
            // Remove inline style issues
            const styleAttr = el.getAttribute('style');
            if (styleAttr && (styleAttr.includes('okl') || styleAttr.includes('color-mix'))) {
              const sanitized = styleAttr
                .replace(/okl(ch|ab)\([^)]+\)/g, '#ffffff')
                .replace(/color-mix\([^)]+\)/g, 'currentColor');
              el.setAttribute('style', sanitized);
            }

            // Fix Recharts specific SVG attributes
            ['fill', 'stroke'].forEach(attr => {
              const val = el.getAttribute(attr);
              if (val && (val.includes('okl') || val.includes('color-mix'))) {
                el.setAttribute(attr, attr === 'fill' ? '#2dd4bf' : '#334155');
              }
            });

            // Force computed style fallbacks
            if (el.style) {
              const props = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'] as const;
              props.forEach(prop => {
                const val = el.style[prop as keyof CSSStyleDeclaration];
                if (typeof val === 'string' && (val.includes('okl') || val.includes('color-mix'))) {
                  if (prop === 'backgroundColor') el.style.backgroundColor = '#0f172a';
                  else if (prop === 'color') el.style.color = '#ffffff';
                  else if (prop === 'borderColor') el.style.borderColor = 'rgba(255,255,255,0.05)';
                  else if (prop === 'fill') el.style.fill = '#2dd4bf';
                  else if (prop === 'stroke') el.style.stroke = '#2dd4bf';
                }
              });
            }
          }
        }
      });
      return canvas;
    } catch (err) {
      console.error('Canvas capture failed:', err);
      return null;
    }
  };

  const downloadPNG = async () => {
    const canvas = await downloadChart();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `strategic_chart_${activeMetric}_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadPDF = async () => {
    const canvas = await downloadChart();
    if (!canvas) return;
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`strategic_chart_${activeMetric}_${new Date().getTime()}.pdf`);
  };

  const exportCSV = () => {
    const headers = ['Category', 'Value'];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n"
      + chartData.map(e => `${e.name},${e.value}`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `data_${activeMetric}.csv`);
    link.click();
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-slate-500 font-bold p-20 text-center">
      <div className="flex flex-col items-center gap-4">
        <Activity className="animate-spin text-brand-primary" size={32} />
        <p className="text-sm tracking-widest uppercase font-black">جاري تحضير المختبر الاستراتيجي...</p>
      </div>
    </div>
  );

  // Helper for Tooltip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isPercentage = ['projects_completion', 'hieas_completion', 'goals_completion', 'performance_trend'].includes(activeMetric);
      return (
        <div className="bg-[#0a0a0b] border border-white/10 p-4 shadow-2xl rounded-xl backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 border-b border-white/5 pb-1">{label}</p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              <span className="text-xs font-bold text-white">{p.value}{isPercentage ? '%' : ''} {activeMetric === 'projects_status' ? 'مشروع' : ''}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-10 space-y-8 min-h-screen text-right pb-32 md:pb-10 bg-brand-dark/50">
      
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-10 border-b border-white/5">
        <div className="flex flex-col items-center lg:items-end gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-3">
             <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tighter">مختبر البيانات</h1>
             <motion.div 
               animate={{ scale: [1, 1.1, 1] }} 
               transition={{ duration: 2, repeat: Infinity }}
               className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary"
             >
                <LayoutDashboard size={20} />
             </motion.div>
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">تخصيص كامل للرؤية الاستراتيجية الرقمية</p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap justify-center gap-4 bg-[#0a0a0b] p-2 rounded-3xl border border-white/5 shadow-2xl">
           <button 
             onClick={downloadPNG}
             className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-3 transition-all group"
           >
              <Download size={18} className="text-slate-400 group-hover:text-brand-primary group-hover:-translate-y-1 transition-all" />
              <span className="text-xs font-bold text-white uppercase tracking-widest hidden md:inline">PNG</span>
           </button>
           <button 
             onClick={downloadPDF}
             className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-3 transition-all group"
           >
              <FileDown size={18} className="text-slate-400 group-hover:text-brand-primary group-hover:-translate-y-1 transition-all" />
              <span className="text-xs font-bold text-white uppercase tracking-widest hidden md:inline">PDF</span>
           </button>
           <button 
             onClick={() => setSettingsOpen(true)}
             className="w-12 h-12 md:w-auto md:px-6 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-primary/20 transition-all text-brand-primary"
           >
              <Settings2 size={18} />
              <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">تخصيص اللوحة</span>
           </button>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Metric Selection - New Horizontal Grid Layout */}
        <div className="bg-[#0a0a0b] p-6 rounded-[3rem] border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 -translate-x-12 -translate-y-12 rotate-45 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 px-4">
             <div className="flex flex-col items-center md:items-end">
               <label className="text-[10px] font-black uppercase text-brand-primary tracking-[0.3em] mb-1">نطاق التحليل</label>
               <h3 className="text-xl font-black text-white">اختر المؤشر الاستراتيجي</h3>
             </div>
             <div className="hidden md:block h-px flex-1 bg-gradient-to-l from-brand-primary/20 via-transparent to-transparent ml-4" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'projects_status', label: 'حالة المشاريع', icon: Briefcase, color: 'text-sky-400', desc: 'توزيع العمليات' },
              { id: 'projects_completion', label: 'إنجاز المشاريع', icon: TrendingUp, color: 'text-emerald-400', desc: 'نسب تقدم العمل' },
              { id: 'hieas_workload', label: 'نشاط الهيئات', icon: Layers, color: 'text-brand-primary', desc: 'كثافة المشاريع' },
              { id: 'hieas_completion', label: 'إنجاز الهيئات', icon: Check, color: 'text-sky-500', desc: 'متوسط التقدم' },
              { id: 'goals_structure', label: 'هيكل الأهداف', icon: Target, color: 'text-emerald-400', desc: 'التوازن الاستراتيجي' },
              { id: 'goals_completion', label: 'إنجاز المستهدفات', icon: Activity, color: 'text-brand-primary', desc: 'نسب تحقق الأهداف' },
              { id: 'conferences_impact', label: 'تغطية المؤتمرات', icon: Activity, color: 'text-amber-400', desc: 'توزيع الفعاليات' },
              { id: 'performance_trend', label: 'اتجاه الأداء', icon: TrendingUp, color: 'text-rose-400', desc: 'الإنجاز العام' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveMetric(item.id as MetricType)}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center gap-3 relative group ${activeMetric === item.id ? 'bg-brand-primary text-brand-dark border-brand-primary shadow-xl shadow-brand-primary/10' : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/5'}`}
              >
                <div className={`p-2 rounded-xl border transition-colors ${activeMetric === item.id ? 'bg-brand-dark/20 border-brand-dark/20 text-brand-dark' : 'bg-white/5 border-white/5 text-slate-500 group-hover:text-white'}`}>
                  <item.icon size={18} />
                </div>
                <div className="space-y-0.5">
                  <h4 className={`font-black text-[11px] leading-tight ${activeMetric === item.id ? 'text-brand-dark' : 'text-white'}`}>{item.label}</h4>
                  <p className={`text-[8px] font-bold uppercase tracking-tighter ${activeMetric === item.id ? 'text-brand-dark/60' : 'text-slate-600'}`}>{item.desc}</p>
                </div>
                {activeMetric === item.id && (
                  <motion.div layoutId="activeGlow" className="absolute inset-0 bg-white/10 pointer-events-none rounded-2xl" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Explorer Area - Now Full Width */}
        <div className="space-y-8">
           
           {/* Visual Controls (Chart Type) */}
           <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0a0a0b] border border-white/5 rounded-3xl">
              <div className="flex gap-2">
                {[
                  { id: 'bar', label: 'أعمدة', icon: BarChart3 },
                  { id: 'pie', label: 'دائري', icon: PieChartIcon },
                  { id: 'area', label: 'مساحة', icon: TrendingUp },
                  { id: 'line', label: 'خطي', icon: Activity }
                ].map(type => (
                  <button 
                    key={type.id}
                    onClick={() => setActiveChartType(type.id as ChartType)}
                    className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${activeChartType === type.id ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  >
                    <type.icon size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                  </button>
                ))}
              </div>
              <div className="hidden md:block h-6 w-px bg-white/5" />
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                 <Box size={14} className="text-brand-primary" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{chartData.length} نقاط بيانات معالجة</span>
              </div>
           </div>

           {/* The Canvas */}
           <motion.div 
             layout
             ref={chartRef}
             className="bg-[#0a0a0b] border border-white/5 rounded-[3rem] p-10 min-h-[500px] relative flex flex-col items-center justify-center shadow-inner"
           >
              {/* Background Aesthetic Watermark */}
              <div className="absolute top-10 left-10 pointer-events-none">
                 <p className="text-[8px] font-black text-white/5 uppercase tracking-[1em] whitespace-nowrap rotate-90 origin-left">INTEGRATED ANALYTICS ENGINE V9.4</p>
              </div>

              <div className="w-full h-[400px]" style={{ opacity: chartOpacity }}>
                 <ResponsiveContainer width="100%" height="100%">
                   {activeChartType === 'bar' ? (
                     <BarChart data={chartData}>
                       {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />}
                       <XAxis 
                         dataKey="name" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                         reversed={true}
                       />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} orientation="right" />
                       <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                       <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={barSize}>
                         {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Bar>
                     </BarChart>
                   ) : activeChartType === 'pie' ? (
                     <PieChart>
                       <Pie
                         data={chartData}
                         cx="50%"
                         cy="50%"
                         innerRadius={chartRadius * 1.2}
                         outerRadius={chartRadius * 1.6}
                         paddingAngle={8}
                         dataKey="value"
                         animationDuration={1000}
                       >
                         {chartData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                       </Pie>
                       <Tooltip content={<CustomTooltip />} />
                       <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-[10px] font-bold text-slate-500 mr-2">{v}</span>} />
                     </PieChart>
                   ) : activeChartType === 'area' ? (
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" />}
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} reversed={true} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                      </AreaChart>
                   ) : (
                     <LineChart data={chartData}>
                       {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" />}
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} reversed={true} />
                       <Tooltip content={<CustomTooltip />} />
                       <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={4} dot={{ r: 4, fill: '#38bdf8', strokeWidth: 2, stroke: '#0a0a0b' }} />
                     </LineChart>
                   )}
                 </ResponsiveContainer>
              </div>

              {/* Data Summary Legend */}
              <div className="mt-10 flex flex-wrap justify-center gap-6 border-t border-white/5 pt-8 w-full max-w-2xl">
                 {chartData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.name}</span>
                       <span className="text-xs font-black text-white">{d.value}</span>
                    </div>
                 ))}
              </div>
           </motion.div>
        </div>
      </div>

      {/* Dynamic Customization Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSettingsOpen(false)}
               className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              className="fixed top-0 right-0 h-full w-[400px] bg-[#0a0a0b] border-l border-white/10 z-[110] p-10 shadow-[-40px_0_100px_rgba(0,0,0,0.8)] flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all border border-white/10"
                >
                  <X />
                </button>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-white tracking-tight">مهندس الرسوم</h2>
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mt-1">Architecture Editor</p>
                </div>
              </div>

              <div className="space-y-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Visual Style */}
                <section>
                  <div className="flex items-center gap-2 justify-end mb-6">
                    <Palette size={14} className="text-brand-primary" />
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">نمط الإضاءة</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'vibrant', label: 'ألوان حية', desc: 'هوية متميزة' },
                      { id: 'minimal', label: 'هادئ', desc: 'تركيز عالي' }
                    ].map(mode => (
                      <button 
                        key={mode.id}
                        onClick={() => setThemeMode(mode.id as 'vibrant' | 'minimal')}
                        className={`p-5 rounded-3xl border transition-all text-right group ${themeMode === mode.id ? 'border-brand-primary bg-brand-primary/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}
                      >
                        <h5 className="text-sm font-black text-white mb-1">{mode.label}</h5>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{mode.desc}</p>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Dimensions */}
                <section>
                   <div className="flex items-center gap-2 justify-end mb-6">
                    <Box size={14} className="text-brand-primary" />
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">أبعاد التجسيم</label>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-3">
                        <span className="text-[10px] font-bold text-slate-500">{barSize}px</span>
                        <span className="text-[10px] font-black uppercase text-slate-400">سماكة الأعمدة</span>
                      </div>
                      <input 
                        type="range" min="10" max="80" value={barSize} 
                        onChange={(e) => setBarSize(Number(e.target.value))}
                        className="w-full accent-brand-primary h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-3">
                        <span className="text-[10px] font-bold text-slate-500">{chartRadius}px</span>
                        <span className="text-[10px] font-black uppercase text-slate-400">نطاق الدوائر / الرؤية</span>
                      </div>
                      <input 
                        type="range" min="30" max="100" value={chartRadius} 
                        onChange={(e) => setChartRadius(Number(e.target.value))}
                        className="w-full accent-brand-primary h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-3">
                        <span className="text-[10px] font-bold text-slate-500">{Math.round(chartOpacity * 100)}%</span>
                        <span className="text-[10px] font-black uppercase text-slate-400">شفافية البيانات</span>
                      </div>
                      <input 
                        type="range" min="0.2" max="1" step="0.1" value={chartOpacity} 
                        onChange={(e) => setChartOpacity(Number(e.target.value))}
                        className="w-full accent-brand-primary h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </section>

                {/* Toggles */}
                <section>
                  <div className="flex items-center gap-2 justify-end mb-6">
                    <Eye size={14} className="text-brand-primary" />
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">عناصر الواجهة</label>
                  </div>
                  <button 
                    onClick={() => setShowGrid(!showGrid)}
                    className={`w-full p-5 rounded-3xl border transition-all flex items-center justify-between ${showGrid ? 'border-brand-primary bg-brand-primary/5' : 'border-white/5 bg-white/[0.02]'}`}
                  >
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${showGrid ? 'bg-brand-primary text-brand-dark' : 'bg-slate-800'}`}>
                      {showGrid && <Check size={14} strokeWidth={4} />}
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">إظهار شبكة الخلفية المساعدة</span>
                  </button>
                </section>
              </div>

              <div className="pt-10 mt-10 border-t border-white/5 flex gap-4">
                <button 
                  onClick={exportCSV}
                  className="flex-1 py-5 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center gap-3 text-slate-400 hover:text-white hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest"
                >
                  <FileDown size={18} />
                  تصدير CSV
                </button>
                <button 
                   onClick={() => setSettingsOpen(false)}
                   className="flex-1 py-5 bg-brand-primary text-brand-dark rounded-3xl font-black text-xs uppercase tracking-widest shadow-[0_15px_30px_rgba(45,212,191,0.2)] hover:scale-105 transition-all"
                >
                  حفظ التفضيلات
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(45, 212, 191, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(45, 212, 191, 0.3); }
      `}} />
    </div>
  );
}

function X() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
