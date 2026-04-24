import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid,
  GanttChart,
  Shield,
  Target,
  AlertCircle,
  Plus, 
  Briefcase, 
  Layers,
  Calendar, 
  CheckCircle2, 
  ListTodo, 
  Trash2, 
  ChevronLeft, 
  Edit2, 
  Check, 
  X
} from 'lucide-react';
import { useProjects, useGoals, useHieas } from '../../hooks/useData';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import { ProjectStatus } from '../../types';
import ProjectGantt from '../../components/ProjectGantt';
import ProjectIcon, { availableIcons } from '../../components/ProjectIcon';

export default function Projects() {
  const { projects } = useProjects();
  const { goals } = useGoals();
  const { hieas } = useHieas();
  const { user } = useAuth();
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [viewType, setViewType] = useState<'grid' | 'timeline'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; projectId: string | null }>({
    isOpen: false,
    projectId: null
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: ProjectStatus.IN_PROGRESS,
    progress: 0,
    hieaId: '',
    goalId: '',
    tags: [] as string[],
    icon: 'Briefcase',
  });

  const [editData, setEditData] = useState<any>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: ProjectStatus.IN_PROGRESS,
    progress: 0,
    milestones: [],
    hieaId: '',
    goalId: '',
    tags: [] as string[],
    icon: 'Briefcase',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: ProjectStatus.IN_PROGRESS,
      progress: 0,
      hieaId: '',
      goalId: '',
      tags: [],
      icon: 'Briefcase',
    });
    setNewTag('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'projects'), {
        ...formData,
        milestones: [],
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
    if (!selectedProject) return;
    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        ...editData,
        updatedAt: serverTimestamp(),
      });
      setIsEditing(false);
      setSelectedProject({ ...selectedProject, ...editData });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProject = async () => {
    if (!deleteConfirm.projectId) return;
    try {
      await deleteDoc(doc(db, 'projects', deleteConfirm.projectId));
      if (selectedProject?.id === deleteConfirm.projectId) setSelectedProject(null);
      setDeleteConfirm({ isOpen: false, projectId: null });
    } catch (err) {
      console.error(err);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, projectId: id });
  };

  const addMilestone = () => {
    setEditData({
      ...editData,
      milestones: [...editData.milestones, { title: '', date: '', completed: false, id: Date.now() }]
    });
  };

  const updateMilestone = (id: number, updates: any) => {
    setEditData({
      ...editData,
      milestones: editData.milestones.map((m: any) => m.id === id ? { ...m, ...updates } : m)
    });
  };

  const removeMilestone = (id: number) => {
    setEditData({
      ...editData,
      milestones: editData.milestones.filter((m: any) => m.id !== id)
    });
  };

  const handleAddTag = (isEdit: boolean) => {
    const tag = newTag.trim();
    if (!tag) return;
    
    if (isEdit) {
      if (!editData.tags.includes(tag)) {
        setEditData({ ...editData, tags: [...editData.tags, tag] });
      }
    } else {
      if (!formData.tags.includes(tag)) {
        setFormData({ ...formData, tags: [...formData.tags, tag] });
      }
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string, isEdit: boolean) => {
    if (isEdit) {
      setEditData({ ...editData, tags: editData.tags.filter((t: string) => t !== tag) });
    } else {
      setFormData({ ...formData, tags: formData.tags.filter((t: string) => t !== tag) });
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden text-right">
      {/* Header section with high-contrast typography and clear call-to-action */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 py-6 shrink-0 border-b border-white/5 mb-4">
        <div className="text-right">
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight leading-none">المشاريع التنفيذية</h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">تنسيق المبادرات الميدانية وتحديث مسارات الإنجاز بصورة تفاعلية</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-none border border-white/5">
            <button 
              onClick={() => setViewType('grid')}
              className={`p-2 transition-all ${viewType === 'grid' ? 'bg-brand-secondary text-brand-dark shadow-lg shadow-brand-secondary/20' : 'text-slate-500 hover:text-slate-300'}`}
              title="عرض الشبكة"
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewType('timeline')}
              className={`p-2 transition-all ${viewType === 'timeline' ? 'bg-brand-secondary text-brand-dark shadow-lg shadow-brand-secondary/20' : 'text-slate-500 hover:text-slate-300'}`}
              title="عرض الجدول الزمني"
            >
              <GanttChart size={20} />
            </button>
          </div>
          <button 
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="w-full md:w-auto bg-brand-primary text-brand-dark font-black px-6 py-3 rounded-none flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 shadow-lg shadow-brand-primary/10 transition-all group"
          >
            <span className="text-base">إطلاق مشروع جديد</span>
            <div className="w-8 h-8 rounded-none bg-brand-dark/10 flex items-center justify-center group-hover:rotate-90 transition-transform">
              <Plus size={18} strokeWidth={3} />
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 bg-transparent">
        <AnimatePresence mode="wait">
          {!selectedProject ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col pt-4 overflow-hidden"
            >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 px-2 shrink-0">
                  <div className="flex flex-col gap-6 w-full lg:w-auto">
                    <div className="flex flex-wrap items-center gap-3">
                      {[
                        { id: 'all', label: 'كافة المشاريع' },
                        { id: ProjectStatus.UPCOMING, label: 'قيد التخطيط' },
                        { id: ProjectStatus.IN_PROGRESS, label: 'نشطة حالياً' },
                        { id: ProjectStatus.COMPLETED, label: 'مبادرات منجزة' }
                      ].map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => setFilterStatus(filter.id as any)}
                          className={`px-6 py-2.5 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border ${
                            filterStatus === filter.id 
                            ? 'bg-brand-secondary/10 border-brand-secondary/40 text-brand-secondary ring-1 ring-brand-secondary/20' 
                            : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {/* Tag Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black uppercase text-slate-700 tracking-widest ml-4">تصفية حسب الوسم:</span>
                      <button
                        onClick={() => setSelectedTag('all')}
                        className={`px-4 py-1.5 rounded-none text-[8px] font-bold uppercase transition-all border ${
                          selectedTag === 'all' 
                          ? 'bg-white/10 border-white/20 text-white' 
                          : 'bg-white/[0.02] border-transparent text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        الكل
                      </button>
                      {Array.from(new Set(projects.flatMap(p => p.tags || []))).map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`px-4 py-1.5 rounded-none text-[8px] font-bold uppercase transition-all border ${
                            selectedTag === tag 
                            ? 'bg-brand-secondary/20 border-brand-secondary/40 text-brand-secondary' 
                            : 'bg-white/[0.02] border-transparent text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white/5 border border-white/5 px-4 py-2 hover:border-white/10 transition-all focus-within:border-brand-secondary/30">
                       <input 
                         type="text"
                         placeholder="بحث في المبادرات..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="bg-transparent border-none outline-none text-xs text-slate-300 placeholder:text-slate-600 text-right w-48"
                       />
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest bg-white/5 px-4 py-2 border border-white/5">
                      سجلات: {projects.filter(p => (filterStatus === 'all' || p.status === filterStatus) && (selectedTag === 'all' || p.tags?.includes(selectedTag))).length}
                    </span>
                  </div>
                </div>

              {/* Responsive Grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 px-2">
                {viewType === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {projects
                      .filter(p => 
                        (filterStatus === 'all' || p.status === filterStatus) && 
                        (selectedTag === 'all' || p.tags?.includes(selectedTag)) &&
                        (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                      )
                      .map((project) => (
                      <motion.div
                        layout
                        key={project.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group cursor-pointer"
                        onClick={() => {
                          setSelectedProject(project);
                          setEditData({
                            name: project.name,
                            description: project.description || '',
                            startDate: project.startDate || '',
                            endDate: project.endDate || '',
                            status: project.status || ProjectStatus.IN_PROGRESS,
                            progress: project.progress || 0,
                            milestones: project.milestones || [],
                            hieaId: project.hieaId || '',
                            goalId: project.goalId || '',
                            tags: project.tags || [],
                            icon: project.icon || 'Briefcase',
                          });
                          setIsEditing(false);
                        }}
                      >
                        <div className="relative h-full bg-white/[0.02] border border-white/5 p-8 transition-all hover:bg-white/[0.04] hover:border-brand-secondary/30 hover:translate-y-[-4px] overflow-hidden">
                          {/* Status Accent Line */}
                          <div 
                            className={`absolute top-0 right-0 left-0 h-[2px] transition-all bg-brand-secondary/20 group-hover:bg-brand-secondary`} 
                            style={{ backgroundColor: hieas.find(h => h.id === project.hieaId)?.color }}
                          />
                          
                          <div className="flex items-center justify-between mb-8">
                            <div 
                              className={`w-12 h-12 rounded-none flex items-center justify-center bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20`}
                              style={{ borderColor: hieas.find(h => h.id === project.hieaId)?.color, color: hieas.find(h => h.id === project.hieaId)?.color }}
                            >
                              <ProjectIcon name={project.icon} size={20} />
                            </div>
                            <div className="flex flex-col items-end">
                              <span 
                                className="text-xl font-display font-black text-white/40 tracking-tighter group-hover:text-brand-secondary/60 transition-colors"
                                style={{ color: hieas.find(h => h.id === project.hieaId)?.color ? `${hieas.find(h => h.id === project.hieaId)?.color}66` : undefined }}
                              >
                                {project.progress}%
                              </span>
                              <div className="w-24 h-2 bg-white/5 mt-1 rounded-none overflow-hidden border border-white/5 relative">
                                 {/* Dynamic Glow Layer */}
                                 <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                    style={{ width: `${project.progress}%`, backgroundColor: hieas.find(h => h.id === project.hieaId)?.color }}
                                    className="absolute inset-0 bg-brand-secondary/20 blur-md pointer-events-none"
                                 />
                                 
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${project.progress}%` }}
                                    transition={{ duration: 1.2, ease: "circOut" }}
                                    className="h-full bg-gradient-to-l from-brand-secondary via-brand-secondary to-brand-primary relative z-10" 
                                    style={{ background: hieas.find(h => h.id === project.hieaId)?.color ? `linear-gradient(to left, ${hieas.find(h => h.id === project.hieaId)?.color}, ${hieas.find(h => h.id === project.hieaId)?.color}cc)` : undefined }}
                                 >
                                    {/* Glass Shimmer Effect */}
                                    <motion.div 
                                      animate={{ x: ['-200%', '200%'] }}
                                      transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                                    />
                                    
                                    {/* Tip Glow Pin */}
                                    <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-white shadow-[0_0_10px_#fff]" />
                                 </motion.div>
                              </div>
                            </div>
                          </div>

                          <h4 className="text-xl font-bold text-white mb-4 line-clamp-2 leading-tight group-hover:text-brand-secondary transition-colors">{project.name}</h4>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                              {project.tags?.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-brand-secondary/10 text-brand-secondary text-[8px] font-black uppercase tracking-tighter border border-brand-secondary/20">
                                  #{tag}
                                </span>
                              ))}
                          </div>
                          <p className="text-xs text-slate-500 mb-8 line-clamp-3 leading-relaxed min-h-[4.5em]">{project.description || 'لا يوجد وصف متاح لهذا المشروع حالياً.'}</p>
                          
                          <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                             <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-1">الحالة التنفيذية</span>
                                <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-tight">
                                  {project.status === 'completed' ? 'تم الإنجاز' : project.status === 'in-progress' ? 'نشط ميدانياً' : 'مرحلة التخطيط'}
                                </span>
                             </div>
                             <div className="flex gap-2">
                               <button 
                                 onClick={(e) => openDeleteConfirm(e, project.id)}
                                 className="p-3 text-red-500/50 hover:text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-all rounded-none border border-red-500/10"
                                 title="حذف المشروع"
                               >
                                 <Trash2 size={16} />
                               </button>
                               <button 
                                 className="p-3 text-brand-secondary/50 bg-brand-secondary/5 border border-brand-secondary/10 hover:text-brand-secondary hover:bg-brand-secondary/10 transition-all"
                                 onClick={() => {
                                   setSelectedProject(project);
                                   setEditData({
                                     name: project.name,
                                     description: project.description || '',
                                     startDate: project.startDate || '',
                                     endDate: project.endDate || '',
                                     status: project.status || ProjectStatus.IN_PROGRESS,
                                     progress: project.progress || 0,
                                     milestones: project.milestones || [],
                                     hieaId: project.hieaId || '',
                                     goalId: project.goalId || '',
                                     tags: project.tags || [],
                                     icon: project.icon || 'Briefcase',
                                   });
                                   setIsEditing(false);
                                 }}
                               >
                                 <ChevronLeft size={16} className="rtl-flip" />
                               </button>
                             </div>
                          </div>

                          {/* Background Decor */}
                          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-secondary/5 rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <ProjectGantt 
                    projects={projects.filter(p => 
                      (filterStatus === 'all' || p.status === filterStatus) &&
                      (selectedTag === 'all' || p.tags?.includes(selectedTag))
                    )} 
                    onProjectClick={(project) => {
                      setSelectedProject(project);
                      setEditData({
                        name: project.name,
                        description: project.description || '',
                        startDate: project.startDate || '',
                        endDate: project.endDate || '',
                        status: project.status || ProjectStatus.IN_PROGRESS,
                        progress: project.progress || 0,
                        milestones: project.milestones || [],
                        hieaId: project.hieaId || '',
                        goalId: project.goalId || '',
                        tags: project.tags || [],
                        icon: project.icon || 'Briefcase',
                      });
                      setIsEditing(false);
                    }}
                  />
                )}

                {projects.length === 0 && (
                  <div className="text-center py-40">
                    <div className="relative inline-block mb-8">
                       <div className="absolute inset-0 bg-brand-secondary/10 blur-[80px] animate-pulse" />
                       <Briefcase size={80} className="relative z-10 text-slate-800 opacity-20" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-500 opacity-20">بانتظار تأسيس أول مبادرة تنفيذية</p>
                  </div>
                )}
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
              {/* Specialized Detail Header with Back Button */}
              <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-sm z-20 shrink-0">
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-none text-slate-300 font-bold text-[11px] uppercase tracking-widest transition-all border border-white/10 group"
                >
                  <ChevronLeft className="rtl-flip group-hover:-translate-x-1 transition-transform text-brand-secondary" size={16} /> 
                  <span className="relative z-10">الرجوع للمبادرات</span>
                </button>
                <div className="flex items-center gap-4 flex-row-reverse">
                  <div className="w-10 h-10 rounded-none bg-brand-secondary/10 flex items-center justify-center text-brand-secondary border border-brand-secondary/20">
                    <ProjectIcon name={selectedProject.icon} size={20} />
                  </div>
                  <div className="text-right hidden md:block">
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none mb-1">Project Identity</p>
                     <p className="text-[10px] text-brand-secondary/80 font-bold">Initiative details under O.V.9 control</p>
                  </div>
                </div>
              </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center lg:items-start justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                        <div 
                          className="w-16 h-16 md:w-20 md:h-20 rounded-none flex items-center justify-center border-2 transition-all shrink-0 bg-brand-secondary/10 border-brand-secondary/40 text-brand-secondary shadow-[0_15px_30px_-10px_rgba(45,212,191,0.3)]"
                          style={{ borderColor: hieas.find(h => h.id === selectedProject.hieaId)?.color, color: hieas.find(h => h.id === selectedProject.hieaId)?.color, backgroundColor: hieas.find(h => h.id === selectedProject.hieaId)?.color ? `${hieas.find(h => h.id === selectedProject.hieaId)?.color}1a` : undefined }}
                        >
                          <ProjectIcon name={isEditing ? editData.icon : selectedProject.icon} size={32} />
                        </div>
                        <div className="space-y-4 max-w-2xl">
                          {isEditing ? (
                            <div className="space-y-4">
                              <input 
                                type="text"
                                value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-none px-6 py-2 text-xl font-display font-bold text-white outline-none focus:border-brand-secondary w-full md:w-[400px]"
                              />
                              <select 
                                value={editData.status}
                                onChange={(e) => setEditData({ ...editData, status: e.target.value as ProjectStatus })}
                                className="bg-white/5 border border-white/10 rounded-none px-6 py-2 text-sm text-slate-300 outline-none focus:border-brand-secondary w-full md:w-[400px] appearance-none"
                              >
                                <option value={ProjectStatus.UPCOMING} className="bg-slate-900">قيد التخطيط</option>
                                <option value={ProjectStatus.IN_PROGRESS} className="bg-slate-900">قيد التنفيذ</option>
                                <option value={ProjectStatus.COMPLETED} className="bg-slate-900">مكتمل</option>
                              </select>
                              <select 
                                value={editData.hieaId}
                                onChange={(e) => setEditData({ ...editData, hieaId: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-none px-6 py-2 text-sm text-slate-300 outline-none focus:border-brand-secondary w-full md:w-[400px] appearance-none"
                              >
                                <option value="" className="bg-slate-900">ربط بهيئة جديدة...</option>
                                {hieas.map(h => <option key={h.id} value={h.id} className="bg-slate-900">{h.name}</option>)}
                              </select>
                              <select 
                                value={editData.goalId}
                                onChange={(e) => setEditData({ ...editData, goalId: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-none px-6 py-2 text-sm text-slate-300 outline-none focus:border-brand-secondary w-full md:w-[400px] appearance-none"
                              >
                                <option value="" className="bg-slate-900">ربط بهدف استراتيجي...</option>
                                {goals.map(g => <option key={g.id} value={g.id} className="bg-slate-900">{g.name}</option>)}
                              </select>

                              <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">أيقونة المشروع</label>
                                <div className="grid grid-cols-5 md:grid-cols-8 gap-2 p-2 bg-white/5 border border-white/10">
                                  {availableIcons.map(({ id, icon: Icon }) => (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => setEditData({ ...editData, icon: id })}
                                      className={`p-2 flex items-center justify-center transition-all ${
                                        editData.icon === id 
                                        ? 'bg-brand-secondary text-brand-dark shadow-lg shadow-brand-secondary/20 scale-110' 
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                      }`}
                                      title={id}
                                    >
                                      <Icon size={16} />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-4">
                                 <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">التصنيفات والوسوم</label>
                                 <div className="flex gap-2">
                                   <input 
                                     type="text" 
                                     value={newTag}
                                     onChange={(e) => setNewTag(e.target.value)}
                                     onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(true))}
                                     className="flex-1 bg-white/5 border border-white/10 rounded-none py-2 px-4 outline-none focus:border-brand-secondary text-sm text-slate-300 font-bold text-right"
                                     placeholder="أضف وسم جديد..."
                                    />
                                   <button 
                                     type="button" 
                                     onClick={() => handleAddTag(true)}
                                     className="px-4 bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 font-black text-[10px]"
                                    >
                                     إضافة
                                   </button>
                                 </div>
                                 <div className="flex flex-wrap gap-2">
                                   {editData.tags.map((tag: string) => (
                                     <span key={tag} className="flex items-center gap-2 bg-brand-secondary/10 text-brand-secondary px-3 py-1 text-[8px] font-black uppercase tracking-widest border border-brand-secondary/20">
                                       {tag}
                                       <button type="button" onClick={() => handleRemoveTag(tag, true)} className="hover:text-white transition-colors">
                                         <X size={8} />
                                       </button>
                                     </span>
                                   ))}
                                 </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <h2 className="text-3xl md:text-5xl font-display font-black text-white leading-tight tracking-tight mb-2">{selectedProject.name}</h2>
                              <div className="flex flex-wrap gap-2 justify-center md:justify-start flex-row-reverse mb-4">
                                {selectedProject.hieaId && (
                                  <motion.p 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-[10px] text-brand-primary font-black uppercase tracking-widest bg-brand-primary/10 border border-brand-primary/20 px-3 py-1.5"
                                  >
                                    {hieas.find(h => h.id === selectedProject.hieaId)?.name}
                                  </motion.p>
                                )}
                                {selectedProject.goalId && (
                                  <motion.p 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-[10px] text-brand-secondary font-black uppercase tracking-widest bg-brand-secondary/10 border border-brand-secondary/20 px-3 py-1.5"
                                  >
                                    {goals.find(g => g.id === selectedProject.goalId)?.name}
                                  </motion.p>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 py-2 border-y border-white/[0.03]">
                            <div className="flex items-center gap-2 flex-row-reverse">
                              <span className="w-1.5 h-1.5 bg-brand-secondary shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">O.V.9 STRATEGIC INITIATIVE</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                            <span className="px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-brand-secondary">
                                 مسارات التنفيذ الرسمية
                            </span>
                            <span className="text-xs text-slate-600 font-bold">•</span>
                            <span className="text-xs text-slate-600 font-black uppercase tracking-widest">O.V.9 Initiative</span>
                          </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full md:w-auto">
                        <button 
                        onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
                        className={`w-full px-10 py-5 rounded-none font-black flex items-center justify-center gap-3 transition-all ${
                          isEditing ? 'bg-brand-secondary text-brand-dark shadow-2xl shadow-brand-secondary/20' : 'bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200'
                        }`}
                        >
                          {isEditing ? <Check size={24} /> : <Edit2 size={20} />}
                          {isEditing ? 'حفظ التغييرات' : 'تعديل البيانات'}
                        </button>
                        {!isEditing && (
                          <button 
                            onClick={(e) => openDeleteConfirm(e, selectedProject.id)}
                            className="w-full px-10 py-5 rounded-none border border-red-500/20 text-red-500 hover:bg-red-500/10 font-black flex items-center justify-center gap-3 transition-all"
                          >
                            <Trash2 size={20} />
                            حذف المشروع
                          </button>
                        )}
                        {isEditing && (
                          <button onClick={() => setIsEditing(false)} className="px-10 py-5 rounded-none glass text-slate-500 hover:bg-white/10 font-black transition-all">
                            إلغاء التعديل
                          </button>
                        )}
                    </div>
                  </div>
                  
                  <div className="mt-12 h-px bg-gradient-to-l from-transparent via-white/5 to-transparent" />
                </div>

                <div className="px-8 md:px-12 pb-20 space-y-12 text-right">
                  {/* Executive Dashboard Summary */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Progress Monitor Section */}
                    <div className="xl:col-span-2 p-10 glass rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center gap-12 bg-white/[0.01] relative overflow-hidden group/prog">
                      <div className="absolute top-0 right-0 p-12 text-white/[0.02] pointer-events-none group-hover/prog:text-brand-secondary/5 transition-all">
                        <ProjectIcon name={selectedProject.icon} size={240} />
                      </div>
                          
                      <div className="flex flex-col items-center gap-4 relative z-10 shrink-0">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">الإنجاز الرقمي</span>
                        <div className="relative w-44 h-44">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="88" cy="88" r="80" className="stroke-white/[0.01]" strokeWidth="16" fill="transparent" />
                              
                              {/* Background animated ring */}
                              <motion.circle 
                                cx="88" cy="88" r="76" 
                                className="stroke-white/[0.03]" 
                                strokeWidth="1" 
                                fill="transparent" 
                                strokeDasharray="4 8"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                              />

                              <circle cx="88" cy="88" r="72" className="stroke-white/5" strokeWidth="12" fill="transparent" />
                              
                              <defs>
                                <linearGradient id="progressGradientDetail" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#2dd4bf" />
                                  <stop offset="50%" stopColor="#4ade80" />
                                  <stop offset="100%" stopColor="#22c55e" />
                                </linearGradient>
                                <filter id="glowDetail" x="-50%" y="-50%" width="200%" height="200%">
                                   <feGaussianBlur stdDeviation="4" result="blur" />
                                   <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <filter id="pulseGlow">
                                   <feGaussianBlur stdDeviation="6" result="blur" />
                                </filter>
                              </defs>
    
                              {/* Animated Pulse Glow behind the arc */}
                              <motion.circle 
                                cx="88" cy="88" r="72" 
                                initial={{ strokeDashoffset: 452.3 }}
                                animate={{ 
                                  strokeDashoffset: 452.3 - (452.3 * (isEditing ? editData.progress : selectedProject.progress)) / 100,
                                  opacity: [0.1, 0.3, 0.1]
                                }}
                                className="stroke-brand-secondary"
                                strokeWidth="20" 
                                fill="transparent" 
                                strokeDasharray={452.3}
                                strokeLinecap="round"
                                filter="url(#pulseGlow)"
                                transition={{ 
                                  strokeDashoffset: { duration: 1.5, ease: "circOut" },
                                  opacity: { repeat: Infinity, duration: 3, ease: "easeInOut" }
                                }}
                              />

                              <motion.circle 
                                cx="88" cy="88" r="72" 
                                initial={{ strokeDashoffset: 452.3 }}
                                animate={{ strokeDashoffset: 452.3 - (452.3 * (isEditing ? editData.progress : selectedProject.progress)) / 100 }}
                                className="stroke-[url(#progressGradientDetail)]"
                                strokeWidth="14" 
                                fill="transparent" 
                                strokeDasharray={452.3}
                                strokeLinecap="round"
                                filter="url(#glowDetail)"
                                transition={{ duration: 1.5, ease: "circOut" }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-100">
                              <motion.span 
                                key={isEditing ? editData.progress : selectedProject.progress}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-5xl font-display font-black leading-none bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent"
                              >
                                {isEditing ? editData.progress : selectedProject.progress}%
                              </motion.span>
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] mt-3 text-brand-secondary/60">Execution</span>
                            </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 w-full space-y-6 relative z-10 text-right">
                        <div className="flex justify-between items-end flex-row-reverse border-b border-white/5 pb-4">
                            <div className="space-y-1">
                              <h4 className="text-xl font-bold tracking-tight">تحديث المسار التنفيذي</h4>
                              <p className="text-xs text-slate-600 font-medium">تحكم في مستوى التقدم الميداني لمسار المبادرة الحالية</p>
                            </div>
                            <span className="hidden md:block text-[10px] font-black text-brand-secondary tracking-widest uppercase">Execution Tracker</span>
                        </div>
                        
                        <div className="relative pt-4 pb-8">
                          {/* Custom Slider Background */}
                          <div className="absolute top-[22px] right-0 left-0 h-2 bg-white/5 rounded-none overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${isEditing ? editData.progress : selectedProject.progress}%` }}
                               transition={{ duration: 0.8, ease: "easeOut" }}
                               className="h-full bg-gradient-to-l from-brand-secondary to-brand-primary opacity-30 blur-[2px]"
                             />
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${isEditing ? editData.progress : selectedProject.progress}%` }}
                               transition={{ duration: 0.8, ease: "easeOut" }}
                               className="h-full bg-gradient-to-l from-brand-secondary to-brand-primary"
                             />
                          </div>
                          
                          <input 
                            type="range"
                            min="0" max="100"
                            value={isEditing ? editData.progress : selectedProject.progress}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isEditing) {
                                updateDoc(doc(db, 'projects', selectedProject.id), { progress: val });
                                setSelectedProject({ ...selectedProject, progress: val });
                              } else {
                                setEditData({ ...editData, progress: val });
                              }
                            }}
                            className="relative z-10 w-full h-2.5 bg-transparent appearance-none outline-none cursor-pointer accent-brand-secondary [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
                          />
                          <div className="flex justify-between mt-8 px-1 flex-row-reverse">
                              {['تجهيز', 'إطلاق', 'تشغيل', 'توسيع', 'اكتمال'].map((step, i) => (
                                <div key={i} className="flex flex-col items-center gap-3">
                                  <div className={`w-4 h-4 rounded-none transition-all duration-500 scale-110 relative ${
                                    (isEditing ? editData.progress : selectedProject.progress) >= (i * 25) ? 'bg-brand-secondary shadow-[0_0_20px_rgba(45,212,191,0.6)]' : 'bg-white/10'
                                  }`}>
                                    {(isEditing ? editData.progress : selectedProject.progress) >= (i * 25) && (
                                       <motion.div 
                                         layoutId="active-step-detail"
                                         className="absolute inset-0 border-2 border-brand-secondary scale-150 opacity-30"
                                         animate={{ scale: [1.5, 2.5, 1.5], opacity: [0.3, 0, 0.3] }}
                                         transition={{ repeat: Infinity, duration: 2 }}
                                       />
                                    )}
                                  </div>
                                  <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                                    (isEditing ? editData.progress : selectedProject.progress) >= (i * 25) ? 'text-brand-secondary' : 'text-slate-700'
                                  }`}>{step}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Info Cards */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Chronology Mini Card */}
                      <div className="glass p-8 border border-white/5 bg-white/[0.01] flex flex-col justify-between group/chrono h-full">
                         <div className="flex items-center justify-between flex-row-reverse mb-6">
                            <div className="w-10 h-10 bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
                               <Calendar size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">الجدول الزمني</span>
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center flex-row-reverse">
                               <span className="text-[10px] text-slate-600 font-bold uppercase">البداية</span>
                               <span className="text-lg font-black text-slate-300 font-display">{selectedProject.startDate || '---'}</span>
                            </div>
                            <div className="h-px bg-white/5 w-full" />
                            <div className="flex justify-between items-center flex-row-reverse">
                               <span className="text-[10px] text-slate-600 font-bold uppercase">النهاية</span>
                               <span className="text-lg font-black text-brand-secondary font-display">{selectedProject.endDate || '---'}</span>
                            </div>
                         </div>
                      </div>

                      {/* Identity Mini Card */}
                      <div className="glass p-8 border border-white/5 bg-white/[0.01] flex flex-col justify-between h-full">
                         <div className="flex items-center justify-between flex-row-reverse mb-6">
                            <div className="w-10 h-10 bg-brand-secondary/10 flex items-center justify-center text-brand-secondary border border-brand-secondary/20">
                               <Shield size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">التصنيف الأمني</span>
                         </div>
                         <div className="space-y-2">
                             <div className="flex items-center gap-2 justify-end">
                                <span className="text-[10px] font-black text-white/40 uppercase">O.V.9 INTERNAL</span>
                                <div className="w-2 h-2 bg-brand-secondary" />
                             </div>
                             <p className="text-[11px] text-slate-600 font-bold leading-relaxed">هذه البيانات تخضع لنظام الإدارة الاستراتيجية الموحد وتعتبر معلومات داخلية محمية.</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Column: Context & Content */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Description Block */}
                        <div className="glass rounded-none p-10 border border-white/5 space-y-8 bg-white/[0.01] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/[0.02] blur-[40px] -translate-y-16 translate-x-16" />
                            
                            <div className="flex items-center justify-between flex-row-reverse relative z-10">
                              <div className="flex items-center gap-4 flex-row-reverse">
                                <div className="w-12 h-12 rounded-none bg-brand-secondary/10 flex items-center justify-center text-brand-secondary border border-brand-secondary/20 shadow-[0_0_15px_rgba(45,212,191,0.1)]">
                                    <ListTodo size={24} />
                                </div>
                                <h4 className="text-xl font-bold tracking-tight">الخلاصة التنفيذية للمشروع</h4>
                              </div>
                              <span className="text-[10px] font-black text-slate-700 tracking-widest uppercase">Abstract</span>
                            </div>
                            
                            {isEditing ? (
                              <textarea 
                                value={editData.description}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-none p-8 text-sm text-slate-300 outline-none focus:border-brand-secondary min-h-[220px] resize-none relative z-10 leading-relaxed"
                                placeholder="أدخل مبررات وأهداف المشروع الميدانية..."
                              />
                            ) : (
                              <div className="relative z-10">
                                <p className="text-sm md:text-base text-slate-300 font-medium leading-[2] bg-white/[0.02] p-10 rounded-none border border-white/5 italic text-justify">
                                    {selectedProject.description || 'لا يتوفر وصف معمق متاح لهذا المسار التنفيذي حالياً في قاعدة البيانات الاستراتيجية.'}
                                </p>
                                <div className="mt-6 flex items-center gap-4 text-slate-600">
                                   <div className="h-px flex-1 bg-white/5" />
                                   <span className="text-[9px] font-black uppercase tracking-widest">End of Summary</span>
                                   <div className="h-px flex-1 bg-white/5" />
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Analysis Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* HIEA Context */}
                           <div className="p-8 glass border border-brand-primary/10 bg-brand-primary/[0.01] flex flex-col justify-between min-h-[200px] group/hiea">
                              <div className="flex justify-between items-start flex-row-reverse">
                                 <div className="w-12 h-12 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 group-hover/hiea:scale-110 transition-transform">
                                    <Layers size={24} />
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[10px] text-brand-primary font-black uppercase tracking-[0.2em] mb-2 block">الحوكمة المرتبطة</span>
                                    <h5 className="text-lg font-bold text-slate-200">الدعم الهيكلي</h5>
                                 </div>
                              </div>
                              <div className="mt-8">
                                 <p className="text-xl font-display font-black text-white leading-snug">
                                   {hieas.find(h => h.id === selectedProject.hieaId)?.name || 'غير مرتبط بنطاق حوكمة'}
                                 </p>
                              </div>
                           </div>

                           {/* Goal Context */}
                           <div className="p-8 glass border border-brand-secondary/10 bg-brand-secondary/[0.01] flex flex-col justify-between min-h-[200px] group/goal">
                              <div className="flex justify-between items-start flex-row-reverse">
                                 <div className="w-12 h-12 rounded-none bg-brand-secondary/10 flex items-center justify-center text-brand-secondary border border-brand-secondary/20 group-hover/goal:scale-110 transition-transform">
                                    <Target size={24} />
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[10px] text-brand-secondary font-black uppercase tracking-[0.2em] mb-2 block">المستهدف الاستراتيجي</span>
                                    <h5 className="text-lg font-bold text-slate-200">تحويل الرؤية</h5>
                                 </div>
                              </div>
                              <div className="mt-8">
                                 <p className="text-xl font-display font-black text-white leading-snug">
                                   {goals.find(g => g.id === selectedProject.goalId)?.name || 'غير مرتبط بهدف استراتيجي'}
                                 </p>
                              </div>
                           </div>
                        </div>
                    </div>

                    {/* Right Column: Stages/Milestones Workspace */}
                    <div className="glass rounded-none p-10 border border-white/5 flex flex-col h-full bg-white/[0.01] relative">
                      <div className="absolute inset-0 bg-teal-400/[0.01] pointer-events-none" />
                      
                      <div className="flex items-center justify-between mb-10 flex-row-reverse relative z-10">
                          <div className="flex items-center gap-4 flex-row-reverse">
                            <div className="w-12 h-12 rounded-none bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 shadow-[0_0_20px_rgba(20,184,166,0.1)]">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                               <h4 className="text-xl font-bold tracking-tight">المخطط التنفيذي</h4>
                               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Execution Stages</p>
                            </div>
                          </div>
                          {isEditing && (
                            <button 
                              onClick={addMilestone} 
                              className="px-6 py-3 rounded-none bg-teal-500 text-brand-dark text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(20,184,166,0.2)]"
                            >
                              إضافة مرحلة +
                            </button>
                          )}
                      </div>
                      
                      <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-4 relative z-10 text-right">
                        {(isEditing ? editData.milestones : selectedProject.milestones || []).map((m: any, idx: number) => (
                          <motion.div 
                            key={m.id} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-6 rounded-none border transition-all flex flex-col gap-4 group relative ${
                            m.completed 
                            ? 'bg-teal-500/[0.05] border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.05)]' 
                            : 'bg-white/5 border-white/10 hover:border-brand-secondary/30 hover:bg-white/[0.08]'
                          }`}>
                              <div className="flex items-center gap-6 flex-row-reverse">
                                <button 
                                  disabled={!isEditing}
                                  onClick={() => updateMilestone(m.id, { completed: !m.completed })}
                                  className={`w-10 h-10 rounded-none flex items-center justify-center shrink-0 border-2 transition-all ${
                                      m.completed 
                                      ? 'bg-teal-400 border-teal-400 text-brand-dark shadow-[0_0_15px_rgba(45,212,191,0.5)]' 
                                      : 'bg-transparent border-slate-800 hover:border-slate-500'
                                  }`}
                                >
                                    {m.completed && <Check size={24} strokeWidth={4} />}
                                </button>
                                {isEditing ? (
                                  <div className="flex-1 space-y-3">
                                      <input 
                                        type="text" 
                                        value={m.title}
                                        onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                                        className="w-full bg-transparent border-b border-white/10 outline-none text-base text-slate-100 font-bold placeholder:text-slate-700 text-right py-1 focus:border-brand-secondary transition-colors"
                                        placeholder="مسمى المرحلة..."
                                      />
                                      <div className="flex items-center gap-2 justify-end">
                                         <Calendar size={12} className="text-slate-600" />
                                         <input 
                                          type="date" 
                                          value={m.date}
                                          onChange={(e) => updateMilestone(m.id, { date: e.target.value })}
                                          className="bg-transparent border-none text-[10px] font-black uppercase text-slate-600 outline-none text-right"
                                        />
                                      </div>
                                  </div>
                                ) : (
                                  <div className="flex-1 min-w-0">
                                      <p className={`text-lg font-bold transition-all ${m.completed ? 'text-teal-400/80 line-through' : 'text-slate-100'}`}>{m.title}</p>
                                      <div className="flex items-center gap-3 justify-end mt-2">
                                         {m.date && <p className="text-[10px] text-slate-600 uppercase font-black tracking-[0.2em]">{m.date}</p>}
                                         <div className={`w-1 h-1 ${m.completed ? 'bg-teal-400' : 'bg-slate-800'}`} />
                                      </div>
                                  </div>
                                )}
                                {isEditing && (
                                  <button 
                                    onClick={() => removeMilestone(m.id)} 
                                    className="p-3 text-slate-700 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                )}
                              </div>
                          </motion.div>
                        ))}
                        {(isEditing ? editData.milestones : selectedProject.milestones || []).length === 0 && (
                           <div className="py-20 text-center border-2 border-dashed border-white/5">
                              <p className="text-[10px] font-black uppercase text-slate-800 tracking-[0.4em]">لا توجد مراحل مسجلة</p>
                           </div>
                        )}
                      </div>

                      {/* Summary Data */}
                      <div className="mt-10 pt-10 border-t border-white/5 space-y-4">
                         <div className="flex justify-between items-center flex-row-reverse">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">إجمالي المراحل</span>
                            <span className="text-sm font-black text-white">{(selectedProject.milestones || []).length}</span>
                         </div>
                         <div className="flex justify-between items-center flex-row-reverse">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">المراحل المنجزة</span>
                            <span className="text-sm font-black text-teal-400">{(selectedProject.milestones || []).filter((m:any) => m.completed).length}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }} 
        title="تأسيس مشروع تنفيذي جديد"
      >
        <form onSubmit={handleSubmit} className="space-y-10 p-4 text-right">
          <div className="space-y-8">
             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">مسمى المشروع أو المبادرة</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-none py-6 px-10 outline-none focus:border-brand-secondary text-2xl font-bold text-white shadow-inner text-right"
                  placeholder="صياغة المسمى الرسمي للمشروع..."
                  required
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الارتباط بالهيئة</label>
                    <select 
                      value={formData.hieaId}
                      onChange={(e) => setFormData({ ...formData, hieaId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-none py-4 px-10 outline-none focus:border-brand-secondary text-slate-300 appearance-none font-bold text-right"
                    >
                      <option value="" className="bg-slate-900">اختر الهيئة (اختياري)...</option>
                      {hieas.map(h => <option key={h.id} value={h.id} className="bg-slate-900">{h.name}</option>)}
                    </select>
                </div>
                <div className="space-y-4">
                    <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الارتباط بالهدف</label>
                    <select 
                      value={formData.goalId}
                      onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-none py-4 px-10 outline-none focus:border-brand-secondary text-slate-300 appearance-none font-bold text-right"
                    >
                      <option value="" className="bg-slate-900">اختر الهدف (اختياري)...</option>
                      {goals.map(g => <option key={g.id} value={g.id} className="bg-slate-900">{g.name}</option>)}
                    </select>
                </div>
             </div>

             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">أيقونة المشروع</label>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2 p-4 bg-white/5 border border-white/10">
                  {availableIcons.map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: id })}
                      className={`p-3 flex items-center justify-center transition-all ${
                        formData.icon === id 
                        ? 'bg-brand-secondary text-brand-dark shadow-2xl shadow-brand-secondary/20 scale-125' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'
                      }`}
                      title={id}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
             </div>

             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الملخص التنفيذي</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-none py-6 px-10 outline-none focus:border-brand-secondary text-base font-bold text-slate-300 shadow-inner min-h-[150px] resize-none text-right"
                  placeholder="وصف موجز للمشروع وأهدافه الميدانية..."
                />
             </div>

             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">التصنيفات والوسوم</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(false))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-none py-4 px-10 outline-none focus:border-brand-secondary text-slate-300 font-bold text-right"
                    placeholder="أضف وسم جديد (مثال: عاجل، فريق أ، 2024)..."
                  />
                  <button 
                    type="button" 
                    onClick={() => handleAddTag(false)}
                    className="px-10 bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 font-black"
                  >
                    إضافة
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 px-4">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-2 bg-brand-secondary/10 text-brand-secondary px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border border-brand-secondary/20">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag, false)} className="hover:text-white transition-colors">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8">
               <div className="space-y-4">
                  <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">موعد الإغلاق المستهدف</label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-none py-5 px-8 outline-none focus:border-brand-secondary text-slate-300 font-bold"
                    required
                  />
               </div>
               <div className="space-y-4 text-right">
                  <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">تاريخ الانطلاق</label>
                  <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-none py-5 px-8 outline-none focus:border-brand-secondary text-slate-300 font-bold"
                    required
                  />
               </div>
             </div>

             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الحالة المبدئية</label>
                <div className="flex gap-4 p-2 bg-white/5 rounded-none border border-white/5">
                  {[
                    { id: ProjectStatus.UPCOMING, label: 'قيد التخطيط' },
                    { id: ProjectStatus.IN_PROGRESS, label: 'نشط تنفيذياً' },
                    { id: ProjectStatus.COMPLETED, label: 'مكتمل' }
                  ].map(status => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: status.id })}
                      className={`flex-1 py-5 rounded-none font-black transition-all text-xs uppercase tracking-widest ${
                        formData.status === status.id 
                        ? 'bg-brand-secondary text-brand-dark shadow-[0_15px_30px_rgba(45,212,191,0.3)] scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
             </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-brand-secondary text-brand-dark font-black uppercase tracking-[0.3em] py-7 rounded-none hover:scale-[1.02] active:scale-[0.98] transition-all neon-glow text-lg mt-6"
          >
            تثبيت المشروع وإدراجه في المنصة
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteConfirm.isOpen} 
        onClose={() => setDeleteConfirm({ isOpen: false, projectId: null })}
        title="تأكيد الحذف النهائي"
      >
        <div className="text-right space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-none">
            <AlertCircle className="text-red-500 shrink-0" size={24} />
            <p className="text-sm text-slate-300 font-medium">
              هل أنت متأكد من رغبتك في حذف هذا المشروع؟ هذا الإجراء نهائي ولا يمكن التراجع عنه، وسيؤدي إلى إزالة كافة البيانات والمراحل المرتبطة به.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button 
              onClick={deleteProject}
              className="flex-1 bg-red-600 text-white font-black py-4 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
            >
              نعم، أحذف المشروع نهائياً
            </button>
            <button 
              onClick={() => setDeleteConfirm({ isOpen: false, projectId: null })}
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
