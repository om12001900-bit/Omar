import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid,
  GanttChart,
  Plus, 
  Award, 
  Search,
  Trash2, 
  ChevronLeft, 
  Edit2, 
  Check, 
  X,
  Calendar,
  Shield,
  ListTodo,
  Layers,
  Target,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useProjects, useGoals, useHieas } from '../../hooks/useData';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  arrayUnion 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import PerformanceTracker from '../../components/PerformanceTracker';
import { ProjectStatus, Project, Milestone, ProjectSubGoal } from '../../types';
import ProjectGantt from '../../components/ProjectGantt';
import MilestoneGantt from '../../components/MilestoneGantt';
import ProjectIcon, { availableIcons } from '../../components/ProjectIcon';

const PROJECT_COLORS = ['#10b981', '#2dd4bf', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6', '#0ea5e9', '#94a3b8'];

export default function Projects() {
  const { projects } = useProjects();
  const { goals } = useGoals();
  const { hieas } = useHieas();
  const { user } = useAuth();
  const isAdmin = user?.email === 'om12001900@gmail.com';
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [isPerformanceModalOpen, setPerformanceModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [viewType, setViewType] = useState<'grid' | 'timeline' | 'kanban'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [progressNote, setProgressNote] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);
  const [activeTabDetail, setActiveTabDetail] = useState<'performance' | 'timeline' | 'details'>('performance');
  const [isManagingSubGoals, setIsManagingSubGoals] = useState(false);
  const [indicatorType, setIndicatorType] = useState<'positive' | 'negative' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; projectId: string | null; projectName: string }>({
    isOpen: false,
    projectId: null,
    projectName: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: ProjectStatus.IN_PROGRESS,
    progress: 0,
    kpiTitle: '',
    kpiTarget: 0,
    kpiCurrent: 0,
    kpiUnit: '',
    hieaIds: [] as string[],
    goalId: '',
    tags: [] as string[],
    icon: 'Award',
    color: '#2dd4bf',
    milestones: [] as Milestone[],
    dependencies: [] as string[],
    subGoals: [] as ProjectSubGoal[],
    challenges: [] as string[],
    requiredResources: [] as string[],
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  const [editData, setEditData] = useState<Partial<Project>>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: ProjectStatus.IN_PROGRESS,
    progress: 0,
    milestones: [] as Milestone[],
    hieaIds: [] as string[],
    goalId: '',
    tags: [] as string[],
    icon: 'Award',
    color: '#2dd4bf',
    dependencies: [] as string[],
    subGoals: [] as ProjectSubGoal[],
  });

  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) {
        // Sync selected project with live data if it changed (e.g. from PerformanceTracker)
        if (JSON.stringify(updated.performanceLogs) !== JSON.stringify(selectedProject.performanceLogs) || 
            updated.progress !== selectedProject.progress ||
            updated.kpiCurrent !== selectedProject.kpiCurrent) {
          setSelectedProject(updated);
        }

        setEditData({
          name: updated.name,
          description: updated.description || '',
          startDate: updated.startDate || '',
          endDate: updated.endDate || '',
          status: updated.status || ProjectStatus.IN_PROGRESS,
          progress: updated.progress || 0,
          milestones: updated.milestones || [],
          hieaIds: updated.hieaIds || (updated.hieaId ? [updated.hieaId] : []),
          goalId: updated.goalId || '',
          tags: updated.tags || [],
          icon: updated.icon || 'Award',
          color: updated.color || '#2dd4bf',
          dependencies: updated.dependencies || [],
          subGoals: updated.subGoals || [],
          challenges: updated.challenges || [],
          requiredResources: updated.requiredResources || [],
          priority: updated.priority || 'medium',
          kpiTitle: updated.kpiTitle || '',
          kpiTarget: updated.kpiTarget || 0,
          kpiCurrent: updated.kpiCurrent || 0,
          kpiUnit: updated.kpiUnit || '',
        });
      }
      setIsEditing(false);
    }
  }, [selectedProject?.id, projects]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: ProjectStatus.IN_PROGRESS,
      progress: 0,
      hieaIds: [],
      goalId: '',
      tags: [],
      icon: 'Award',
      color: '#2dd4bf',
      milestones: [],
      dependencies: [],
      subGoals: [],
      challenges: [],
      requiredResources: [],
      priority: 'medium',
    });
    setNewTag('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let finalStatus = formData.status;
      
      // Approval Workflow: If creating as completed and not admin, set to pending_completion
      if (finalStatus === ProjectStatus.COMPLETED && !isAdmin) {
        finalStatus = ProjectStatus.PENDING_COMPLETION;
      }

      await addDoc(collection(db, 'projects'), {
        ...formData,
        status: finalStatus,
        hieaId: formData.hieaIds[0] || '',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'projects');
    }
  };

  const handleUpdate = async () => {
    if (!selectedProject) return;
    try {
      let finalStatus = editData.status;
      
      // Check for newly completed milestones
      const newlyCompletedMilestones = (editData.milestones || []).filter(m => 
        m.completed && !(selectedProject.milestones || []).find(sm => sm.id === m.id)?.completed
      );

      // Approval Workflow: If moving to completed and not admin, set to pending_completion
      if (finalStatus === ProjectStatus.COMPLETED && !isAdmin && selectedProject.status !== ProjectStatus.COMPLETED) {
        finalStatus = ProjectStatus.PENDING_COMPLETION;
      }

      const updatedData = {
        ...editData,
        status: finalStatus,
        hieaId: editData.hieaIds && editData.hieaIds.length > 0 ? editData.hieaIds[0] : '',
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'projects', selectedProject.id), updatedData);
      setIsEditing(false);
      setSelectedProject({ ...selectedProject, ...updatedData } as Project);

      // Trigger prompt if milestone completed or project completed
      if (newlyCompletedMilestones.length > 0) {
        const lastM = newlyCompletedMilestones[newlyCompletedMilestones.length - 1];
        setUpdatePrompt({
          show: true,
          title: lastM.title,
          content: `تم إنجاز مرحلة محورية: "${lastM.title}" ضمن مشروع ${selectedProject.name}. يمثل هذا التقدم خطوة جوهرية نحو تحقيق الأهداف الاستراتيجية المسندة.`,
          type: 'milestone',
          entityId: selectedProject.id,
          entityName: selectedProject.name,
          icon: selectedProject.icon
        });
      } else if (finalStatus === ProjectStatus.COMPLETED && selectedProject.status !== ProjectStatus.COMPLETED) {
        setUpdatePrompt({
          show: true,
          title: `اكتمال مشروع: ${selectedProject.name}`,
          content: `نفخر بالإعلان عن إتمام مشروع "${selectedProject.name}" بنجاح. تم تحقيق كافة المستهدفات والمراحل الرئيسية بكفاءة استراتيجية عالية.`,
          type: 'project',
          entityId: selectedProject.id,
          entityName: selectedProject.name,
          icon: 'Award'
        });
      }
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
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

  const updateProjectProgress = async (val: number, note?: string, type?: 'positive' | 'negative') => {
    if (!selectedProject || isEditing) return;
    try {
      const updatePayload: Record<string, unknown> = { 
        progress: val, 
        updatedAt: serverTimestamp() 
      };

      const performanceType = type || (val >= selectedProject.progress ? 'positive' : 'negative');

      if (note || type) {
        const newLog = {
          id: Math.random().toString(36).substr(2, 9),
          value: val - (selectedProject.progress || 0),
          type: 'relative',
          impact: performanceType,
          note: note || (performanceType === 'positive' ? 'تم رصد تقدم إيجابي في المسار الميداني' : 'تم رصد معوقات أو تأخر في المسار'),
          date: new Date().toISOString().split('T')[0],
          recordedBy: user?.displayName || user?.email || 'مستخدم',
          recordedAt: new Date().toISOString()
        };
        updatePayload.performanceLogs = arrayUnion(newLog);
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updatePayload);
      
      // Auto-Sync logic for HIEAs and Goals if progress is positive
      if (performanceType === 'positive' && val > selectedProject.progress) {
        const diff = val - selectedProject.progress;
        
        // Update HIEAs
        const hieaIds = selectedProject.hieaIds || (selectedProject.hieaId ? [selectedProject.hieaId] : []);
        for (const hId of hieaIds) {
          const hiea = hieas.find(h => h.id === hId);
          if (hiea) {
            const currentHieaProgress = hiea.progress || 0;
            // Proportional increase: increase hiea progress by a fraction of the project progress jump
            const newHieaProgress = Math.min(100, currentHieaProgress + (diff * 0.5)); 
            await updateDoc(doc(db, 'hieas', hId), { 
              progress: newHieaProgress,
              updatedAt: serverTimestamp()
            });
          }
        }

        // Update Goal
        if (selectedProject.goalId) {
          const goal = goals.find(g => g.id === selectedProject.goalId);
          if (goal) {
            const currentGoalProgress = goal.progress || 0;
            const newGoalProgress = Math.min(100, currentGoalProgress + (diff * 0.3));
            await updateDoc(doc(db, 'goals', selectedProject.goalId), { 
              progress: newGoalProgress,
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      setSelectedProject(prev => prev ? { ...prev, progress: val } : null);
      setProgressNote('');
      setShowNoteField(false);
      setIndicatorType(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const updateSubGoal = async (goalId: string, updates: Partial<ProjectSubGoal>) => {
    if (!selectedProject) return;
    try {
      const newSubGoals = (selectedProject.subGoals || []).map(sg => 
        sg.id === goalId ? { ...sg, ...updates } : sg
      );
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        subGoals: newSubGoals,
        updatedAt: serverTimestamp()
      });
      setSelectedProject({ ...selectedProject, subGoals: newSubGoals });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}/subgoal/${goalId}`);
    }
  };

  const addSubGoal = async (title: string) => {
    if (!selectedProject || !title.trim()) return;
    try {
      const newGoal = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        progress: 0,
        indicator: 'stable'
      };
      const newSubGoals = [...(selectedProject.subGoals || []), newGoal];
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        subGoals: newSubGoals,
        updatedAt: serverTimestamp()
      });
      setSelectedProject({ ...selectedProject, subGoals: newSubGoals });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}/subgoals`);
    }
  };

  const removeSubGoal = async (goalId: string) => {
    if (!selectedProject) return;
    try {
      const newSubGoals = (selectedProject.subGoals || []).filter(sg => sg.id !== goalId);
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        subGoals: newSubGoals,
        updatedAt: serverTimestamp()
      });
      setSelectedProject({ ...selectedProject, subGoals: newSubGoals });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}/subgoals`);
    }
  };

  const deleteProject = async () => {
    if (!deleteConfirm.projectId) return;
    try {
      await deleteDoc(doc(db, 'projects', deleteConfirm.projectId));
      if (selectedProject?.id === deleteConfirm.projectId) setSelectedProject(null);
      setDeleteConfirm({ isOpen: false, projectId: null, projectName: '' });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `projects/${deleteConfirm.projectId}`);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, projectId: id, projectName: name });
  };

  const addMilestone = (isEdit: boolean = true) => {
    if (isEdit) {
      setEditData({
        ...editData,
        milestones: [...(editData.milestones || []), { title: '', date: '', completed: false, notes: '', id: Date.now() }]
      });
    } else {
      setFormData({
        ...formData,
        milestones: [...(formData.milestones || []), { title: '', date: '', completed: false, notes: '', id: Date.now() }]
      });
    }
  };

  const updateMilestone = (id: number, updates: Partial<Milestone>, isEdit: boolean = true) => {
    if (isEdit) {
      setEditData({
        ...editData,
        milestones: (editData.milestones || []).map((m) => m.id === id ? { ...m, ...updates } : m)
      });
    } else {
      setFormData({
        ...formData,
        milestones: (formData.milestones || []).map((m) => m.id === id ? { ...m, ...updates } : m)
      });
    }
  };

  const removeMilestone = (id: number, isEdit: boolean = true) => {
    if (isEdit) {
      setEditData({
        ...editData,
        milestones: (editData.milestones || []).filter((m) => m.id !== id)
      });
    } else {
      setFormData({
        ...formData,
        milestones: (formData.milestones || []).filter((m) => m.id !== id)
      });
    }
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

  const selectedProjectHieaIds = selectedProject?.hieaIds || (selectedProject?.hieaId ? [selectedProject.hieaId] : []);
  const selectedProjectHieas = hieas.filter(h => selectedProjectHieaIds.includes(h.id));
  const projectThemeColor = selectedProject?.color || selectedProjectHieas[0]?.color || '#2dd4bf';

  const relatedProjects = projects.filter(p => 
    selectedProject && 
    p.id !== selectedProject.id && 
    (p.hieaIds || (p.hieaId ? [p.hieaId] : [])).some(id => selectedProjectHieaIds.includes(id))
  ).slice(0, 4);

  const cycleView = () => {
    if (viewType === 'grid') setViewType('kanban');
    else if (viewType === 'kanban') setViewType('timeline');
    else setViewType('grid');
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden text-right">
      {/* Header section with high-contrast typography and clear call-to-action */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2 py-8 shrink-0 border-b border-white/5 mb-6">
        <div className="text-right w-full md:w-auto">
          <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter leading-tight mb-2">المشاريع التنفيذية</h1>
          <p className="text-slate-500 font-bold text-sm md:text-base">تنسيق المبادرات الميدانية وتحديث مسارات الإنجاز بصورة تفاعلية</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <button 
            id="projects-view-toggle-btn"
            onClick={cycleView}
            className="w-full md:w-auto bg-[#0a0a0b] text-slate-300 border border-white/10 font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.98] group shrink-0 relative focus:outline-none focus:ring-2 focus:ring-brand-secondary/50"
            aria-label={viewType === 'grid' ? "التبديل إلى عرض كانبان" : viewType === 'kanban' ? "التبديل إلى عرض مخطط جانت" : "التبديل إلى عرض الشبكة"}
          >
            <div className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-primary"></span>
            </div>
            {viewType === 'grid' ? (
              <>
                <ListTodo size={20} className="text-brand-secondary group-hover:scale-110 transition-transform" />
                <span className="text-sm tracking-tight font-black uppercase">لوحة كانبان (Kanban)</span>
              </>
            ) : viewType === 'kanban' ? (
              <>
                <GanttChart size={20} className="text-brand-secondary group-hover:scale-110 transition-transform" />
                <span className="text-sm tracking-tight font-black uppercase">مخطط جانت (Gantt Chart)</span>
              </>
            ) : (
              <>
                <LayoutGrid size={20} className="text-brand-secondary group-hover:scale-110 transition-transform" />
                <span className="text-sm tracking-tight font-black uppercase">شبكة المشاريع (Grid View)</span>
              </>
            )}
          </button>
          <button 
            id="add-project-btn"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="w-full md:w-auto bg-brand-primary text-brand-dark font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-brand-primary/20 transition-all group shrink-0 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="إضافة مشروع تنفيذي جديد"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-dark/10 flex items-center justify-center group-hover:rotate-90 transition-transform">
              <Plus size={20} strokeWidth={3} />
            </div>
            <span className="text-base tracking-tight">إطلاق مشروع جديد</span>
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
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 mb-12 px-2 shrink-0 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
                  <div className="flex flex-col gap-6 flex-1">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      {[
                        { id: 'all', label: 'كافة المشاريع' },
                        { id: ProjectStatus.UPCOMING, label: 'قيد التخطيط' },
                        { id: ProjectStatus.IN_PROGRESS, label: 'نشطة ومستمرة' },
                        { id: ProjectStatus.PENDING_COMPLETION, label: 'بانتظار المراجعة' },
                        { id: ProjectStatus.COMPLETED, label: 'مشاريع مكتملة' }
                      ].map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => setFilterStatus(filter.id as ProjectStatus | 'all')}
                          className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            filterStatus === filter.id 
                            ? 'bg-brand-primary text-brand-dark border-brand-primary shadow-xl shadow-brand-primary/10' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
                      <div className="bg-white/5 px-4 py-2 flex items-center shrink-0 border border-white/10">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">تصفية حسب الوسوم</span>
                      </div>
                      <button
                        onClick={() => setSelectedTag('all')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all shrink-0 border ${
                          selectedTag === 'all' 
                          ? 'bg-brand-secondary/20 border-brand-secondary/40 text-brand-secondary' 
                          : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        الكل
                      </button>
                      {Array.from(new Set(projects.flatMap(p => p.tags || []))).map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all shrink-0 border ${
                            selectedTag === tag 
                            ? 'bg-brand-secondary text-brand-dark border-brand-secondary' 
                            : 'bg-white/5 border-transparent text-slate-500 hover:text-white'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center bg-[#0a0a0b] border border-white/5 rounded-2xl px-5 py-3 hover:border-brand-secondary/30 transition-all focus-within:ring-4 focus-within:ring-brand-secondary/5 w-full sm:w-72">
                       <Search size={16} className="text-slate-600" aria-hidden="true" />
                       <input 
                         type="text"
                         placeholder="بحث في المبادرات..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder:text-slate-700 text-right w-full mr-3"
                         aria-label="بحث في المبادرات"
                       />
                    </div>
                    <div className="hidden sm:flex items-center gap-3 px-5 py-3 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl shrink-0">
                      <span className="text-[10px] font-black uppercase text-brand-primary tracking-widest">
                        {projects.filter(p => (filterStatus === 'all' || p.status === filterStatus) && (selectedTag === 'all' || p.tags?.includes(selectedTag))).length}
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">سجل</span>
                    </div>
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
                      .map((project) => {
                        const projectHieaIds = project.hieaIds || (project.hieaId ? [project.hieaId] : []);
                        const projectHieas = hieas.filter(h => projectHieaIds.includes(h.id));
                        const themeColor = project.color || projectHieas[0]?.color || '#2dd4bf';

                        return (
                          <motion.div
                            layout
                            key={project.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group cursor-pointer relative"
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
                                hieaIds: project.hieaIds || (project.hieaId ? [project.hieaId] : []),
                                goalId: project.goalId || '',
                                tags: project.tags || [],
                                icon: project.icon || 'Award',
                                color: project.color || '#2dd4bf',
                                kpiTitle: project.kpiTitle || '',
                                kpiTarget: project.kpiTarget || 0,
                                kpiCurrent: project.kpiCurrent || 0,
                                kpiUnit: project.kpiUnit || '',
                              });
                              setIsEditing(false);
                            }}
                          >
                            <div 
                              className="relative h-full bg-white/[0.02] border border-white/5 p-8 transition-all group-hover:bg-white/[0.04] group-hover:translate-y-[-4px] overflow-hidden"
                              style={{ 
                                borderColor: themeColor ? `${themeColor}33` : undefined,
                              }}
                            >
                              {/* Hover Actions Overlay */}
                              <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-6 p-8 z-20 pointer-events-none group-hover:pointer-events-auto">
                                <motion.div 
                                  initial={{ y: 20, opacity: 0 }}
                                  whileInView={{ y: 0, opacity: 1 }}
                                  className="text-center"
                                >
                                  <p className="text-[10px] font-black uppercase text-brand-secondary tracking-[0.3em] mb-2">إجراء سريع للمبادرة</p>
                                  <h4 className="text-white font-bold text-base mb-6 px-4">{project.name}</h4>
                                </motion.div>
                                
                                <div className="grid grid-cols-2 gap-4 w-full">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProject(project);
                                      setPerformanceModalOpen(true);
                                    }}
                                    className="bg-brand-primary text-brand-dark px-4 py-4 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-3 shadow-xl shadow-brand-primary/10"
                                  >
                                    <Activity size={20} />
                                    تحديث الأداء
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProject(project);
                                      setIsEditing(true);
                                    }}
                                    className="bg-white/10 text-white px-4 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all flex flex-col items-center gap-3 border border-white/10"
                                  >
                                    <Edit2 size={20} />
                                    تعديل البيانات
                                  </button>
                                </div>
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProject(project);
                                  }}
                                  className="w-full mt-4 bg-transparent text-slate-400 hover:text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b border-transparent hover:border-white/10"
                                >
                                  عرض التفاصيل والمسارات الكاملة
                                </button>
                                
                                <div className="absolute bottom-6 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-pulse" />
                                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">O.V.9 Operational Console</span>
                                </div>
                              </div>

                              {/* Status Accent Line */}
                              <div 
                                className="absolute top-0 right-0 left-0 h-[2px] transition-all" 
                                style={{ backgroundColor: themeColor }}
                              />
                              
                              <div className="flex items-center justify-between mb-8">
                                <div 
                                  className="w-12 h-12 rounded-none flex items-center justify-center border transition-all"
                                  style={{ 
                                    backgroundColor: `${themeColor}1a`, 
                                    borderColor: `${themeColor}4d`,
                                    color: themeColor
                                  }}
                                >
                                  <ProjectIcon name={project.icon} size={20} />
                                </div>
                                <div className="flex flex-col items-end">
                                  <span 
                                    className="text-xl font-display font-black tracking-tighter transition-colors"
                                    style={{ color: `${themeColor}cc` }}
                                  >
                                    {project.progress}%
                                  </span>
                                  <div className="w-24 h-2 bg-white/5 mt-1 rounded-none overflow-hidden border border-white/5 relative">
                                     {/* Dynamic Glow Layer */}
                                     <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                        style={{ width: `${project.progress}%`, backgroundColor: themeColor }}
                                        className="absolute inset-0 blur-md pointer-events-none"
                                     />
                                     
                                     <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${project.progress}%` }}
                                        transition={{ duration: 1.2, ease: "circOut" }}
                                        className="h-full relative z-10" 
                                        style={{ background: `linear-gradient(to left, ${themeColor}, ${themeColor}cc)` }}
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
                                    <span 
                                      key={tag} 
                                      className="px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter border transition-all"
                                      style={{ 
                                        backgroundColor: `${themeColor}1a`, 
                                        color: themeColor,
                                        borderColor: `${themeColor}33`
                                      }}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                              </div>
                              <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed min-h-[3em]">{project.description || 'لا يوجد وصف متاح لهذا المشروع حالياً.'}</p>
                              
                              {/* Associated Hieas */}
                              {projectHieas.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                  {projectHieas.map(h => (
                                    <div key={h.id} className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] border border-white/5 rounded-none">
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.color || themeColor }} />
                                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider transition-colors group-hover:text-white">{h.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Milestones Preview */}
                              {(project.milestones || []).length > 0 && (
                                <div className="space-y-2 mb-8 h-[100px] overflow-hidden relative">
                                  <div className="flex items-center gap-2 mb-3">
                                    <ListTodo size={12} className="text-slate-500" />
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">المحطات الرئيسية</span>
                                  </div>
                                  <div className="space-y-2">
                                    {(project.milestones || []).slice(0, 3).map((milestone) => (
                                      <div key={milestone.id} className="flex items-center gap-2 group/ms">
                                        <div className={`w-3 h-3 border shrink-0 flex items-center justify-center transition-all ${
                                          milestone.completed 
                                          ? 'bg-brand-secondary border-brand-secondary text-brand-dark' 
                                          : 'border-white/10 text-transparent'
                                        }`}>
                                          <Check size={8} strokeWidth={4} />
                                        </div>
                                        <span className={`text-[11px] truncate ${milestone.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                          {milestone.title}
                                        </span>
                                      </div>
                                    ))}
                                    {project.milestones.length > 3 && (
                                      <div className="text-[10px] text-slate-600 font-bold pr-5 mt-1 italic">
                                        + {project.milestones.length - 3} محطات إضافية...
                                      </div>
                                    )}
                                  </div>
                                  {/* Fade out effect if many milestones */}
                                  <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-brand-dark/50 to-transparent pointer-events-none" />
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                                 <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-1">الحالة التنفيذية</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tight" style={{ color: themeColor }}>
                                      {project.status === 'completed' ? 'تم الإنجاز' : 
                                       project.status === 'pending_completion' ? 'بانتظار الاعتماد' :
                                       project.status === 'in-progress' ? 'نشط ميدانياً' : 'مرحلة التخطيط'}
                                    </span>
                                 </div>
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={(e) => openDeleteConfirm(e, project.id, project.name)}
                                     className="p-3 text-red-500/50 hover:text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-all rounded-none border border-red-500/10"
                                     title="حذف المشروع"
                                   >
                                     <Trash2 size={16} />
                                   </button>
                                   <button 
                                     className="p-3 transition-all border"
                                     style={{ 
                                       backgroundColor: `${themeColor}0d`, 
                                       borderColor: `${themeColor}1a`,
                                       color: `${themeColor}80`
                                     }}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setSelectedProject(project);
                                       setEditData({
                                         name: project.name,
                                         description: project.description || '',
                                         startDate: project.startDate || '',
                                         endDate: project.endDate || '',
                                         status: project.status || ProjectStatus.IN_PROGRESS,
                                         progress: project.progress || 0,
                                         milestones: project.milestones || [],
                                         hieaIds: project.hieaIds || (project.hieaId ? [project.hieaId] : []),
                                         goalId: project.goalId || '',
                                         tags: project.tags || [],
                                         icon: project.icon || 'Award',
                                         kpiTitle: project.kpiTitle || '',
                                         kpiTarget: project.kpiTarget || 0,
                                         kpiCurrent: project.kpiCurrent || 0,
                                         kpiUnit: project.kpiUnit || '',
                                       });
                                       setIsEditing(false);
                                     }}
                                   >
                                     <ChevronLeft size={16} className="rtl-flip" style={{ color: themeColor }} />
                                   </button>
                                 </div>
                              </div>

                              {/* Background Decor */}
                              <div 
                                className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" 
                                style={{ backgroundColor: `${themeColor}33` }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                ) : viewType === 'kanban' ? (
                  <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
                    {[
                      { id: ProjectStatus.UPCOMING, label: 'قيد التخطيط', color: '#64748b' },
                      { id: ProjectStatus.IN_PROGRESS, label: 'نشط ميدانياً', color: '#2dd4bf' },
                      { id: ProjectStatus.PENDING_COMPLETION, label: 'بانتظار الاعتماد', color: '#fbbf24' },
                      { id: ProjectStatus.COMPLETED, label: 'تم الإنجاز بنجاح', color: '#10b981' }
                    ].map((column) => (
                      <div key={column.id} className="flex-1 min-w-[320px] max-w-[400px] flex flex-col bg-[#0a0a0b]/40 border border-white/5 rounded-[2rem] overflow-hidden">
                        <div className="p-6 border-b border-white/5 shrink-0 flex items-center justify-between bg-white/[0.02]">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                            <h3 className="text-xs font-black uppercase text-white tracking-widest leading-none">{column.label}</h3>
                          </div>
                          <span className="text-[10px] font-black text-slate-700 bg-white/5 px-2 py-1 rounded-md">
                            {projects.filter(p => 
                              p.status === column.id && 
                              (selectedTag === 'all' || p.tags?.includes(selectedTag)) &&
                              (p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                            ).length}
                          </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                          {projects
                            .filter(p => 
                              p.status === column.id && 
                              (selectedTag === 'all' || p.tags?.includes(selectedTag)) &&
                              (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                              )
                            )
                            .map((project) => {
                              const projectHieaIds = project.hieaIds || (project.hieaId ? [project.hieaId] : []);
                              const projectHieas = hieas.filter(h => projectHieaIds.includes(h.id));
                              const themeColor = projectHieas[0]?.color || column.color;
                              
                              return (
                                <motion.div
                                  layout
                                  key={project.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="group cursor-pointer bg-[#020617] border border-white/5 p-5 rounded-2xl hover:border-brand-primary/30 transition-all shadow-lg hover:shadow-brand-primary/5 relative overflow-hidden"
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
                                      hieaIds: project.hieaIds || (project.hieaId ? [project.hieaId] : []),
                                      goalId: project.goalId || '',
                                      tags: project.tags || [],
                                      icon: project.icon || 'Award',
                                      kpiTitle: project.kpiTitle || '',
                                      kpiTarget: project.kpiTarget || 0,
                                      kpiCurrent: project.kpiCurrent || 0,
                                      kpiUnit: project.kpiUnit || '',
                                    });
                                    setIsEditing(false);
                                  }}
                                >
                                  {/* Kanban Hover Actions */}
                                  <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 px-4 z-10 pointer-events-none group-hover:pointer-events-auto">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProject(project);
                                        setPerformanceModalOpen(true);
                                      }}
                                      title="تحديث الأداء"
                                      className="p-2.5 bg-brand-primary text-brand-dark rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
                                    >
                                      <Activity size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProject(project);
                                        setIsEditing(true);
                                      }}
                                      title="تعديل البيانات"
                                      className="p-2.5 bg-white/10 text-white border border-white/10 rounded-xl hover:bg-white/20 hover:scale-110 active:scale-95 transition-all"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProject(project);
                                      }}
                                      title="عرض التفاصيل"
                                      className="p-2.5 bg-white/10 text-white border border-white/10 rounded-xl hover:bg-white/20 hover:scale-110 active:scale-95 transition-all"
                                    >
                                      <ChevronLeft size={16} className="rtl-flip" />
                                    </button>
                                  </div>
                                  <div className="flex items-start justify-between mb-3">
                                    <div 
                                      className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                                      style={{ 
                                        backgroundColor: `${themeColor}1a`, 
                                        borderColor: `${themeColor}4d`,
                                        color: themeColor
                                      }}
                                    >
                                      <ProjectIcon name={project.icon} size={18} />
                                    </div>
                                    <span className="text-[10px] font-black" style={{ color: themeColor }}>{project.progress}%</span>
                                  </div>
                                  <h4 className="text-sm font-bold text-white mb-2 leading-relaxed group-hover:text-brand-primary transition-colors">{project.name}</h4>
                                  
                                  {/* Associated Hieas */}
                                  {projectHieas.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                      {projectHieas.map(h => (
                                        <span 
                                          key={h.id} 
                                          className="text-[7px] font-black uppercase tracking-wider text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-sm border border-white/5"
                                        >
                                          {h.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {project.tags?.slice(0, 2).map(tag => (
                                      <span key={tag} className="px-2 py-0.5 text-[7px] font-black uppercase bg-white/5 border border-white/5 text-slate-500 rounded-md">#{tag}</span>
                                    ))}
                                  </div>
                                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full" style={{ width: `${project.progress}%`, backgroundColor: themeColor }} />
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ProjectGantt 
                    projects={projects.filter(p => 
                      (filterStatus === 'all' || p.status === filterStatus) &&
                      (selectedTag === 'all' || p.tags?.includes(selectedTag))
                    )} 
                    hieas={hieas}
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
                        hieaIds: project.hieaIds || (project.hieaId ? [project.hieaId] : []),
                        goalId: project.goalId || '',
                        tags: project.tags || [],
                        icon: project.icon || 'Award',
                        color: project.color || '#2dd4bf',
                        kpiTitle: project.kpiTitle || '',
                        kpiTarget: project.kpiTarget || 0,
                        kpiCurrent: project.kpiCurrent || 0,
                        kpiUnit: project.kpiUnit || '',
                      });
                      setIsEditing(false);
                    }}
                  />
                )}

                {projects.length === 0 && (
                  <div className="text-center py-40">
                    <div className="relative inline-block mb-8">
                       <div className="absolute inset-0 bg-brand-secondary/10 blur-[80px] animate-pulse" />
                       <Award size={80} className="relative z-10 text-slate-800 opacity-20" />
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
                  <div 
                    className="w-10 h-10 rounded-none flex items-center justify-center border transition-all"
                    style={{ 
                      backgroundColor: `${projectThemeColor}1a`, 
                      borderColor: `${projectThemeColor}33`,
                      color: projectThemeColor
                    }}
                  >
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
                          className="w-16 h-16 md:w-20 md:h-20 rounded-none flex items-center justify-center border-2 transition-all shrink-0 shadow-[0_15px_30px_-10px_rgba(45,212,191,0.3)]"
                          style={{ 
                            borderColor: projectThemeColor, 
                            color: projectThemeColor, 
                            backgroundColor: `${projectThemeColor}1a`
                          }}
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
                                <option value={ProjectStatus.PENDING_COMPLETION} className="bg-slate-900">إرسال لطلب الاعتماد</option>
                                <option value={ProjectStatus.COMPLETED} className="bg-slate-900">مكتمل {isAdmin ? '(اعتماد فوري)' : '(يتطلب اعتماد)'}</option>
                              </select>
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">الارتباط بالهيئات (يمكن اختيار أكثر من هيئة)</label>
                                <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10 w-full md:w-[400px]">
                                  {hieas.map(h => {
                                    const isSelected = editData.hieaIds?.includes(h.id);
                                    return (
                                      <button
                                        key={h.id}
                                        type="button"
                                        onClick={() => {
                                          const currentIds = editData.hieaIds || [];
                                          const newHieaIds = isSelected 
                                            ? currentIds.filter(id => id !== h.id)
                                            : [...currentIds, h.id];
                                          setEditData({ ...editData, hieaIds: newHieaIds });
                                        }}
                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-all ${
                                          isSelected 
                                            ? 'bg-brand-secondary text-brand-dark border-brand-secondary' 
                                            : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'
                                        }`}
                                      >
                                        {h.name}
                                      </button>
                                    );
                                  })}
                                  {hieas.length === 0 && <span className="text-[9px] text-slate-600 uppercase font-black">لا توجد هيئات</span>}
                                </div>
                              </div>
                              <select 
                                value={editData.goalId}
                                onChange={(e) => setEditData({ ...editData, goalId: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-none px-6 py-2 text-sm text-slate-300 outline-none focus:border-brand-secondary w-full md:w-[400px] appearance-none"
                              >
                                <option value="" className="bg-slate-900">ربط بهدف استراتيجي (اختياري)...</option>
                                {goals.map(g => <option key={g.id} value={g.id} className="bg-slate-900">{g.name}</option>)}
                              </select>

                              {editData.status !== ProjectStatus.COMPLETED && (
                                <div className="grid grid-cols-2 gap-4 w-full md:w-[400px]">
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">تاريخ الانطلاق</label>
                                    <input 
                                      type="date" 
                                      value={editData.startDate}
                                      onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                      className="w-full bg-white/5 border border-white/10 rounded-none py-2 px-4 outline-none focus:border-brand-secondary text-sm text-slate-300 font-bold"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">تاريخ الانتهاء</label>
                                    <input 
                                      type="date" 
                                      value={editData.endDate}
                                      onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                                      className="w-full bg-white/5 border border-white/10 rounded-none py-2 px-4 outline-none focus:border-brand-secondary text-sm text-slate-300 font-bold"
                                    />
                                  </div>
                                </div>
                              )}


                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-[600px] p-4 bg-white/[0.02] border border-white/5">
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">مؤشر الأداء (KPI)</label>
                                  <input 
                                    type="text" 
                                    value={editData.kpiTitle}
                                    onChange={(e) => setEditData({ ...editData, kpiTitle: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-none py-2 px-4 outline-none focus:border-brand-secondary text-sm text-slate-300 font-bold"
                                    placeholder="مسمى المؤشر"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">المستهدف</label>
                                  <input 
                                    type="number" 
                                    value={editData.kpiTarget}
                                    onChange={(e) => setEditData({ ...editData, kpiTarget: Number(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-none py-2 px-4 outline-none focus:border-brand-secondary text-sm text-slate-300 font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">الحالي</label>
                                  <input 
                                    type="number" 
                                    value={editData.kpiCurrent}
                                    onChange={(e) => setEditData({ ...editData, kpiCurrent: Number(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-none py-2 px-4 outline-none focus:border-brand-secondary text-sm text-slate-300 font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">الوحدة</label>
                                  <input 
                                    type="text" 
                                    value={editData.kpiUnit}
                                    onChange={(e) => setEditData({ ...editData, kpiUnit: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-none py-2 px-4 outline-none focus:border-brand-secondary text-sm text-slate-300 font-bold"
                                    placeholder="%"
                                  />
                                </div>
                              </div>

                              <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">الارتباط بمشاريع أخرى (الاعتمادات)</label>
                                <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10 w-full md:w-[600px]">
                                  {projects.filter(p => p.id !== selectedProject?.id).map(p => {
                                    const isDepSelected = editData.dependencies?.includes(p.id);
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          const currentDeps = editData.dependencies || [];
                                          const newDeps = isDepSelected ? currentDeps.filter(id => id !== p.id) : [...currentDeps, p.id];
                                          setEditData({ ...editData, dependencies: newDeps });
                                        }}
                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-all ${
                                          isDepSelected 
                                            ? 'bg-brand-primary text-brand-dark border-brand-primary' 
                                            : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'
                                        }`}
                                      >
                                        {p.name}
                                      </button>
                                    );
                                  })}
                                  {projects.length <= 1 && <span className="text-[9px] text-slate-600 uppercase font-black">لا توجد مشاريع أخرى للربط</span>}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">لون المشروع</label>
                                <div className="flex flex-wrap gap-2 p-2 bg-white/5 border border-white/10 w-full md:w-[400px]">
                                  {PROJECT_COLORS.map(c => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setEditData({ ...editData, color: c })}
                                      className={`w-8 h-8 rounded-full transition-all border-2 ${editData.color === c ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </div>
                              </div>

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
                                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">أهداف فرعية للمشروع (Strategic Sub-Goals)</label>
                                <div className="space-y-4">
                                  {(editData.subGoals || []).map((sg: ProjectSubGoal, idx: number) => (
                                    <div key={sg.id || idx} className="space-y-2 p-4 bg-white/5 border border-white/10">
                                      <div className="flex gap-2">
                                        <input 
                                          type="text"
                                          placeholder="عنوان الهدف"
                                          value={sg.title}
                                          onChange={(e) => {
                                            const newSg = [...(editData.subGoals || [])];
                                            newSg[idx] = { ...sg, title: e.target.value };
                                            setEditData({ ...editData, subGoals: newSg });
                                          }}
                                          className="flex-1 bg-white/5 border border-white/10 py-2 px-4 text-sm text-slate-300"
                                        />
                                        <button 
                                          onClick={(e: React.MouseEvent) => {
                                            e.preventDefault();
                                            setEditData({ ...editData, subGoals: (editData.subGoals || []).filter((_: ProjectSubGoal, i: number) => i !== idx) });
                                          }}
                                          className="p-2 text-red-500 hover:bg-red-500/10"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                          <input 
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={sg.progress}
                                            onChange={(e) => {
                                              const newSg = [...(editData.subGoals || [])];
                                              const val = parseInt(e.target.value);
                                              const oldProgress = sg.progress || 0;
                                              const indicator = val > oldProgress ? 'positive' : val < oldProgress ? 'negative' : (sg.indicator || 'stable');
                                              newSg[idx] = { ...sg, progress: val, indicator };
                                              setEditData({ ...editData, subGoals: newSg });
                                            }}
                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                                          />
                                        </div>
                                        <span className="text-[10px] font-black text-brand-secondary w-8 text-center">{sg.progress}%</span>
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditData({ ...editData, subGoals: [...(editData.subGoals || []), { id: Math.random().toString(36).substr(2, 9), title: '', progress: 0, indicator: 'stable' }] })}
                                    className="text-[10px] font-black text-brand-secondary uppercase tracking-widest hover:underline"
                                  >
                                    + إضافة هدف استراتيجي فرعي
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">التحديات والمعوقات</label>
                                <div className="space-y-2">
                                  {(editData.challenges || []).map((ch, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <input 
                                        type="text"
                                        value={ch}
                                        onChange={(e) => {
                                          const newCh = [...(editData.challenges || [])];
                                          newCh[idx] = e.target.value;
                                          setEditData({ ...editData, challenges: newCh });
                                        }}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-none py-2 px-4 text-sm text-slate-300 pointer-events-auto"
                                      />
                                      <button 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setEditData({ ...editData, challenges: (editData.challenges || []).filter((_, i) => i !== idx) });
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-500/10"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditData({ ...editData, challenges: [...(editData.challenges || []), ''] })}
                                    className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:underline"
                                  >
                                    + رصد تحدي جديد
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-2">الموارد اللازمة</label>
                                <div className="space-y-2">
                                  {(editData.requiredResources || []).map((res, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <input 
                                        type="text"
                                        value={res}
                                        onChange={(e) => {
                                          const newRes = [...(editData.requiredResources || [])];
                                          newRes[idx] = e.target.value;
                                          setEditData({ ...editData, requiredResources: newRes });
                                        }}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-none py-2 px-4 text-sm text-slate-300 pointer-events-auto"
                                      />
                                      <button 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setEditData({ ...editData, requiredResources: (editData.requiredResources || []).filter((_, i) => i !== idx) });
                                        }}
                                        className="p-2 text-brand-primary/70 hover:text-brand-primary"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditData({ ...editData, requiredResources: [...(editData.requiredResources || []), ''] })}
                                    className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline"
                                  >
                                    + إضافة مورد مطلوب
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-4">الأولوية الاستراتيجية</label>
                                <div className="flex gap-2 p-1 bg-white/5 border border-white/5">
                                  {[
                                    { id: 'low', label: 'عادية', color: 'text-slate-400' },
                                    { id: 'medium', label: 'متوسطة', color: 'text-brand-secondary' },
                                    { id: 'high', label: 'عالية جداً', color: 'text-red-500' }
                                  ].map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => setEditData({ ...editData, priority: p.id as 'high' | 'medium' | 'low' })}
                                      className={`flex-1 py-2 font-black transition-all text-[9px] uppercase tracking-widest border ${
                                        editData.priority === p.id 
                                        ? 'bg-white/10 border-white/20 ' + p.color
                                        : 'text-slate-600 border-transparent hover:text-slate-400'
                                      }`}
                                    >
                                      {p.label}
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
                                {selectedProjectHieas.map(h => (
                                  <motion.p 
                                    key={h.id}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5"
                                    style={{ 
                                      color: projectThemeColor, 
                                      backgroundColor: `${projectThemeColor}1a`, 
                                      borderColor: `${projectThemeColor}33`
                                    }}
                                  >
                                    {h.name}
                                  </motion.p>
                                ))}
                                {selectedProject.goalId && (
                                  <motion.p 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5"
                                    style={{ 
                                      color: projectThemeColor, 
                                      backgroundColor: `${projectThemeColor}1a`, 
                                      borderColor: `${projectThemeColor}33`,
                                      opacity: 0.8
                                    }}
                                  >
                                    {goals.find(g => g.id === selectedProject.goalId)?.name}
                                  </motion.p>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 py-2 border-y border-white/[0.03]">
                            {selectedProject.status === ProjectStatus.PENDING_COMPLETION && (
                              <div className="flex items-center gap-3 bg-brand-secondary/10 border border-brand-secondary/30 px-6 py-3 w-full md:w-auto relative group/approve">
                                <AlertCircle size={18} className="text-brand-secondary" />
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-white uppercase tracking-widest">تنبيه: بانتظار الاعتماد</p>
                                  <p className="text-[9px] text-brand-secondary/60 font-bold">تم تقديم طلب إغلاق هذا المشروع بنجاح</p>
                                </div>
                                {isAdmin && (
                                  <button 
                                    onClick={async () => {
                                      try {
                                        await updateDoc(doc(db, 'projects', selectedProject.id), { status: ProjectStatus.COMPLETED, updatedAt: serverTimestamp() });
                                        setSelectedProject({ ...selectedProject, status: ProjectStatus.COMPLETED });
                                      } catch (err) {
                                        handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
                                      }
                                    }}
                                    className="mr-auto bg-brand-secondary text-brand-dark px-4 py-1.5 text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(45,212,191,0.3)]"
                                  >
                                    اعتماد الإغلاق النهائي
                                  </button>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-row-reverse">
                              <span className="w-1.5 h-1.5 shadow-[0_0_8px_rgba(45,212,191,0.5)]" style={{ backgroundColor: projectThemeColor }} />
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">O.V.9 STRATEGIC INITIATIVE</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                            <span 
                              className="px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10"
                              style={{ color: projectThemeColor }}
                            >
                                 مسارات التنفيذ الرسمية
                            </span>
                            <span className="text-xs text-slate-600 font-bold">•</span>
                            <span className="text-xs text-slate-600 font-black uppercase tracking-widest">O.V.9 Initiative</span>
                          </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full md:w-auto">
                        <button 
                          onClick={() => setPerformanceModalOpen(true)}
                          className="w-full px-10 py-5 rounded-none bg-brand-primary text-brand-dark font-black flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-primary/20"
                        >
                          <Activity size={24} />
                          رصد أداء جديد
                        </button>
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
                            onClick={(e) => openDeleteConfirm(e, selectedProject.id, selectedProject.name)}
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
                                style={{ stroke: projectThemeColor }}
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
                                style={{ stroke: projectThemeColor }}
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
                            <span className="hidden md:block text-[10px] font-black tracking-widest uppercase" style={{ color: projectThemeColor }}>Execution Tracker</span>
                        </div>
                        
                        <div className="relative pt-4 pb-8">
                          {/* Custom Slider Background */}
                          <div className="absolute top-[22px] right-0 left-0 h-2 bg-white/5 rounded-none overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${isEditing ? editData.progress : selectedProject.progress}%` }}
                               transition={{ duration: 0.8, ease: "easeOut" }}
                               className="h-full opacity-30 blur-[2px]"
                               style={{ backgroundColor: projectThemeColor }}
                             />
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${isEditing ? editData.progress : selectedProject.progress}%` }}
                               transition={{ duration: 0.8, ease: "easeOut" }}
                               className="h-full"
                               style={{ backgroundColor: projectThemeColor }}
                             />
                          </div>
                          
                          <input 
                            type="range"
                            min="0" max="100"
                            value={isEditing ? editData.progress : selectedProject.progress}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isEditing) {
                                setShowNoteField(true);
                                setSelectedProject(prev => prev ? { ...prev, progress: val } : null);
                              } else {
                                setEditData({ ...editData, progress: val });
                              }
                            }}
                            className="relative z-10 w-full h-2.5 bg-transparent appearance-none outline-none cursor-pointer accent-brand-secondary [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
                          />
                          
                          <AnimatePresence>
                            {showNoteField && !isEditing && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 space-y-6 overflow-hidden bg-white/[0.02] p-8 border border-white/5"
                              >
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                  <div className="flex-1 w-full space-y-4">
                                     <div className="flex items-center justify-between flex-row-reverse mb-2">
                                       <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">تفاصيل التحديث الميداني</label>
                                       <div className="flex gap-2">
                                          <button 
                                            type="button"
                                            onClick={() => setIndicatorType('positive')}
                                            className={`p-2 border transition-all ${indicatorType === 'positive' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-slate-600 hover:text-green-500/50'}`}
                                          >
                                            <ArrowUp size={16} />
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => setIndicatorType('negative')}
                                            className={`p-2 border transition-all ${indicatorType === 'negative' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/10 text-slate-600 hover:text-red-500/50'}`}
                                          >
                                            <ArrowDown size={16} />
                                          </button>
                                       </div>
                                     </div>
                                     <textarea
                                      value={progressNote}
                                      onChange={(e) => setProgressNote(e.target.value)}
                                      placeholder="أضف تفاصيل التحديث (ما الذي حدث ميدانياً؟)..."
                                      className="w-full bg-black/20 border border-white/10 p-6 text-sm text-white outline-none focus:border-brand-secondary resize-none h-32 text-right leading-relaxed"
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-4 flex-row-reverse">
                                  <button 
                                    onClick={() => updateProjectProgress(selectedProject?.progress || 0, progressNote, indicatorType || undefined)}
                                    className="flex-1 bg-brand-secondary text-brand-dark py-4 font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-secondary/10"
                                  >
                                    اعتماد التحديث الاستراتيجي
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setShowNoteField(false);
                                      setProgressNote('');
                                      setIndicatorType(null);
                                    }}
                                    className="px-10 py-4 bg-white/5 text-slate-400 font-bold text-xs uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-all"
                                  >
                                    إلغاء
                                  </button>
                                </div>

                                {indicatorType === 'positive' && (
                                  <p className="text-[10px] font-bold text-green-500/70 text-right italic">
                                    * ملاحظة: رصد تقدم إيجابي سيؤدي لتحديث تلقائي لنسب إنجاز الهيئات والأهداف المرتبطة.
                                  </p>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                            {selectedProject.status !== ProjectStatus.COMPLETED ? (
                              <>
                                <div className="flex justify-between items-center flex-row-reverse">
                                   <span className="text-[10px] text-slate-600 font-bold uppercase">البداية</span>
                                   <span className="text-lg font-black text-slate-300 font-display">{selectedProject.startDate || '---'}</span>
                                </div>
                                {/* KPI Display Mini Cards */}
                        {selectedProject.kpiTitle && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass p-8 border border-white/5 bg-white/[0.01] flex flex-col justify-between group/kpi transition-all hover:bg-white/[0.03]">
                               <div className="flex items-center justify-between flex-row-reverse mb-6">
                                  <div className="w-10 h-10 bg-brand-secondary/10 flex items-center justify-center text-brand-secondary border border-brand-secondary/20 group-hover/kpi:scale-110 transition-transform">
                                     <Activity size={20} />
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-1">مؤشر الأداء الرئيسي</span>
                                    <h4 className="text-sm font-bold text-slate-300">{selectedProject.kpiTitle}</h4>
                                  </div>
                               </div>
                               
                               <div className="flex items-end justify-between flex-row-reverse">
                                  <div className="text-right">
                                    <p className="text-3xl font-display font-black text-white leading-none mb-1">
                                      {selectedProject.kpiCurrent}
                                      <span className="text-xs text-slate-500 font-bold mr-2 uppercase">{selectedProject.kpiUnit}</span>
                                    </p>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">القيمة الحالية</p>
                                  </div>
                                  <div className="text-left opacity-30">
                                     <p className="text-sm font-black text-slate-300 leading-none mb-1">
                                       {selectedProject.kpiTarget}
                                       <span className="text-[10px] font-bold mr-1 uppercase">{selectedProject.kpiUnit}</span>
                                     </p>
                                     <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">المستهدف</p>
                                  </div>
                               </div>
                               
                               <div className="mt-6 h-1 w-full bg-white/5 overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (selectedProject.kpiCurrent / (selectedProject.kpiTarget || 1)) * 100)}%` }}
                                    className="h-full bg-brand-secondary"
                                  />
                               </div>
                            </div>

                            <div className="glass p-8 border border-white/5 bg-white/[0.01] flex flex-col justify-between items-center group/kpi-radial">
                               <div className="relative w-24 h-24 flex items-center justify-center">
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" className="stroke-white/5" strokeWidth="4" fill="transparent" />
                                    <motion.circle 
                                      cx="48" cy="48" r="40" 
                                      initial={{ strokeDashoffset: 251.2 }}
                                      animate={{ strokeDashoffset: 251.2 - (251.2 * Math.min(100, (selectedProject.kpiCurrent / (selectedProject.kpiTarget || 1)) * 100)) / 100 }}
                                      style={{ stroke: projectThemeColor }}
                                      className="opacity-40"
                                      strokeWidth="4" 
                                      fill="transparent" 
                                      strokeDasharray={251.2}
                                      strokeLinecap="round"
                                      transition={{ duration: 2, ease: "circOut" }}
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-display font-black text-white">
                                      {Math.round((selectedProject.kpiCurrent / (selectedProject.kpiTarget || 1)) * 100)}%
                                    </span>
                                  </div>
                               </div>
                               <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mt-4">نسبة الوصول للمستهدف</span>
                            </div>
                          </div>
                        )}

                        <div className="h-px bg-white/5 w-full" />
                                <div className="flex justify-between items-center flex-row-reverse">
                                   <span className="text-[10px] text-slate-600 font-bold uppercase">النهاية</span>
                                   <span className="text-lg font-black text-brand-secondary font-display">{selectedProject.endDate || '---'}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-4 space-y-2 opacity-60">
                                 <CheckCircle2 size={32} className="text-brand-secondary mb-1" />
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">مشروع منجز - لا يتطلب جدولاً زمنياً</span>
                              </div>
                            )}
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
                              <div className="space-y-6">
                                <div className="flex items-center gap-2 bg-[#0a0a0b] p-1 border border-white/5 self-end shrink-0 overflow-x-auto no-scrollbar">
                                  {[
                                    { id: 'performance', label: 'الأداء والنمو', icon: Activity },
                                    { id: 'timeline', label: 'المخطط الزمني', icon: GanttChart },
                                    { id: 'details', label: 'الخلاصة التنفيذية', icon: ListTodo }
                                  ].map(tab => (
                                    <button
                                      key={tab.id}
                                      onClick={() => setActiveTabDetail(tab.id as 'performance' | 'timeline' | 'details')}
                                      className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                                        activeTabDetail === tab.id 
                                        ? 'bg-white/10 text-white shadow-lg' 
                                        : 'text-slate-600 hover:text-slate-400 grayscale'
                                      }`}
                                    >
                                      <tab.icon size={14} className={activeTabDetail === tab.id ? 'text-brand-secondary' : ''} />
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>
                                
                                <div className="min-h-[400px]">
                                  {activeTabDetail === 'performance' && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                    >
                                       <PerformanceTracker 
                                         entityId={selectedProject.id} 
                                         collectionName="projects" 
                                         logs={selectedProject.performanceLogs} 
                                         accentColor={projectThemeColor}
                                         hieaIds={selectedProject.hieaIds || (selectedProject.hieaId ? [selectedProject.hieaId] : [])}
                                         goalId={selectedProject.goalId}
                                         currentProgress={selectedProject.progress}
                                       />
                                    </motion.div>
                                  )}

                                  {activeTabDetail === 'timeline' && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="h-full"
                                    >
                                      <MilestoneGantt 
                                        milestones={selectedProject.milestones || []} 
                                        projectStart={selectedProject.startDate}
                                        projectEnd={selectedProject.endDate}
                                        accentColor={projectThemeColor}
                                      />
                                    </motion.div>
                                  )}

                                  {activeTabDetail === 'details' && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="space-y-8"
                                    >
                                      <p className="text-sm md:text-base text-slate-300 font-medium leading-[2] bg-white/[0.02] p-10 rounded-none border border-white/5 italic text-justify">
                                          {selectedProject.description || 'لا يتوفر وصف معمق متاح لهذا المسار التنفيذي حالياً في قاعدة البيانات الاستراتيجية.'}
                                      </p>

                                      {/* Contextual Blocks */}
                                      <div className="space-y-6">
                                        {selectedProject.subGoals && selectedProject.subGoals.length > 0 && (
                                          <div className="p-8 bg-white/[0.01] border border-white/5 space-y-6">
                                            <div className="flex items-center justify-between flex-row-reverse mb-6">
                                              <h5 className="text-[10px] font-black uppercase text-brand-secondary tracking-[0.2em]">الأهداف الاستراتيجية الميدانية</h5>
                                              <div className="flex gap-4 items-center">
                                                <Target size={18} className="text-brand-secondary/50" />
                                                <button 
                                                  onClick={() => setIsManagingSubGoals(!isManagingSubGoals)}
                                                  className="text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                                                >
                                                  {isManagingSubGoals ? 'إنهاء الإدارة' : 'إدارة الأهداف'}
                                                </button>
                                              </div>
                                            </div>
                                            
                                            <div className="space-y-6">
                                              {selectedProject.subGoals.map((sg: ProjectSubGoal, idx: number) => {
                                                const sgTitle = sg.title;
                                                const sgProgress = sg.progress || 0;
                                                const sgIndicator = sg.indicator || 'stable';
                                                
                                                return (
                                                  <div key={sg.id || idx} className="group/sg border-b border-white/5 pb-6 last:border-0 last:pb-0">
                                                    <div className="flex items-center justify-between flex-row-reverse mb-3">
                                                      <div className="flex items-center gap-3 flex-row-reverse flex-1">
                                                        <div className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all ${
                                                          sgIndicator === 'positive' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                                          sgIndicator === 'negative' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                                          'bg-white/5 border-white/10 text-slate-500'
                                                        }`}>
                                                          {sgIndicator === 'positive' ? <ArrowUp size={14} /> : 
                                                           sgIndicator === 'negative' ? <ArrowDown size={14} /> : 
                                                           <Activity size={12} />}
                                                        </div>
                                                        {isManagingSubGoals ? (
                                                          <input 
                                                            type="text"
                                                            value={sgTitle}
                                                            onChange={(e) => updateSubGoal(sg.id, { title: e.target.value })}
                                                            className="flex-1 bg-white/5 border border-white/10 py-1 px-3 text-sm text-white"
                                                          />
                                                        ) : (
                                                          <p className="text-sm font-bold text-slate-200 group-hover/sg:text-brand-secondary transition-colors">{sgTitle}</p>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-4">
                                                        {isManagingSubGoals && (
                                                          <button 
                                                            onClick={() => removeSubGoal(sg.id)}
                                                            className="text-red-500 hover:text-red-400 p-1"
                                                          >
                                                            <Trash2 size={14} />
                                                          </button>
                                                        )}
                                                        <span className="text-xs font-black text-slate-500">{sgProgress}%</span>
                                                      </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4">
                                                      <div className="flex-1 relative h-1.5 bg-white/5 overflow-hidden">
                                                        <motion.div 
                                                          initial={{ width: 0 }}
                                                          animate={{ width: `${sgProgress}%` }}
                                                          transition={{ duration: 1, ease: "circOut" }}
                                                          className={`h-full relative ${
                                                            sgIndicator === 'positive' ? 'bg-green-500' :
                                                            sgIndicator === 'negative' ? 'bg-red-500' :
                                                            'bg-brand-secondary'
                                                          }`}
                                                        >
                                                          <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white/30 to-transparent" />
                                                        </motion.div>
                                                      </div>
                                                      {isManagingSubGoals && (
                                                        <input 
                                                          type="range"
                                                          min="0"
                                                          max="100"
                                                          value={sgProgress}
                                                          onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            const indicator = val > sgProgress ? 'positive' : val < sgProgress ? 'negative' : sgIndicator;
                                                            updateSubGoal(sg.id, { progress: val, indicator });
                                                          }}
                                                          className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                                                        />
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                              {isManagingSubGoals && (
                                                <button
                                                  onClick={() => addSubGoal('هدف استراتيجي جديد')}
                                                  className="w-full py-4 border-2 border-dashed border-white/5 text-[10px] font-black uppercase text-slate-500 hover:text-brand-secondary hover:border-brand-secondary/30 transition-all"
                                                >
                                                  + إضافة هدف جديد للمشروع
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {selectedProject.challenges && selectedProject.challenges.length > 0 && (
                                          <div className="p-6 bg-red-500/5 border border-red-500/10">
                                            <h5 className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-4">التحديات والمعوقات</h5>
                                            <div className="space-y-3">
                                              {selectedProject.challenges.map((ch, idx) => (
                                                <div key={idx} className="flex items-center gap-3 flex-row-reverse group">
                                                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                                                  <p className="text-sm text-slate-300 font-bold">{ch}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {selectedProject.requiredResources && selectedProject.requiredResources.length > 0 && (
                                          <div className="p-6 bg-brand-primary/5 border border-brand-primary/10">
                                            <h5 className="text-[10px] font-black uppercase text-brand-primary tracking-widest mb-4">الموارد والمتطلبات</h5>
                                            <div className="space-y-3">
                                              {selectedProject.requiredResources.map((res, idx) => (
                                                <div key={idx} className="flex items-center gap-3 flex-row-reverse group">
                                                  <Layers size={14} className="text-brand-primary shrink-0" />
                                                  <p className="text-sm text-slate-300 font-bold">{res}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            )}

                        <div className="mt-6 flex items-center gap-4 text-slate-600">
                                   <div className="h-px flex-1 bg-white/5" />
                                   <span className="text-[9px] font-black uppercase tracking-widest">End of Summary</span>
                                   <div className="h-px flex-1 bg-white/5" />
                                </div>
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
                               <div className="mt-8 flex flex-wrap gap-2 justify-end">
                                  {selectedProjectHieas.length > 0 ? (
                                    selectedProjectHieas.map(h => (
                                      <span key={h.id} className="text-sm font-display font-black text-white bg-white/5 px-3 py-1 border border-white/10 uppercase tracking-tighter">
                                        {h.name}
                                      </span>
                                    ))
                                  ) : (
                                    <p className="text-xl font-display font-black text-slate-500">غير مرتبط بنطاق حوكمة</p>
                                  )}
                               </div>
                           </div>

                           {/* Goal Context */}
                           {(() => {
                             const linkedGoal = goals.find(g => g.id === selectedProject.goalId);
                             return (
                               <div className="p-8 glass border border-brand-secondary/10 bg-brand-secondary/[0.01] flex flex-col justify-between min-h-[250px] group/goal relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-32 h-32 bg-brand-secondary/[0.05] rounded-full -translate-x-16 -translate-y-16 blur-2xl group-hover/goal:bg-brand-secondary/[0.1] transition-all" />
                                  
                                  <div className="flex justify-between items-start flex-row-reverse relative z-10">
                                     <div className="w-12 h-12 rounded-none bg-brand-secondary/10 flex items-center justify-center text-brand-secondary border border-brand-secondary/20 group-hover/goal:scale-110 transition-transform">
                                        <Target size={24} />
                                     </div>
                                     <div className="text-right">
                                        <span className="text-[10px] text-brand-secondary font-black uppercase tracking-[0.2em] mb-2 block">المستهدف الاستراتيجي</span>
                                        <h5 className="text-lg font-bold text-slate-200">تحويل الرؤية</h5>
                                     </div>
                                  </div>
                                  
                                  <div className="mt-8 relative z-10">
                                     <p className="text-xl font-display font-black text-white leading-snug text-right">
                                       {linkedGoal?.name || 'غير مرتبط بهدف استراتيجي'}
                                     </p>
                                     
                                     {linkedGoal && (
                                       <div className="mt-8 space-y-6">
                                          {/* Goal Progress Bar */}
                                          <div className="space-y-3">
                                             <div className="flex justify-between items-center flex-row-reverse">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">نسبة إنجاز الهدف الاستراتيجي</span>
                                                <span className="text-sm font-display font-black text-brand-secondary">{linkedGoal.progress}%</span>
                                             </div>
                                             <div className="h-1.5 w-full bg-white/5 overflow-hidden">
                                                <motion.div 
                                                  initial={{ width: 0 }}
                                                  animate={{ width: `${linkedGoal.progress}%` }}
                                                  transition={{ duration: 1, ease: "easeOut" }}
                                                  className="h-full bg-brand-secondary shadow-[0_0_15px_rgba(45,212,191,0.3)]"
                                                />
                                             </div>
                                          </div>

                                          {/* Mini Stats Grid for Goal */}
                                          <div className="grid grid-cols-2 gap-4">
                                             <div className="bg-white/5 p-3 border border-white/5 flex flex-col items-end">
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter mb-1">المحطات المنجزة</span>
                                                <span className="text-xs font-bold text-slate-300">
                                                  {linkedGoal.milestones?.filter(m => m.completed).length || 0} / {linkedGoal.milestones?.length || 0}
                                                </span>
                                             </div>
                                             <div className="bg-white/5 p-3 border border-white/5 flex flex-col items-end">
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter mb-1">تصنيف المبادرة</span>
                                                <span className="text-[9px] font-black text-brand-secondary uppercase">{linkedGoal.category || 'N/A'}</span>
                                             </div>
                                          </div>
                                       </div>
                                     )}
                                  </div>
                                  
                                  {/* Radial Background Accent for Progress */}
                                  {linkedGoal && (
                                    <div className="absolute -bottom-6 -right-6 opacity-5 group-hover/goal:opacity-10 transition-opacity">
                                      <svg className="w-40 h-40 transform -rotate-90">
                                        <circle cx="80" cy="80" r="70" className="stroke-white" strokeWidth="2" fill="transparent" />
                                        <motion.circle 
                                          cx="80" cy="80" r="70" 
                                          initial={{ strokeDashoffset: 439.6 }}
                                          animate={{ strokeDashoffset: 439.6 - (439.6 * linkedGoal.progress) / 100 }}
                                          className="stroke-brand-secondary"
                                          strokeWidth="8" 
                                          fill="transparent" 
                                          strokeDasharray={439.6}
                                          strokeLinecap="round"
                                          transition={{ duration: 2 }}
                                        />
                                      </svg>
                                    </div>
                                  )}
                               </div>
                             );
                           })()}
                        </div>
                        {/* Related Projects Section */}
                        {relatedProjects.length > 0 && (
                           <motion.div 
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             className="space-y-6 pt-10"
                           >
                             <div className="flex items-center gap-4 flex-row-reverse px-2">
                               <div className="h-px flex-1 bg-white/5" />
                               <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">مسارات تنفيذية مرتبطة</h4>
                               <div className="h-px flex-1 bg-white/5" />
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                               {relatedProjects.map(p => {
                                 const pHieaIds = p.hieaIds || (p.hieaId ? [p.hieaId] : []);
                                 const pHieas = hieas.filter(h => pHieaIds.includes(h.id));
                                 const pColor = p.color || pHieas[0]?.color || '#2dd4bf';
                                 
                                 return (
                                   <motion.button
                                     key={p.id}
                                     whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)' }}
                                     onClick={() => {
                                       setSelectedProject(p);
                                       window.scrollTo({ top: 0, behavior: 'smooth' });
                                     }}
                                     className="glass p-6 border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4 text-right group/rel"
                                   >
                                     <ChevronLeft size={16} className="text-slate-700 group-hover/rel:text-brand-secondary transition-colors" />
                                     <div className="flex-1 min-w-0">
                                       <h5 className="text-sm font-bold text-slate-300 truncate mb-1 group-hover/rel:text-white transition-colors">{p.name}</h5>
                                       <div className="flex items-center gap-2 justify-end">
                                         <span className="text-[9px] font-bold text-slate-500 uppercase">{p.status === ProjectStatus.COMPLETED ? 'مكتمل' : 'قيد التنفيذ'}</span>
                                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pColor }} />
                                       </div>
                                     </div>
                                     <div 
                                       className="w-10 h-10 border flex items-center justify-center shrink-0 transition-all bg-white/5"
                                       style={{ borderColor: `${pColor}40`, color: pColor }}
                                     >
                                       <ProjectIcon name={p.icon || 'Award'} size={18} />
                                     </div>
                                   </motion.button>
                                 );
                               })}
                             </div>
                           </motion.div>
                        )}
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
                        {(isEditing ? editData.milestones : selectedProject.milestones || []).map((m: Milestone, idx: number) => (
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
                                  <div className="flex-1 space-y-4">
                                      <input 
                                        type="text" 
                                        value={m.title}
                                        onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                                        className="w-full bg-transparent border-b border-white/10 outline-none text-base text-slate-100 font-bold placeholder:text-slate-700 text-right py-1 focus:border-brand-secondary transition-colors"
                                        placeholder="مسمى المرحلة..."
                                      />
                                      <div className="flex items-center gap-4 justify-end">
                                         <div className="flex items-center gap-2">
                                           <textarea 
                                              value={m.notes || ''}
                                              onChange={(e) => updateMilestone(m.id, { notes: e.target.value })}
                                              className="w-full bg-white/5 border border-white/10 p-4 text-xs text-slate-400 font-bold placeholder:text-slate-700 text-right outline-none focus:border-brand-secondary transition-colors resize-none h-20"
                                              placeholder="إضافة ملاحظات أو تفاصيل للمرحلة..."
                                           />
                                         </div>
                                         <div className="flex flex-col items-end gap-2 shrink-0">
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
                                      </div>
                                  </div>
                                ) : (
                                  <div className="flex-1 min-w-0">
                                      <p className={`text-lg font-bold transition-all ${m.completed ? 'text-teal-400/80 line-through' : 'text-slate-100'}`}>{m.title}</p>
                                      {m.notes && (
                                        <p className="text-xs text-slate-500 mt-2 line-clamp-3 bg-white/5 p-3 border-r-2 border-brand-secondary/30">{m.notes}</p>
                                      )}
                                      <div className="flex items-center gap-3 justify-end mt-4">
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
                            <span className="text-sm font-black text-teal-400">{(selectedProject.milestones || []).filter((m: Milestone) => m.completed).length}</span>
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
                    <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الارتباط بالهيئات (يمكن اختيار أكثر من هيئة)</label>
                    <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10">
                      {hieas.map(h => {
                        const isSelected = formData.hieaIds.includes(h.id);
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              const newHieaIds = isSelected 
                                ? formData.hieaIds.filter(id => id !== h.id)
                                : [...formData.hieaIds, h.id];
                              setFormData({ ...formData, hieaIds: newHieaIds });
                            }}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${
                              isSelected 
                                ? 'bg-brand-secondary text-brand-dark border-brand-secondary' 
                                : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {h.name}
                          </button>
                        );
                      })}
                      {hieas.length === 0 && <span className="text-[10px] text-slate-600 uppercase font-black px-2">لا توجد هيئات متاحة</span>}
                    </div>
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

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-white/[0.02] border border-white/5">
                <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">مسمى مؤشر الأداء (KPI)</label>
                    <input 
                      type="text" 
                      value={formData.kpiTitle}
                      onChange={(e) => setFormData({ ...formData, kpiTitle: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 py-3 px-6 outline-none focus:border-brand-secondary text-sm font-bold text-white text-right"
                      placeholder="مثال: نسبة الإنجاز الهندسي..."
                    />
                </div>
                <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">المستهدف الرقمي</label>
                    <input 
                      type="number" 
                      value={formData.kpiTarget}
                      onChange={(e) => setFormData({ ...formData, kpiTarget: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 py-3 px-6 outline-none focus:border-brand-secondary text-sm font-bold text-white text-right"
                    />
                </div>
                <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">القيمة الحالية</label>
                    <input 
                      type="number" 
                      value={formData.kpiCurrent}
                      onChange={(e) => setFormData({ ...formData, kpiCurrent: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 py-3 px-6 outline-none focus:border-brand-secondary text-sm font-bold text-white text-right"
                    />
                </div>
                <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الوحدة</label>
                    <input 
                      type="text" 
                      value={formData.kpiUnit}
                      onChange={(e) => setFormData({ ...formData, kpiUnit: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 py-3 px-6 outline-none focus:border-brand-secondary text-sm font-bold text-white text-right"
                      placeholder="مثال: % أو ساعة عمل..."
                    />
                </div>
             </div>

             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الارتباط بمشاريع أخرى (الاعتمادات)</label>
                <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10 w-full">
                  {projects.map(p => {
                    const isDepSelected = formData.dependencies.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const newDeps = isDepSelected 
                            ? formData.dependencies.filter(id => id !== p.id) 
                            : [...formData.dependencies, p.id];
                          setFormData({ ...formData, dependencies: newDeps });
                        }}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${
                          isDepSelected 
                            ? 'bg-brand-primary text-brand-dark border-brand-primary' 
                            : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                  {projects.length === 0 && <span className="text-[10px] text-slate-600 uppercase font-black px-2">لا توجد مشاريع متاحة للربط</span>}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">تخصيص لون المشروع</label>
                <div className="flex flex-wrap gap-4 p-4 bg-white/5 border border-white/10">
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-12 h-12 rounded-full transition-all border-2 ${formData.color === c ? 'border-white scale-110 shadow-2xl shadow-white/20' : 'border-transparent opacity-40 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
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
                                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">أهداف المبادرة الفرعية (Internal Goals)</label>
                                <div className="space-y-3">
                                   {(formData.subGoals || []).map((sg: ProjectSubGoal, idx: number) => (
                                     <div key={sg.id || idx} className="space-y-2 p-4 bg-white/5 border border-white/10">
                                       <div className="flex gap-2">
                                         <input 
                                           type="text"
                                           value={sg.title}
                                           onChange={(e) => {
                                             const newSg = [...(formData.subGoals || [])];
                                             newSg[idx] = { ...sg, title: e.target.value };
                                             setFormData({ ...formData, subGoals: newSg });
                                           }}
                                           className="flex-1 bg-white/5 border border-white/10 py-3 px-6 text-sm text-white"
                                           placeholder={`الهدف رقم ${idx + 1}`}
                                         />
                                         <button type="button" onClick={() => setFormData({ ...formData, subGoals: formData.subGoals.filter((_: ProjectSubGoal, i: number) => i !== idx) })} className="p-2 text-red-500"><Trash2 size={16} /></button>
                                       </div>
                                       <div className="flex items-center gap-4">
                                          <div className="flex-1">
                                            <input 
                                              type="range"
                                              min="0"
                                              max="100"
                                              value={sg.progress}
                                              onChange={(e) => {
                                                const newSg = [...(formData.subGoals || [])];
                                                const val = parseInt(e.target.value);
                                                const oldProgress = sg.progress || 0;
                                                const indicator = val > oldProgress ? 'positive' : val < oldProgress ? 'negative' : (sg.indicator || 'stable');
                                                newSg[idx] = { ...sg, progress: val, indicator };
                                                setFormData({ ...formData, subGoals: newSg });
                                              }}
                                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                                            />
                                          </div>
                                          <span className="text-[10px] font-black text-brand-secondary w-8 text-center">{sg.progress}%</span>
                                        </div>
                                     </div>
                                   ))}
                                   <button type="button" onClick={() => setFormData({ ...formData, subGoals: [...(formData.subGoals || []), { id: Math.random().toString(36).substr(2, 9), title: '', progress: 0, indicator: 'stable' }] })} className="text-[10px] font-black text-brand-secondary uppercase">+ إضافة هدف استراتيجي فرعي</button>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">التحديات والمعوقات المتوقعة</label>
                                <div className="space-y-3">
                                   {(formData.challenges || []).map((ch, idx) => (
                                     <div key={idx} className="flex gap-2">
                                       <input 
                                         type="text"
                                         value={ch}
                                         onChange={(e) => {
                                           const newCh = [...(formData.challenges || [])];
                                           newCh[idx] = e.target.value;
                                           setFormData({ ...formData, challenges: newCh });
                                         }}
                                         className="flex-1 bg-white/5 border border-white/10 py-3 px-6 text-sm text-white"
                                         placeholder={`تحدي رقم ${idx + 1}`}
                                       />
                                       <button type="button" onClick={() => setFormData({ ...formData, challenges: formData.challenges.filter((_, i) => i !== idx) })} className="p-2 text-red-400 hover:text-red-500"><Trash2 size={16} /></button>
                                     </div>
                                   ))}
                                   <button type="button" onClick={() => setFormData({ ...formData, challenges: [...(formData.challenges || []), ''] })} className="text-[10px] font-black text-red-400 uppercase">+ رصد تحدي جديد</button>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الموارد والمتطلبات اللازمة</label>
                                <div className="space-y-3">
                                   {(formData.requiredResources || []).map((res, idx) => (
                                     <div key={idx} className="flex gap-2">
                                       <input 
                                         type="text"
                                         value={res}
                                         onChange={(e) => {
                                           const newRes = [...(formData.requiredResources || [])];
                                           newRes[idx] = e.target.value;
                                           setFormData({ ...formData, requiredResources: newRes });
                                         }}
                                         className="flex-1 bg-white/5 border border-white/10 py-3 px-6 text-sm text-white"
                                         placeholder={`مورد رقم ${idx + 1}`}
                                       />
                                       <button type="button" onClick={() => setFormData({ ...formData, requiredResources: formData.requiredResources.filter((_, i) => i !== idx) })} className="p-2 text-brand-primary/70 hover:text-brand-primary"><Trash2 size={16} /></button>
                                     </div>
                                   ))}
                                   <button type="button" onClick={() => setFormData({ ...formData, requiredResources: [...(formData.requiredResources || []), ''] })} className="text-[10px] font-black text-brand-primary uppercase">+ إضافة مورد مطلوب</button>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">مستوى الأولوية الاستراتيجية</label>
                                <div className="flex gap-4 p-2 bg-white/5 rounded-none border border-white/5">
                                  {[
                                    { id: 'low', label: 'عادية', color: 'text-slate-400' },
                                    { id: 'medium', label: 'متوسطة', color: 'text-brand-secondary' },
                                    { id: 'high', label: 'عالية جداً', color: 'text-red-500' }
                                  ].map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => setFormData({ ...formData, priority: p.id as 'high' | 'medium' | 'low' })}
                                      className={`flex-1 py-4 font-black transition-all text-[10px] uppercase tracking-widest border ${
                                        formData.priority === p.id 
                                        ? 'bg-white/10 border-white/20 ' + p.color
                                        : 'text-slate-600 border-transparent hover:text-slate-400'
                                      }`}
                                    >
                                      {p.label}
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
               {formData.status !== ProjectStatus.COMPLETED && (
                 <>
                   <div className="space-y-4">
                      <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">
                        موعد الإغلاق المستهدف
                      </label>
                      <input 
                        type="date" 
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-none py-5 px-8 outline-none focus:border-brand-secondary text-slate-300 font-bold text-right"
                        required
                      />
                   </div>
                   <div className="space-y-4 text-right">
                      <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">
                        تاريخ الانطلاق
                      </label>
                      <input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-none py-5 px-8 outline-none focus:border-brand-secondary text-slate-300 font-bold text-right"
                        required
                      />
                   </div>
                 </>
               )}
             </div>

             <div className="space-y-4">
                <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-[0.2em] px-4">الحالة المبدئية</label>
                <div className="flex gap-4 p-2 bg-white/5 rounded-none border border-white/5">
                  {[
                    { id: ProjectStatus.UPCOMING, label: 'قيد التخطيط' },
                    { id: ProjectStatus.IN_PROGRESS, label: 'نشط تنفيذياً' },
                    { id: ProjectStatus.COMPLETED, label: isAdmin ? 'مكتمل (اعتماد فوري)' : 'طلب اعتماد الإكمال' }
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
              <div className="space-y-6 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between flex-row-reverse">
                   <label className="block text-xs font-black uppercase text-slate-600 tracking-[0.2em] px-4">المراحل التنفيذية (Milestones)</label>
                   <button 
                     type="button"
                     onClick={() => addMilestone(false)}
                     className="px-4 py-2 bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 text-[10px] font-black uppercase hover:bg-brand-secondary hover:text-brand-dark transition-all"
                   >
                     إضافة مرحلة +
                   </button>
                </div>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar px-2">
                   {formData.milestones.map((m) => (
                      <div key={m.id} className="p-6 bg-white/5 border border-white/10 space-y-4 group">
                         <div className="flex items-center gap-4 flex-row-reverse">
                            <input 
                              type="text"
                              value={m.title}
                              onChange={(e) => updateMilestone(m.id, { title: e.target.value }, false)}
                              className="flex-1 bg-transparent border-b border-white/10 outline-none text-sm text-white font-bold placeholder:text-slate-700 text-right py-1"
                              placeholder="مسمى المرحلة..."
                            />
                            <button 
                              type="button"
                              onClick={() => removeMilestone(m.id, false)}
                              className="text-slate-600 hover:text-red-500 transition-colors"
                            >
                               <Trash2 size={16} />
                            </button>
                         </div>
                         <div className="flex flex-col md:flex-row gap-4 flex-row-reverse">
                            <div className="flex-1">
                               <textarea 
                                 value={m.notes || ''}
                                 onChange={(e) => updateMilestone(m.id, { notes: e.target.value }, false)}
                                 className="w-full bg-white/5 border border-white/10 p-3 text-xs text-slate-400 font-bold placeholder:text-slate-700 text-right outline-none focus:border-brand-secondary transition-colors resize-none h-20"
                                 placeholder="ملاحظات وتفاصيل التقدم..."
                               />
                            </div>
                            <div className="shrink-0 flex items-center gap-2 justify-end">
                               <Calendar size={12} className="text-slate-600" />
                               <input 
                                 type="date"
                                 value={m.date}
                                 onChange={(e) => updateMilestone(m.id, { date: e.target.value }, false)}
                                 className="bg-transparent border-none text-[10px] font-black uppercase text-slate-600 outline-none text-right"
                                 required
                               />
                            </div>
                         </div>
                      </div>
                   ))}
                   {formData.milestones.length === 0 && (
                      <div className="py-10 text-center border border-dashed border-white/5">
                         <p className="text-[10px] font-black uppercase text-slate-700 tracking-widest">لم يتم تحديد مراحل بعد</p>
                      </div>
                   )}
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
        onClose={() => setDeleteConfirm({ isOpen: false, projectId: null, projectName: '' })}
        title="تأكيد الحذف النهائي"
      >
        <div className="text-right space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-none">
            <AlertCircle className="text-red-500 shrink-0" size={24} />
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              هل أنت متأكد من رغبتك في حذف المشروع <span className="text-white font-black">"{deleteConfirm.projectName}"</span>؟ 
              هذا الإجراء نهائي ولا يمكن التراجع عنه، وسيؤدي إلى إزالة كافة البيانات والمراحل المرتبطة به من السجلات الإستراتيجية.
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
              onClick={() => setDeleteConfirm({ isOpen: false, projectId: null, projectName: '' })}
              className="flex-1 bg-white/5 text-slate-400 font-black py-4 hover:bg-white/10 border border-white/5 transition-all"
            >
              إلغاء العملية
            </button>
          </div>
        </div>
      </Modal>

      {/* Performance Update Modal */}
      <Modal
        isOpen={isPerformanceModalOpen}
        onClose={() => setPerformanceModalOpen(false)}
        title={`رصد أداء: ${selectedProject?.name}`}
      >
        {selectedProject && (
          <div className="p-2">
             <PerformanceTracker 
               entityId={selectedProject.id} 
               collectionName="projects" 
               logs={selectedProject.performanceLogs} 
               accentColor={projectThemeColor}
               hieaIds={selectedProject.hieaIds || (selectedProject.hieaId ? [selectedProject.hieaId] : [])}
               goalId={selectedProject.goalId}
               currentProgress={selectedProject.progress}
             />
             
             {/* Unified Update Button */}
             <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setPerformanceModalOpen(false)}
                  className="px-8 py-3 bg-white/5 text-slate-400 font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all"
                >
                  إغلاق النافذة
                </button>
             </div>
          </div>
        )}
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
