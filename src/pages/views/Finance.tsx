import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Banknote,
  DollarSign,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2
} from 'lucide-react';
import { useFinance } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import { db, incrementPlatformVersion } from '../../lib/firebase';
import { WishlistItem } from '../../types';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

export default function Finance() {
  const { user } = useAuth();
  const { budget, wishlist, transactions, loading } = useFinance();
  
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddWishlist, setShowAddWishlist] = useState(false);
  const [initialBudgetData, setInitialBudgetData] = useState({ total: '', cash: '', digital: '' });
  const [transactionForm, setTransactionForm] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    category: 'cash' as 'cash' | 'digital'
  });
  const [wishlistForm, setWishlistForm] = useState({
    name: '',
    price: '',
    status: 'desire' as 'desire' | 'bought'
  });

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const total = parseFloat(initialBudgetData.total) || 0;
    const cash = parseFloat(initialBudgetData.cash) || 0;
    const digital = parseFloat(initialBudgetData.digital) || 0;
    
    try {
      const newBudgetRef = doc(collection(db, 'budgets'));
      await setDoc(newBudgetRef, {
        total,
        cash,
        digital,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      });
      await incrementPlatformVersion();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(transactionForm.amount);
    if (isNaN(amount)) return;

    try {
      // 1. Add Transaction
      await addDoc(collection(db, 'transactions'), {
        ...transactionForm,
        amount,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });

      // 2. Update Budget
      const currentBudget = budget || { total: 0, cash: 0, digital: 0, ownerId: user.uid };
      const multiplier = transactionForm.type === 'income' ? 1 : -1;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        updatedAt: serverTimestamp(),
        ownerId: user.uid
      };

      if (transactionForm.category === 'cash') {
        updateData.cash = (currentBudget.cash || 0) + (amount * multiplier);
        updateData.total = (currentBudget.total || 0) + (amount * multiplier);
      } else if (transactionForm.category === 'digital') {
        updateData.digital = (currentBudget.digital || 0) + (amount * multiplier);
        updateData.total = (currentBudget.total || 0) + (amount * multiplier);
      }

      if (budget?.id) {
        await updateDoc(doc(db, 'budgets', budget.id), updateData);
      } else {
        const newBudgetRef = doc(collection(db, 'budgets'));
        // Complete the object for setDoc
        const fullNewBudget = {
          total: updateData.total || 0,
          cash: updateData.cash || 0,
          digital: updateData.digital || 0,
          ownerId: user.uid,
          updatedAt: serverTimestamp()
        };
        await setDoc(newBudgetRef, fullNewBudget);
      }

      await incrementPlatformVersion();
      setShowAddTransaction(false);
      setTransactionForm({ type: 'income', amount: '', description: '', category: 'cash' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const price = parseFloat(wishlistForm.price);
    if (isNaN(price)) return;

    try {
      const isBought = wishlistForm.status === 'bought';
      const price = parseFloat(wishlistForm.price);
      
      await addDoc(collection(db, 'wishlist'), {
        name: wishlistForm.name,
        price,
        isBought,
        status: wishlistForm.status,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });

      if (isBought && budget?.id) {
        // Record transaction immediately if bought
        await addDoc(collection(db, 'transactions'), {
          type: 'expense',
          amount: price,
          description: `شراء مباشرة: ${wishlistForm.name}`,
          category: 'cash', // Default to cash for direct buy, or let user pick? 
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          date: new Date().toISOString().split('T')[0]
        });

        await updateDoc(doc(db, 'budgets', budget.id), {
          total: (budget.total || 0) - price,
          cash: (budget.cash || 0) - price,
          updatedAt: serverTimestamp()
        });
      }

      await incrementPlatformVersion();
      setShowAddWishlist(false);
      setWishlistForm({ name: '', price: '', status: 'desire' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuyItem = async (item: WishlistItem) => {
    if (!user || !budget) return;

    try {
      // 1. Mark as bought
      await updateDoc(doc(db, 'wishlist', item.id), { isBought: true, status: 'bought' });

      // 2. Add transaction (expense)
      await addDoc(collection(db, 'transactions'), {
        type: 'expense',
        amount: item.price,
        description: `شراء: ${item.name}`,
        category: 'cash',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });

      // 3. Update budget
      await updateDoc(doc(db, 'budgets', budget.id), {
        total: (budget.total || 0) - item.price,
        cash: (budget.cash || 0) - item.price,
        updatedAt: serverTimestamp()
      });

      await incrementPlatformVersion();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWishlist = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'wishlist', itemId));
      await incrementPlatformVersion();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full shadow-2xl shadow-brand-primary/20"
        />
      </div>
    );
  }

  if (!budget && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0a0a0b] border border-white/5 p-12 rounded-[3rem] w-full max-w-lg shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-brand-primary/20 text-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Wallet size={40} />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">مرحباً بك في النظام المالي</h2>
          <p className="text-slate-500 font-bold mb-8">قبل البدء، يرجى تحديد ميزانيتك الحالية لبدء التتبع الدقيق.</p>
          
          <form onSubmit={handleInitialSetup} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-right">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">الكاش (نقداً)</label>
                <input 
                  type="number" 
                  value={initialBudgetData.cash}
                  onChange={e => {
                    const cash = e.target.value;
                    const digital = initialBudgetData.digital;
                    setInitialBudgetData({ ...initialBudgetData, cash, total: (parseFloat(cash) || 0) + (parseFloat(digital) || 0) + "" });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">الرصيد الرقمي</label>
                <input 
                  type="number" 
                  value={initialBudgetData.digital}
                  onChange={e => {
                    const digital = e.target.value;
                    const cash = initialBudgetData.cash;
                    setInitialBudgetData({ ...initialBudgetData, digital, total: (parseFloat(cash) || 0) + (parseFloat(digital) || 0) + "" });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">إجمالي الميزانية</label>
              <input 
                type="number" 
                readOnly
                value={initialBudgetData.total}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-brand-primary font-black text-2xl"
              />
            </div>
            <button type="submit" className="w-full py-5 bg-brand-primary text-black font-black rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all">
              بدء النظام المالي
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const currentTotal = budget?.total || 0;

  return (
    <div className="space-y-10 pb-20 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary">
              <Wallet size={20} />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-brand-primary">الإدارة المالية</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-white font-display tracking-tight"
          >
            النظام <span className="text-brand-primary italic">المالي</span>
          </motion.h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setTransactionForm({ ...transactionForm, type: 'income' });
              setShowAddTransaction(true);
            }}
            className="px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/10"
          >
            <TrendingUp size={16} />
            إضافة دخل
          </button>
          <button
            onClick={() => {
              setTransactionForm({ ...transactionForm, type: 'expense' });
              setShowAddTransaction(true);
            }}
            className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-500/10"
          >
            <TrendingDown size={16} />
            تسجيل مصروف
          </button>
        </div>
      </div>

      {/* Main Budget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'الميزانية العامة', value: budget?.total || 0, icon: DollarSign, color: 'brand-primary' },
          { label: 'الكاش', value: budget?.cash || 0, icon: Banknote, color: 'teal-400' },
          { label: 'الرصيد الرقمي', value: budget?.digital || 0, icon: CreditCard, color: 'brand-secondary' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative group overflow-hidden"
          >
            <div className={`absolute inset-0 bg-${stat.color}/5 blur-2xl group-hover:bg-${stat.color}/10 transition-colors duration-500`} />
            <div className="relative bg-[#0a0a0b]/80 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-3xl group-hover:border-white/10 transition-all duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 bg-brand-primary/10 rounded-2xl shadow-inner`}>
                  <stat.icon className={`text-brand-primary`} size={24} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-${stat.color}/80`}>{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">{stat.value.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-500">ريال عماني</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Wishlist and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Wishlist */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-brand-secondary" />
              <h2 className="text-2xl font-black text-white">الرغبات والاحتياجات</h2>
            </div>
            <button
              onClick={() => setShowAddWishlist(true)}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all hover:scale-110 active:scale-95"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {wishlist.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/5 border border-dashed border-white/10 p-12 rounded-[2.5rem] text-center"
                >
                  <ShoppingBag size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                  <p className="text-slate-500 font-bold">قائمة الرغبات فارغة حالياً</p>
                </motion.div>
              ) : (
                wishlist.map((item, index) => {
                  const remaining1 = Math.max(0, item.price - currentTotal);
                  const remaining2 = Math.max(0, (item.price * 3) - currentTotal);
                  const canAfford1 = currentTotal >= item.price;
                  const canAfford2 = currentTotal >= (item.price * 3);

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all duration-500 ${
                        item.isBought 
                          ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' 
                          : 'bg-[#0a0a0b]/40 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className={`text-xl font-black mb-1 ${item.isBought ? 'line-through text-emerald-400' : 'text-white'}`}>
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                            <span>{item.price.toLocaleString()}</span>
                            <span>ريال عماني</span>
                          </div>
                        </div>
                        
                        {!item.isBought && (
                          <div className="flex gap-2">
                             <button 
                                onClick={() => handleDeleteWishlist(item.id)}
                                className="p-2 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                             <button
                              onClick={() => handleBuyItem(item)}
                              disabled={!canAfford1}
                              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                canAfford1 
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95' 
                                  : 'bg-white/5 text-slate-500 cursor-not-allowed opacity-50'
                              }`}
                            >
                              <CheckCircle2 size={12} />
                              تم الشراء
                            </button>
                          </div>
                        )}
                        {item.isBought && (
                          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>

                      {!item.isBought && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">المتبقي للشراء</p>
                            {canAfford1 ? (
                              <p className="text-emerald-400 text-xs font-bold font-black">متاح للشراء الآن!</p>
                            ) : (
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-white">{remaining1.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-500">ريال عماني</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">شرط الأمان (3 أضعاف)</p>
                            {canAfford2 ? (
                              <p className="text-brand-secondary text-xs font-bold font-black">جاهز للاقتناء (آمن)</p>
                            ) : (
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-white">{remaining2.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-500">ريال عماني</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Transactions */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <History className="text-brand-primary" />
            <h2 className="text-2xl font-black text-white">سجل المعاملات</h2>
          </div>

          <div className="bg-[#0a0a0b]/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl">
            {transactions.length === 0 ? (
               <div className="p-20 text-center">
                  <Clock size={40} className="mx-auto text-slate-700 mb-4 opacity-20" />
                  <p className="text-slate-500 font-bold">لا يوجد سجل معاملات حالياً</p>
               </div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${
                        tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm mb-1">{tx.description || (tx.type === 'income' ? 'دخل جديد' : 'مصروف جديد')}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{tx.date}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="text-[10px] text-brand-primary font-black uppercase tracking-widest">
                            {tx.category === 'total' ? 'عام' : tx.category === 'cash' ? 'كاش' : 'رقمي'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-black ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddTransaction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTransaction(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0b] border border-white/10 p-8 rounded-[3rem] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary to-brand-secondary" />
              <div className="flex items-center gap-4 mb-8">
                <div className={`p-3 rounded-2xl ${transactionForm.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {transactionForm.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
                <h3 className="text-2xl font-black text-white">
                  {transactionForm.type === 'income' ? 'تسجيل كسب / دخل' : 'تسجيل مصروف / مبلغ'}
                </h3>
              </div>

              <form onSubmit={handleTransaction} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">الحساب المستخدم</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['cash', 'digital'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setTransactionForm({ ...transactionForm, category: cat as 'cash' | 'digital' })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          transactionForm.category === cat 
                            ? 'bg-brand-primary text-black' 
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {cat === 'cash' ? 'كاش' : 'رقمي'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">المبلغ</label>
                  <input
                    type="number"
                    required
                    value={transactionForm.amount}
                    onChange={e => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">التفاصيل / ملاحظة</label>
                  <input
                    type="text"
                    required
                    value={transactionForm.description}
                    onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    placeholder="مثال: مبيعات، شراء منتج..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4 shadow-xl ${
                    transactionForm.type === 'income' 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                      : 'bg-red-500 text-white shadow-red-500/20'
                  }`}
                >
                  تأكيد العملية
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Wishlist Modal */}
      <AnimatePresence>
        {showAddWishlist && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddWishlist(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0b] border border-white/10 p-8 rounded-[3rem] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-secondary to-brand-primary" />
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-brand-secondary/20 text-brand-secondary rounded-2xl">
                  <ShoppingBag size={24} />
                </div>
                <h3 className="text-2xl font-black text-white">إضافة منتج مرغوب</h3>
              </div>

              <form onSubmit={handleAddWishlist} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">الحالة عند التسجيل</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'desire', label: 'رغبة في الشراء' },
                      { id: 'bought', label: 'تم الشراء بالفعل' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setWishlistForm({ ...wishlistForm, status: s.id as 'desire' | 'bought' })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          wishlistForm.status === s.id 
                            ? 'bg-brand-secondary text-white' 
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">اسم المنتج</label>
                  <input
                    type="text"
                    required
                    value={wishlistForm.name}
                    onChange={e => setWishlistForm({ ...wishlistForm, name: e.target.value })}
                    placeholder="مثال: آيفون 15..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-brand-secondary outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">سعر المنتج</label>
                  <input
                    type="number"
                    required
                    value={wishlistForm.price}
                    onChange={e => setWishlistForm({ ...wishlistForm, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-brand-secondary outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-brand-secondary text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4 shadow-xl shadow-brand-secondary/20"
                >
                  إضافة للقائمة
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
