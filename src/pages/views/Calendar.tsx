import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  X, 
  Clock, 
  MapPin, 
  MoreVertical,
  Trash2,
  Edit2,
  PlusCircle,
  AlertCircle,
  Bell
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO,
  isToday
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useHieas, useConferences, useProjects } from '../../hooks/useData';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  type: 'meeting' | 'milestone' | 'deadline' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  ownerId: string;
  hieaId?: string;
  isExternal?: boolean;
  source?: string;
  reminder?: 'none' | '15m' | '1h' | '1d' | '1w';
}

const EVENT_TYPES = [
  { id: 'meeting', label: 'اجتماع', color: 'bg-blue-500' },
  { id: 'milestone', label: 'محطة مفصلية', color: 'bg-emerald-500' },
  { id: 'deadline', label: 'موعد نهائي', color: 'bg-amber-500' },
  { id: 'other', label: 'آخر', color: 'bg-slate-500' },
];

const PRIORITIES = [
  { id: 'low', label: 'منخفضة', color: 'text-slate-400' },
  { id: 'medium', label: 'متوسطة', color: 'text-blue-400' },
  { id: 'high', label: 'عالية', color: 'text-amber-400' },
  { id: 'critical', label: 'حرجة', color: 'text-red-400' },
];

export default function Calendar() {
  const { user } = useAuth();
  const { hieas } = useHieas();
  const { conferences } = useConferences();
  const { projects } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHieaIds, setSelectedHieaIds] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    type: 'meeting' as CalendarEvent['type'],
    priority: 'medium' as CalendarEvent['priority'],
    hieaId: '',
    reminder: 'none' as CalendarEvent['reminder']
  });

  const [activeNotification, setActiveNotification] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'calendar_events'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CalendarEvent[];
        setEvents(fetchedEvents);
        setLoading(false);
      },
      (error) => {
        console.error("Error in calendar_events listener:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const [showExternal, setShowExternal] = useState(true);
  const [externalEvents, setExternalEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchedConfs = conferences.map(conf => ({
      id: conf.id,
      title: conf.name,
      date: conf.startDate,
      startTime: '08:00',
      endTime: '17:00',
      type: 'meeting',
      isExternal: true,
      source: 'مؤتمر',
      hieaId: conf.hieaId
    }));

    const fetchedMilestones: any[] = [];
    projects.forEach(proj => {
      if (proj.milestones) {
        proj.milestones.forEach((m: any) => {
          if (m.dueDate) {
            fetchedMilestones.push({
              id: `${proj.id}-${m.title}`,
              title: `${proj.name}: ${m.title}`,
              date: m.dueDate,
              startTime: '00:00',
              endTime: '23:59',
              type: 'milestone',
              isExternal: true,
              source: 'مشروع',
              hieaId: proj.hieaId
            });
          }
        });
      }
    });

    setExternalEvents([...fetchedConfs, ...fetchedMilestones]);
  }, [conferences, projects]);

  const allEvents = showExternal ? [...events, ...externalEvents] : events;

  useEffect(() => {
    if (!user) return;

    const checkReminders = () => {
      const now = new Date();
      allEvents.forEach(event => {
        if (!event.reminder || event.reminder === 'none' || event.isExternal) return;
        
        const eventDate = new Date(`${event.date}T${event.startTime}`);
        let reminderTime = new Date(eventDate);

        switch (event.reminder) {
          case '15m': reminderTime.setMinutes(reminderTime.getMinutes() - 15); break;
          case '1h': reminderTime.setHours(reminderTime.getHours() - 1); break;
          case '1d': reminderTime.setDate(reminderTime.getDate() - 1); break;
          case '1w': reminderTime.setDate(reminderTime.getDate() - 7); break;
        }

        // Trigger if time matches and happened within last minute (simple check)
        const diff = now.getTime() - reminderTime.getTime();
        if (diff > 0 && diff < 60000) {
          setActiveNotification(event);
          
          // Browser Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("تذكير القمة الاستراتيجية", {
              body: `الحدث: ${event.title}\nالوقت: ${event.startTime}`,
              icon: "/favicon.ico"
            });
          }
        }
      });
    };

    // Request notification permission if not yet decided
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [allEvents, user]);
  const filteredEvents = selectedHieaIds.length === 0 
    ? allEvents 
    : allEvents.filter(e => e.hieaId && selectedHieaIds.includes(e.hieaId));

  const toggleHieaFilter = (id: string) => {
    setSelectedHieaIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const onDateClick = (day: Date) => {
    setSelectedDate(day);
    setFormData(prev => ({ ...prev, date: format(day, 'yyyy-MM-dd') }));
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const eventData = {
        ...formData,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'calendar_events', editingEvent.id), eventData);
      } else {
        await addDoc(collection(db, 'calendar_events'), eventData);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('حدث خطأ أثناء حفظ الفعالية');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفعالية؟')) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      type: event.type,
      priority: event.priority,
      hieaId: event.hieaId || '',
      reminder: event.reminder || 'none'
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      description: '',
      type: 'meeting',
      priority: 'medium',
      hieaId: '',
      reminder: 'none'
    });
  };

  // Calendar Components
  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 px-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
          <CalendarIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-100 font-display uppercase tracking-tight">التقويم الإستراتيجي</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Strategic Timeline Control</p>
            {selectedHieaIds.length > 0 && (
              <span className="text-[8px] bg-brand-primary/20 text-brand-primary px-2 py-0.5 font-black uppercase tracking-tighter rounded-full">
                {selectedHieaIds.length} هيئات مختارة
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 justify-end">
        <div className="flex flex-wrap items-center gap-2 max-w-[500px]">
          <button
            onClick={() => setSelectedHieaIds([])}
            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
              selectedHieaIds.length === 0 
              ? 'bg-brand-primary text-brand-dark' 
              : 'bg-white/5 text-slate-500 hover:bg-white/10'
            }`}
          >
            الكل
          </button>
          {hieas.map(h => {
             const isSelected = selectedHieaIds.includes(h.id);
             return (
               <button
                 key={h.id}
                 onClick={() => toggleHieaFilter(h.id)}
                 className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all border ${
                   isSelected 
                   ? 'bg-white/10 text-white border-brand-primary' 
                   : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'
                 }`}
                 style={{ borderColor: isSelected ? (h.color || '#4ade80') : 'transparent' }}
               >
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.color || '#4ade80' }} />
                   {h.name}
                 </div>
               </button>
             );
          })}
        </div>

        <div className="flex items-center bg-white/5 border border-white/10 p-1">
          <button
            onClick={() => setShowExternal(!showExternal)}
            className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
              showExternal 
              ? 'bg-brand-secondary text-brand-dark shadow-lg shadow-brand-secondary/20' 
              : 'text-slate-500 hover:text-white'
            }`}
          >
            {showExternal ? 'إخفاء الأحداث الخارجية' : 'عرض الأحداث الخارجية'}
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 border border-white/10">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <ChevronRight size={20} />
          </button>
          <span className="text-sm font-black text-slate-200 px-4 min-w-[140px] text-center uppercase tracking-widest">
            {format(currentDate, 'MMMM yyyy', { locale: ar })}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
        </div>

        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-brand-primary text-brand-dark px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)]"
        >
          <Plus size={16} />
          إضافة فعالية
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return (
      <div className="grid grid-cols-7 mb-4 border-b border-white/5 pb-4">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows: React.ReactNode[] = [];
    let days: React.ReactNode[] = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'yyyy-MM-dd');
        const dayEvents = filteredEvents.filter(e => e.date === formattedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = isSameDay(day, selectedDate);
        const isTodayDate = isToday(day);

        days.push(
          <div
            key={day.toString()}
            onClick={() => onDateClick(new Date(day))}
            className={`min-h-[140px] p-2 border border-white/5 transition-all cursor-pointer relative group ${
              !isCurrentMonth ? 'opacity-20 pointer-events-none' : 'hover:bg-white/[0.02]'
            } ${isSelected ? 'bg-brand-primary/[0.03] ring-1 ring-inset ring-brand-primary/20' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs font-black p-1 min-w-[24px] text-center ${
                isTodayDate ? 'bg-brand-primary text-brand-dark' : isSelected ? 'text-brand-primary' : 'text-slate-500'
              }`}>
                {format(day, 'd')}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-[8px] font-black text-slate-600 bg-white/5 px-1.5 py-0.5 uppercase tracking-tighter">
                  {dayEvents.length} APPT
                </span>
              )}
            </div>

            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => {
                const hiea = hieas.find(h => h.id === event.hieaId);
                const eventColor = hiea?.color || EVENT_TYPES.find(t => t.id === event.type)?.color.replace('bg-', '#').replace('blue-500', '#3b82f6').replace('emerald-500', '#10b981').replace('amber-500', '#f59e0b').replace('slate-500', '#64748b') || '#64748b';

                return (
                  <div 
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); !event.isExternal && openEditModal(event); }}
                    className={`text-[9px] px-2 py-1 truncate font-bold border-r-2 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${event.isExternal ? 'opacity-60 cursor-default' : ''}`}
                    style={{ borderColor: eventColor }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: eventColor }} />
                      {event.startTime} - {event.title}
                    </div>
                  </div>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-[8px] text-slate-600 font-bold px-2">
                  + {dayEvents.length - 3} إضافي
                </div>
              )}
            </div>
            
            <div className="absolute inset-0 border border-brand-primary/0 group-hover:border-brand-primary/10 pointer-events-none transition-all" />
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return <div className="border border-white/5">{rows}</div>;
  };

  const renderEventList = () => {
    const selectedDateEvents = filteredEvents
      .filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="glass p-8 border border-white/5 h-full flex flex-col bg-white/[0.01]">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <div className="text-right">
            <h3 className="text-xl font-bold text-slate-100">أجندة اليوم</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
              {format(selectedDate, 'EEEE, d MMMM', { locale: ar })}
            </p>
          </div>
          <div className="w-10 h-10 bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
            <Clock size={18} />
          </div>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map((event) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={event.id}
                className="group relative p-5 bg-white/5 border border-white/5 hover:border-brand-primary/30 transition-all text-right"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {!event.isExternal && (
                      <>
                        <button onClick={() => openEditModal(event)} className="p-1 text-slate-500 hover:text-brand-primary transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteEvent(event.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {event.isExternal && (
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{event.source}</span>
                    )}
                  </div>
                  <div className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                    EVENT_TYPES.find(t => t.id === event.type)?.color || 'bg-slate-500'
                  } text-white`}>
                    {EVENT_TYPES.find(t => t.id === event.type)?.label}
                  </div>
                </div>

                <h4 className="text-base font-bold text-slate-100 mb-2 truncate">{event.title}</h4>
                
                {event.hieaId && (
                  <div className="flex items-center justify-end gap-2 mb-3">
                    <span className="text-[9px] font-bold text-slate-500">
                      {hieas.find(h => h.id === event.hieaId)?.name}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hieas.find(h => h.id === event.hieaId)?.color || '#4ade80' }} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-end gap-2 text-slate-400">
                    <span className="text-[10px] font-black">{event.startTime} - {event.endTime}</span>
                    <Clock size={12} className="text-brand-primary" />
                  </div>
                  {event.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 italic">{event.description}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${
                    PRIORITIES.find(p => p.id === event.priority)?.color
                  }`}>
                    {PRIORITIES.find(p => p.id === event.priority)?.label} PRIORITY
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    PRIORITIES.find(p => p.id === event.priority)?.color.replace('text-', 'bg-')
                  }`} />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 border-2 border-dashed border-white/5">
              <CalendarIcon size={48} className="text-slate-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">No Scheduled Engagements</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="mt-8 w-full py-4 border border-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary/10 transition-all flex items-center justify-center gap-3 group"
        >
          <PlusCircle size={16} className="group-hover:rotate-90 transition-transform" />
          تحديد موعد جديد
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto min-h-screen pb-20" dir="rtl">
      {/* Notification Overlay */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 right-4 left-4 z-[100] flex justify-center pointer-events-none"
          >
            <div className="bg-brand-primary text-brand-dark p-6 border-b-4 border-brand-dark/20 flex items-center gap-6 shadow-[0_20px_50px_-10px_rgba(45,212,191,0.5)] pointer-events-auto">
              <div className="w-12 h-12 bg-black/10 flex items-center justify-center animate-pulse">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tighter">تذكير استراتيجي نشط</h3>
                <p className="text-xl font-bold font-display">{activeNotification.title}</p>
                <p className="text-[10px] font-black opacity-60">سيبدأ في: {activeNotification.startTime}</p>
              </div>
              <button 
                onClick={() => setActiveNotification(null)}
                className="bg-black/10 hover:bg-black/20 p-4 transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderHeader()}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          <div className="glass p-8 border border-white/5 bg-white/[0.01]">
            {renderDays()}
            {renderCells()}
          </div>
        </div>

        <div className="xl:col-span-1">
          {renderEventList()}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-brand-dark/90 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-brand-dark border border-white/10 shadow-2xl p-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 text-brand-primary/5 pointer-events-none">
                <CalendarIcon size={120} />
              </div>

              <div className="flex items-center justify-between mb-10 relative z-10 border-b border-white/5 pb-6">
                <div className="text-right">
                  <h3 className="text-2xl font-black text-slate-100">{editingEvent ? 'تعديل فعالية' : 'إضافة فعالية جديدة'}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Calendar Deployment Panel</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">عنوان الفعالية</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all font-bold"
                    placeholder="مثلاً: اجتماع اللجنة التوجيهية..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">التاريخ</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">البداية</label>
                      <input 
                        type="time" 
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">النهاية</label>
                      <input 
                        type="time" 
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">نوع الفعالية</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all appearance-none"
                    >
                      {EVENT_TYPES.map(type => (
                        <option key={type.id} value={type.id} className="bg-brand-dark">{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">الأولوية</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all appearance-none"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p.id} value={p.id} className="bg-brand-dark">{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">الهيئة الاستراتيجية المرتبطة</label>
                  <select 
                    value={formData.hieaId}
                    onChange={(e) => setFormData({ ...formData, hieaId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all appearance-none"
                  >
                    <option value="" className="bg-brand-dark">غير مرتبطة بهيئة</option>
                    {hieas.map(h => (
                      <option key={h.id} value={h.id} className="bg-brand-dark">{h.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">تذكير استراتيجي</label>
                  <select 
                    value={formData.reminder}
                    onChange={(e) => setFormData({ ...formData, reminder: e.target.value as any })}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all appearance-none"
                  >
                    <option value="none" className="bg-brand-dark">لا يوجد تذكير</option>
                    <option value="15m" className="bg-brand-dark">قبل 15 دقيقة</option>
                    <option value="1h" className="bg-brand-dark">قبل ساعة واحدة</option>
                    <option value="1d" className="bg-brand-dark">قبل يوم واحد</option>
                    <option value="1w" className="bg-brand-dark">قبل أسبوع واحد</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">ملاحظات إضافية</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all font-medium min-h-[120px] resize-none"
                    placeholder="اكتب أي تفاصيل أخرى هنا..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-brand-primary text-brand-dark font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {editingEvent ? 'تحديث الفعالية المصنفة' : 'تأكيد الحجز الزمني للمرة الأولى'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
