import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Target, 
  Layers, 
  Briefcase, 
  LogOut,
  ChevronLeft,
  Bell,
  Search,
  User as UserIcon,
  Menu,
  X,
  Presentation,
  Calendar as CalendarIcon,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import Overview from './views/Overview';
import GoalsTargets from './views/GoalsTargets';
import Hieas from './views/Hieas';
import Projects from './views/Projects';
import Conferences from './views/Conferences';
import Calendar from './views/Calendar';
import Settings from './views/Settings';

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { title: 'تم تحديث مشروع "النظام المركزي"', time: 'منذ دقيقتين' },
    { title: 'تم الوصول لمستهدف رقمي في س 15', time: 'منذ ساعة' },
    { title: 'مؤتمر جديد قيد التخطيط', time: 'اليوم' },
  ];

  const navItems = [
    { path: '/dashboard', label: 'المتابعة', icon: LayoutDashboard },
    { path: '/dashboard/goals', label: 'الأهداف والمستهدفات', icon: Target },
    { path: '/dashboard/hieas', label: 'الهيئات الاستراتيجية', icon: Layers },
    { path: '/dashboard/projects', label: 'المشاريع التنفيذية', icon: Briefcase },
    { path: '/dashboard/conferences', label: 'المؤتمرات والمعارض', icon: Presentation },
    { path: '/dashboard/calendar', label: 'التقويم الإستراتيجي', icon: CalendarIcon },
    { path: '/dashboard/settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-white overflow-hidden" dir="rtl">
      {/* 1. Header Area (Strategic Control Center) */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 md:px-10 shrink-0 bg-[#020617] backdrop-blur-md relative z-50">
        {/* Left Side: User Profile & Quick Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B00] rounded-none flex items-center justify-center font-black text-xl text-white shadow-lg">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                profile?.displayName?.charAt(0) || 'O'
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-100 leading-tight">{profile?.displayName || 'Omar Apps'}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-bold">{profile?.email || 'oapps703@gmail.com'}</span>
                <span className="text-[9px] text-brand-primary font-black uppercase tracking-wider">STRATEGIC DIRECTOR</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-4">
            <button 
              onClick={() => confirm('هل تريد تسجيل الخروج؟') && signOut()}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/5 transition-all text-slate-400"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
            
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-8 h-8 flex items-center justify-center hover:bg-white/5 transition-all text-slate-400 group"
            >
              <Bell size={16} className="group-hover:text-brand-primary transition-colors" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-primary rounded-full ring-2 ring-brand-dark" />
            </button>
          </div>
        </div>

        {/* Right Side: Platform Branding */}
        <div className="flex items-center gap-3 text-left">
          <div className="flex flex-col items-end">
            <span className="text-base font-display font-black tracking-tighter text-slate-100">O.V.9 Control Tracker</span>
            <span className="text-[9px] text-brand-primary font-black uppercase tracking-[0.2em]">STRATEGIC PLATFORM V9.0</span>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 bg-brand-primary rounded-none flex items-center justify-center font-black text-xl text-brand-dark shadow-[0_0_15px_rgba(74,222,128,0.3)] relative group"
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-brand-primary/20 rounded-none"
            />
            <span className="relative z-10">O</span>
          </motion.div>
        </div>

        <AnimatePresence>
          {showNotifications && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-1/2 -translate-x-1/2 top-14 w-64 md:w-80 bg-brand-dark border border-white/10 shadow-2xl p-4 z-[100] text-right"
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">التنبيهات الاستراتيجية</span>
                <button onClick={() => setShowNotifications(false)}><X size={14} className="text-slate-500" /></button>
              </div>
              <div className="space-y-4">
                {notifications.map((n, i) => (
                  <div key={i} className="group cursor-default">
                    <p className="text-xs font-bold text-slate-300 group-hover:text-brand-primary transition-colors">{n.title}</p>
                    <p className="text-[9px] text-slate-600 mt-1 uppercase font-black tracking-widest">{n.time}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Navigation Ribbon (Red Zone in user's logic) */}
      <nav className="h-12 md:h-14 bg-white/[0.01] border-b border-red-500/10 flex items-center px-4 overflow-x-auto no-scrollbar shrink-0">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
          className="flex items-center gap-2 md:gap-4 mx-auto"
        >
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));
            return (
              <motion.div
                key={item.path}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <Link
                  to={item.path}
                  className={`flex flex-col items-center justify-center px-3 md:px-6 py-1 transition-all relative group min-w-[60px] md:min-w-[80px] ${
                    isActive 
                      ? 'text-brand-primary' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={item.label}
                >
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 rounded-none transition-all duration-300 ${isActive ? 'bg-brand-primary/10 shadow-[0_0_20px_rgba(74,222,128,0.1)]' : 'group-hover:bg-white/5'}`}
                  >
                    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary shadow-[0_0_10px_rgba(74,222,128,1)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </nav>

      {/* 3. Viewport Content (Purple Zone in user's logic) */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-[#020617]/50 border-t border-purple-500/5">
        <div className="min-h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="h-full"
            >
              <Routes>
                <Route index element={<Overview />} />
                <Route path="goals" element={<GoalsTargets />} />
                <Route path="hieas" element={<Hieas />} />
                <Route path="projects" element={<Projects />} />
                <Route path="conferences" element={<Conferences />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings" element={<Settings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
