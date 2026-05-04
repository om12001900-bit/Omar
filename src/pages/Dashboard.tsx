import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Layout,
  Target, 
  Layers, 
  Briefcase, 
  LogOut,
  Bell,
  Menu,
  X,
  Presentation,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePWA } from '../hooks/usePWA';

import Overview from './views/Overview';
import GoalsTargets from './views/GoalsTargets';
import Hieas from './views/Hieas';
import Projects from './views/Projects';
import Conferences from './views/Conferences';
import Calendar from './views/Calendar';
import Settings from './views/Settings';
import Analytics from './views/Analytics';
import PlanPage from './views/PlanPage';

import { Logo } from '../components/Logo';
import { InstallPWA } from '../components/InstallPWA';

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const { isStandalone } = usePWA();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { title: 'تم تحديث مشروع "النظام المركزي"', time: 'منذ دقيقتين' },
    { title: 'تم الوصول لمستهدف رقمي في س 15', time: 'منذ ساعة' },
    { title: 'مؤتمر جديد قيد التخطيط', time: 'اليوم' },
  ];

  const navItems = [
    { path: '/dashboard', label: 'المتابعة', icon: LayoutDashboard },
    { path: '/dashboard/analytics', label: 'التمثيل البياني', icon: BarChart3 },
    { path: '/dashboard/goals', label: 'الأهداف والمستهدفات', icon: Target },
    { path: '/dashboard/hieas', label: 'الهيئات الاستراتيجية', icon: Layers },
    { path: '/dashboard/plan', label: 'الخطة الاستراتيجية', icon: Layout },
    { path: '/dashboard/projects', label: 'المشاريع التنفيذية', icon: Briefcase },
    { path: '/dashboard/conferences', label: 'المؤتمرات والمعارض', icon: Presentation },
    { path: '/dashboard/calendar', label: 'التقويم الإستراتيجي', icon: CalendarIcon },
    { path: '/dashboard/settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-white overflow-hidden" dir="rtl">
      {/* 1. Header Area (Strategic Control Center) */}
      <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-10 shrink-0 bg-[#020617]/80 backdrop-blur-xl relative z-50">
        {/* Left Side: Mobile Menu Toggle & User Profile */}
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all text-slate-400"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center font-black text-lg md:text-2xl text-brand-dark shadow-2xl relative overflow-hidden group">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span className="relative z-10">{profile?.displayName?.charAt(0) || 'O'}</span>
              )}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-black text-slate-100 leading-tight">{profile?.displayName || 'Strategic User'}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-brand-primary font-black uppercase tracking-wider">STRATEGIC DIRECTOR</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 mr-4 border-r border-white/10 pr-4">
            <InstallPWA />
            
            <button 
              onClick={() => confirm('هل تريد تسجيل الخروج؟') && signOut()}
              className="w-9 h-9 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all text-slate-500"
              title="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
            
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-9 h-9 flex items-center justify-center hover:bg-white/5 rounded-lg transition-all text-slate-500 group"
            >
              <Bell size={18} className="group-hover:text-brand-primary transition-colors" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-primary rounded-full ring-2 ring-[#020617]" />
            </button>
          </div>
        </div>

        {/* Right Side: Platform Branding */}
        <div className="flex items-center gap-2 md:gap-4 text-left">
          <div className="flex flex-col items-end">
            <span className="text-lg md:text-2xl font-display font-black tracking-tighter text-white leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              O.V.9 CONTROL
            </span>
            <span className="text-[10px] md:text-xs text-brand-primary font-black uppercase tracking-[0.3em] mt-1">
              STRATEGIC PLATFORM
            </span>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center relative group cursor-pointer"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-brand-primary/10 rounded-2xl blur-xl group-hover:bg-brand-primary/20 transition-all"
            />
            <div className="relative w-full h-full bg-[#0a0a0b] border border-white/10 rounded-2xl flex items-center justify-center neon-glow-brand group-hover:border-brand-primary/50 transition-all overflow-hidden shadow-2xl">
              <Logo className="scale-75" showText={false} />
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
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

      {/* 2. Navigation Area */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 bg-[#020617] z-[60] flex flex-col p-8 md:hidden"
          >
            <div className="flex items-center justify-between mb-12">
              <Logo className="scale-110" />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar">
              {navItems.map((item) => {
                const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 border ${
                      isActive 
                        ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' 
                        : 'bg-white/[0.02] border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    }`}
                  >
                    <div className={`${isActive ? 'text-brand-primary' : 'text-slate-500'}`}>
                      <item.icon size={22} />
                    </div>
                    <span className="font-bold text-base tracking-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
              <div className="flex justify-center mb-2">
                <InstallPWA />
              </div>
              <div className="flex items-center gap-4 p-4 glass rounded-2xl border border-white/5">
                <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center font-black text-xl text-brand-dark">
                  {profile?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-white">{profile?.displayName}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{profile?.email}</p>
                </div>
              </div>
              <button 
                onClick={() => signOut()}
                className="w-full p-5 flex items-center justify-center gap-3 bg-red-500/10 text-red-500 font-black rounded-2xl hover:bg-red-500/20 transition-all border border-red-500/20"
              >
                <LogOut size={20} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Ribbon (Desktop only, or horizontal on mobile) */}
      <nav className="hidden md:flex h-14 bg-[#0a0a0b]/50 border-b border-white/5 items-center px-6 overflow-x-auto no-scrollbar shrink-0 backdrop-blur-md">
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
          className="flex items-center gap-2"
        >
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));
            return (
              <motion.div
                key={item.path}
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  visible: { opacity: 1, scale: 1 }
                }}
              >
                <Link
                  to={item.path}
                  className={`flex items-center gap-2 px-5 py-2 transition-all relative group rounded-xl border whitespace-nowrap ${
                    isActive 
                      ? 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' 
                      : 'text-slate-500 hover:text-slate-100 hover:bg-white/5 border-transparent'
                  }`}
                >
                  <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-brand-primary' : 'text-slate-500 group-hover:text-slate-300'} />
                  <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="nav-indicator"
                      className="absolute inset-0 border border-brand-primary/30 rounded-xl"
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
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-[#020617]/50 border-t border-purple-500/5 pb-20 md:pb-0">
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
                <Route path="analytics" element={<Analytics />} />
                <Route path="goals" element={<GoalsTargets />} />
                <Route path="hieas" element={<Hieas />} />
                <Route path="plan" element={<PlanPage />} />
                <Route path="projects" element={<Projects />} />
                <Route path="conferences" element={<Conferences />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings" element={<Settings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 4. Mobile Bottom Navigation (Ease of access) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#020617]/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 z-[50]">
        {[
          { path: '/dashboard', label: 'المتابعة', icon: LayoutDashboard },
          { path: '/dashboard/analytics', label: 'الإحصائيات', icon: BarChart3 },
          { path: '/dashboard/projects', label: 'المشاريع', icon: Briefcase },
          { path: '/dashboard/goals', label: 'الأهداف', icon: Target },
          { path: '/dashboard/calendar', label: 'التقويم', icon: CalendarIcon },
        ].map((item) => {
          const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 py-1 ${
                isActive ? 'text-brand-primary' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-brand-primary/10 shadow-[0_0_15px_rgba(74,222,128,0.15)]' : ''}`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-slate-500"
        >
          <div className="p-1.5 rounded-lg">
            <Menu size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">المزيد</span>
        </button>
      </nav>
    </div>
  );
}
