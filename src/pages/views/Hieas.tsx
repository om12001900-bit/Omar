import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Layers, Book, Gavel, ArrowRight, ChevronLeft, Target, Briefcase, Activity, TrendingUp, Check, Search, AlertCircle, Upload, Loader2, Link as LinkIcon } from 'lucide-react';
import { useGoals, useHieas, useProjects } from '../../hooks/useData';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

import { Hiea } from '../../types';

export default function Hieas() {
  const { hieas } = useHieas();
  const { goals } = useGoals();
  const { projects } = useProjects();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedHiea, setSelectedHiea] = useState<Hiea | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'progress'>('name');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; hieaId: string | null; name: string }>({
    isOpen: false,
    hieaId: null,
    name: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    color: '#4ade80', // Default brand primary
    goalIds: [] as string[],
    logoUrl: '',
    achievements: '',
    description: '',
  });

  const [editContent, setEditContent] = useState<Partial<Hiea>>({
    laws: '',
    procedures: '',
    color: '',
    progress: 0,
    goalIds: [] as string[],
    logoUrl: '',
    achievements: '',
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Simulate file upload with a local deterministic URL
      const fakeUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${file.name}`;
      
      if (isEdit) {
        setEditContent({ ...editContent, logoUrl: fakeUrl });
      } else {
        setFormData({ ...formData, logoUrl: fakeUrl });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'hieas'), {
        name: formData.name,
        color: formData.color,
        goalIds: formData.goalIds,
        logoUrl: formData.logoUrl,
        achievements: formData.achievements,
        description: formData.description,
        laws: '',
        procedures: '',
        progress: 0,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setModalOpen(false);
      setFormData({ name: '', color: '#4ade80', goalIds: [], logoUrl: '', achievements: '', description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateContent = async () => {
    if (!selectedHiea) return;
    try {
      await updateDoc(doc(db, 'hieas', selectedHiea.id), {
        ...editContent,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      setSelectedHiea({ ...selectedHiea, ...editContent });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.hieaId) return;
    try {
      await deleteDoc(doc(db, 'hieas', deleteConfirm.hieaId));
      if (selectedHiea?.id === deleteConfirm.hieaId) setSelectedHiea(null);
      setDeleteConfirm({ isOpen: false, hieaId: null, name: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, hiea: Hiea) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, hieaId: hiea.id, name: hiea.name });
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden text-right pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2 py-6 shrink-0 border-b border-white/5 mb-6">
        <div className="text-right w-full md:w-auto">
          <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter leading-tight mb-2">الهيئات الاستراتيجية</h1>
          <p className="text-slate-500 font-bold text-sm md:text-base">تنظيم ومتابعة الكيانات والأنظمة المؤسسية العليا</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="w-full md:w-auto bg-brand-primary text-brand-dark font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-brand-primary/20 transition-all group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-dark/10 flex items-center justify-center group-hover:rotate-90 transition-transform">
            <Plus size={20} strokeWidth={3} />
          </div>
          <span className="text-base tracking-tight">إضافة هيئة جديدة</span>
        </button>
      </div>

      <div className="flex-1 relative min-h-0 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {!selectedHiea ? (
            <motion.div 
              key="grid-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-2 space-y-10 pb-12"
            >
              {/* Search and Filters Bar */}
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 bg-[#0a0a0b] p-6 rounded-3xl border border-white/5">
                <div className="flex items-center gap-4 flex-1 bg-[#020617] border border-white/10 rounded-2xl px-5 py-3.5 focus-within:ring-4 focus-within:ring-brand-primary/5 transition-all">
                  <Search size={20} className="text-slate-700" />
                  <input 
                    type="text"
                    placeholder="ابحث عن كيان استراتيجي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder:text-slate-700 text-right w-full px-2"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] sm:ml-2">ترتيب البيانات:</span>
                  <div className="flex bg-[#020617] p-1.5 rounded-2xl border border-white/10 w-full sm:w-auto">
                    {[
                      { id: 'name', label: 'الاسم' },
                      { id: 'progress', label: 'الإنجاز' }
                    ].map(option => (
                      <button
                        key={option.id}
                        onClick={() => setSortBy(option.id as 'name' | 'progress')}
                        className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          sortBy === option.id 
                            ? 'bg-brand-primary text-brand-dark shadow-xl' 
                            : 'text-slate-600 hover:text-slate-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hiea Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 px-2">
                {hieas
                  .filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .sort((a, b) => {
                    if (sortBy === 'name') return a.name.localeCompare(b.name);
                    return (b.progress || 0) - (a.progress || 0);
                  })
                  .map((hiea, index) => {
                    const relatedGoals = goals.filter(g => (hiea.goalIds || []).includes(g.id) || g.hieaId === hiea.id);
                    const relatedProjects = projects.filter(p => goals.some(g => (g.hieaId === hiea.id && g.projectId === p.id)));

                    return (
                      <motion.div
                        key={hiea.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          setSelectedHiea(hiea);
                          setEditContent({ 
                            laws: hiea.laws || '', 
                            procedures: hiea.procedures || '',
                            color: hiea.color || '#4ade80',
                            progress: hiea.progress || 0,
                            goalIds: hiea.goalIds || [],
                            logoUrl: hiea.logoUrl || '',
                            achievements: hiea.achievements || '',
                            description: hiea.description || '',
                          });
                          setIsEditing(false);
                        }}
                        className="group relative h-[420px] cursor-pointer overflow-hidden border border-white/5 bg-[#0a0a0b] hover:border-white/20 transition-all duration-500 flex flex-col rounded-[2.5rem] shadow-2xl"
                      >
                        {/* Status Light */}
                        <div 
                          className="absolute top-0 right-0 h-2 w-full opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-30"
                          style={{ backgroundColor: hiea.color || '#4ade80' }}
                        />

                        {/* Card Content */}
                        <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
                          <div className="flex justify-between items-start mb-8 flex-row-reverse">
                            <div 
                              className="w-20 h-20 bg-[#020617] border border-white/10 rounded-3xl flex items-center justify-center relative overflow-hidden transition-all group-hover:scale-110 group-hover:border-brand-primary/50 group-hover:shadow-[0_0_30px_rgba(74,222,128,0.2)]"
                              style={{ color: hiea.color || '#4ade80' }}
                            >
                              {hiea.logoUrl ? (
                                <img src={hiea.logoUrl} alt={hiea.name} className="w-full h-full object-contain p-3" />
                              ) : (
                                <Layers size={32} />
                              )}
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-1">الإنجاز</p>
                               <p className="text-3xl font-display font-black text-white">{hiea.progress || 0}%</p>
                            </div>
                          </div>

                          <div className="flex-1 space-y-4">
                            <h3 className="text-2xl font-display font-black text-white leading-tight group-hover:text-brand-primary transition-colors text-right tracking-tight">
                              {hiea.name}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed text-right font-medium">
                              {hiea.description || 'لا يوجد وصف استراتيجي مسجل لهذا الكيان حالياً في قاعدة البيانات المركزية.'}
                            </p>
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center justify-end gap-6 mb-8 flex-row-reverse">
                             <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">أهداف</span>
                                <span className="text-sm font-black text-slate-300">{relatedGoals.length}</span>
                             </div>
                             <div className="w-px h-6 bg-white/5" />
                             <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">مشاريع</span>
                                <span className="text-sm font-black text-slate-300">{relatedProjects.length}</span>
                             </div>
                          </div>

                          {/* Progress Line */}
                          <div className="pt-2 relative">
                             <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${hiea.progress || 0}%` }}
                                  transition={{ duration: 1.5, ease: "circOut" }}
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{ 
                                    backgroundColor: hiea.color || '#4ade80'
                                  }}
                                />
                             </div>
                          </div>
                        </div>

                        {/* HOVER OVERLAY: Details Reveal */}
                        <motion.div 
                          className="absolute inset-0 bg-[#020617]/98 z-40 p-10 flex flex-col justify-between translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.23,1,0.32,1]"
                        >
                           <div className="space-y-8">
                              <div className="flex items-center justify-between border-b border-white/5 pb-6 flex-row-reverse">
                                 <h4 className="text-xs font-black uppercase tracking-[0.3em] text-brand-primary">لوحة التحكم</h4>
                                 <ArrowRight size={18} className="text-slate-700 rtl-flip" />
                              </div>
                              
                              <div className="space-y-8">
                                 <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase text-slate-700 mb-4 text-right tracking-widest">تنسيق الأهداف</p>
                                    <div className="space-y-3">
                                       {relatedGoals.slice(0, 3).map(g => (
                                          <div key={g.id} className="text-xs font-bold text-slate-400 truncate flex items-center gap-3 justify-end">
                                             <span className="truncate">{g.name}</span>
                                             <div className="w-1.5 h-1.5 shrink-0 bg-brand-primary/40 rounded-full" />
                                          </div>
                                       ))}
                                       {relatedGoals.length > 3 && <p className="text-[10px] text-brand-primary font-black uppercase tracking-widest text-right mt-2">+{relatedGoals.length - 3} MORE</p>}
                                       {relatedGoals.length === 0 && <p className="text-xs text-slate-800 italic text-right">No active goals</p>}
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-brand-primary text-brand-dark p-6 rounded-[1.5rem] text-center text-xs font-black uppercase tracking-[0.4em] shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                              إدارة الكيان 
                           </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
              </div>

              {hieas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-40 text-slate-800">
                  <Layers size={80} className="opacity-5 mb-6" />
                  <p className="text-sm font-black uppercase tracking-[0.3em] opacity-20">بانتظار تسجيل مؤسسات استراتيجية جديدة</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full flex flex-col min-h-0 relative overflow-hidden"
            >
              {/* Drill-Down Header */}
              <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <button 
                  onClick={() => setSelectedHiea(null)}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-none text-slate-300 font-black text-xs transition-all shadow-lg shadow-black/20 group"
                >
                  <ChevronLeft className="rtl-flip group-hover:-translate-x-1 transition-transform" size={18} /> 
                  الرجوع لقائمة الهيئات
                </button>
                <div className="flex items-center gap-3 text-left">
                  <div className="text-right hidden md:block">
                     <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">Entity Intelligence</p>
                     <p className="text-[10px] text-brand-primary font-bold">Strategic oversight under O.V.9 control</p>
                  </div>
                  <div className="w-8 h-8 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Layers size={16} />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center lg:items-start justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                        <div 
                          className="w-16 h-16 md:w-20 md:h-20 rounded-none bg-white/[0.03] flex items-center justify-center border-2 transition-all shrink-0 overflow-hidden"
                          style={{ 
                            color: selectedHiea.color || '#4ade80',
                            borderColor: `${selectedHiea.color || '#4ade80'}40`,
                            boxShadow: `0 15px 30px -10px ${selectedHiea.color || '#4ade80'}30`
                          }}
                        >
                          {selectedHiea.logoUrl ? (
                            <img src={selectedHiea.logoUrl} alt={selectedHiea.name} className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                          ) : (
                            <Layers size={32} />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h2 className="text-2xl md:text-4xl font-display font-black text-white leading-tight tracking-tight">{selectedHiea.name}</h2>
                          <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                            <span 
                              className="px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10"
                              style={{ color: selectedHiea.color || '#4ade80' }}
                            >
                              كيان استراتيجي معتمد
                            </span>
                            <span className="text-xs text-slate-600 font-bold">•</span>
                            <span className="text-xs text-slate-600 font-black uppercase tracking-widest">Vision Entity O.V.9</span>
                          </div>
                        </div>
                    </div>

                      <div className="flex flex-col gap-4 w-full md:w-auto">
                        <button 
                          onClick={() => !isEditing ? setIsEditing(true) : handleUpdateContent()}
                          className={`w-full px-10 py-5 rounded-none font-black flex items-center justify-center gap-3 transition-all ${
                            isEditing ? 'bg-brand-primary text-brand-dark shadow-2xl shadow-brand-primary/20' : 'bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200'
                          }`}
                        >
                          {isEditing ? <Check size={24} /> : <Edit2 size={20} />}
                          {isEditing ? 'اعتماد التغييرات' : 'تعديل البيانات'}
                        </button>
                        {!isEditing && (
                          <button 
                            onClick={(e) => openDeleteConfirm(e, selectedHiea)}
                            className="w-full px-10 py-5 rounded-none border border-red-500/20 text-red-500 hover:bg-red-500/10 font-black flex items-center justify-center gap-3 transition-all"
                          >
                            <Trash2 size={20} />
                            حذف الكيان
                          </button>
                        )}
                        {isEditing && (
                          <button 
                            onClick={() => setIsEditing(false)}
                            className="px-10 py-5 rounded-none glass hover:bg-white/10 text-slate-500 font-black transition-all"
                          >
                            إلغاء التعديل
                          </button>
                        )}
                      </div>
                  </div>

                  <div className="mt-12 h-px bg-gradient-to-l from-transparent via-white/5 to-transparent" />
                </div>

                <div className="px-8 md:px-12 pb-12 space-y-12 text-right">
                    {isEditing && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-10 glass rounded-none border border-brand-primary/20 bg-brand-primary/[0.02] space-y-10"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <label className="text-xs font-black uppercase text-slate-500 tracking-widest px-2">اللون المميز للهيئة</label>
                              <div className="flex flex-wrap gap-3 justify-end items-center">
                                {['#4ade80', '#2dd4bf', '#3b82f6', '#8b5cf6', '#f43f5e', '#fbbf24'].map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setEditContent({ ...editContent, color: c })}
                                    className={`w-10 h-10 rounded-none border-4 transition-all ${editContent.color === c ? 'scale-110 border-white shadow-xl' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                                <div className="w-px h-8 bg-white/10 mx-2" />
                                <div className="relative group">
                                  <input 
                                    type="color"
                                    value={editContent.color}
                                    onChange={(e) => setEditContent({ ...editContent, color: e.target.value })}
                                    className="w-12 h-12 bg-transparent border-none outline-none cursor-pointer p-0 opacity-0 absolute inset-0 z-10"
                                  />
                                  <div 
                                    className="w-12 h-12 border-4 border-white/20 group-hover:border-white transition-all flex items-center justify-center overflow-hidden"
                                    style={{ backgroundColor: editContent.color }}
                                  >
                                     <Plus size={16} className="text-white mix-blend-difference" />
                                  </div>
                                </div>
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              <div className="flex justify-between items-center px-2 flex-row-reverse">
                                 <label className="text-xs font-black uppercase text-slate-500 tracking-widest">نسبة الإنجاز الفعلية</label>
                                 <span className="text-xl font-display font-black text-brand-primary">{editContent.progress}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0" max="100"
                                value={editContent.progress}
                                onChange={(e) => setEditContent({ ...editContent, progress: parseInt(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-none appearance-none outline-none accent-brand-primary cursor-pointer"
                              />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-widest px-2">شعار الهيئة</label>
                            <div className="flex gap-3 flex-row-reverse">
                              <div className="flex-1 relative group">
                                <LinkIcon size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input 
                                  type="text" 
                                  value={editContent.logoUrl}
                                  onChange={(e) => setEditContent({ ...editContent, logoUrl: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 rounded-none py-3 pr-10 pl-6 outline-none focus:border-brand-primary text-[11px] text-slate-300 font-bold text-right"
                                  placeholder="رابط الصورة المباشر..."
                                />
                              </div>
                              <button 
                                type="button"
                                onClick={() => editFileInputRef.current?.click()}
                                disabled={isUploading}
                                className="px-4 bg-white/5 border border-white/10 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/5 transition-all flex items-center gap-2 group/upload"
                              >
                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} className="group-hover/upload:scale-110 transition-transform" />}
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">رفع ملف</span>
                              </button>
                              <input 
                                type="file" 
                                ref={editFileInputRef} 
                                onChange={(e) => handleFileUpload(e, true)} 
                                accept="image/*" 
                                hidden 
                              />
                            </div>
                            {editContent.logoUrl && (
                              <div className="mt-2 flex justify-end">
                                <div className="w-12 h-12 border border-white/10 bg-white/5 p-1">
                                  <img src={editContent.logoUrl} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-widest px-2">وصف مختصر</label>
                            <input 
                              type="text" 
                              value={editContent.description}
                              onChange={(e) => setEditContent({ ...editContent, description: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-none py-3 px-6 outline-none focus:border-brand-primary text-sm text-slate-300 font-bold text-right"
                              placeholder="أدخل وصفاً موجزاً..."
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-xs font-black uppercase text-slate-500 tracking-widest px-2">المنجزات والنجاحات</label>
                          <div className="bg-white rounded-none p-2 text-brand-dark">
                             <ReactQuill theme="snow" value={editContent.achievements} onChange={(val) => setEditContent({ ...editContent, achievements: val })} modules={quillModules} />
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2 flex-row-reverse">
                               <label className="text-xs font-black uppercase text-slate-500 tracking-widest">الأهداف الاستراتيجية المرتبطة</label>
                               <span className="text-[10px] font-black text-brand-primary uppercase">Multi-Select Enabled</span>
                            </div>
                            <div className="space-y-2">
                               <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 text-right">
                                  <Search size={14} className="text-slate-600" />
                                  <input 
                                    type="text" 
                                    placeholder="ابحث عن هدف للربط..." 
                                    className="bg-transparent border-none outline-none text-[11px] text-slate-400 w-full text-right"
                                    onChange={(e) => {
                                      const val = e.target.value.toLowerCase();
                                      const buttons = document.querySelectorAll('.goal-option');
                                      buttons.forEach(btn => {
                                        const text = btn.textContent?.toLowerCase() || '';
                                        (btn as HTMLElement).style.display = text.includes(val) ? 'block' : 'none';
                                      });
                                    }}
                                  />
                               </div>
                               <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-white/[0.02] border border-white/5 rounded-none overflow-y-auto max-h-[180px] custom-scrollbar">
                                {goals.map(goal => (
                                  <button
                                    key={goal.id}
                                    type="button"
                                    onClick={() => {
                                      const currentIds = editContent.goalIds || [];
                                      setEditContent({
                                        ...editContent,
                                        goalIds: currentIds.includes(goal.id)
                                          ? currentIds.filter(id => id !== goal.id)
                                          : [...currentIds, goal.id]
                                      });
                                    }}
                                    className={`goal-option p-3 text-[10px] font-bold text-right transition-all border relative overflow-hidden group/opt ${
                                      (editContent.goalIds || []).includes(goal.id)
                                        ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-[0_0_10px_rgba(74,222,128,0.05)]'
                                        : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'
                                    }`}
                                  >
                                    <span className="relative z-10">{goal.name}</span>
                                    {(editContent.goalIds || []).includes(goal.id) && (
                                       <div className="absolute top-1 left-1">
                                          <Check size={8} />
                                       </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                        </div>
                      </motion.div>
                    )}

                    {!isEditing && selectedHiea.description && (
                       <div className="p-10 glass rounded-none border border-white/5 space-y-4 bg-white/[0.01]">
                          <div className="flex items-center gap-4 flex-row-reverse">
                              <div className="w-10 h-10 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                 <AlertCircle size={20} />
                              </div>
                              <h4 className="text-lg font-bold tracking-tight">نبذة عن الكيان</h4>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed">{selectedHiea.description}</p>
                       </div>
                    )}

                    {!isEditing && selectedHiea.achievements && (
                       <div className="p-10 glass rounded-none border border-brand-primary/10 space-y-6 bg-brand-primary/[0.01]">
                          <div className="flex items-center gap-4 flex-row-reverse">
                              <div className="w-10 h-10 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                 <TrendingUp size={20} />
                              </div>
                              <h4 className="text-lg font-bold tracking-tight">سجل المنجزات والنجاحات</h4>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none text-slate-300 achievements-view text-right" dangerouslySetInnerHTML={{ __html: selectedHiea.achievements }} />
                       </div>
                    )}

                    {/* Related Data Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-10 glass rounded-none border border-white/5 space-y-8 bg-white/[0.01] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-24 h-24 bg-brand-primary/5 -translate-x-12 -translate-y-12 rotate-45" />
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-[0_0_15px_rgba(74,222,128,0.1)]">
                               <Target size={24} />
                            </div>
                            <div>
                               <h4 className="text-lg font-bold tracking-tight">الأهداف الاستراتيجية</h4>
                               <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Strategic Alignment</p>
                            </div>
                        </div>
                        <div className="text-right">
                           <span className="text-4xl font-display font-black text-white/5 opacity-40">{goals.filter(g => (selectedHiea.goalIds || []).includes(g.id) || g.hieaId === selectedHiea.id).length}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 relative z-10">
                        {goals.filter(g => (selectedHiea.goalIds || []).includes(g.id) || g.hieaId === selectedHiea.id).map(g => (
                          <motion.button 
                            key={g.id} 
                            whileHover={{ x: -10 }}
                            onClick={() => navigate('/dashboard/goals')}
                            className="p-4 bg-white/5 rounded-none border border-white/5 flex items-center justify-between hover:bg-brand-primary/5 hover:border-brand-primary/20 transition-all group w-full text-right"
                          >
                            <div className="flex items-center gap-4 flex-row-reverse">
                              <div className="w-2 h-2 bg-brand-primary shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                              <span className="font-bold text-slate-300 group-hover:text-brand-primary transition-colors">{g.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">View Detail</span>
                                <ArrowRight size={12} className="text-brand-primary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                            </div>
                          </motion.button>
                        ))}
                        {goals.filter(g => (selectedHiea.goalIds || []).includes(g.id) || g.hieaId === selectedHiea.id).length === 0 && (
                            <div className="py-12 text-center bg-white/[0.02] border border-dashed border-white/10">
                               <p className="text-xs font-bold text-slate-700 italic uppercase tracking-[0.2em]">لا توجد أهداف استراتيجية مرتبطة</p>
                            </div>
                        )}
                      </div>
                    </div>

                    <div className="p-10 glass rounded-none border border-white/5 space-y-8 bg-white/[0.01] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-24 h-24 bg-brand-secondary/5 -translate-x-12 -translate-y-12 rotate-45" />
                      <div className="flex items-center justify-between relative z-10 text-right">
                         <div className="text-left">
                            <span className="text-4xl font-display font-black text-white/5 opacity-40">{projects.filter(p => goals.some(g => g.hieaId === selectedHiea.id && g.projectId === p.id)).length}</span>
                         </div>
                        <div className="flex items-center gap-4 flex-row-reverse">
                            <div className="w-12 h-12 rounded-none bg-brand-secondary/10 flex items-center justify-center text-brand-secondary shadow-[0_0_15px_rgba(45,212,191,0.1)]">
                               <Briefcase size={24} />
                            </div>
                            <div className="text-right">
                               <h4 className="text-lg font-bold tracking-tight">المبادرات والمشاريع</h4>
                               <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Operational Delivery</p>
                            </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 relative z-10">
                          {projects.filter(p => goals.some(g => g.hieaId === selectedHiea.id && g.projectId === p.id)).map(p => (
                             <motion.button 
                               key={p.id} 
                               whileHover={{ x: -10 }}
                               onClick={() => navigate('/dashboard/projects')}
                               className="p-4 bg-white/5 rounded-none border border-white/5 flex items-center gap-4 hover:bg-brand-secondary/5 hover:border-brand-secondary/20 transition-all group w-full text-right flex-row-reverse"
                             >
                               <div className="w-8 h-8 flex items-center justify-center bg-brand-secondary/10 text-brand-secondary group-hover:scale-110 transition-transform">
                                  <Activity size={16} />
                               </div>
                               <div className="flex-1 flex flex-col items-end">
                                  <span className="font-bold text-slate-300 group-hover:text-brand-secondary transition-colors truncate w-full">{p.name}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                     <div className="w-16 h-0.5 bg-white/5 overflow-hidden">
                                        <div className="h-full bg-brand-secondary" style={{ width: `${p.progress}%` }} />
                                     </div>
                                     <span className="text-[8px] font-black text-slate-600 font-mono">{p.progress}%</span>
                                  </div>
                               </div>
                             </motion.button>
                          ))}
                          {projects.filter(p => goals.some(g => g.hieaId === selectedHiea.id && g.projectId === p.id)).length === 0 && (
                             <div className="py-12 text-center bg-white/[0.02] border border-dashed border-white/10">
                                <p className="text-xs font-bold text-slate-700 italic uppercase tracking-[0.2em]">لا توجد مسارات تنفيذية مسجلة</p>
                             </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Editor Sections - NOW HORIZONTAL */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/5">
                            <Gavel size={16} />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">الأنظمة واللوائح المنظمة</h3>
                      </div>
                      
                      {isEditing ? (
                        <div className="bg-white rounded-none overflow-hidden text-brand-dark p-4 border-4 border-brand-primary/10 shadow-xl">
                          <ReactQuill theme="snow" value={editContent.laws} onChange={(val) => setEditContent({ ...editContent, laws: val })} modules={quillModules} />
                        </div>
                      ) : (
                        <div className="p-8 glass rounded-none border border-white/5 bg-white/[0.01] prose prose-invert prose-sm max-w-none shadow-inner min-h-[300px]" 
                             dangerouslySetInnerHTML={{ __html: selectedHiea.laws || '<p class="text-slate-700 italic text-center font-bold uppercase tracking-widest my-12 opacity-30">بانتظار صياغة الأنظمة واللوائح المنظمة لهذا الكيان...</p>' }} 
                        />
                      )}
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-none bg-brand-secondary/10 flex items-center justify-center text-brand-secondary shadow-lg shadow-brand-secondary/5">
                            <Book size={16} />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">مسارات العمل والإجراءات التنفيذية</h3>
                      </div>
                      
                      {isEditing ? (
                        <div className="bg-white rounded-none overflow-hidden text-brand-dark p-4 border-4 border-brand-secondary/10 shadow-xl">
                          <ReactQuill theme="snow" value={editContent.procedures} onChange={(val) => setEditContent({ ...editContent, procedures: val })} modules={quillModules} />
                        </div>
                      ) : (
                        <div className="p-8 glass rounded-none border border-white/5 bg-white/[0.01] prose prose-invert prose-sm max-w-none shadow-inner min-h-[300px]" 
                             dangerouslySetInnerHTML={{ __html: selectedHiea.procedures || '<p class="text-slate-700 italic text-center font-bold uppercase tracking-widest my-12 opacity-30">بانتظار تحديد الإجراءات والمسارات التشغيلية المعتمدة...</p>' }} 
                        />
                      )}
                    </section>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Hiea Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="تأسيس هيئة استراتيجية جديدة">
        <form onSubmit={handleSubmit} className="space-y-8 p-4 text-right">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">مسمى الهيئة الرسمي</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-none py-6 px-10 outline-none focus:border-brand-primary transition-all text-2xl font-bold text-white shadow-inner text-right"
                placeholder="مثال: المجلس الأعلى للتحول الرقمي..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">شعار الهيئة</label>
                <div className="flex gap-3 flex-row-reverse px-2">
                   <div className="flex-1 relative">
                      <LinkIcon size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input 
                        type="text" 
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-none py-4 pr-10 pl-6 outline-none focus:border-brand-primary transition-all text-[11px] text-white text-right"
                        placeholder="رابط الصورة..."
                      />
                   </div>
                   <button 
                     type="button"
                     onClick={() => createFileInputRef.current?.click()}
                     disabled={isUploading}
                     className="px-6 bg-white/5 border border-white/10 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/5 transition-all flex items-center gap-2 group/upload"
                   >
                     {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={18} className="group-hover/upload:scale-110 transition-transform" />}
                     <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">رفع</span>
                   </button>
                   <input type="file" ref={createFileInputRef} onChange={(e) => handleFileUpload(e, false)} accept="image/*" hidden />
                </div>
                {formData.logoUrl && (
                  <div className="mt-2 flex justify-end px-4">
                    <div className="w-16 h-16 border border-white/10 bg-white/5 p-2">
                       <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">وصف مختصر</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-none py-4 px-6 outline-none focus:border-brand-primary transition-all text-sm text-white text-right"
                  placeholder="أدخل مبررات الهيئة..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">أهم المنجزات</label>
              <div className="bg-white rounded-none p-2 text-brand-dark">
                <ReactQuill theme="snow" value={formData.achievements} onChange={(val) => setFormData({ ...formData, achievements: val })} modules={quillModules} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center px-4 flex-row-reverse">
                 <label className="block text-xs font-black uppercase text-slate-600 tracking-[0.2em]">ربط الأهداف الاستراتيجية</label>
                 <span className="text-[9px] font-black text-brand-primary uppercase opacity-60">Selection Required</span>
              </div>
              <div className="space-y-2 px-2">
                 <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-3 text-right">
                    <Search size={16} className="text-slate-600" />
                    <input 
                      type="text" 
                      placeholder="ابحث عن هدف استراتيجي لربطه..." 
                      className="bg-transparent border-none outline-none text-xs text-slate-400 w-full text-right font-medium"
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase();
                        const buttons = document.querySelectorAll('.new-goal-option');
                        buttons.forEach(btn => {
                          const text = btn.textContent?.toLowerCase() || '';
                          (btn as HTMLElement).style.display = text.includes(val) ? 'block' : 'none';
                        });
                      }}
                    />
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-6 glass rounded-none border border-white/5 overflow-y-auto max-h-[180px] custom-scrollbar">
                  {goals.map(goal => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          goalIds: formData.goalIds.includes(goal.id)
                            ? formData.goalIds.filter(id => id !== goal.id)
                            : [...formData.goalIds, goal.id]
                        });
                      }}
                      className={`new-goal-option p-4 text-[10px] font-black text-right transition-all border relative overflow-hidden group/nopt leading-relaxed ${
                        formData.goalIds.includes(goal.id)
                          ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-lg'
                          : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <span className="relative z-10">{goal.name}</span>
                      {formData.goalIds.includes(goal.id) && (
                         <div className="absolute top-1.5 left-1.5">
                            <div className="w-2.5 h-2.5 bg-brand-primary flex items-center justify-center">
                               <Check size={8} className="text-brand-dark" />
                            </div>
                         </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">سمات الهوية واللون المميز</label>
              <div className="flex flex-wrap gap-4 p-8 glass rounded-none border border-white/5 items-center justify-center">
                {['#4ade80', '#2dd4bf', '#3b82f6', '#8b5cf6', '#f43f5e', '#fbbf24'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-12 h-12 rounded-none border-4 transition-all ${formData.color === c ? 'scale-125 border-white shadow-2xl' : 'border-transparent opacity-30 hover:opacity-100 hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="w-px h-10 bg-white/10 mx-2" />
                <div className="relative group">
                   <input 
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-14 h-14 bg-transparent border-none outline-none cursor-pointer p-0 opacity-0 absolute inset-0 z-10"
                   />
                   <div 
                    className="w-14 h-14 border-4 border-white/20 group-hover:border-white transition-all flex items-center justify-center overflow-hidden shadow-lg"
                    style={{ backgroundColor: formData.color }}
                   >
                      <Plus size={20} className="text-white mix-blend-difference" />
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            type="submit"
            className="w-full bg-brand-primary text-brand-dark font-black uppercase tracking-[0.3em] py-7 rounded-none hover:scale-[1.02] active:scale-[0.98] transition-all neon-glow text-lg"
          >
            اعتماد وتأسيس الهيئة
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteConfirm.isOpen} 
        onClose={() => setDeleteConfirm({ isOpen: false, hieaId: null, name: '' })}
        title="تأكيد الحذف النهائي للهيئة"
      >
        <div className="text-right space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-none">
            <AlertCircle className="text-red-500 shrink-0" size={24} />
            <div className="space-y-1">
              <p className="text-sm text-slate-300 font-bold">حذف الهيئة الاستراتيجية: {deleteConfirm.name}</p>
              <p className="text-[11px] text-slate-500 font-medium">
                تحذير: سيتم حذف كافة اللوائح والأنظمة والإجراءات المسجلة لهذا الكيان نهائياً. هذا الإجراء غير قابل للتراجع.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button 
              onClick={handleDelete}
              className="flex-1 bg-red-600 text-white font-black py-4 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
            >
              نعم، أحذف الهيئة نهائياً
            </button>
            <button 
              onClick={() => setDeleteConfirm({ isOpen: false, hieaId: null, name: '' })}
              className="flex-1 bg-white/5 text-slate-400 font-black py-4 hover:bg-white/10 border border-white/5 transition-all"
            >
              إلغاء العملية
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
