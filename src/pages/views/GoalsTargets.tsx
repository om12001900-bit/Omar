import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Calendar, Target, TrendingUp, Layers, CheckCircle2, ChevronLeft, Check, Target as TargetIcon, Search, ChevronDown, Activity, Award } from 'lucide-react';
import { useGoals, useHieas, useProjects } from '../../hooks/useData';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
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
import PerformanceTracker from '../../components/PerformanceTracker';
import { GoalType, GoalCategory, Goal, Milestone } from '../../types';

export default function GoalsTargets() {
  const { goals } = useGoals();
  const { hieas } = useHieas();
  const { projects } = useProjects();
  const { user } = useAuth();
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updatePrompt, setUpdatePrompt] = useState<{
    show: boolean;
    title: string;
    content: string;
    type: 'milestone' | 'project' | 'goal' | 'general';
    entityId: string;
    entityName: string;
    icon?: string;
  } | null>(null);
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: GoalType.OBJECTIVE,
    startDate: '',
    endDate: '',
    hieaId: '',
    projectId: '',
    category: GoalCategory.OV9,
    kpiTitle: '',
    kpiTarget: 0,
    kpiCurrent: 0,
    kpiUnit: '',
  });

  const [editData, setEditData] = useState<Partial<Goal>>({
    name: '',
    type: GoalType.OBJECTIVE,
    startDate: '',
    endDate: '',
    hieaId: '',
    projectId: '',
    category: GoalCategory.OV9,
    progress: 0,
    kpiTitle: '',
    kpiTarget: 0,
    kpiCurrent: 0,
    kpiUnit: '',
    milestones: [] as Milestone[],
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; goalId: string | null; name: string }>({
    isOpen: false,
    goalId: null,
    name: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: GoalType.OBJECTIVE,
      startDate: '',
      endDate: '',
      hieaId: '',
      projectId: '',
      category: GoalCategory.OV9,
      kpiTitle: '',
      kpiTarget: 0,
      kpiCurrent: 0,
      kpiUnit: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'goals'), {
        ...formData,
        milestones: [],
        ownerId: user.uid,
        progress: 0,
        createdAt: serverTimestamp(),
      });
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedGoal) return;
    try {
      // Check for newly completed milestones
      const newlyCompletedMilestones = (editData.milestones || []).filter(m => 
        m.completed && !(selectedGoal.milestones || []).find(sm => sm.id === m.id)?.completed
      );

      await updateDoc(doc(db, 'goals', selectedGoal.id), {
        ...editData,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      setSelectedGoal({ ...selectedGoal, ...editData });

      // Trigger prompt if milestone completed or goal reached 100%
      if (newlyCompletedMilestones.length > 0) {
        const lastM = newlyCompletedMilestones[newlyCompletedMilestones.length - 1];
        setUpdatePrompt({
          show: true,
          title: lastM.title,
          content: `تم إنجاز محطة رئيسية: "${lastM.title}" ضمن الهدف الاستراتيجي ${selectedGoal.name}. يعكس هذا التحول التزاماً عميقاً بمسارات الرؤية الموضوعة.`,
          type: 'milestone',
          entityId: selectedGoal.id,
          entityName: selectedGoal.name,
          icon: 'Target'
        });
      } else if ((editData.progress || 0) === 100 && (selectedGoal.progress || 0) < 100) {
        setUpdatePrompt({
          show: true,
          title: `تحقيق الهدف الاستراتيجي: ${selectedGoal.name}`,
          content: `اكتمل تحقيق الهدف الاستراتيجي "${selectedGoal.name}" بنسبة 100%. يسجل هذا الإنجاز كعلامة فارقة في التطور المؤسسي والتحول الاستراتيجي.`,
          type: 'goal',
          entityId: selectedGoal.id,
          entityName: selectedGoal.name,
          icon: 'TrendingUp'
        });
      }
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `goals/${selectedGoal.id}`);
    }
  };

  const handlePostStrategicUpdate = async () => {
    if (!updatePrompt || !user) return;
    setIsPostingUpdate(true);
    try {
      await addDoc(collection(db, 'strategic_updates'), {
        title: updatePrompt.title,
        content: updatePrompt.content,
        type: updatePrompt.type,
        entityId: updatePrompt.entityId,
        entityName: updatePrompt.entityName,
        icon: updatePrompt.icon || 'Activity',
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setUpdatePrompt(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'strategic_updates');
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const updateGoalProgress = async (val: number) => {
    if (!selectedGoal || isEditing) return;
    try {
      await updateDoc(doc(db, 'goals', selectedGoal.id), { progress: val, updatedAt: serverTimestamp() });
      setSelectedGoal({ ...selectedGoal, progress: val });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.goalId) return;
    try {
      await deleteDoc(doc(db, 'goals', deleteConfirm.goalId));
      if (selectedGoal?.id === deleteConfirm.goalId) setSelectedGoal(null);
      setDeleteConfirm({ isOpen: false, goalId: null, name: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, goal: Goal) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, goalId: goal.id, name: goal.name });
  };

  const addMilestone = () => {
    setEditData({
      ...editData,
      milestones: [...editData.milestones, { title: '', date: '', completed: false, id: Date.now() }]
    });
  };

  const updateMilestone = (id: number, updates: Partial<Milestone>) => {
    setEditData({
      ...editData,
      milestones: (editData.milestones || []).map((m) => m.id === id ? { ...m, ...updates } : m)
    });
  };

  const removeMilestone = (id: number) => {
    setEditData({
      ...editData,
      milestones: (editData.milestones || []).filter((m) => m.id !== id)
    });
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden text-right pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2 py-6 shrink-0 border-b border-white/5 mb-6">
        <div className="text-right w-full md:w-auto">
          <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter leading-tight mb-2">الأهداف والمؤشرات</h1>
          <p className="text-slate-500 font-bold text-sm md:text-base">إدارة وتتبع تطلعات الرؤية الاستراتيجية بصورة تفاعلية</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="w-full md:w-auto bg-brand-primary text-brand-dark font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-brand-primary/20 transition-all group shrink-0 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="إضافة هدف استراتيجي جديد"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-dark/10 flex items-center justify-center group-hover:rotate-90 transition-transform">
            <Plus size={20} strokeWidth={3} />
          </div>
          <span className="text-base tracking-tight">إضافة هدف جديد</span>
        </button>
      </div>

      <div className="flex-1 relative min-h-0">
        <AnimatePresence mode="wait">
          {!selectedGoal ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 h-full gap-0 overflow-hidden"
            >
              {/* List Side */}
              <div className="lg:col-span-3 h-full bg-[#0a0a0b]/40 border-l border-white/5 p-6 flex flex-col min-h-0 transition-all rounded-3xl">
                <div className="flex items-center justify-between mb-8 px-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em]">دليل الأهداف</h3>
                  <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold tracking-widest">{goals.length} عنصر</span>
                  </div>
                </div>

                <div className="mb-6 px-1">
                   <div className="flex items-center bg-[#0a0a0b] border border-white/5 rounded-2xl px-5 py-3 hover:border-brand-primary/30 transition-all focus-within:ring-4 focus-within:ring-brand-primary/5">
                      <Search size={16} className="text-slate-700" aria-hidden="true" />
                      <input 
                        type="text"
                        placeholder="بحث في المستهدفات..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder:text-slate-700 text-right w-full px-3 focus:outline-none"
                        aria-label="بحث في المستهدفات"
                      />
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 px-1 custom-scrollbar pb-10 relative" role="list" aria-label="قائمة الأهداف الاستراتيجية">
                  {goals
                    .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((goal) => (
                    <motion.div
                      layout
                      key={goal.id}
                      role="listitem"
                      tabIndex={0}
                      aria-label={`الهدف: ${goal.name}. نسبة الإنجاز: ${goal.progress}%`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedGoal(goal);
                          // ... other states
                        }
                      }}
                      onClick={() => {
                        setSelectedGoal(goal);
                        setEditData({
                          name: goal.name,
                          type: goal.type,
                          startDate: goal.startDate,
                          endDate: goal.endDate,
                          hieaId: goal.hieaId || '',
                          projectId: goal.projectId || '',
                          category: goal.category,
                          progress: goal.progress || 0,
                          kpiTitle: goal.kpiTitle || '',
                          kpiTarget: goal.kpiTarget || 0,
                          kpiCurrent: goal.kpiCurrent || 0,
                          kpiUnit: goal.kpiUnit || '',
                          milestones: goal.milestones || [],
                        });
                        setIsEditing(false);
                      }}
                      className={`w-full text-right p-5 rounded-2xl transition-all border relative overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/40 ${
                        selectedGoal?.id === goal.id 
                        ? 'bg-brand-primary/10 border-brand-primary/30 shadow-2xl' 
                        : 'bg-[#0a0a0b] border-white/5 hover:border-white/10 grayscale-[0.3] hover:grayscale-0'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4 relative z-10">
                         <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                              goal.type === GoalType.OBJECTIVE ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
                            }`}>
                               {goal.type === GoalType.OBJECTIVE ? <Target size={18} aria-hidden="true" /> : <TrendingUp size={18} aria-hidden="true" />}
                            </div>
                            {goal.hieaId && (
                              <div 
                                className="w-1.5 h-6 rounded-full" 
                                style={{ backgroundColor: hieas.find(h => h.id === goal.hieaId)?.color || '#4ade80' }}
                                title={hieas.find(h => h.id === goal.hieaId)?.name}
                                aria-label={`تصنيف: ${hieas.find(h => h.id === goal.hieaId)?.name}`}
                              />
                            )}
                         </div>
                         <div className="bg-white/5 px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-display font-black text-white/60 tracking-tight">{goal.progress}%</span>
                         </div>
                      </div>
                      
                      <h4 className="text-base font-bold text-slate-100 line-clamp-2 mb-4 relative z-10 leading-snug">{goal.name}</h4>
                      
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative z-10" role="progressbar" aria-valuenow={goal.progress || 0} aria-valuemin={0} aria-valuemax={100}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${goal.progress || 0}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full transition-all duration-1000 ${
                            goal.type === GoalType.OBJECTIVE ? 'bg-brand-primary shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-brand-secondary shadow-[0_0_10px_rgba(45,212,191,0.5)]'
                          }`}
                        />
                      </div>

                      <button 
                        onClick={(e) => openDeleteConfirm(e, goal)}
                        className="absolute left-4 bottom-14 p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl border border-red-500/10 transition-all opacity-0 group-hover:opacity-100 z-20 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        title="حذف العنصر"
                        aria-label={`حذف الهدف ${goal.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                  {goals.length === 0 && (
                    <div className="text-center py-32 text-slate-800">
                      <Target size={64} className="mx-auto mb-6 opacity-5" />
                      <p className="text-sm font-bold uppercase tracking-widest opacity-20">لم يتم تحديد أهداف بعد</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Helper Board */}
              <div className="hidden lg:flex lg:col-span-9 h-full flex flex-col items-center justify-center text-slate-800 p-8 text-center bg-transparent">
          <div className="relative mb-12">
             <div className="absolute inset-0 bg-brand-primary/10 blur-[120px] rounded-none animate-pulse" />
             <Target size={160} className="relative z-10 opacity-5" />
          </div>
          <h3 className="text-xl font-display font-black opacity-20 tracking-[0.4em] uppercase leading-relaxed">
            نظام تتبع الأهداف والمستهدفات<br />
            Vision Control Room
          </h3>
          <p className="text-slate-700 mt-8 font-bold tracking-[0.2em] uppercase text-sm opacity-30">حدد مسار استراتيجي من القائمة لبدء التحكم في الإنجاز</p>
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
        {/* Drill-Down Header */}
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <button 
            onClick={() => setSelectedGoal(null)}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-none text-slate-300 font-black text-xs transition-all shadow-lg shadow-black/20 group"
          >
            <ChevronLeft className="rtl-flip group-hover:-translate-x-1 transition-transform" size={18} /> 
            الرجوع لقائمة الأهداف
          </button>
          <div className="flex items-center gap-3 text-left">
            <div className="text-right hidden md:block">
               <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">Goal Intelligence</p>
               <p className="text-[10px] text-brand-primary font-bold">Strategic precision monitoring O.V.9</p>
            </div>
            <div className="w-8 h-8 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Target size={16} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center lg:items-start justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-none flex items-center justify-center border-2 transition-all shrink-0 ${
                          selectedGoal.type === GoalType.OBJECTIVE 
                          ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary shadow-[0_15px_30px_-10px_rgba(74,222,128,0.3)]' 
                          : 'bg-brand-secondary/10 border-brand-secondary/40 text-brand-secondary shadow-[0_15px_30px_-10px_rgba(45,212,191,0.3)]'
                        }`}>
                          {selectedGoal.type === GoalType.OBJECTIVE ? <Target size={32} /> : <TrendingUp size={32} />}
                        </div>
                        <div className="space-y-1">
                          {isEditing ? (
                            <textarea 
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="bg-white/5 border border-white/10 rounded-none px-6 py-2 text-xl md:text-3xl font-display font-bold text-white outline-none focus:border-brand-primary w-full md:w-[400px] resize-none"
                            />
                          ) : (
                            <h2 className="text-2xl md:text-4xl font-display font-black text-white leading-tight tracking-tight">{selectedGoal.name}</h2>
                          )}
                          <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                            <span className={`px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 ${
                              selectedGoal.type === GoalType.OBJECTIVE ? 'text-brand-primary' : 'text-brand-secondary'
                            }`}>
                              {selectedGoal.type === GoalType.OBJECTIVE ? 'أولوية استراتيجية' : 'أداء رقمي'}
                            </span>
                            <span className="text-xs text-slate-600 font-bold">•</span>
                            <span className="text-xs text-slate-600 font-black uppercase tracking-widest">{selectedGoal.category} Path</span>
                            {selectedGoal.kpiTitle && (
                              <>
                                <span className="text-xs text-slate-600 font-bold">•</span>
                                <span className="text-xs text-brand-primary font-black uppercase tracking-widest">{selectedGoal.kpiTitle}</span>
                              </>
                            )}
                          </div>

                          {isEditing && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 bg-white/[0.02] p-6 border border-white/5">
                              <div className="space-y-2 col-span-2">
                                <label className="text-[10px] text-slate-600 block px-2 uppercase font-black tracking-widest">عنوان المؤشر (KPI)</label>
                                <input 
                                  type="text" 
                                  value={editData.kpiTitle}
                                  onChange={(e) => setEditData({ ...editData, kpiTitle: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-sm text-slate-300 outline-none focus:border-brand-primary font-bold"
                                  placeholder="مثل: نسبة الإنجاز الربعية..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] text-slate-600 block px-2 uppercase font-black tracking-widest">المستهدف الرقمي</label>
                                <input 
                                  type="number" 
                                  value={editData.kpiTarget}
                                  onChange={(e) => setEditData({ ...editData, kpiTarget: Number(e.target.value) })}
                                  className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-sm text-slate-300 outline-none focus:border-brand-primary font-bold"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] text-slate-600 block px-2 uppercase font-black tracking-widest">الحالي</label>
                                <input 
                                  type="number" 
                                  value={editData.kpiCurrent}
                                  onChange={(e) => setEditData({ ...editData, kpiCurrent: Number(e.target.value) })}
                                  className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-sm text-slate-300 outline-none focus:border-brand-primary font-bold"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] text-slate-600 block px-2 uppercase font-black tracking-widest">الوحدة</label>
                                <input 
                                  type="text" 
                                  value={editData.kpiUnit}
                                  onChange={(e) => setEditData({ ...editData, kpiUnit: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-sm text-slate-300 outline-none focus:border-brand-primary font-bold"
                                  placeholder="مثل: %, ريال, ساعة..."
                                />
                              </div>
                            </div>
                          )}

                          {!isEditing && selectedGoal.kpiTitle && (
                            <div className="mt-6 flex flex-wrap gap-8 items-center bg-white/[0.02] p-6 border border-white/5">
                               <div className="flex flex-col gap-1">
                                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">المستهدف</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-display font-black text-white">{selectedGoal.kpiTarget}</span>
                                    <span className="text-xs text-slate-500 font-bold">{selectedGoal.kpiUnit}</span>
                                  </div>
                               </div>
                               <div className="flex flex-col gap-1">
                                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">المحقق حالياً</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-display font-black text-brand-primary">{selectedGoal.kpiCurrent}</span>
                                    <span className="text-xs text-slate-500 font-bold">{selectedGoal.kpiUnit}</span>
                                  </div>
                               </div>
                               <div className="flex flex-col gap-1">
                                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">نسبة التحقيق</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-display font-black text-brand-secondary">
                                      {selectedGoal.kpiTarget ? Math.round((selectedGoal.kpiCurrent || 0) / selectedGoal.kpiTarget * 100) : 0}%
                                    </span>
                                  </div>
                               </div>
                            </div>
                          )}
                          
                          {/* Dedicated Linear Progress Bar for immediate visual feedback */}
                          {!isEditing && (
                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between items-end mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedGoal.type === GoalType.OBJECTIVE ? 'text-brand-primary' : 'text-brand-secondary'}`}>
                                  المعدل التنفيذي التراكمي
                                </span>
                                <span className="text-lg font-display font-black text-white">{selectedGoal.progress}%</span>
                              </div>
                              <div className="w-full h-2 bg-white/5 rounded-none overflow-hidden relative border border-white/5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${selectedGoal.progress}%` }}
                                  transition={{ duration: 1.5, ease: "circOut" }}
                                  className={`h-full relative ${
                                    selectedGoal.type === GoalType.OBJECTIVE 
                                    ? 'bg-gradient-to-l from-brand-primary/80 to-brand-primary shadow-[0_0_15px_rgba(74,222,128,0.3)]' 
                                    : 'bg-gradient-to-l from-brand-secondary/80 to-brand-secondary shadow-[0_0_15px_rgba(45,212,191,0.3)]'
                                  }`}
                                >
                                  <motion.div 
                                    animate={{ x: ['-200%', '200%'] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                                  />
                                </motion.div>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full md:w-auto">
                        <button 
                          onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
                          className={`w-full px-10 py-5 rounded-none font-black flex items-center justify-center gap-3 transition-all ${
                            isEditing ? 'bg-brand-primary text-brand-dark shadow-2xl shadow-brand-primary/20' : 'bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200'
                          }`}
                        >
                          {isEditing ? <Check size={24} /> : <Edit2 size={20} />}
                          {isEditing ? 'حفظ التغييرات' : 'تعديل البيانات'}
                        </button>
                        {!isEditing && (
                          <button 
                            onClick={(e) => openDeleteConfirm(e, selectedGoal)}
                            className="w-full px-10 py-5 rounded-none border border-red-500/20 text-red-500 hover:bg-red-500/10 font-black flex items-center justify-center gap-3 transition-all"
                          >
                            <Trash2 size={20} />
                            حذف الهدف
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

                <div className="px-8 md:px-12 pb-12 space-y-12">
                  {/* Progress Control Panel */}
                  <div className="p-10 glass rounded-none border border-white/5 flex flex-col md:flex-row items-center gap-12 bg-white/[0.01] relative overflow-hidden group/prog">
                     <div className="absolute top-0 right-0 p-12 text-white/[0.02] pointer-events-none group-hover/prog:text-brand-primary/5 transition-all">
                        <TargetIcon size={240} />
                     </div>
                     
                     <div className="flex flex-col items-center gap-4 relative z-10">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">مستوى الإنجاز</span>
                        <div className="relative w-36 h-36">
                           <svg className="w-full h-full transform -rotate-90">
                              <circle cx="72" cy="72" r="64" className="stroke-white/5" strokeWidth="12" fill="transparent" />
                              <circle 
                                cx="72" cy="72" r="64" 
                                className={selectedGoal.type === GoalType.OBJECTIVE ? 'stroke-brand-primary' : 'stroke-brand-secondary'}
                                strokeWidth="12" 
                                fill="transparent" 
                                strokeDasharray={401.9}
                                strokeDashoffset={401.9 - (401.9 * (isEditing ? editData.progress : selectedGoal.progress)) / 100}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-100">
                              <span className="text-4xl font-display font-black leading-none">{isEditing ? editData.progress : selectedGoal.progress}%</span>
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex-1 w-full space-y-6 relative z-10">
                        <div className="flex justify-between items-end">
                           <div className="space-y-1">
                              <h4 className="text-xl font-bold tracking-tight">تحديث المسار الميداني</h4>
                              <p className="text-xs text-slate-600 font-medium">قم بتحريك المؤشر لتعيين مستوى التقدم المحرز في هذا المسار</p>
                           </div>
                           <span className="hidden md:block text-[10px] font-black text-brand-primary tracking-widest uppercase">Target Precision</span>
                        </div>
                        
                        <div className="relative pt-4 pb-8 px-2">
                          <input 
                            type="range"
                            min="0" max="100"
                            value={isEditing ? editData.progress : selectedGoal.progress}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isEditing) {
                                // Direct update for convenience
                                updateGoalProgress(val);
                                setSelectedGoal({ ...selectedGoal, progress: val });
                              } else {
                                setEditData({ ...editData, progress: val });
                              }
                            }}
                            className={`w-full h-2.5 bg-white/5 rounded-none appearance-none outline-none cursor-pointer ${
                              selectedGoal.type === GoalType.OBJECTIVE ? 'accent-brand-primary' : 'accent-brand-secondary'
                            }`}
                          />
                          <div className="flex justify-between mt-6 px-1">
                             {['تخطيط', 'تحضير', 'تنفيذ', 'إنجاز', 'اكتمال'].map((step, i) => (
                               <div key={i} className="flex flex-col items-center gap-2">
                                  <div className={`w-2 h-2 rounded-none transition-all duration-500 ${
                                    (isEditing ? editData.progress : selectedGoal.progress) >= (i * 25) ? 'bg-brand-primary shadow-[0_0_10px_rgba(74,222,128,0.5)] scale-125' : 'bg-white/10'
                                  }`} />
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">{step}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-10">
                        {/* Performance Monitor Block */}
                        <div className="glass rounded-none p-10 border border-white/5 bg-white/[0.01]">
                           <PerformanceTracker 
                             entityId={selectedGoal.id} 
                             collectionName="goals" 
                             logs={selectedGoal.performanceLogs} 
                             accentColor={selectedGoal.type === GoalType.OBJECTIVE ? '#4ade80' : '#2dd4bf'}
                           />
                        </div>

                        {/* Time Block */}
                        <div className="glass rounded-none p-10 border border-white/5 space-y-8 bg-white/[0.01]">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-none bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                 <Calendar size={24} />
                              </div>
                              <h4 className="text-lg font-bold tracking-tight">الجدول الزمني المحكم</h4>
                           </div>
                           
                           {/* Edit Mode & Not Completed */}
                           {isEditing && editData.progress < 100 && (
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <label className="text-[10px] text-slate-600 block px-4 uppercase font-black tracking-widest">تاريخ الانطلاق</label>
                                   <input 
                                     type="date" 
                                     value={editData.startDate}
                                     onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                     className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-xs text-brand-primary outline-none focus:border-brand-primary font-bold transition-all"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] text-slate-600 block px-4 uppercase font-black tracking-widest">تاريخ الإنجاز</label>
                                   <input 
                                     type="date" 
                                     value={editData.endDate}
                                     onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                                     className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-xs text-brand-primary outline-none focus:border-brand-primary font-bold transition-all"
                                   />
                                </div>
                             </div>
                           )}

                           {/* View Mode & Not Completed */}
                           {!isEditing && selectedGoal.progress < 100 && (
                             <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-none border border-white/5">
                                <div className="flex flex-col gap-1">
                                   <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">نقطة البداية</span>
                                   <span className="text-xl font-black text-slate-300 font-display">{selectedGoal.startDate}</span>
                                </div>
                                <ChevronLeft size={20} className="text-white/5 rtl-flip transition-transform rotate-180" />
                                <div className="flex flex-col gap-1 text-left">
                                   <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">الموعد المستهدف</span>
                                   <span className="text-xl font-black text-brand-primary font-display">{selectedGoal.endDate}</span>
                                </div>
                             </div>
                           )}

                           {/* Completed Mode */}
                           {(isEditing ? editData.progress : selectedGoal.progress) === 100 && (
                             <div className="flex flex-col items-center justify-center py-6 gap-3 text-brand-primary/60">
                                <CheckCircle2 size={32} />
                                <span className="text-[10px] font-black uppercase tracking-widest">مستهدف مكتمل - الجدول الزمني مغلق</span>
                             </div>
                           )}
                        </div>

                        <div className="glass rounded-none p-10 border border-white/5 space-y-8 bg-white/[0.01]">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-none bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
                                 <Layers size={24} />
                              </div>
                              <h4 className="text-lg font-bold tracking-tight">الارتباط الهيكلي</h4>
                           </div>
                           
                           {isEditing ? (
                             <div className="space-y-5">
                                <div className="space-y-2">
                                   <label className="text-[10px] text-slate-600 block px-4 uppercase font-black tracking-widest">الهيئة الاستراتيجية</label>
                                   <div className="relative group">
                                     <select 
                                       value={editData.hieaId}
                                       onChange={(e) => setEditData({ ...editData, hieaId: e.target.value })}
                                       className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-xs text-slate-300 outline-none focus:border-brand-primary appearance-none transition-all px-8 group-hover:border-white/20 cursor-pointer"
                                     >
                                       <option value="" className="bg-slate-900">اختر الهيئة...</option>
                                       {hieas.map(h => <option key={h.id} value={h.id} className="bg-slate-900">{h.name}</option>)}
                                     </select>
                                     <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none group-focus-within:text-brand-primary transition-colors" size={14} />
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] text-slate-600 block px-4 uppercase font-black tracking-widest">المشروع التنفيذي</label>
                                   <div className="relative group">
                                     <select 
                                       value={editData.projectId}
                                       onChange={(e) => setEditData({ ...editData, projectId: e.target.value })}
                                       className="w-full bg-white/5 border border-white/10 rounded-none p-4 text-xs text-slate-300 outline-none focus:border-brand-primary appearance-none transition-all px-8 group-hover:border-white/20 cursor-pointer"
                                     >
                                       <option value="" className="bg-slate-900">ربط بمشروع تنفيذ...</option>
                                       {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                                     </select>
                                     <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none group-focus-within:text-brand-primary transition-colors" size={14} />
                                   </div>
                                </div>
                             </div>
                           ) : (
                             <div className="space-y-6">
                                <div className="flex items-center gap-5 p-4 bg-white/5 rounded-none border border-white/5 transition-all hover:bg-white/[0.08]">
                                   <div className="w-4 h-4 rounded-none flex items-center justify-center shrink-0 border border-white/10" style={{ backgroundColor: hieas.find(h => h.id === selectedGoal.hieaId)?.color || '#4ade80' }} />
                                   <div className="flex-1 min-w-0">
                                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">الهيئة الحاضنة</p>
                                      <p className="text-sm font-bold text-slate-300 truncate">{hieas.find(h => h.id === selectedGoal.hieaId)?.name || 'غير مرتبط'}</p>
                                   </div>
                                </div>
                                
                                <div className="flex items-center gap-5 p-4 bg-white/5 rounded-none border border-white/5 transition-all hover:bg-white/[0.08]">
                                   <div className="w-4 h-4 rounded-none flex items-center justify-center shrink-0 bg-teal-400 border border-white/10" />
                                   <div className="flex-1 min-w-0">
                                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">المبادرة المنفذة</p>
                                      <p className="text-sm font-bold text-slate-300 truncate">{projects.find(p => p.id === selectedGoal.projectId)?.name || 'غير مرتبط'}</p>
                                   </div>
                                </div>
                             </div>
                           )}
                        </div>
                     </div>

                     {/* Milestones Workspace */}
                      <div className="glass rounded-none p-10 border border-white/5 flex flex-col h-full bg-white/[0.01] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] blur-[40px] -translate-y-16 translate-x-16" />
                        
                        <div className="flex items-center justify-between mb-10 relative z-10">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                 <CheckCircle2 size={24} />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold tracking-tight">المحطات المسجلة</h4>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Strategy Execution Points</p>
                              </div>
                           </div>
                           {isEditing && (
                             <button 
                               onClick={addMilestone} 
                               className="px-6 py-2.5 rounded-none bg-emerald-500 text-brand-dark text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                             >
                                إضافة محطة +
                             </button>
                           )}
                        </div>
                        
                        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-4 max-h-[550px] relative z-10 text-right">
                          {(isEditing ? editData.milestones : selectedGoal.milestones || []).map((m: Milestone, idx: number) => (
                            <motion.div 
                              key={m.id} 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className={`p-6 rounded-none border transition-all flex flex-col gap-4 group relative ${
                              m.completed 
                              ? 'bg-emerald-500/[0.05] border-emerald-500/30' 
                              : 'bg-white/5 border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.08]'
                            }`}>
                               <div className="flex items-center gap-6">
                                  <button 
                                    disabled={!isEditing}
                                    onClick={() => updateMilestone(m.id, { completed: !m.completed })}
                                    className={`w-10 h-10 rounded-none flex items-center justify-center shrink-0 border-2 transition-all ${
                                       m.completed 
                                       ? 'bg-emerald-500 border-emerald-500 text-brand-dark shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
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
                                        className="w-full bg-transparent border-b border-white/10 outline-none text-base text-slate-100 font-bold placeholder:text-slate-700 py-1 focus:border-brand-primary"
                                        placeholder="صغ مسمى المحطة..."
                                      />
                                      <div className="flex items-center gap-2">
                                        <Calendar size={12} className="text-slate-600" />
                                        <input 
                                          type="date" 
                                          value={m.date}
                                          onChange={(e) => updateMilestone(m.id, { date: e.target.value })}
                                          className="bg-transparent border-none text-[10px] text-slate-500 outline-none font-bold uppercase"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-1 min-w-0">
                                       <p className={`text-lg font-bold transition-all ${m.completed ? 'text-emerald-400/80 line-through' : 'text-slate-100'}`}>{m.title}</p>
                                       <div className="flex items-center gap-3 mt-2">
                                          <div className={`w-1 h-1 ${m.completed ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                                          {m.date && <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">{m.date}</p>}
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
                          {(isEditing ? editData.milestones : selectedGoal.milestones || []).length === 0 && (
                            <div className="text-center py-24 opacity-10 flex flex-col items-center border-2 border-dashed border-white/5">
                               <TargetIcon size={64} className="mx-auto mb-6" />
                               <h5 className="text-[10px] font-black uppercase tracking-[0.4em]">لا توجد محطات مسجلة</h5>
                               <p className="text-[9px] mt-2 font-bold opacity-60 italic">Strategic planning required</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-8 pt-8 border-t border-white/5 space-y-4 relative z-10">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">إجمالي الخطوات</span>
                              <span className="text-sm font-black text-white">{(selectedGoal.milestones || []).length}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">الخطوات المكتملة</span>
                              <span className="text-sm font-black text-emerald-400">{(selectedGoal.milestones || []).filter((m: Milestone) => m.completed).length}</span>
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
        title="تأسيس عنصر استراتيجي جديد"
      >
        <form onSubmit={handleSubmit} className="space-y-10 p-4">
          <div className="space-y-8">
             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">نوع المسار الاستراتيجي</label>
                <div className="flex gap-4 p-2 bg-white/5 rounded-none border border-white/5">
                  {[
                    { id: GoalType.OBJECTIVE, label: 'أولوية / هدف' },
                    { id: GoalType.TARGET, label: 'مؤشر أداء رقمي' }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.id })}
                      className={`flex-1 py-5 rounded-none font-black transition-all text-xs uppercase tracking-widest ${
                        formData.type === type.id 
                        ? 'bg-brand-primary text-brand-dark shadow-[0_15px_30px_rgba(74,222,128,0.3)] scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
             </div>

             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">مسمى الهدف أو المؤشر</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-none py-6 px-10 outline-none focus:border-brand-primary text-2xl font-bold text-white shadow-inner"
                  placeholder="صياغة المسمى الرسمي للمسار..."
                  required
                />
             </div>

             <div className="grid grid-cols-2 gap-8">
               <div className="space-y-4">
                  <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">تاريخ الانطلاق (اختياري)</label>
                  <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-none py-5 px-8 outline-none focus:border-brand-primary text-slate-300 font-bold"
                  />
               </div>
               <div className="space-y-4 text-right">
                  <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">موعد الإغلاق (اختياري)</label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-none py-5 px-8 outline-none focus:border-brand-primary text-slate-300 font-bold"
                  />
               </div>
             </div>

             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الارتباط الهيكلي بالهيئة والاستراتيجية (اختياري)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative group">
                    <select 
                      value={formData.hieaId}
                      onChange={(e) => setFormData({ ...formData, hieaId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-none py-5 px-10 outline-none focus:border-brand-primary text-slate-300 appearance-none font-bold group-hover:border-white/20 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-slate-900">اختر الهيئة الحاضنة...</option>
                      {hieas.map(h => <option key={h.id} value={h.id} className="bg-slate-900">{h.name}</option>)}
                    </select>
                    <ChevronDown className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within:text-brand-primary transition-colors" size={18} />
                  </div>

                  <div className="relative group">
                    <select 
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-none py-5 px-10 outline-none focus:border-brand-primary text-slate-300 appearance-none font-bold group-hover:border-white/20 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-slate-900">ربط بمشروع تنفيذي...</option>
                      {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within:text-brand-primary transition-colors" size={18} />
                  </div>
                </div>
                
                <div className="flex gap-4 mt-4">
                    {[
                      { id: GoalCategory.OV9, label: 'إطار O.V.9' },
                      { id: GoalCategory.S15, label: 'مسار س 15' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                        className={`flex-1 py-5 rounded-none border text-[10px] font-black uppercase tracking-widest transition-all ${
                          formData.category === cat.id 
                          ? 'bg-brand-secondary/20 text-brand-secondary border-brand-secondary/40 shadow-lg shadow-brand-secondary/5' 
                          : 'bg-white/5 border-white/10 text-slate-600'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-white/5">
                  <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">تتبع مؤشرات الأداء (KPIs)</label>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      value={formData.kpiTitle}
                      onChange={(e) => setFormData({ ...formData, kpiTitle: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-none py-4 px-8 outline-none focus:border-brand-primary text-sm text-slate-300 font-bold"
                      placeholder="عنوان المؤشر (مثال: نسبة المبيعات المستهدفة)"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] text-slate-700 block px-2 uppercase font-black tracking-widest">المستهدف</label>
                        <input 
                          type="number" 
                          value={formData.kpiTarget}
                          onChange={(e) => setFormData({ ...formData, kpiTarget: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-none py-3 px-4 outline-none focus:border-brand-primary text-sm text-brand-primary font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-slate-700 block px-2 uppercase font-black tracking-widest">الحالي</label>
                        <input 
                          type="number" 
                          value={formData.kpiCurrent}
                          onChange={(e) => setFormData({ ...formData, kpiCurrent: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-none py-3 px-4 outline-none focus:border-brand-primary text-sm text-brand-secondary font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-slate-700 block px-2 uppercase font-black tracking-widest">الوحدة</label>
                        <input 
                          type="text" 
                          value={formData.kpiUnit}
                          onChange={(e) => setFormData({ ...formData, kpiUnit: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-none py-3 px-4 outline-none focus:border-brand-primary text-sm text-slate-300 font-bold"
                          placeholder="%, ريال..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
             </div>

          <button 
            type="submit"
            className="w-full bg-brand-primary text-brand-dark font-black uppercase tracking-[0.3em] py-7 rounded-none hover:scale-[1.02] active:scale-[0.98] transition-all neon-glow text-lg mt-6"
          >
            تثبيت العنصر الاستراتيجي
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteConfirm.isOpen} 
        onClose={() => setDeleteConfirm({ isOpen: false, goalId: null, name: '' })}
        title="تأكيد الحذف النهائي"
      >
        <div className="text-right space-y-8 p-2">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trash2 size={40} className="text-red-500" />
          </div>
          
          <div className="space-y-3 text-center">
            <h3 className="text-xl font-display font-black text-white">هل أنت متأكد من الحذف؟</h3>
            <p className="text-slate-400 font-medium">سيتم حذف الهدف <span className="text-red-400 font-black">"{deleteConfirm.name}"</span> وكافة البيانات المرتبطة به نهائياً من النظام.</p>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <button 
              onClick={handleDelete}
              className="w-full bg-red-600 text-white font-black py-5 rounded-none hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 text-sm uppercase tracking-widest"
            >
              نعم، أحذف الهدف (Yes, Delete)
            </button>
            <button 
              onClick={() => setDeleteConfirm({ isOpen: false, goalId: null, name: '' })}
              className="w-full bg-white/5 text-slate-400 font-black py-5 rounded-none hover:bg-white/10 border border-white/5 transition-all text-sm uppercase tracking-widest"
            >
              إلغاء العملية (Cancel)
            </button>
          </div>
        </div>
      </Modal>

      {/* Strategic Update Prompt */}
      <AnimatePresence>
        {updatePrompt?.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-brand-dark/90 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="w-full max-w-lg bg-[#0a0a0b] border border-brand-primary/20 shadow-[0_0_50px_rgba(45,212,191,0.1)] p-8 md:p-12 relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl -translate-y-16 -translate-x-16" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="w-20 h-20 bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 mb-8 shadow-lg">
                      <Award size={40} />
                   </div>
                   
                   <h3 className="text-2xl font-display font-black text-white mb-4 leading-tight text-center">مشاركة إنجاز استراتيجي؟</h3>
                   <p className="text-slate-400 font-bold leading-relaxed mb-10 text-sm text-center">
                      لقد حققت تقدماً ملموساً في "{updatePrompt.title}". هل ترغب في مشاركة هذا التحديث الاستراتيجي في لوحة النشاط العامة لتعزيز الشفافية التنفيذية؟
                   </p>
                   
                   <div className="w-full space-y-4">
                      <button 
                        disabled={isPostingUpdate}
                        onClick={handlePostStrategicUpdate}
                        className="w-full bg-brand-primary text-brand-dark font-black uppercase tracking-[0.2em] py-5 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20"
                      >
                         {isPostingUpdate ? (
                           <div className="w-5 h-5 border-2 border-brand-dark/30 border-t-brand-dark animate-spin" />
                         ) : (
                           <>
                             <Activity size={18} />
                             نشر التحديث الآن
                           </>
                         )}
                      </button>
                      <button 
                        disabled={isPostingUpdate}
                        onClick={() => setUpdatePrompt(null)}
                        className="w-full bg-white/5 text-slate-500 font-black uppercase tracking-[0.2em] py-5 hover:bg-white/10 transition-all border border-white/5"
                      >
                         تجاهل والمتابعة
                      </button>
                   </div>
                   
                   <div className="mt-8 pt-8 border-t border-white/5 w-full">
                      <div className="flex items-center gap-3 justify-center mb-4 text-center">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                         <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Protocol Strategic Announcement</span>
                      </div>
                      <div className="p-4 bg-white/[0.02] border border-white/5 text-right">
                         <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">"{updatePrompt.content}"</p>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
