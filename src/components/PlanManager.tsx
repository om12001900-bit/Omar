import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Target, 
  Plus, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronDown,
  Layout,
  Clock,
  Trash2,
  AlertCircle,
  TrendingUp,
  X,
  Activity,
  Lock
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Plan, PlanStage, Hiea } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface PlanManagerProps {
  hiea?: Hiea;
  isGeneral?: boolean;
}

const PlanManager: React.FC<PlanManagerProps> = ({ hiea, isGeneral = false }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [hieas, setHieas] = useState<Hiea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    hieaId: '',
    performanceIndicator: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date((new Date()).setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!user) return;

    if (isGeneral) {
      const hieaQuery = query(collection(db, 'hieas'), where('ownerId', '==', user.uid));
      const unsubHieas = onSnapshot(hieaQuery, (snapshot) => {
        setHieas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Hiea)));
      });
      return () => unsubHieas();
    }
  }, [user, isGeneral]);

  useEffect(() => {
    if (!user) return;

    let q;
    if (hiea && !isGeneral) {
      q = query(
        collection(db, 'plans'),
        where('hieaId', '==', hiea.id)
      );
    } else {
      q = query(
        collection(db, 'plans'),
        where('ownerId', '==', user.uid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[];
      setPlans(plansData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'plans');
    });

    return () => unsubscribe();
  }, [user, hiea?.id, isGeneral]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const planData: Omit<Plan, 'id'> = {
        hieaId: isGeneral ? (newPlan.hieaId || '') : (hiea?.id || ''),
        title: newPlan.title,
        description: newPlan.description,
        startDate: newPlan.startDate,
        endDate: newPlan.endDate,
        stages: [],
        performanceIndicator: newPlan.performanceIndicator || 0,
        progress: 0,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'plans'), planData);
      setIsCreating(false);
      setNewPlan({
        title: '',
        description: '',
        hieaId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date((new Date()).setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        performanceIndicator: 0
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'plans');
    }
  };

  const handleUpdateStage = async (plan: Plan, stages: PlanStage[]) => {
    try {
      // Calculate overall plan progress based on stages and goal completion
      let totalGoals = 0;
      let completedGoals = 0;
      
      stages.forEach(stage => {
        stage.goals.forEach(goal => {
          totalGoals++;
          if (goal.completed) completedGoals++;
        });
      });

      const progress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

      await updateDoc(doc(db, 'plans', plan.id), {
        stages,
        progress: progress,
        updatedAt: serverTimestamp()
      });

      // Also update Hiea progress if this is the active plan? 
      if (hiea && !isGeneral) {
        await updateDoc(doc(db, 'hieas', hiea.id), {
          progress: Math.max(hiea.progress || 0, progress),
          updatedAt: serverTimestamp()
        });
      }

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `plans/${plan.id}`);
    }
  };

  const addStage = (plan: Plan) => {
    const newStage: PlanStage = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'مرحلة جديدة',
      goals: [],
      startDate: plan.startDate,
      endDate: plan.endDate,
      status: 'pending'
    };
    handleUpdateStage(plan, [...plan.stages, newStage]);
  };

  const removePlan = async (id: string, title?: string) => {
    if (title) {
      setDeleteConfirm({ isOpen: true, planId: id, title });
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'plans', id));
      if (selectedPlanId === id) setSelectedPlanId(null);
      setDeleteConfirm({ isOpen: false, planId: null, title: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `plans/${id}`);
    }
  };

  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; planId: string | null; title: string }>({
    isOpen: false,
    planId: null,
    title: ''
  });

  useEffect(() => {
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    if (selectedPlan && selectedPlan.stages.length > 0 && !activeStageId) {
      setActiveStageId(selectedPlan.stages[0].id);
    }
  }, [plans, selectedPlanId, activeStageId]);

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
    </div>
  );

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const isStageLocked = (stageIdx: number, plan: Plan) => {
    if (stageIdx === 0) return false;
    const previousStage = plan.stages[stageIdx - 1];
    return previousStage.status !== 'completed';
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header & Create Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Layout className="text-brand-primary" size={24} />
            الخطط الإستراتيجية
          </h3>
          <p className="text-slate-500 text-sm mt-1">إدارة خطط العمل، المراحل، والأهداف المرحلية للهيئة</p>
        </div>
        
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-brand-dark font-black px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-primary/20"
        >
          {isCreating ? <ChevronDown size={20} /> : <Plus size={20} />}
          {isCreating ? 'إلغاء الإنشـاء' : 'إنشـاء خطة جديـدة'}
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <form onSubmit={handleCreatePlan} className="bg-[#020617] border border-white/10 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">عنوان الخطة</label>
              <input
                required
                value={newPlan.title}
                onChange={e => setNewPlan({...newPlan, title: e.target.value})}
                placeholder="مثال: الخطة التحولية 2030"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">تاريخ البداية والنهاية</label>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    required
                    value={newPlan.startDate}
                    onChange={e => setNewPlan({...newPlan, startDate: e.target.value})}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary/50 transition-all text-sm"
                  />
                  <input
                    type="date"
                    required
                    value={newPlan.endDate}
                    onChange={e => setNewPlan({...newPlan, endDate: e.target.value})}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary/50 transition-all text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  {[
                    { label: '6 أشهر', val: 6 },
                    { label: 'سنة', val: 12 },
                    { label: 'سنتان', val: 24 },
                    { label: '5 سنوات', val: 60 }
                  ].map(preset => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => {
                        const start = new Date(newPlan.startDate);
                        const end = new Date(start);
                        end.setMonth(start.getMonth() + preset.val);
                        setNewPlan({ ...newPlan, endDate: end.toISOString().split('T')[0] });
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-500 hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/20 transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">مؤشر الأداء المستهدف (%)</label>
              <input
                type="number"
                min="0"
                max="1000"
                value={newPlan.performanceIndicator}
                onChange={e => setNewPlan({...newPlan, performanceIndicator: parseInt(e.target.value) || 0})}
                placeholder="مثال: 85"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-primary/50 transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">وصف الخطة</label>
              <textarea
                value={newPlan.description}
                onChange={e => setNewPlan({...newPlan, description: e.target.value})}
                placeholder="أهداف ومخرجات الخطة الرئيسية..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-primary/50 transition-all resize-none"
              />
            </div>
            {isGeneral && (
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-600 tracking-widest px-1">ربط بالهيئة (اختياري)</label>
                <select
                  value={newPlan.hieaId}
                  onChange={e => setNewPlan({...newPlan, hieaId: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary/50 transition-all"
                >
                  <option value="" className="bg-[#0a0a0b]">عامة (لجميع الهيئات)</option>
                  {hieas.map(h => (
                    <option key={h.id} value={h.id} className="bg-[#0a0a0b]">{h.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-xl transition-all border border-white/5"
          >
            تـأكيـد إنشـاء الخطة
          </button>
        </form>
      )}

      {/* Plans List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Plans List */}
        <div className="lg:col-span-1 space-y-3">
          {plans.length === 0 ? (
            <div className="bg-[#020617] border border-white/5 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-slate-700" size={24} />
              </div>
              <p className="text-slate-500 text-sm font-bold">لا يوجد خطط حالياً</p>
            </div>
          ) : (
            plans.map(plan => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full text-right p-5 rounded-2xl border transition-all group relative cursor-pointer ${
                  selectedPlanId === plan.id 
                  ? 'bg-brand-primary border-brand-primary text-brand-dark shadow-xl shadow-brand-primary/20' 
                  : 'bg-[#020617] border-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${selectedPlanId === plan.id ? 'text-brand-dark/60' : 'text-slate-600'}`}>
                    {plan.startDate} - {plan.endDate}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlan(plan.id, plan.title);
                      }}
                      className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                        selectedPlanId === plan.id ? 'text-brand-dark hover:bg-brand-dark/10' : 'text-red-500 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 size={12} />
                    </button>
                    <TrendingUp size={14} className={selectedPlanId === plan.id ? 'text-brand-dark' : 'text-brand-primary'} />
                  </div>
                </div>
                <h4 className="font-black text-sm truncate">{plan.title}</h4>
                  <div className={`mt-3 flex items-center gap-2`}>
                  <div className={`flex-1 h-1 rounded-full overflow-hidden ${selectedPlanId === plan.id ? 'bg-brand-dark/20' : 'bg-white/5'}`}>
                    <div 
                      className={`h-full ${selectedPlanId === plan.id ? 'bg-brand-dark' : 'bg-brand-primary'}`}
                      style={{ width: `${plan.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black">{plan.progress || 0}%</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Main Content: Selected Plan Detail */}
        <div className="lg:col-span-3">
          {selectedPlan ? (
            <div className="animate-in fade-in duration-500 space-y-6">
              {/* Plan Header Card */}
              <div className="bg-[#020617] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-[100px] rounded-full" />
                <div className="p-8 relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      {isEditing ? (
                        <input 
                          value={selectedPlan.title}
                          onChange={async (e) => {
                            try {
                              await updateDoc(doc(db, 'plans', selectedPlan.id), {
                                title: e.target.value,
                                updatedAt: serverTimestamp()
                              });
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="text-3xl font-black text-white mb-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-brand-primary w-full"
                        />
                      ) : (
                        <h2 className="text-3xl font-black text-white mb-2">{selectedPlan.title}</h2>
                      )}
                      <div className="flex items-center gap-4 text-slate-500 text-xs font-bold">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {selectedPlan.startDate}</span>
                        <ChevronRight size={12} className="rotate-180" />
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {selectedPlan.endDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isGeneral && selectedPlan.hieaId && (
                         <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-black rounded-full border border-brand-primary/20">
                            {hieas.find(h => h.id === selectedPlan.hieaId)?.name || 'هيئة مرتبطة'}
                         </span>
                      )}
                      <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-3 rounded-xl transition-all shadow-lg ${isEditing ? 'bg-brand-primary text-brand-dark shadow-brand-primary/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                      >
                        <Layout size={18} />
                      </button>
                      <button 
                        onClick={() => removePlan(selectedPlan.id, selectedPlan.title)}
                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {isEditing ? (
                    <textarea 
                      value={selectedPlan.description}
                      onChange={async (e) => {
                        try {
                          await updateDoc(doc(db, 'plans', selectedPlan.id), {
                            description: e.target.value,
                            updatedAt: serverTimestamp()
                          });
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="text-slate-400 text-sm leading-relaxed max-w-2xl bg-white/5 border border-white/10 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-brand-primary h-24 resize-none"
                    />
                  ) : (
                    <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{selectedPlan.description}</p>
                  )}
                </div>

                {/* Main Progress & Strategic Linkage */}
                <div className="px-8 pb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Plan Specific Progress */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <Target size={12} className="text-brand-primary" /> مؤشر الأداء (المحقق/المستهدف)
                        </span>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <input 
                              type="number"
                              value={selectedPlan.performanceIndicator}
                              onChange={async (e) => {
                                const val = parseInt(e.target.value) || 0;
                                try {
                                  await updateDoc(doc(db, 'plans', selectedPlan.id), {
                                    performanceIndicator: val,
                                    updatedAt: serverTimestamp()
                                  });
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-brand-primary font-black text-center focus:outline-none focus:border-brand-primary"
                            />
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={selectedPlan.performanceIndicator}
                              onChange={async (e) => {
                                const val = parseInt(e.target.value);
                                try {
                                  await updateDoc(doc(db, 'plans', selectedPlan.id), {
                                    performanceIndicator: val,
                                    updatedAt: serverTimestamp()
                                  });
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="flex-1 accent-brand-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex gap-1">
                              {[0, 50, 100].map(v => (
                                <button
                                  key={v}
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'plans', selectedPlan.id), {
                                        performanceIndicator: v,
                                        updatedAt: serverTimestamp()
                                      });
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="text-[8px] font-black w-7 h-5 flex items-center justify-center rounded bg-white/5 border border-white/5 text-slate-500 hover:text-brand-primary hover:border-brand-primary/20"
                                >
                                  {v}%
                                </button>
                              ))}
                            </div>
                            <span className="text-brand-primary/50 text-sm font-black">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">نسبة إنجاز المهام والأهداف</span>
                        <span className="text-white font-black text-xs">{selectedPlan.progress || 0}%</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                        <div 
                          className="h-full bg-brand-primary rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-1000"
                          style={{ width: `${selectedPlan.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Entity Overall standing Linkage (ONLY if linked to a hiea) */}
                    {hiea && !isGeneral && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Activity size={12} className="text-green-500" /> مؤشر أداء الهيئة الكلي
                          </span>
                          <span className="text-green-500 font-black text-lg">{hiea.progress || 0}%</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div 
                            className="h-full bg-green-500/80 rounded-full transition-all duration-1000"
                            style={{ width: `${hiea.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Strategic Alignment Note */}
                  {hiea && !isGeneral && (
                    <div className="mt-8 p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl flex items-start gap-4">
                      <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary">
                        <TrendingUp size={20} />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-[11px] font-black uppercase text-white tracking-widest">الارتباط الإستراتيجي</h5>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          يتم تحديث مؤشر أداء الهيئة تلقائياً عند تحقيق أهداف هذه الخطة. نجاح الخطة يساهم بنسبة مباشرة في رفع تصنيف الهيئة وتحقيق مستهدفاتها العليا.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stages Interactive Roadmap */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Layout size={14} /> مسار مراحل العمل
                  </h4>
                  {isEditing && (
                    <button 
                      onClick={() => addStage(selectedPlan)}
                      className="text-[10px] font-black uppercase text-brand-primary hover:text-white transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-primary/20 hover:border-brand-primary/50"
                    >
                      <Plus size={14} /> إضافـة مرحلـة
                    </button>
                  )}
                </div>

                {selectedPlan.stages.length === 0 ? (
                  <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center">
                    <p className="text-slate-600 text-sm font-bold mb-4">لا توجد مراحل محددة لهذه الخطة بعد</p>
                    {isEditing && (
                      <button 
                        onClick={() => addStage(selectedPlan)}
                        className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-6 py-3 rounded-xl border border-white/5 transition-all"
                      >
                        أضف المرحلة الأولى الآن
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Roadmap Visualiser */}
                    <div className="bg-[#0a0a0b] border border-white/5 rounded-[3rem] p-12 overflow-x-auto no-scrollbar relative shadow-2xl group/roadmap">
                      {/* Interactive Roadmap Stage Labels/Icons */}
                      <div className="flex items-center justify-between min-w-[900px] relative px-10 py-4">
                         {/* Connecting Line (Base) */}
                        <div className="absolute top-1/2 left-10 right-10 h-1.5 bg-white/5 -translate-y-1/2 z-0 rounded-full" />
                        
                        {selectedPlan.stages.map((stage, idx) => {
                          const isLocked = isStageLocked(idx, selectedPlan);
                          const isActive = activeStageId === stage.id;
                          const isCompleted = stage.status === 'completed';
                          const isInProgress = stage.status === 'in-progress';
                          const stageProgress = (stage.goals.length > 0) 
                            ? Math.round((stage.goals.filter(g => g.completed).length / stage.goals.length) * 100)
                            : (isCompleted ? 100 : 0);
                          const previousCompleted = idx === 0 || selectedPlan.stages[idx-1].status === 'completed';

                          return (
                            <div key={stage.id} className="relative z-10 flex flex-col items-center">
                              {/* Progress Connector (Active/Completed) */}
                              {idx > 0 && (
                                <div 
                                  className={`absolute top-1/2 right-[50%] w-full h-1.5 -translate-y-1/2 -z-10 transition-all duration-700 ${
                                    isCompleted || (isInProgress && previousCompleted) 
                                    ? 'bg-gradient-to-r from-brand-primary to-brand-primary/50 shadow-[0_0_20px_rgba(45,212,191,0.2)]' 
                                    : 'bg-transparent'
                                  }`}
                                />
                              )}

                              <div className="flex flex-col items-center gap-4">
                                {/* Stage Icon/Number Node */}
                                <button
                                  onClick={() => !isLocked && setActiveStageId(stage.id)}
                                  disabled={isLocked}
                                  className={`w-24 h-24 rounded-[2.5rem] flex flex-col items-center justify-center border-2 transition-all duration-500 relative group/node ${
                                    isActive 
                                      ? 'bg-brand-primary border-brand-primary shadow-[0_0_40px_rgba(45,212,191,0.4)] scale-110 -translate-y-4' 
                                      : isCompleted
                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 hover:bg-emerald-500/20'
                                        : isInProgress
                                          ? 'bg-brand-primary/5 border-brand-primary/30 text-brand-primary hover:border-brand-primary'
                                          : isLocked
                                            ? 'bg-white/[0.02] border-white/5 text-slate-800 cursor-not-allowed'
                                            : 'bg-[#0a0a0b] border-white/10 text-slate-500 hover:border-brand-primary/50 hover:bg-brand-primary/5'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 size={36} strokeWidth={2.5} />
                                  ) : isLocked ? (
                                    <Lock size={28} className="text-slate-800" />
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <span className={`text-2xl font-black italic leading-none ${isActive ? 'text-brand-dark' : ''}`}>{idx + 1}</span>
                                      <span className={`text-[10px] font-black mt-1 ${isActive ? 'text-brand-dark/70' : 'text-slate-500'}`}>
                                        {stageProgress}%
                                      </span>
                                    </div>
                                  )}

                                  {/* Pulsing indicator for active stage */}
                                  {isInProgress && (
                                    <motion.div 
                                      animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
                                      transition={{ repeat: Infinity, duration: 2.5 }}
                                      className="absolute inset-0 bg-brand-primary rounded-[2.5rem] -z-10"
                                    />
                                  )}
                                </button>

                                {/* Descriptive Label */}
                                <div className="text-center group-hover/node:scale-105 transition-transform">
                                  <h5 className={`text-sm font-black transition-all ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                    {stage.title}
                                  </h5>
                                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-brand-primary animate-pulse' : 'bg-slate-800'
                                    }`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                      {stage.status === 'completed' ? 'تـم الإنجـاز' : stage.status === 'in-progress' ? 'قيد العمـل' : 'منتظـر'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Stage Details - Bento Style */}
                    {activeStageId && selectedPlan.stages.find(s => s.id === activeStageId) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                      >
                        {(() => {
                           const stage = selectedPlan.stages.find(s => s.id === activeStageId)!;
                           const sIdx = selectedPlan.stages.findIndex(s => s.id === activeStageId);
                           const stageProgress = (stage.goals.length > 0) 
                            ? Math.round((stage.goals.filter(g => g.completed).length / stage.goals.length) * 100)
                            : (stage.status === 'completed' ? 100 : 0);
                           
                           return (
                             <>
                               {/* Left Column: Basic Info & Status */}
                               <div className="lg:col-span-1 space-y-6">
                                 <div className="bg-[#0a0a0b] border border-white/5 rounded-[3rem] p-10 shadow-xl relative overflow-hidden group/card h-full flex flex-col justify-between">
                                   <div className="absolute top-0 right-0 p-8 text-brand-primary/[0.03] pointer-events-none group-hover/card:scale-110 transition-transform">
                                      <Activity size={180} />
                                   </div>
                                   
                                   <div className="relative z-10 space-y-8">
                                     <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                           <Layout size={24} />
                                        </div>
                                        <div>
                                          <h6 className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-2">تفاصيل المرحلة الحالية</h6>
                                          <h3 className="text-2xl font-black text-white leading-tight">
                                            {isEditing ? (
                                              <input 
                                                value={stage.title}
                                                onChange={e => {
                                                  const newStages = [...selectedPlan.stages];
                                                  newStages[sIdx].title = e.target.value;
                                                  handleUpdateStage(selectedPlan, newStages);
                                                }}
                                                className="bg-white/5 border border-white/10 text-xl font-black text-white p-3 rounded-2xl w-full focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                                              />
                                            ) : stage.title}
                                          </h3>
                                        </div>
                                     </div>

                                     <div className="space-y-4">
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-all">
                                           <div className="flex items-center justify-between mb-4">
                                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">مستوى الإنجاز</span>
                                              <span className="text-brand-primary font-black text-sm">{stageProgress}%</span>
                                           </div>
                                           <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                              <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${stageProgress}%` }}
                                                className="h-full bg-brand-primary shadow-[0_0_10px_rgba(45,212,191,0.3)]"
                                              />
                                           </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">تاريخ البداية</span>
                                             <span className="text-[11px] font-bold text-white flex items-center gap-2">
                                                <Calendar size={12} className="text-brand-primary/50" />
                                                {stage.startDate}
                                             </span>
                                          </div>
                                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">تاريخ الانتهاء</span>
                                             <span className="text-[11px] font-bold text-white flex items-center gap-2">
                                                <Clock size={12} className="text-secondary/50" />
                                                {stage.endDate}
                                             </span>
                                          </div>
                                        </div>
                                     </div>
                                   </div>

                                   <div className="relative z-10 pt-8 mt-8 border-t border-white/5">
                                      <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2 px-1">حالة المرحلة</label>
                                          <select
                                            value={stage.status}
                                            onChange={e => {
                                              const newStages = [...selectedPlan.stages];
                                              newStages[sIdx].status = e.target.value as 'pending' | 'in-progress' | 'completed';
                                              handleUpdateStage(selectedPlan, newStages);
                                            }}
                                            className={`w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[11px] font-black uppercase focus:outline-none transition-all cursor-pointer ${
                                              stage.status === 'completed' ? 'text-emerald-400 border-emerald-500/20' : 
                                              stage.status === 'in-progress' ? 'text-brand-primary border-brand-primary/20' : 'text-slate-400'
                                            }`}
                                          >
                                            <option value="pending" className="bg-[#0a0a0b]">معلق</option>
                                            <option value="in-progress" className="bg-[#0a0a0b]">قيد التنفيذ</option>
                                            <option value="completed" className="bg-[#0a0a0b]">مكتمل</option>
                                          </select>
                                        </div>
                                        {isEditing && (
                                          <button 
                                            onClick={() => {
                                              const newStages = selectedPlan.stages.filter(s => s.id !== stage.id);
                                              handleUpdateStage(selectedPlan, newStages);
                                              setActiveStageId(null);
                                            }}
                                            className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 mt-5"
                                          >
                                            <Trash2 size={24} />
                                          </button>
                                        )}
                                      </div>
                                   </div>
                                 </div>
                               </div>

                               {/* Right Column: Goal Management */}
                               <div className="lg:col-span-2">
                                 <div className="bg-[#0a0a0b] border border-white/5 rounded-[3rem] p-10 shadow-xl min-h-full flex flex-col">
                                   <div className="flex items-center justify-between mb-10 px-2">
                                     <div className="flex items-center gap-4">
                                       <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/5">
                                         <Target size={28} />
                                       </div>
                                       <div>
                                          <h4 className="text-xl font-black text-white">الأهداف التشغيلية</h4>
                                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Operational Targets List</p>
                                       </div>
                                     </div>
                                     {isEditing && (
                                       <button 
                                         onClick={() => {
                                           const newStages = [...selectedPlan.stages];
                                           newStages[sIdx].goals.push({
                                             id: Math.random().toString(36).substr(2, 9),
                                             text: 'ادخل هدفاً جديداً للمرحلة',
                                             completed: false
                                           });
                                           handleUpdateStage(selectedPlan, newStages);
                                         }}
                                         className="text-xs font-black text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 px-6 py-3 rounded-2xl border border-brand-primary/20 transition-all flex items-center gap-2"
                                       >
                                         <Plus size={18} /> إضافة هدف جديـد
                                       </button>
                                     )}
                                   </div>

                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                                     {stage.goals.length === 0 ? (
                                       <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                                         <AlertCircle size={40} className="text-slate-800 mb-4" />
                                         <p className="text-slate-600 text-sm font-bold uppercase tracking-widest text-center">لم يتم تحديد أهداف عمل لهذه المرحلة</p>
                                       </div>
                                     ) : (
                                       stage.goals.map((goal, gIdx) => (
                                         <motion.div 
                                           key={goal.id} 
                                           initial={{ opacity: 0, y: 10 }}
                                           animate={{ opacity: 1, y: 0 }}
                                           transition={{ delay: gIdx * 0.05 }}
                                           className={`group/goal flex flex-col gap-5 bg-white/[0.02] border rounded-[2rem] p-6 transition-all relative overflow-hidden ${
                                             goal.completed ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-white/5 hover:border-brand-primary/30 hover:bg-white/[0.04]'
                                           }`}
                                         >
                                           <div className="flex items-start gap-4">
                                              <button 
                                                onClick={() => {
                                                  const newStages = [...selectedPlan.stages];
                                                  newStages[sIdx].goals[gIdx].completed = !goal.completed;
                                                  handleUpdateStage(selectedPlan, newStages);
                                                }}
                                                className={`mt-1 transition-all rounded-lg p-1 ${goal.completed ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-700 bg-white/5 hover:text-brand-primary hover:bg-brand-primary/10'}`}
                                              >
                                                {goal.completed ? <CheckCircle2 size={24} strokeWidth={2.5} /> : <Circle size={24} />}
                                              </button>
                                              
                                              <div className="flex-1 space-y-1">
                                                {isEditing ? (
                                                  <textarea 
                                                    value={goal.text}
                                                    onChange={e => {
                                                      const newStages = [...selectedPlan.stages];
                                                      newStages[sIdx].goals[gIdx].text = e.target.value;
                                                      handleUpdateStage(selectedPlan, newStages);
                                                    }}
                                                    rows={2}
                                                    className="w-full bg-transparent border-none p-0 text-sm font-bold focus:outline-none text-white placeholder:text-slate-800 resize-none"
                                                    placeholder="وصف الهدف..."
                                                  />
                                                ) : (
                                                  <span className={`text-[15px] font-bold transition-all block leading-relaxed ${goal.completed ? 'text-slate-500 line-through' : 'text-white font-display'}`}>
                                                    {goal.text}
                                                  </span>
                                                )}
                                              </div>

                                              {isEditing && (
                                                <button 
                                                  onClick={() => {
                                                    const newStages = [...selectedPlan.stages];
                                                    newStages[sIdx].goals = stage.goals.filter(g => g.id !== goal.id);
                                                    handleUpdateStage(selectedPlan, newStages);
                                                  }}
                                                  className="p-2 text-slate-800 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                  <X size={20} />
                                                </button>
                                              )}
                                           </div>

                                           {/* KPI Section Enhanced */}
                                           <div className="mt-2 pt-5 border-t border-white/5">
                                              <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                    <TrendingUp size={14} />
                                                  </div>
                                                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">مؤشر الأداء</span>
                                                </div>
                                                {!isEditing && goal.kpiTitle && (
                                                  <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 px-2 py-1 rounded">
                                                    {goal.kpiTarget && goal.kpiTarget > 0 ? Math.round(((goal.kpiCurrent || 0) / goal.kpiTarget) * 100) : 0}%
                                                  </span>
                                                )}
                                              </div>

                                              {isEditing ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="col-span-2">
                                                    <input 
                                                      value={goal.kpiTitle || ''}
                                                      onChange={e => {
                                                        const newStages = [...selectedPlan.stages];
                                                        newStages[sIdx].goals[gIdx].kpiTitle = e.target.value;
                                                        handleUpdateStage(selectedPlan, newStages);
                                                      }}
                                                      placeholder="مثال: عدد المشاركين"
                                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white focus:outline-none focus:border-brand-primary/50"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <input 
                                                      type="number"
                                                      value={goal.kpiTarget || 0}
                                                      onChange={e => {
                                                        const newStages = [...selectedPlan.stages];
                                                        newStages[sIdx].goals[gIdx].kpiTarget = parseInt(e.target.value) || 0;
                                                        handleUpdateStage(selectedPlan, newStages);
                                                      }}
                                                      placeholder="المستهدف"
                                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white focus:outline-none"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <input 
                                                      type="number"
                                                      value={goal.kpiCurrent || 0}
                                                      onChange={e => {
                                                        const newStages = [...selectedPlan.stages];
                                                        newStages[sIdx].goals[gIdx].kpiCurrent = parseInt(e.target.value) || 0;
                                                        handleUpdateStage(selectedPlan, newStages);
                                                      }}
                                                      placeholder="المحقق"
                                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white focus:outline-none"
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                goal.kpiTitle ? (
                                                  <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                      <p className="text-[11px] font-bold text-white shrink-0">{goal.kpiTitle}</p>
                                                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                                                        {goal.kpiCurrent || 0} / {goal.kpiTarget || 0} <span className="text-slate-700">{goal.kpiUnit || ''}</span>
                                                      </p>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                      <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${goal.kpiTarget && goal.kpiTarget > 0 ? Math.min(100, Math.round(((goal.kpiCurrent || 0) / goal.kpiTarget) * 100)) : 0}%` }}
                                                        className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                                                      />
                                                    </div>
                                                  </div>
                                                ) : (
                                                   <p className="text-[10px] font-bold text-slate-700 italic border border-dashed border-white/5 rounded-xl p-3 text-center">لا يوجد مؤشر محدد</p>
                                                )
                                              )}
                                           </div>
                                         </motion.div>
                                       ))
                                     )}
                                   </div>
                                 </div>
                               </div>
                             </>
                           );
                        })()}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center bg-[#020617] border border-white/5 rounded-3xl p-12 text-center opacity-40">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8">
                <Target className="text-slate-700" size={40} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">إختر خـطة للعـرض</h3>
              <p className="text-slate-500 text-sm max-w-xs">إختـر خـطة من القائمـة الجانبيـة لعرض تـفاصيلهـا أو المراحل الخاصـة بهـا</p>
            </div>
          )}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-md" onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })} />
          <div className="relative bg-[#0a0a0b] border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-8 mx-auto">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-4">حذف الخطة الإستراتيجية</h3>
            <p className="text-slate-500 text-center text-sm leading-relaxed mb-8">
              هل أنت متأكد من رغبتك في حذف <span className="text-white font-bold">"{deleteConfirm.title}"</span>؟ 
              سيؤدي هذا الإجراء إلى حذف جميع المراحل والأهداف المرتبطة بها نهائياً.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
                className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-black text-sm hover:bg-white/10 transition-all"
              >
                تراجـع
              </button>
              <button
                onClick={() => deleteConfirm.planId && removePlan(deleteConfirm.planId)}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                تـأكيد الحـذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManager;
