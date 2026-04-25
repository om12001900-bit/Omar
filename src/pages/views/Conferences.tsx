import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Presentation, 
  Calendar, 
  MapPin, 
  Layers, 
  Briefcase, 
  Target, 
  Trash2, 
  ChevronLeft, 
  Edit2, 
  Check, 
  Link as LinkIcon,
  Search
} from 'lucide-react';
import { useConferences, useHieas, useProjects, useGoals } from '../../hooks/useData';
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

import { Conference } from '../../types';

export default function Conferences() {
  const { conferences } = useConferences();
  const { hieas } = useHieas();
  const { projects } = useProjects();
  const { goals } = useGoals();
  const { user } = useAuth();
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedConf, setSelectedConf] = useState<Conference | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'desc' | 'agenda' | 'related'>('desc');

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    agenda: '',
    hieaId: '',
    projectId: '',
    goalId: '',
  });

  const [editData, setEditData] = useState<Partial<Conference>>({
    name: '',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    agenda: '',
    hieaId: '',
    projectId: '',
    goalId: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; confId: string | null; name: string }>({
    isOpen: false,
    confId: null,
    name: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
      agenda: '',
      hieaId: '',
      projectId: '',
      goalId: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'conferences'), {
        ...formData,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedConf) return;
    try {
      await updateDoc(doc(db, 'conferences', selectedConf.id), {
        ...editData,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      setSelectedConf({ ...selectedConf, ...editData });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteConf = async () => {
    if (!deleteConfirm.confId) return;
    try {
      await deleteDoc(doc(db, 'conferences', deleteConfirm.confId));
      if (selectedConf?.id === deleteConfirm.confId) setSelectedConf(null);
      setDeleteConfirm({ isOpen: false, confId: null, name: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, conf: Conference) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, confId: conf.id, name: conf.name });
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden text-right">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 py-4 shrink-0">
        <div className="text-right">
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">إدارة المؤتمرات والمعارض</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">تنظيم الفعاليات الإستراتيجية وربطها بالهيئات والمبادرات التنفيذية</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="w-full md:w-auto bg-brand-primary text-brand-dark font-black px-6 py-3 rounded-none flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 shadow-lg shadow-brand-primary/10 transition-all group"
        >
          <span className="text-base">إضافة فعالية جديدة</span>
          <div className="w-8 h-8 rounded-none bg-brand-dark/10 flex items-center justify-center group-hover:rotate-90 transition-transform">
            <Plus size={18} strokeWidth={3} />
          </div>
        </button>
      </div>

      <div className="flex-1 relative min-h-0">
        <AnimatePresence mode="wait">
          {!selectedConf ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-3 h-full bg-white/[0.01] border-l border-white/5 p-5 flex flex-col min-h-0 transition-all">
                <div className="flex items-center justify-between mb-6 px-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em]">سجل الفعاليات</h3>
                  <span className="text-[10px] bg-white/5 px-4 py-1.5 rounded-none text-slate-500 font-black">{conferences.length} مسجل</span>
                </div>
                
                <div className="mb-4 px-1">
                   <div className="flex items-center bg-white/5 border border-white/5 px-4 py-2 hover:border-white/10 transition-all focus-within:border-brand-primary/30">
                      <Search size={14} className="text-slate-600" />
                      <input 
                        type="text"
                        placeholder="ابحث عن فعالية..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-slate-300 placeholder:text-slate-600 text-right w-full px-2"
                      />
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 px-1 custom-scrollbar pb-6 relative">
                  {conferences
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((conf) => (
                    <div
                      key={conf.id}
                      onClick={() => {
                        setSelectedConf(conf);
                        setEditData({
                          name: conf.name,
                          startDate: conf.startDate || '',
                          endDate: conf.endDate || '',
                          location: conf.location || '',
                          description: conf.description || '',
                          agenda: conf.agenda || '',
                          hieaId: conf.hieaId || '',
                          projectId: conf.projectId || '',
                          goalId: conf.goalId || '',
                        });
                        setIsEditing(false);
                        setActiveTab('desc');
                      }}
                      className={`w-full text-right p-4 rounded-none transition-all border relative overflow-hidden group cursor-pointer ${
                        selectedConf?.id === conf.id 
                        ? 'bg-white/[0.04] border-brand-primary/30 shadow-lg' 
                        : 'bg-white/[0.02] border-transparent hover:border-white/5'
                      }`}
                      style={{ borderColor: selectedConf?.id === conf.id ? (hieas.find(h => h.id === conf.hieaId)?.color || '#f59e0b') : undefined }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Presentation 
                            size={14} 
                            className="text-brand-primary" 
                            style={{ color: hieas.find(h => h.id === conf.hieaId)?.color }}
                          />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            {conf.startDate} {conf.endDate && conf.endDate !== conf.startDate && `- ${conf.endDate}`}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mb-1">{conf.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600">
                        <MapPin size={10} />
                        <span>{conf.location}</span>
                      </div>
                      
                      <button 
                        onClick={(e) => openDeleteConfirm(e, conf)}
                        className="absolute left-2 top-2 p-1.5 bg-red-500/5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 border border-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {conferences.length === 0 && (
                    <div className="text-center py-20 opacity-10">
                      <Presentation size={48} className="mx-auto mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">لا توجد فعاليات</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex lg:col-span-9 h-full flex flex-col items-center justify-center text-slate-800 p-6 text-center">
                <Presentation size={80} className="opacity-5 mb-6" />
                <h3 className="text-xl font-display font-black opacity-20 tracking-[0.4em] uppercase leading-relaxed">
                  إدارة الفعاليات الاستراتيجية<br />
                  Conference Management
                </h3>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full flex flex-col min-h-0 relative overflow-hidden bg-transparent"
            >
              <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <button 
                  onClick={() => setSelectedConf(null)}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-none text-slate-300 font-black text-xs transition-all shadow-lg shadow-black/20 group"
                >
                  <ChevronLeft className="rtl-flip group-hover:-translate-x-1 transition-transform" size={18} /> 
                  الرجوع للسجل
                </button>
                <div className="flex items-center gap-3 text-left">
                  <div className="text-right hidden md:block">
                     <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] font-display">Event System</p>
                     <p className="text-[10px] text-brand-primary font-bold">Strategic event oversight O.V.9</p>
                  </div>
                  <div className="w-8 h-8 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Presentation size={16} />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                        <div 
                          className="w-16 h-16 md:w-20 md:h-20 rounded-none bg-brand-primary/10 border-2 border-brand-primary/20 flex items-center justify-center text-brand-primary transition-all shrink-0"
                          style={{ borderColor: hieas.find(h => h.id === selectedConf.hieaId)?.color, color: hieas.find(h => h.id === selectedConf.hieaId)?.color, backgroundColor: hieas.find(h => h.id === selectedConf.hieaId)?.color ? `${hieas.find(h => h.id === selectedConf.hieaId)?.color}1a` : undefined }}
                        >
                          <Presentation size={32} />
                        </div>
                        <div className="space-y-1 text-right">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="bg-white/5 border border-white/10 rounded-none px-6 py-2 text-xl font-display font-bold text-white outline-none focus:border-brand-primary w-full md:w-[400px]"
                            />
                          ) : (
                            <h2 className="text-2xl md:text-4xl font-display font-black text-white leading-tight tracking-tight">{selectedConf.name}</h2>
                          )}
                          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2 flex-wrap justify-end">
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-brand-primary" />
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="date"
                                    value={editData.startDate}
                                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                    className="bg-white/5 border border-white/10 px-2 py-1 outline-none text-slate-300"
                                  />
                                  <span>-</span>
                                  <input 
                                    type="date"
                                    value={editData.endDate}
                                    onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                                    className="bg-white/5 border border-white/10 px-2 py-1 outline-none text-slate-300"
                                  />
                                </div>
                              ) : (
                                <span>{selectedConf.startDate} {selectedConf.endDate && selectedConf.endDate !== selectedConf.startDate && `- ${selectedConf.endDate}`}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-brand-primary" />
                              {isEditing ? (
                                <input 
                                  type="text"
                                  value={editData.location}
                                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                  className="bg-white/5 border border-white/10 px-2 py-1 outline-none text-slate-300 text-right"
                                />
                              ) : (
                                <span>{selectedConf.location}</span>
                              )}
                            </div>
                          </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
                        className={`px-8 py-3 rounded-none font-black text-xs flex items-center justify-center gap-2 transition-all ${
                          isEditing ? 'bg-brand-primary text-brand-dark' : 'bg-white/5 border border-white/10 text-slate-200'
                        }`}
                      >
                        {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                        {isEditing ? 'حفظ التغييرات' : 'تعديل الفعالية'}
                      </button>
                      {!isEditing && (
                        <button 
                          onClick={(e) => openDeleteConfirm(e, selectedConf)}
                          className="px-8 py-3 rounded-none border border-red-500/20 text-red-500 hover:bg-red-500/10 font-black flex items-center justify-center gap-2 transition-all"
                        >
                          <Trash2 size={16} />
                          حذف الفعالية
                        </button>
                      )}
                      {isEditing && (
                        <button onClick={() => setIsEditing(false)} className="px-8 py-3 rounded-none bg-white/5 text-slate-500 font-black text-xs">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    {/* Tabs Navigation */}
                    <div className="flex border-b border-white/5 mb-8">
                      {[
                        { id: 'desc', label: 'الوصف', icon: Presentation },
                        { id: 'agenda', label: 'جدول الأعمال', icon: Calendar },
                        { id: 'related', label: 'الارتباطات', icon: LinkIcon }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as 'desc' | 'agenda' | 'related')}
                          className={`flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                            activeTab === tab.id ? 'text-brand-primary' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <tab.icon size={14} />
                          {tab.label}
                          {activeTab === tab.id && (
                            <motion.div layoutId="activeTabConf" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                          )}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {activeTab === 'desc' && (
                        <motion.div
                          key="desc-tab"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="glass p-8 rounded-none border border-white/5 bg-white/[0.01] min-h-[400px]"
                        >
                          <h4 className="text-lg font-bold mb-6 text-white tracking-tight">وصف الفعالية</h4>
                          {isEditing ? (
                            <textarea 
                              value={editData.description}
                              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 p-6 text-sm text-slate-300 outline-none min-h-[300px] resize-none text-right"
                              placeholder="أدخل وصفاً تفصيلياً للفعالية..."
                            />
                          ) : (
                            <div className="text-sm text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                              {selectedConf.description || 'لا يتوفر وصف تفصيلي لهذه الفعالية حالياً.'}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {activeTab === 'agenda' && (
                        <motion.div
                          key="agenda-tab"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="glass p-8 rounded-none border border-white/5 bg-white/[0.01] min-h-[400px]"
                        >
                          <h4 className="text-lg font-bold mb-6 text-white tracking-tight">برنامج وجدول الأعمال</h4>
                          {isEditing ? (
                            <textarea 
                              value={editData.agenda}
                              onChange={(e) => setEditData({ ...editData, agenda: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 p-6 text-sm text-slate-300 outline-none min-h-[300px] resize-none text-right placeholder:text-slate-700"
                              placeholder="أدخل برنامج الفعالية وسجل الجلسات..."
                            />
                          ) : (
                            <div className="text-sm text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                              {selectedConf.agenda || 'لم يتم تسجيل جدول أعمال لهذه الفعالية بعد.'}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {activeTab === 'related' && (
                        <motion.div
                          key="related-tab"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        >
                          <div className="glass p-6 rounded-none border border-white/5 bg-white/[0.01] space-y-2">
                             <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">الهيئة المرتبطة</label>
                             {isEditing ? (
                               <select 
                                 value={editData.hieaId}
                                 onChange={(e) => setEditData({ ...editData, hieaId: e.target.value })}
                                 className="w-full bg-white/5 border border-white/10 p-4 text-xs text-slate-300 outline-none mt-2"
                               >
                                 <option value="" className="bg-slate-900">غير مرتبط...</option>
                                 {hieas.map(h => <option key={h.id} value={h.id} className="bg-slate-900">{h.name}</option>)}
                               </select>
                             ) : (
                               <div className="p-4 bg-white/5 border border-white/5 flex items-center gap-4 mt-2">
                                 <Layers size={16} className="text-brand-primary" />
                                 <span className="text-sm font-bold text-slate-200">{hieas.find(h => h.id === selectedConf.hieaId)?.name || 'غير مخصص'}</span>
                               </div>
                             )}
                          </div>

                          <div className="glass p-6 rounded-none border border-white/5 bg-white/[0.01] space-y-2">
                             <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">المبادرة المرتبطة</label>
                             {isEditing ? (
                               <select 
                                 value={editData.projectId}
                                 onChange={(e) => setEditData({ ...editData, projectId: e.target.value })}
                                 className="w-full bg-white/5 border border-white/10 p-4 text-xs text-slate-300 outline-none mt-2"
                               >
                                 <option value="" className="bg-slate-900">غير مرتبط...</option>
                                 {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                               </select>
                             ) : (
                               <div className="p-4 bg-white/5 border border-white/5 flex items-center gap-4 mt-2">
                                 <Briefcase size={16} className="text-brand-secondary" />
                                 <span className="text-sm font-bold text-slate-200">{projects.find(p => p.id === selectedConf.projectId)?.name || 'غير مخصص'}</span>
                               </div>
                             )}
                          </div>

                          <div className="glass p-6 rounded-none border border-white/5 bg-white/[0.01] space-y-2">
                             <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">الهدف المرتبط</label>
                             {isEditing ? (
                               <select 
                                 value={editData.goalId}
                                 onChange={(e) => setEditData({ ...editData, goalId: e.target.value })}
                                 className="w-full bg-white/5 border border-white/10 p-4 text-xs text-slate-300 outline-none mt-2"
                               >
                                 <option value="" className="bg-slate-900">غير مرتبط...</option>
                                 {goals.map(g => <option key={g.id} value={g.id} className="bg-slate-900">{g.name}</option>)}
                               </select>
                             ) : (
                               <div className="p-4 bg-white/5 border border-white/5 flex items-center gap-4 mt-2">
                                 <Target size={16} className="text-red-400" />
                                 <span className="text-sm font-bold text-slate-200">{goals.find(g => g.id === selectedConf.goalId)?.name || 'غير مخصص'}</span>
                               </div>
                             )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="تنسيق مؤتمر أو حدث صاعد">
        <form onSubmit={handleSubmit} className="space-y-6 p-4 text-right">
          <div className="space-y-4">
            <label className="block text-xs font-black uppercase text-slate-600 px-2 tracking-widest">مسمى الفعالية</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 py-5 px-8 outline-none text-xl font-bold text-white text-right"
              placeholder="مشروع مؤتمر..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-600 px-2 tracking-widest text-right">تاريخ الانتهاء</label>
              <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full bg-white/5 border border-white/10 py-4 px-6 text-slate-300" required />
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-600 px-2 tracking-widest text-right">تاريخ البدء</label>
              <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-white/5 border border-white/10 py-4 px-6 text-slate-300" required />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black uppercase text-slate-600 px-2 tracking-widest">الموقع / القاعة</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full bg-white/5 border border-white/10 py-4 px-6 text-slate-300 text-right" placeholder="مقر الانعقاد..." required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-600 px-2 tracking-widest">الهيئة</label>
              <select value={formData.hieaId} onChange={(e) => setFormData({ ...formData, hieaId: e.target.value })} className="w-full bg-white/5 border border-white/10 py-4 px-6 text-slate-300 appearance-none text-right">
                <option value="" className="bg-slate-900">ربط بهيئة...</option>
                {hieas.map(h => <option key={h.id} value={h.id} className="bg-slate-900">{h.name}</option>)}
              </select>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-600 px-2 tracking-widest">المبادرة</label>
              <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full bg-white/5 border border-white/10 py-4 px-6 text-slate-300 appearance-none text-right">
                <option value="" className="bg-slate-900">ربط بمشروع...</option>
                {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-600 px-2 tracking-widest">الهدف</label>
              <select value={formData.goalId} onChange={(e) => setFormData({ ...formData, goalId: e.target.value })} className="w-full bg-white/5 border border-white/10 py-4 px-6 text-slate-300 appearance-none text-right">
                <option value="" className="bg-slate-900">ربط بهدف...</option>
                {goals.map(g => <option key={g.id} value={g.id} className="bg-slate-900">{g.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black uppercase text-slate-600 px-2 tracking-widest">الوصف والبرنامج</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-white/5 border border-white/10 py-5 px-8 min-h-[120px] resize-none text-slate-300 text-right" placeholder="وصف موجز للفعالية..." />
              <textarea value={formData.agenda} onChange={(e) => setFormData({ ...formData, agenda: e.target.value })} className="w-full bg-white/5 border border-white/10 py-5 px-8 min-h-[120px] resize-none text-slate-300 text-right" placeholder="جدول أعمال محتمل..." />
            </div>
          </div>

          <button type="submit" className="w-full bg-brand-primary text-brand-dark font-black uppercase tracking-[0.3em] py-6 text-lg hover:scale-[1.02] transition-all">تثبيت الفعالية في الجدول</button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteConfirm.isOpen} 
        onClose={() => setDeleteConfirm({ isOpen: false, confId: null, name: '' })}
        title="تأكيد حذف الفعالية"
      >
        <div className="text-right space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-none">
            <Presentation className="text-red-500 shrink-0" size={24} />
            <div className="space-y-1">
              <p className="text-sm text-slate-300 font-bold">حذف الفعالية: {deleteConfirm.name}</p>
              <p className="text-[11px] text-slate-500 font-medium whitespace-pre-wrap">
                هل أنت متأكد من رغبتك في حذف هذه الفعالية نهائياً؟ سيتم إزالة كافة البيانات المرتبطة بها.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button 
              onClick={deleteConf}
              className="flex-1 bg-red-600 text-white font-black py-4 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
            >
              نعم، أحذف الفعالية نهائياً
            </button>
            <button 
              onClick={() => setDeleteConfirm({ isOpen: false, confId: null, name: '' })}
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
