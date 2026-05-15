import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  X, 
  Clock, 
  Trash2,
  Edit2,
  PlusCircle,
  Bell,
  Search,
  LayoutGrid,
  List as ListIcon,
  Filter,
  CheckCircle2,
  Circle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Star,
  Flag,
  Target,
  Users,
  Coffee,
  MessageSquare,
  Zap,
  TrendingUp,
  MapPin
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
  isToday,
  parseISO,
  eachDayOfInterval
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
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useHieas, useConferences, useProjects } from '../../hooks/useData';
import ProjectIcon from '../../components/ProjectIcon';
import { Milestone } from '../../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  hieaIds?: string[];
  isExternal?: boolean;
  source?: string;
  reminder?: 'none' | '15m' | '1h' | '1d' | '1w';
  isCompleted?: boolean;
  icon?: string;
  color?: string;
  isSpan?: boolean;
  spanStart?: string;
  spanEnd?: string;
  projectId?: string;
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

const AVAILABLE_ICONS = [
  { id: 'Star', icon: Star },
  { id: 'Flag', icon: Flag },
  { id: 'Target', icon: Target },
  { id: 'Users', icon: Users },
  { id: 'Coffee', icon: Coffee },
  { id: 'MessageSquare', icon: MessageSquare },
  { id: 'Zap', icon: Zap },
  { id: 'TrendingUp', icon: TrendingUp },
  { id: 'MapPin', icon: MapPin },
];

export default function Calendar() {
  const { user, profile, linkGoogleCalendar } = useAuth();
  const { settings } = useUI();
  const { hieas } = useHieas();
  const { conferences } = useConferences();
  const { projects } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem('calendar_selectedProjectId');
    return saved || 'all';
  });
  const [selectedHieaIds, setSelectedHieaIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('calendar_selectedHieaIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [viewMode, setViewMode] = useState<'grid' | 'agenda' | 'week' | 'timeline'>(() => {
    const saved = localStorage.getItem('calendar_viewMode');
    return (saved as 'grid' | 'agenda' | 'week' | 'timeline') || settings.defaultCalendarView || 'grid';
  });
  const [focusEventId, setFocusEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>(() => {
    const saved = localStorage.getItem('calendar_filterPriority');
    return saved || 'all';
  });
  const [showExternal, setShowExternal] = useState<boolean>(() => {
    const saved = localStorage.getItem('calendar_showExternal');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('calendar_selectedProjectId', selectedProjectId);
    localStorage.setItem('calendar_selectedHieaIds', JSON.stringify(selectedHieaIds));
    localStorage.setItem('calendar_viewMode', viewMode);
    localStorage.setItem('calendar_filterPriority', filterPriority);
    localStorage.setItem('calendar_showExternal', JSON.stringify(showExternal));
  }, [selectedProjectId, selectedHieaIds, viewMode, filterPriority, showExternal]);

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
    reminder: 'none' as CalendarEvent['reminder'],
    isCompleted: false,
    icon: 'Star'
  });

  const [activeNotification, setActiveNotification] = useState<CalendarEvent | null>(null);

  const fetchGoogleEvents = async () => {
    const token = sessionStorage.getItem('google_calendar_token');
    if (!token) return;

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const googleEvents: CalendarEvent[] = (data.items || []).map((item: { 
          id: string; 
          summary?: string; 
          start: { dateTime?: string; date?: string }; 
          end: { dateTime?: string; date?: string }; 
          description?: string 
        }) => {
          const startDate = item.start.dateTime || item.start.date || '';
          return {
            id: item.id,
            title: item.summary || 'بدون عنوان',
            date: startDate.split('T')[0],
            startTime: item.start.dateTime ? format(new Date(item.start.dateTime), 'HH:mm') : '00:00',
            endTime: item.end.dateTime ? format(new Date(item.end.dateTime), 'HH:mm') : '23:59',
            description: item.description || '',
            type: 'other' as CalendarEvent['type'],
            priority: 'medium' as CalendarEvent['priority'],
            ownerId: user?.uid || '',
            isExternal: true,
            source: 'Google Calendar'
          };
        });
        setEvents(prev => [...prev.filter(e => e.source !== 'Google Calendar'), ...googleEvents]);
      } else if (response.status === 401) {
        // Token expired
        sessionStorage.removeItem('google_calendar_token');
      }
    } catch (err) {
      console.error('Error fetching Google events:', err);
    }
  };

  useEffect(() => {
    if (profile?.integrations?.googleCalendar?.linked) {
      const token = sessionStorage.getItem('google_calendar_token');
      if (token) {
        fetchGoogleEvents();
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'calendar_events'), 
      where('ownerId', '==', user.uid),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CalendarEvent[];
      setEvents(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'calendar_events');
    });

    return () => unsubscribe();
  }, [user]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const fetchedConfs: CalendarEvent[] = conferences.map(conf => ({
      id: conf.id,
      title: conf.name,
      date: conf.startDate,
      startTime: '08:00',
      endTime: '17:00',
      description: conf.description || '',
      type: 'meeting',
      priority: 'medium',
      ownerId: conf.ownerId,
      isExternal: true,
      source: 'مؤتمر',
      hieaId: conf.hieaId,
      hieaIds: conf.hieaIds || (conf.hieaId ? [conf.hieaId] : [])
    }));

    const fetchedMilestones: CalendarEvent[] = [];
    const fetchedProjects: CalendarEvent[] = [];

    projects.forEach(proj => {
      const projectHieaIds = proj.hieaIds || (proj.hieaId ? [proj.hieaId] : []);
      
      // Represent Project Period as events for each day
      if (proj.startDate && proj.endDate) {
        try {
          const start = parseISO(proj.startDate);
          const end = parseISO(proj.endDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const daysInRange = eachDayOfInterval({ start, end });
            
            daysInRange.forEach(dayDate => {
              fetchedProjects.push({
                id: `${proj.id}-span-${format(dayDate, 'yyyy-MM-dd')}`,
                title: `فترة المشروع: ${proj.name}`,
                date: format(dayDate, 'yyyy-MM-dd'),
                startTime: '00:00',
                endTime: '23:59',
                description: proj.description || '',
                type: 'other',
                priority: 'medium',
                ownerId: proj.ownerId,
                isExternal: true,
                source: 'مشروع',
                hieaId: proj.hieaId,
                hieaIds: projectHieaIds,
                color: proj.color,
                icon: proj.icon,
                // Add metadata for span rendering
                isSpan: true,
                spanStart: proj.startDate,
                spanEnd: proj.endDate,
                projectId: proj.id
              });
            });
          }
        } catch (e) {
          console.error("Error creating project span events", e);
        }
      } else if (proj.startDate) {
        // Fallback to start event if end date is missing
        fetchedProjects.push({
          id: `${proj.id}-start`,
          title: `بداية مشروع: ${proj.name}`,
          date: proj.startDate,
          startTime: '08:00',
          endTime: '09:00',
          description: proj.description || '',
          type: 'other',
          priority: 'medium',
          ownerId: proj.ownerId,
          isExternal: true,
          source: 'مشروع',
          hieaId: proj.hieaId,
          hieaIds: projectHieaIds,
          color: proj.color,
          icon: proj.icon
        });
      }

      if (proj.milestones) {
        proj.milestones.forEach((m: Milestone) => {
          const mDate = m.date;
          if (mDate) {
            fetchedMilestones.push({
              id: `${proj.id}-${m.id}`,
              title: `${proj.name}: ${m.title}`,
              date: mDate,
              startTime: '00:00',
              endTime: '23:59',
              description: '',
              type: 'milestone',
              priority: 'high',
              ownerId: proj.ownerId,
              isExternal: true,
              source: 'مشروع',
              hieaId: proj.hieaId,
              hieaIds: projectHieaIds,
              color: proj.color
            });
          }
        });
      }
    });

    setExternalEvents([...fetchedConfs, ...fetchedMilestones, ...fetchedProjects]);
  }, [conferences, projects]);

  const allEvents = showExternal ? [...events, ...externalEvents] : events;

  useEffect(() => {
    if (!user) return;

    const checkReminders = () => {
      const now = new Date();
      allEvents.forEach(event => {
        if (!event.reminder || event.reminder === 'none' || event.isExternal) return;
        
        const eventDateStr = `${event.date}T${event.startTime}`;
        const eventDate = new Date(eventDateStr);
        if (isNaN(eventDate.getTime())) return;

        const reminderTime = new Date(eventDate);

        switch (event.reminder) {
          case '15m': reminderTime.setMinutes(reminderTime.getMinutes() - 15); break;
          case '1h': reminderTime.setHours(reminderTime.getHours() - 1); break;
          case '1d': reminderTime.setDate(reminderTime.getDate() - 1); break;
          case '1w': reminderTime.setDate(reminderTime.getDate() - 7); break;
        }

        const diff = now.getTime() - reminderTime.getTime();
        if (diff > 0 && diff < 60000) {
          setActiveNotification(event);
          
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("تذكير القمة الاستراتيجية", {
              body: `الحدث: ${event.title}\nالوقت: ${event.startTime}`,
              icon: "/favicon.ico"
            });
          }
        }
      });
    };

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [allEvents, user]);

  const filteredEvents = allEvents.filter(e => {
    // Project Filter
    const matchesProject = selectedProjectId === 'all' || 
      e.projectId === selectedProjectId;

    // HIEA Filter
    const matchesHiea = selectedHieaIds.length === 0 || 
      (e.hieaIds && e.hieaIds.some(id => selectedHieaIds.includes(id))) ||
      (e.hieaId && selectedHieaIds.includes(e.hieaId));
    
    // Priority Filter
    const matchesPriority = filterPriority === 'all' || e.priority === filterPriority;

    // Search Filter
    const matchesSearch = searchQuery === '' || 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesProject && matchesHiea && matchesPriority && matchesSearch;
  });

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
        updatedAt: serverTimestamp()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'calendar_events', editingEvent.id), eventData);
      } else {
        const docRef = await addDoc(collection(db, 'calendar_events'), {
          ...eventData,
          createdAt: serverTimestamp()
        });
        if (formData.priority === 'critical') {
            setFocusEventId(docRef.id);
        }
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'calendar_events');
    }
  };

  const rescheduleEvent = async (event: CalendarEvent, days: number) => {
    if (event.isExternal) return;
    try {
      const newDate = addDays(parseISO(event.date), days);
      await updateDoc(doc(db, 'calendar_events', event.id), {
        date: format(newDate, 'yyyy-MM-dd'),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `calendar_events/${event.id}`);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفعالية؟')) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', eventId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `calendar_events/${eventId}`);
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
      reminder: event.reminder || 'none',
      isCompleted: event.isCompleted || false,
      icon: event.icon || 'Star'
    });
    setIsModalOpen(true);
  };

  const toggleEventCompletion = async (event: CalendarEvent) => {
    if (event.isExternal) return;
    try {
      await updateDoc(doc(db, 'calendar_events', event.id), {
        isCompleted: !event.isCompleted,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `calendar_events/${event.id}`);
    }
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
      reminder: 'none',
      isCompleted: false,
      icon: 'Star'
    });
  };

  // Calendar Components
  const renderHeader = () => (
    <div className="flex flex-col mb-10 gap-8 px-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
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

        <div className="flex flex-wrap items-center gap-4">
           {/* Search Bar */}
           <div className="relative group w-full md:w-auto">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-primary transition-colors" />
            <input 
              type="text"
              placeholder="بحث في الأحداث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 px-10 py-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-brand-primary transition-all w-full md:w-64"
            />
          </div>

          <div className="flex items-center bg-white/5 border border-white/10 p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-all ${viewMode === 'grid' ? 'bg-brand-primary text-brand-dark' : 'text-slate-500 hover:text-slate-300'}`}
              title="عرض الشبكة (شهري)"
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`p-2 transition-all ${viewMode === 'week' ? 'bg-brand-primary text-brand-dark' : 'text-slate-500 hover:text-slate-300'}`}
              title="عرض أسبوعي"
            >
              <span className="text-[10px] font-black px-1">W</span>
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={`p-2 transition-all ${viewMode === 'timeline' ? 'bg-brand-primary text-brand-dark' : 'text-slate-500 hover:text-slate-300'}`}
              title="عرض المسارات (Timeline)"
            >
              <Clock size={16} />
            </button>
            <button 
              onClick={() => setViewMode('agenda')}
              className={`p-2 transition-all ${viewMode === 'agenda' ? 'bg-brand-primary text-brand-dark' : 'text-slate-500 hover:text-slate-300'}`}
              title="عرض الأجندة"
            >
              <ListIcon size={16} />
            </button>
          </div>

          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-brand-primary text-brand-dark px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)]"
          >
            <Plus size={16} />
            إضافة فعالية
          </button>

          {profile?.integrations?.googleCalendar?.linked && !sessionStorage.getItem('google_calendar_token') && (
            <button 
              onClick={linkGoogleCalendar}
              className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all text-slate-300"
            >
              <RefreshCw size={14} className="text-brand-primary" />
              مزامنة تقويم Google
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-y border-white/5 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
            <Filter size={10} />
            تصفية المبادرات:
          </div>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest px-4 py-1.5 outline-none focus:border-brand-primary transition-colors appearance-none cursor-pointer text-slate-400 hover:text-white"
          >
            <option value="all" className="bg-brand-dark">كل المشاريع</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} className="bg-brand-dark">{p.name}</option>
            ))}
          </select>

          <div className="w-px h-6 bg-white/5 mx-2" />

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
            <Filter size={10} />
            تصفية الهيئات:
          </div>
          <button
            onClick={() => setSelectedHieaIds([])}
            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
              selectedHieaIds.length === 0 
              ? 'bg-brand-primary text-brand-dark' 
              : 'bg-white/5 text-slate-500 hover:bg-white/10'
            }`}
          >
            جميع الهيئات
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

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-white/5 border border-white/10 p-1">
            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent border-none outline-none text-[9px] text-slate-400 font-black uppercase tracking-widest px-4 py-1 appearance-none cursor-pointer hover:text-slate-200 transition-colors"
            >
              <option value="all" className="bg-brand-dark">جميع الأولويات</option>
              {PRIORITIES.map(p => (
                <option key={p.id} value={p.id} className="bg-brand-dark">{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExternal(!showExternal)}
              className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                showExternal 
                ? 'bg-brand-secondary text-brand-dark shadow-lg shadow-brand-secondary/20' 
                : 'text-slate-500 hover:text-white'
              }`}
            >
              {showExternal ? 'إخفاء الخارجي' : 'عرض الخارجي'}
            </button>

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
          </div>
        </div>
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

  const renderAgendaView = () => {
    const upcomingEvents = [...filteredEvents].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return (
      <div className="space-y-6">
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event, idx) => {
            const isSpan = event.isSpan;
            const isSpanStart = isSpan && event.spanStart === event.date;
            const isFirstInDay = idx === 0 || upcomingEvents[idx - 1].date !== event.date;
            
            // Only show span events in agenda if they are the start, or if we are filtering by that project
            if (isSpan && !isSpanStart && selectedProjectId === 'all') return null;

            const eventHieaIds = event.hieaIds || (event.hieaId ? [event.hieaId] : []);
            const firstHiea = hieas.find(h => eventHieaIds.includes(h.id));
            const eventColor = event.color || firstHiea?.color || EVENT_TYPES.find(t => t.id === event.type)?.color.replace('bg-', '#').replace('blue-500', '#3b82f6').replace('emerald-500', '#10b981').replace('amber-500', '#f59e0b').replace('slate-500', '#64748b') || '#64748b';

            return (
              <div key={event.id} className="flex flex-col md:flex-row gap-4 md:gap-8 border-b border-white/5 pb-6">
                {(isFirstInDay) && (
                  <div className="w-full md:w-48 shrink-0">
                    <div className="sticky top-4">
                      <div className="text-sm font-black text-brand-primary uppercase tracking-widest">{format(new Date(event.date), 'EEEE', { locale: ar })}</div>
                      <div className="text-3xl font-black text-white mt-1">{format(new Date(event.date), 'd MMMM', { locale: ar })}</div>
                    </div>
                  </div>
                )}
                {(!isFirstInDay) && <div className="hidden md:block w-48 shrink-0" />}

                <div className="flex-1">
                  <div className={`p-6 bg-white/5 border-r-4 border-white/10 hover:bg-white/[0.07] transition-all relative group ${event.isCompleted ? 'opacity-50' : ''} ${event.isExternal ? 'border-dashed' : ''} ${isSpan ? 'bg-brand-primary/[0.02]' : ''}`} style={{ borderRightColor: eventColor }}>
                    {event.isExternal && (
                      <div className="absolute top-0 left-0 bg-white/5 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 border-b border-r border-white/10">
                        <ExternalLink size={10} />
                        <span>{isSpan ? 'مدة المبادرة' : `منسق من ${event.source}`}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500">{event.startTime} - {event.endTime}</div>
                        <div className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                          EVENT_TYPES.find(t => t.id === event.type)?.color || 'bg-slate-500'
                        } text-white`}>
                          {EVENT_TYPES.find(t => t.id === event.type)?.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {!event.isExternal && (
                          <>
                            <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 border border-white/5">
                               <button onClick={(e) => { e.stopPropagation(); rescheduleEvent(event, 1); }} className="text-[10px] font-black text-brand-secondary hover:text-white" title="تأجيل لغد">+1ي</button>
                               <button onClick={(e) => { e.stopPropagation(); rescheduleEvent(event, 7); }} className="text-[10px] font-black text-brand-secondary hover:text-white" title="تأجيل لأسبوع">+1أ</button>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setFocusEventId(focusEventId === event.id ? null : event.id); }} 
                              className={`p-1.5 transition-colors ${focusEventId === event.id ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                            >
                               <Star size={16} fill={focusEventId === event.id ? "currentColor" : "none"} />
                            </button>
                            <button onClick={() => toggleEventCompletion(event)} className="p-1.5 text-slate-500 hover:text-brand-primary transition-colors">
                              {event.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </button>
                            <button onClick={() => openEditModal(event)} className="p-1.5 text-slate-500 hover:text-brand-primary transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       {event.icon && <ProjectIcon name={event.icon} size={16} className="text-brand-primary" />}
                       <h4 className={`text-xl font-black text-white mb-2 ${event.isCompleted ? 'line-through decoration-brand-primary decoration-2' : ''}`}>{event.title}</h4>
                    </div>
                    {event.description && <p className="text-xs text-slate-400 leading-relaxed mb-4 max-w-2xl">{event.description}</p>}

                    <div className="flex flex-wrap gap-4 items-center">
                      {(event.hieaIds || (event.hieaId ? [event.hieaId] : [])).map(hid => {
                        const h = hieas.find(x => x.id === hid);
                        if (!h) return null;
                        return (
                          <div key={hid} className="flex items-center gap-2 bg-white/5 px-2 py-1 border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.color || '#4ade80' }} />
                            <span className="text-[10px] font-bold text-slate-400">{h.name}</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-2 ml-auto">
                        <span className={`text-[9px] font-black uppercase tracking-tighter ${
                          PRIORITIES.find(p => p.id === event.priority)?.color
                        }`}>
                          {PRIORITIES.find(p => p.id === event.priority)?.label} PRIORITY
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          PRIORITIES.find(p => p.id === event.priority)?.color.replace('text-', 'bg-')
                        }`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-40 text-center opacity-30 border-2 border-dashed border-white/5">
            <AlertCircle size={48} className="mx-auto mb-4 text-slate-500" />
            <div className="text-[10px] font-black uppercase tracking-[0.4em]">لا توجد أحداث مطابقة للبحث</div>
          </div>
        )}
      </div>
    );
  };

  const renderStats = () => {
    const statsByType = EVENT_TYPES.map(type => ({
      ...type,
      count: filteredEvents.filter(e => e.type === type.id).length
    }));

    const statsByPriority = PRIORITIES.map(p => ({
      ...p,
      count: filteredEvents.filter(e => e.priority === p.id).length
    }));

    const completed = filteredEvents.filter(e => e.isCompleted).length;
    const total = filteredEvents.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <div className="space-y-8">
        {/* Completion Overview */}
        <div className="bg-white/[0.02] border border-white/5 p-6 text-right">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">معدل الإنجاز الاستراتيجي</span>
            <span className="text-2xl font-black text-brand-primary">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-l from-brand-primary to-brand-secondary"
            />
          </div>
          <p className="text-[9px] text-slate-600 font-bold">{completed} من أصل {total} فعاليات مكتملة</p>
        </div>

        {/* Stats by Type */}
        <div className="space-y-4">
          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">توزيع الفعاليات (حسب النوع)</h5>
          <div className="grid grid-cols-2 gap-3">
            {statsByType.map(stat => (
              <div key={stat.id} className="bg-white/5 p-3 border border-white/5">
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-white">{stat.count}</span>
                  <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats by Priority */}
        <div className="space-y-4">
          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">تحليل الأولويات</h5>
          <div className="space-y-2">
            {statsByPriority.map(stat => (
              <div key={stat.id} className="flex items-center justify-between bg-white/[0.01] px-4 py-2 border border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${stat.color.replace('text-', 'bg-')}`} />
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${stat.color}`}>{stat.label}</span>
                </div>
                <span className="text-sm font-black text-slate-300">{stat.count}</span>
              </div>
            ))}
          </div>
        </div>
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
              {dayEvents.slice(0, 5).map((event) => {
                const eventHieaIds = event.hieaIds || (event.hieaId ? [event.hieaId] : []);
                const firstHiea = hieas.find(h => eventHieaIds.includes(h.id));
                const eventColor = event.color || firstHiea?.color || EVENT_TYPES.find(t => t.id === event.type)?.color.replace('bg-', '#').replace('blue-500', '#3b82f6').replace('emerald-500', '#10b981').replace('amber-500', '#f59e0b').replace('slate-500', '#64748b') || '#64748b';
                const isSpan = event.isSpan;
                const isSpanStart = isSpan && event.spanStart === formattedDate;
                const isSpanEnd = isSpan && event.spanEnd === formattedDate;

                return (
                  <div 
                    key={event.id}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (!event.isExternal) openEditModal(event); 
                    }}
                    className={`text-[9px] px-2 py-1 truncate font-bold transition-colors relative group/event ${event.isExternal ? 'cursor-default' : ''} ${event.isCompleted ? 'line-through opacity-40' : ''} ${
                      isSpan 
                      ? 'text-white' 
                      : 'border-r-2 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    style={{ 
                      borderRightColor: isSpan ? 'transparent' : eventColor,
                      backgroundColor: isSpan ? `${eventColor}40` : undefined,
                      borderTopRightRadius: isSpanStart ? '4px' : '0',
                      borderBottomRightRadius: isSpanStart ? '4px' : '0',
                      borderTopLeftRadius: isSpanEnd ? '4px' : '0',
                      borderBottomLeftRadius: isSpanEnd ? '4px' : '0',
                      marginRight: isSpan && !isSpanStart ? '-8px' : '0',
                      marginLeft: isSpan && !isSpanEnd ? '-8px' : '0',
                      paddingRight: isSpan && !isSpanStart ? '10px' : '8px',
                      paddingLeft: isSpan && !isSpanEnd ? '10px' : '8px',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {event.isExternal ? (
                        event.source === 'مشروع' ? (
                          isSpan ? (
                            isSpanStart ? <ProjectIcon name={event.icon} size={10} className="shrink-0" /> : null
                          ) : (
                            <ProjectIcon name={event.icon} size={10} className="shrink-0" style={{ color: eventColor }} />
                          )
                        ) : (
                          <ExternalLink size={10} className="text-slate-600 shrink-0" />
                        )
                      ) : (
                        event.isCompleted ? <CheckCircle2 size={10} className="text-brand-primary shrink-0" /> : <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: eventColor }} />
                      )}
                      <span className="truncate">
                        {isSpan ? (isSpanStart ? event.title : '...') : `${event.startTime} - ${event.title}`}
                      </span>
                    </div>

                    {/* Enhanced Tooltip */}
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-4 bg-brand-dark border border-white/10 shadow-2xl opacity-0 group-hover/event:opacity-100 pointer-events-none transition-all z-20">
                      <div className="text-[8px] font-black text-brand-primary uppercase mb-2">{event.startTime} - {event.endTime}</div>
                      <div className="text-[10px] font-black text-white mb-2 leading-tight">{event.title}</div>
                      {event.description && <div className="text-[8px] text-slate-500 line-clamp-3 mb-2">{event.description}</div>}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className={`text-[7px] font-black uppercase ${PRIORITIES.find(p => p.id === event.priority)?.color}`}>
                          {PRIORITIES.find(p => p.id === event.priority)?.label}
                        </span>
                        {focusEventId === event.id && <Star size={8} className="text-amber-400" fill="currentColor" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              {dayEvents.length > 5 && (
                <div className="text-[8px] text-slate-600 font-bold px-2">
                  + {dayEvents.length - 5} إضافي
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

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart)
    });

    return (
      <div className="grid grid-cols-7 border border-white/5">
        {weekDays.map(day => {
          const formattedDate = format(day, 'yyyy-MM-dd');
          const dayEvents = filteredEvents.filter(e => e.date === formattedDate);
          
          return (
            <div key={day.toString()} className="min-h-[500px] border-l border-white/5 last:border-l-0">
              <div className={`p-4 text-center border-b border-white/5 ${isToday(day) ? 'bg-brand-primary/10' : ''}`}>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{format(day, 'EEEE', { locale: ar })}</div>
                <div className={`text-xl font-black mt-1 ${isToday(day) ? 'text-brand-primary' : 'text-white'}`}>{format(day, 'd')}</div>
              </div>
              <div className="p-2 space-y-2">
                {dayEvents.map(event => {
                  const isSpan = event.isSpan;
                  if (isSpan && selectedProjectId === 'all') return null;

                  const eventHieaIds = event.hieaIds || (event.hieaId ? [event.hieaId] : []);
                  const firstHiea = hieas.find(h => eventHieaIds.includes(h.id));
                  const eventColor = event.color || firstHiea?.color || EVENT_TYPES.find(t => t.id === event.type)?.color.replace('bg-', '#').replace('blue-500', '#3b82f6').replace('emerald-500', '#10b981').replace('amber-500', '#f59e0b').replace('slate-500', '#64748b') || '#64748b';
                  
                  return (
                    <motion.div 
                      key={event.id}
                      onClick={() => !event.isExternal && openEditModal(event)}
                      className={`p-3 border-r-2 cursor-pointer transition-all ${isSpan ? 'bg-brand-primary/10 hover:bg-brand-primary/20' : 'bg-white/5 hover:bg-white/10'}`}
                      style={{ borderRightColor: eventColor }}
                    >
                      <div className="text-[8px] font-black text-slate-500 uppercase mb-1">{isSpan ? 'مدة المبادرة' : event.startTime}</div>
                      <div className="text-[10px] font-bold text-white truncate">{event.title}</div>
                      <div className="flex gap-1 mt-2">
                        {!event.isExternal && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); rescheduleEvent(event, 1); }}
                            className="text-[8px] font-black text-brand-secondary hover:text-white"
                          >
                            +1 يوم
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimelineView = () => {
    const timelineStart = startOfMonth(currentDate);
    const timelineEnd = endOfMonth(currentDate);
    const timelineDays = eachDayOfInterval({ start: timelineStart, end: timelineEnd });

    return (
      <div className="overflow-x-auto custom-scrollbar pb-4">
        <div className="inline-flex min-w-full border border-white/5">
          {timelineDays.map(day => {
            const formattedDate = format(day, 'yyyy-MM-dd');
            const dayEvents = filteredEvents.filter(e => e.date === formattedDate);

            return (
              <div key={day.toString()} className="w-48 shrink-0 border-l border-white/5 last:border-l-0">
                <div className={`p-4 text-center border-b border-white/5 ${isToday(day) ? 'bg-brand-primary/10' : ''}`}>
                  <div className="text-[9px] font-black text-slate-500 uppercase">{format(day, 'EEE', { locale: ar })}</div>
                  <div className="text-lg font-black text-white">{format(day, 'd')}</div>
                </div>
                <div className="p-3 space-y-3 min-h-[400px]">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      onClick={() => !event.isExternal && openEditModal(event)}
                      className="p-3 bg-white/5 border border-white/10 text-right cursor-pointer hover:border-brand-primary transition-all shadow-lg"
                    >
                      <div className="text-[8px] font-black text-brand-primary mb-1">{event.startTime}</div>
                      <div className="text-[10px] font-bold text-slate-100 leading-relaxed">{event.title}</div>
                    </div>
                  ))}
                  {dayEvents.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-5">
                      <div className="w-px h-20 bg-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEventList = () => {
    const selectedDateEvents = filteredEvents
      .filter(e => {
        const isSpan = e.isSpan;
        if (isSpan && e.spanStart !== format(selectedDate, 'yyyy-MM-dd') && selectedProjectId === 'all') return false;
        return e.date === format(selectedDate, 'yyyy-MM-dd');
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="flex flex-col gap-8 h-full">
        <div className="glass p-8 border border-white/5 flex flex-col bg-white/[0.01]">
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

          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-6">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={event.id}
                  className={`group relative p-5 bg-white/5 border border-white/5 hover:border-brand-primary/30 transition-all text-right ${event.isCompleted ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {!event.isExternal && (
                        <>
                          <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 border border-white/5">
                             <button onClick={(e) => { e.stopPropagation(); rescheduleEvent(event, 1); }} className="text-[10px] font-black text-brand-secondary hover:text-white" title="تأجيل لغد">+1ي</button>
                             <button onClick={(e) => { e.stopPropagation(); rescheduleEvent(event, 7); }} className="text-[10px] font-black text-brand-secondary hover:text-white" title="تأجيل لأسبوع">+1أ</button>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setFocusEventId(focusEventId === event.id ? null : event.id); }} 
                            className={`p-1 transition-colors ${focusEventId === event.id ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                          >
                             <Star size={14} fill={focusEventId === event.id ? "currentColor" : "none"} />
                          </button>
                          <button onClick={() => toggleEventCompletion(event)} className="p-1 text-slate-500 hover:text-brand-primary transition-colors">
                            {event.isCompleted ? <CheckCircle2 size={14} className="text-brand-primary" /> : <Circle size={14} />}
                          </button>
                          <button onClick={() => openEditModal(event)} className="p-1 text-slate-500 hover:text-brand-primary transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteEvent(event.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {event.isExternal && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/5 text-slate-500">
                          <ExternalLink size={10} />
                          <span className="text-[8px] font-black uppercase tracking-widest">{event.source}</span>
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                      EVENT_TYPES.find(t => t.id === event.type)?.color || 'bg-slate-500'
                    } text-white`}>
                      {EVENT_TYPES.find(t => t.id === event.type)?.label}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-sm font-bold text-slate-100 mb-2 truncate ${event.isCompleted ? 'line-through' : ''}`}>{event.title}</h4>
                    {event.icon && <ProjectIcon name={event.icon} size={14} className="text-brand-secondary" />}
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 text-slate-400">
                    <span className="text-[10px] font-black">{event.startTime} - {event.endTime}</span>
                    <Clock size={12} className="text-brand-primary" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 opacity-20 border border-dashed border-white/10">
                <CalendarIcon size={32} className="text-slate-500 mb-2" />
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">لا توجد مواعيد</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="w-full py-4 border border-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary/10 transition-all flex items-center justify-center gap-3 group"
          >
            <PlusCircle size={16} className="group-hover:rotate-90 transition-transform" />
            تحديد موعد جديد
          </button>
        </div>

        {renderStats()}
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
          <div className="glass p-8 border border-white/5 bg-white/[0.01] min-h-[600px]">
            {viewMode === 'grid' && (
              <>
                {renderDays()}
                {renderCells()}
              </>
            )}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'timeline' && renderTimelineView()}
            {viewMode === 'agenda' && renderAgendaView()}
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
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as CalendarEvent['type'] })}
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
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as CalendarEvent['priority'] })}
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

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">حالة الفعالية</label>
                    <div 
                      onClick={() => setFormData({ ...formData, isCompleted: !formData.isCompleted })}
                      className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 cursor-pointer hover:bg-white/10 transition-all group"
                    >
                      {formData.isCompleted ? (
                        <CheckCircle2 size={20} className="text-brand-primary" />
                      ) : (
                        <Circle size={20} className="text-slate-600 group-hover:text-slate-400" />
                      )}
                      <span className={`text-sm font-bold ${formData.isCompleted ? 'text-brand-primary' : 'text-slate-500'}`}>
                        {formData.isCompleted ? 'تم الإنجاز بنجاح' : 'قيد الانتظار'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">تذكير استراتيجي</label>
                    <select 
                      value={formData.reminder}
                      onChange={(e) => setFormData({ ...formData, reminder: e.target.value as CalendarEvent['reminder'] })}
                      className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all appearance-none"
                    >
                      <option value="none" className="bg-brand-dark">بدون تذكير</option>
                      <option value="15m" className="bg-brand-dark">قبل 15 دقيقة</option>
                      <option value="1h" className="bg-brand-dark">قبل ساعة واحدة</option>
                      <option value="1d" className="bg-brand-dark">قبل يوم واحد</option>
                      <option value="1w" className="bg-brand-dark">قبل أسبوع واحد</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">ملاحظات إضافية</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 text-sm text-slate-100 outline-none focus:border-brand-primary transition-all font-medium min-h-[100px] resize-none"
                    placeholder="اكتب أي تفاصيل أخرى هنا..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">أيقونة الفعالية</label>
                  <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10">
                    {AVAILABLE_ICONS.map(i => {
                      const IconComp = i.icon;
                      return (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: i.id })}
                          className={`p-3 transition-all ${formData.icon === i.id ? 'bg-brand-primary text-brand-dark' : 'bg-white/5 text-slate-500 hover:text-slate-200'}`}
                        >
                          <IconComp size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="submit"
                    className="flex-[2] py-5 bg-brand-primary text-brand-dark font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {editingEvent ? 'حفظ التعديلات الإستراتيجية' : 'تأكيد الحجز الزمني للفعالية'}
                  </button>
                  {editingEvent && (
                    <button 
                      type="button"
                      onClick={() => handleDeleteEvent(editingEvent.id)}
                      className="flex-1 py-5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
