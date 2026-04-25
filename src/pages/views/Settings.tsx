import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings as SettingsIcon, Shield, User, Bell, Database, ChevronLeft, Save, 
  Mail, Phone, Type, AlignLeft, Camera, Upload, Trash2, Palette, Download, 
  CheckCircle2, AlertCircle, RefreshCw, Smartphone, Sun, Moon, Maximize2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useHieas, useProjects, useGoals, useConferences } from '../../hooks/useData';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { 
  collection, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

export default function Settings() {
  const { profile, updateProfile, uploadAvatar, user } = useAuth();
  const { settings, updateSettings } = useUI();
  const { hieas } = useHieas();
  const { projects } = useProjects();
  const { goals } = useGoals();
  const { conferences } = useConferences();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    email: profile?.email || '',
    phoneNumber: profile?.phoneNumber || '',
    bio: profile?.bio || ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    strategicUpdates: true,
    securityAlerts: true,
    performanceReports: false
  });

  const sections = [
    { id: 'profile', title: 'الملف الشخصي', icon: User, desc: 'إدارة بيانات الحساب والصورة الرمزية' },
    { id: 'appearance', title: 'تخصيص الواجهة', icon: Palette, desc: 'تخصيص الألوان والسمات البصرية' },
    { id: 'security', title: 'الأمان والخصوصية', icon: Shield, desc: 'تحديث كلمة المرور وإعدادات الوصول' },
    { id: 'notifications', title: 'التنبيهات', icon: Bell, desc: 'تخصيص مركز الإشعارات والبريد' },
    { id: 'database', title: 'إدارة البيانات', icon: Database, desc: 'النسخ الاحتياطي وتصدير الموارد' },
  ];

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateProfile({
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        bio: formData.bio
      });
      setSuccessMessage('تم تحديث البيانات الاستراتيجية بنجاح.');
      setTimeout(() => setActiveTab(null), 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user?.uid}`);
      setErrorMessage('فشل تحديث البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      await uploadAvatar(file);
      setSuccessMessage('تم رفع وتحديث صورة البروفايل بنجاح.');
    } catch (error) {
      console.error("Upload error:", error);
      handleFirestoreError(error, OperationType.WRITE, `avatars/${user?.uid}`);
      setErrorMessage('فشل رفع الصورة. تأكد من اتصالك واتصال قاعدة البيانات.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDataExport = () => {
    const data = {
      profile: {
        displayName: profile?.displayName,
        bio: profile?.bio,
        phoneNumber: profile?.phoneNumber
      },
      hieas,
      projects,
      goals,
      conferences,
      timestamp: new Date().toISOString(),
      system: 'O.V.9 Quantum Tracker',
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OV9_Strategic_Export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setSuccessMessage('تم تصدير كافة البيانات الاستراتيجية بنجاح.');
  };

  const handleDataImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setIsSaving(true);
        setSuccessMessage('جاري معالج استيراد البيانات وبناء الروابط الاستراتيجية...');

        const hieaIdMap: Record<string, string> = {};
        const projectIdMap: Record<string, string> = {};

        const batch = writeBatch(db);

        // 1. Import HIEAs
        if (data.hieas && Array.isArray(data.hieas)) {
          for (const item of data.hieas) {
            const cleanData = { ...item };
            const oldId = cleanData.id;
            delete cleanData.id;
            delete cleanData.createdAt;
            delete cleanData.updatedAt;
            
            const docRef = doc(collection(db, 'hieas'));
            batch.set(docRef, {
              ...cleanData,
              ownerId: user.uid,
              createdAt: serverTimestamp()
            });
            if (oldId) hieaIdMap[oldId] = docRef.id;
          }
        }

        // 2. Import Projects
        if (data.projects && Array.isArray(data.projects)) {
          for (const item of data.projects) {
            const cleanData = { ...item };
            const oldId = cleanData.id;
            delete cleanData.id;
            delete cleanData.createdAt;
            delete cleanData.updatedAt;

            const updatedData: Record<string, unknown> = { ...cleanData };
            if (cleanData.hieaId && hieaIdMap[cleanData.hieaId]) {
              updatedData.hieaId = hieaIdMap[cleanData.hieaId];
            }
            if (cleanData.hieaIds && Array.isArray(cleanData.hieaIds)) {
              updatedData.hieaIds = (cleanData.hieaIds as string[]).map((id: string) => hieaIdMap[id] || id);
            }

            const docRef = doc(collection(db, 'projects'));
            batch.set(docRef, {
              ...updatedData,
              ownerId: user.uid,
              createdAt: serverTimestamp()
            });
            if (oldId) projectIdMap[oldId] = docRef.id;
          }
        }

        // 3. Import Goals
        if (data.goals && Array.isArray(data.goals)) {
          for (const item of data.goals) {
            const cleanData = { ...item };
            delete cleanData.id;
            delete cleanData.createdAt;
            delete cleanData.updatedAt;
            
            const updatedData: Record<string, unknown> = { ...cleanData };
            if (cleanData.hieaId && hieaIdMap[cleanData.hieaId]) {
              updatedData.hieaId = hieaIdMap[cleanData.hieaId];
            }
            if (cleanData.projectId && projectIdMap[cleanData.projectId]) {
              updatedData.projectId = projectIdMap[cleanData.projectId];
            }

            const docRef = doc(collection(db, 'goals'));
            batch.set(docRef, {
              ...updatedData,
              ownerId: user.uid,
              createdAt: serverTimestamp()
            });
          }
        }

        // 4. Import Conferences
        if (data.conferences && Array.isArray(data.conferences)) {
          for (const item of data.conferences) {
            const cleanData = { ...item };
            delete cleanData.id;
            delete cleanData.createdAt;
            delete cleanData.updatedAt;

            const updatedData: Record<string, unknown> = { ...cleanData };
            if (cleanData.hieaId && hieaIdMap[cleanData.hieaId]) {
              updatedData.hieaId = hieaIdMap[cleanData.hieaId];
            }
            if (cleanData.projectId && projectIdMap[cleanData.projectId]) {
              updatedData.projectId = projectIdMap[cleanData.projectId];
            }

            const docRef = doc(collection(db, 'conferences'));
            batch.set(docRef, {
              ...updatedData,
              ownerId: user.uid,
              createdAt: serverTimestamp()
            });
          }
        }

        await batch.commit();
        setSuccessMessage('تم استيراد كافة البيانات وبناء الروابط بنجاح.');
      } catch (error) {
        console.error("Import error:", error);
        setErrorMessage('فشل استيراد البيانات. تأكد من صحة تنسيق الملف.');
        try {
          handleFirestoreError(error, OperationType.WRITE, 'bulk_import');
        } catch {
          // Handled
        }
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col p-6 md:p-10 text-right overflow-y-auto custom-scrollbar">
      <AnimatePresence mode="wait">
        {!activeTab ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-12">
              <h1 className="text-3xl font-display font-black text-white tracking-tight flex items-center gap-4 flex-row-reverse">
                <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <SettingsIcon size={24} />
                </div>
                مركز الإعدادات والتحكم
              </h1>
              <p className="text-slate-500 mt-2 font-medium">تخصيص النظام المركزي ليتناسب مع المتطلبات الاستراتيجية للمرحلة</p>
            </div>

            <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-8 mt-10 p-8 border border-white/5 bg-white/[0.01] relative overflow-hidden group glass">
              <div className="absolute top-0 right-0 w-1 h-full bg-brand-primary/20 group-hover:bg-brand-primary transition-all" />
              
              <div className="flex items-center gap-6 flex-row-reverse">
                <div 
                  onClick={handleImageClick}
                  className="w-20 h-20 bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary text-2xl font-black relative cursor-pointer group/avatar overflow-hidden transition-all hover:border-brand-primary"
                >
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover grayscale group-hover/avatar:grayscale-0 transition-all opacity-80 group-hover/avatar:opacity-100" />
                  ) : (
                    profile?.displayName?.charAt(0) || 'O'
                  )}
                  <div className="absolute inset-0 bg-brand-dark/80 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-all">
                    <Camera size={20} className="mb-1 text-brand-primary" />
                    <span className="text-[8px] font-black uppercase text-white">تغيير</span>
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-brand-dark/90 flex items-center justify-center">
                      <RefreshCw size={20} className="animate-spin text-brand-primary" />
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                
                <div className="text-right">
                  <h2 className="text-2xl font-display font-black text-white">{profile?.displayName || 'Omar Apps'}</h2>
                  <p className="text-slate-400 font-bold">{profile?.email}</p>
                  <div className="flex items-center gap-4 justify-end mt-2">
                    {profile?.phoneNumber && (
                      <p className="text-slate-500 text-xs font-bold flex items-center gap-2">
                        {profile.phoneNumber} <Phone size={10} />
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 max-w-md text-right">
                <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-2 px-2">نبذة المستخدم - Bio</p>
                <div className="bg-white/5 p-4 border border-white/5 text-xs text-slate-400 italic leading-relaxed min-h-[60px]">
                  {profile?.bio || 'لا توجد نبذة تعريفية مسجلة حالياً في النظام المركزي.'}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="bg-brand-primary text-brand-dark px-10 py-3 font-black text-[10px] uppercase tracking-widest hover:scale-[1.05] transition-all flex items-center gap-3 justify-center"
                >
                  <RefreshCw size={14} />
                  تحديث البيانات
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.map((section, i) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveTab(section.id)}
                  className="group cursor-pointer p-8 glass rounded-none border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-brand-primary/30 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 text-white/[0.01] pointer-events-none group-hover:text-brand-primary/5 transition-all">
                    <section.icon size={120} />
                  </div>
                  
                  <div className="relative z-10 space-y-4">
                    <div className="w-12 h-12 bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-brand-primary transition-colors border border-white/5">
                      <section.icon size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors">{section.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{section.desc}</p>
                    </div>
                    <div className="pt-4 flex items-center gap-2 group-hover:gap-4 transition-all text-[10px] font-black uppercase text-slate-600 tracking-widest">
                      <span>إدارة الإعدادات</span>
                      <div className="w-4 h-px bg-slate-800" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-12 flex items-center justify-between flex-row-reverse">
              <div className="flex items-center gap-4 flex-row-reverse">
                <div className="w-12 h-12 bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-[0_0_15px_rgba(74,222,128,0.1)]">
                  {(() => {
                    const Icon = sections.find(s => s.id === activeTab)?.icon;
                    return Icon ? <Icon size={24} /> : null;
                  })()}
                </div>
                <div>
                  <h1 className="text-3xl font-display font-black text-white tracking-tight">
                    {sections.find(s => s.id === activeTab)?.title}
                  </h1>
                  <p className="text-slate-500 font-medium">إدارة تخصيص النظام بشكل استراتيجي</p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setActiveTab(null);
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-xs uppercase tracking-widest border border-white/5 transition-all"
              >
                <ChevronLeft size={16} className="rtl-flip" />
                العودة للمركز
              </button>
            </div>

            {/* Success/Error Alerts */}
            <AnimatePresence>
              {successMessage && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold mb-8 flex items-center gap-2 justify-end">
                  {successMessage}
                  <CheckCircle2 size={16} />
                </motion.div>
              )}
              {errorMessage && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold mb-8 flex items-center gap-2 justify-end">
                  {errorMessage}
                  <AlertCircle size={16} />
                </motion.div>
              )}
            </AnimatePresence>

            {activeTab === 'profile' && (
              <div className="max-w-3xl w-full mx-auto bg-white/[0.01] border border-white/5 p-10 glass">
                <div className="flex justify-center mb-10">
                  <div 
                    onClick={handleImageClick}
                    className="w-32 h-32 bg-white/5 border-2 border-white/10 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-brand-primary/50 transition-all group overflow-hidden relative"
                  >
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <Camera size={40} className="mb-2" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 py-2 bg-brand-dark/80 text-[10px] font-black uppercase text-center opacity-0 group-hover:opacity-100 transition-opacity">تغيير الصورة</div>
                    {isUploading && (
                      <div className="absolute inset-0 bg-brand-dark/90 flex items-center justify-center">
                        <RefreshCw size={32} className="animate-spin text-brand-primary" />
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 flex-row-reverse text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">
                        <Type size={12} className="text-brand-primary" />
                        الاسم الكامل
                      </label>
                      <input 
                        type="text" 
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full bg-brand-dark border border-white/10 p-4 outline-none focus:border-brand-primary text-slate-200 font-bold text-right transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 flex-row-reverse text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">
                        <Mail size={12} className="text-brand-primary" />
                        البريد الإلكتروني
                      </label>
                      <input 
                        type="email" 
                        value={formData.email}
                        readOnly
                        className="w-full bg-white/5 border border-white/5 p-4 outline-none text-slate-600 font-bold text-right cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 flex-row-reverse text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">
                      <Phone size={12} className="text-brand-primary" />
                      رقم الهاتف الاستراتيجي
                    </label>
                    <input 
                      type="tel" 
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full bg-brand-dark border border-white/10 p-4 outline-none focus:border-brand-primary text-slate-200 font-bold text-right transition-all"
                      placeholder="+966 50 000 0000"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 flex-row-reverse text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">
                      <AlignLeft size={12} className="text-brand-primary" />
                      النبذة التعريفية
                    </label>
                    <textarea 
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full bg-brand-dark border border-white/10 p-4 outline-none focus:border-brand-primary text-slate-200 font-bold text-right h-32 resize-none transition-all"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`w-full py-5 flex items-center justify-center gap-4 font-black uppercase tracking-[0.3em] transition-all bg-brand-primary text-brand-dark hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] disabled:opacity-50`}
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    {isSaving ? 'جاري الحفظ...' : 'تأكيد التغييرات'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="max-w-3xl w-full mx-auto space-y-10">
                <div className="bg-white/[0.01] border border-white/5 p-10 glass space-y-12">
                  {/* Theme Mode Toggle */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-100 flex items-center gap-4 flex-row-reverse">
                      <Sun size={20} className="text-brand-primary" />
                      وضع العرض (Dark/Light)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => updateSettings({ darkMode: true })}
                        className={`p-6 border flex flex-col items-center gap-3 transition-all ${settings.darkMode ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-lg shadow-brand-primary/5' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                      >
                        <Moon size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">الوضع الليلي</span>
                      </button>
                      <button 
                        onClick={() => updateSettings({ darkMode: false })}
                        className={`p-6 border flex flex-col items-center gap-3 transition-all ${!settings.darkMode ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-lg shadow-brand-primary/5' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                      >
                        <Sun size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">الوضع النهاري</span>
                      </button>
                    </div>
                  </div>

                  {/* Theme Color Selection */}
                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-100 flex items-center gap-4 flex-row-reverse">
                      <Palette size={20} className="text-brand-primary" />
                      اللون الاستراتيجي للطابع (Accent Color)
                    </h3>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                      {[
                        { name: 'Quantum Green', color: '#4ade80' },
                        { name: 'Stellar Blue', color: '#3b82f6' },
                        { name: 'Matrix Red', color: '#ef4444' },
                        { name: 'Solar Gold', color: '#f59e0b' },
                        { name: 'Void Purple', color: '#8b5cf6' },
                        { name: 'Cyan Flux', color: '#06b6d4' },
                        { name: 'Crimson Wave', color: '#f43f5e' },
                        { name: 'Emerald Edge', color: '#34d399' },
                        { name: 'Amber Glow', color: '#fbbf24' },
                        { name: 'Indigo Deep', color: '#6366f1' },
                        { name: 'Rose Bloom', color: '#fb7185' },
                        { name: 'Slate Cool', color: '#94a3b8' }
                      ].map(theme => (
                        <button 
                          key={theme.color}
                          onClick={() => updateSettings({ themeColor: theme.color })}
                          className={`group relative p-2 border transition-all flex flex-col items-center justify-center gap-2 overflow-hidden ${settings.themeColor === theme.color ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.2)]' : 'border-white/5 hover:border-white/20 hover:bg-white/5'}`}
                        >
                          <div className="w-full aspect-square relative shadow-inner" style={{ backgroundColor: theme.color }}>
                            {settings.themeColor === theme.color && (
                              <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/20 backdrop-blur-[1px]">
                                <CheckCircle2 size={16} className="text-white" />
                              </div>
                            )}
                          </div>
                          <span className="text-[7px] font-black uppercase text-slate-500 group-hover:text-slate-300 transition-colors text-center truncate w-full px-1">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size and Layout Density */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-white/5">
                    <div className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-100 flex items-center gap-4 flex-row-reverse">
                        <Type size={18} className="text-brand-primary" />
                        حجم الخط الرئيسي
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'small', label: 'صغير', size: 'text-[10px]' },
                          { id: 'medium', label: 'متوسط', size: 'text-xs' },
                          { id: 'large', label: 'كبير', size: 'text-sm' }
                        ].map(size => (
                          <button 
                            key={size.id}
                            onClick={() => updateSettings({ fontSize: size.id as 'small' | 'medium' | 'large' })}
                            className={`py-4 px-2 border flex flex-col items-center gap-2 transition-all ${settings.fontSize === size.id ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}
                          >
                            <span className={`${size.size} font-bold opacity-40 group-hover:opacity-100`}>A</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">{size.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-100 flex items-center gap-4 flex-row-reverse">
                        <Maximize2 size={18} className="text-brand-primary" />
                        نمط الزوايا (Corner Radius)
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'none', label: 'حاد', radius: '0px' },
                          { id: 'small', label: 'بسيط', radius: '4px' },
                          { id: 'medium', label: 'مستدير', radius: '12px' },
                          { id: 'full', label: 'دائري', radius: '9999px' }
                        ].map(radius => (
                          <button 
                            key={radius.id}
                            onClick={() => updateSettings({ borderRadius: radius.id as 'none' | 'small' | 'medium' | 'full' })}
                            className={`py-4 px-1 border flex flex-col items-center gap-2 transition-all overflow-hidden ${settings.borderRadius === radius.id ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}
                          >
                            <div 
                              className="w-6 h-6 border-2 border-current opacity-40"
                              style={{ borderRadius: radius.radius }}
                            />
                            <span className="text-[9px] font-black uppercase tracking-widest">{radius.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border border-brand-primary/10 bg-brand-primary/[0.01]">
                    <div className="flex items-center gap-3 text-brand-primary mb-2 flex-row-reverse">
                      <Smartphone size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">معاينة استجابة النظام</span>
                    </div>
                    <p className="text-[11px] text-slate-500 text-right leading-relaxed">سيتم حفظ هذه التفضيلات في هويتك الاستراتيجية وتطبيقها تلقائياً عند تسجيل الدخول من أي جهاز في الشبكة المركزية.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="max-w-3xl w-full mx-auto space-y-10">
                <div className="bg-white/[0.01] border border-white/5 p-10 glass space-y-8">
                  <div className="flex items-center gap-4 flex-row-reverse text-brand-primary">
                    <Shield size={32} />
                    <h3 className="text-xl font-display font-black text-white">إعدادات الحماية والأمان</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-brand-primary/5 border border-brand-primary/10 space-y-4">
                      <p className="text-xs font-bold text-slate-300 text-right">تحقق من حسابك الاستراتيجي وقم بتغيير مفتاح الدخول بانتظام.</p>
                      <button className="w-full py-4 border border-brand-primary/30 text-brand-primary font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary hover:text-brand-dark transition-all">تغيير كلمة المرور</button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-white/5 flex-row-reverse">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-100">المصادقة الثنائية - 2FA</p>
                        <p className="text-[10px] text-slate-500">تفعيل طبقة حماية إضافية عبر الهاتف</p>
                      </div>
                      <div className="w-12 h-6 bg-slate-800 rounded-full relative cursor-pointer opacity-50">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-slate-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="max-w-3xl w-full mx-auto space-y-10">
                <div className="bg-white/[0.01] border border-white/5 p-10 glass space-y-8">
                  <div className="flex items-center justify-between flex-row-reverse mb-8">
                    <h3 className="text-lg font-black text-white">مركز التنبيهات الاستراتيجية</h3>
                    <Bell size={24} className="text-brand-primary" />
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'strategicUpdates', label: 'تحديثات المسار الاستراتيجي', desc: 'إخطارات عند تحديث المشاريع والهيئات' },
                      { key: 'securityAlerts', label: 'تنبيهات الأمان والدخول', desc: 'إخطار فوري عند رصد محاولات دخول جديدة' },
                      { key: 'performanceReports', label: 'تقارير الأداء الأسبوعية', desc: 'ملخص رقمي شامل يتم إرساله للبريد الإلكتروني' },
                    ].map(setting => (
                      <div key={setting.key} className="flex items-center justify-between p-6 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all flex-row-reverse">
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-100">{setting.label}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{setting.desc}</p>
                         </div>
                         <button 
                          onClick={() => setNotificationSettings({ 
                            ...notificationSettings, 
                            [setting.key]: !notificationSettings[setting.key as keyof typeof notificationSettings] 
                          })}
                          className={`w-14 h-8 transition-all rounded-none border ${
                            notificationSettings[setting.key as keyof typeof notificationSettings] 
                            ? 'bg-brand-primary/20 border-brand-primary' 
                            : 'bg-white/5 border-white/10'
                          } flex items-center p-1 ${notificationSettings[setting.key as keyof typeof notificationSettings] ? 'justify-end' : 'justify-start'}`}
                         >
                            <motion.div 
                              layout 
                              className={`w-6 h-full ${notificationSettings[setting.key as keyof typeof notificationSettings] ? 'bg-brand-primary' : 'bg-slate-600'}`} 
                            />
                         </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="max-w-3xl w-full mx-auto space-y-10">
                <div className="bg-white/[0.01] border border-white/5 p-10 glass space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-100 flex items-center gap-4 flex-row-reverse">
                    <Database size={20} className="text-brand-primary" />
                    إدارة الموارد والبيانات
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                    <div className="p-4 bg-white/5 border border-white/5 text-center">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">الهيئات</p>
                      <p className="text-xl font-display font-black text-white">{hieas.length}</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 text-center">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">المبادرات</p>
                      <p className="text-xl font-display font-black text-white">{projects.length}</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 text-center">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">الأهداف</p>
                      <p className="text-xl font-display font-black text-white">{goals.length}</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 text-center">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">المؤتمرات</p>
                      <p className="text-xl font-display font-black text-white">{conferences.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 bg-white/5 border border-white/10 space-y-4 text-right group hover:border-brand-primary transition-all">
                      <Download className="text-brand-primary opacity-50 group-hover:opacity-100 transition-all mr-auto" size={32} />
                      <h4 className="text-sm font-black text-white">تصدير كافة البيانات</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-bold italic">تحميل نسخة شاملة من الهيئات، المشاريع، والأهداف بصيغة JSON لنقلها إلى حساب آخر.</p>
                      <button onClick={handleDataExport} className="w-full py-3 bg-white/10 text-slate-300 font-bold text-xs uppercase hover:bg-brand-primary hover:text-brand-dark transition-all">تصدير الآن</button>
                    </div>

                    <div className="p-8 bg-white/5 border border-white/10 space-y-4 text-right group hover:border-brand-primary transition-all">
                      <Upload className="text-brand-primary opacity-50 group-hover:opacity-100 transition-all mr-auto" size={32} />
                      <h4 className="text-sm font-black text-white">استيراد البيانات</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-bold italic">رفع ملف JSON قمت بتصديره سابقاً لإضافة البيانات إلى هذا الحساب الاستراتيجي.</p>
                      <label className="w-full py-3 bg-white/10 text-slate-300 font-bold text-xs uppercase hover:bg-brand-primary hover:text-brand-dark transition-all cursor-pointer flex items-center justify-center">
                        إرفاق واستيراد
                        <input type="file" accept=".json" className="hidden" onChange={handleDataImport} />
                      </label>
                    </div>
                  </div>

                  <div className="p-8 bg-red-500/5 border border-red-500/10 space-y-4 text-right group hover:border-red-500/50 transition-all">
                    <Trash2 className="text-red-500 opacity-50 transition-all mr-auto" size={32} />
                    <h4 className="text-sm font-black text-white">حذف كافة البيانات</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold italic">هذا الإجراء سيقوم بمسح كافة السجلات الاستراتيجية من النظام ولا يمكن التراجع عنه.</p>
                    <button className="w-full py-3 bg-red-500/10 text-red-500 font-bold text-xs uppercase hover:bg-red-500 hover:text-white transition-all">حذف النظام بالكامل</button>
                  </div>
                  
                  <div className="p-6 border border-brand-primary/10 bg-brand-primary/[0.01]">
                    <div className="flex items-center gap-3 text-brand-primary mb-2 flex-row-reverse">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">تنبيه الموارد</span>
                    </div>
                    <p className="text-[10px] text-slate-500 text-right">يتم عمل نسخ احتياطي آلي كل 24 ساعة في خوادم السحابة المشفرة في القطاع 0-5.</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-20 p-10 border border-brand-primary/10 bg-brand-primary/[0.02] relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-1 h-full bg-brand-primary" />
        <h4 className="text-sm font-black uppercase tracking-widest text-brand-primary mb-4">Strategic Environment Info</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-right">
           <div className="space-y-1">
             <p className="text-[10px] text-slate-600 font-black uppercase">System Engine</p>
             <p className="text-xs font-bold text-slate-300">O.V.9 Quantum Tracker</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] text-slate-600 font-black uppercase">Build Status</p>
             <p className="text-xs font-bold text-brand-primary flex items-center gap-2 flex-row-reverse">
               <span className="w-1.5 h-1.5 bg-brand-primary animate-pulse" />
               Production Stable
             </p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] text-slate-600 font-black uppercase">Encryption</p>
             <p className="text-xs font-bold text-slate-300">Level 5 / Sector 0</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] text-slate-600 font-black uppercase">Last Revision</p>
             <p className="text-xs font-bold text-slate-300">April 2026</p>
           </div>
        </div>
      </div>
    </div>
  );
}
