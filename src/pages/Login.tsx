import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn, Chrome, UserPlus, User, Phone } from 'lucide-react';

import { Logo } from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const { login, register, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const identifier = authMethod === 'email' ? email : phone;
    const isPhone = authMethod === 'phone';
    
    try {
      if (isSignUp) {
        await register(identifier, isPhone, password, displayName);
      } else {
        await login(identifier, isPhone, password);
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };
      if (authError.code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول عبر البريد الإلكتروني غير مفعل حالياً. يرجى تفعيله من لوحة تحكم Firebase.');
      } else if (authError.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية.');
      } else if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (authError.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مستخدم بالفعل.');
      } else {
        setError(authError.message || 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };
      if (authError.code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول عبر جوجل غير مفعل حالياً. يرجى تفعيله من لوحة تحكم Firebase.');
      } else if (authError.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية.');
      } else if (authError.code === 'auth/invalid-credential') {
        setError('بيانات الاعتماد غير صالحة. يرجى المحاولة مرة أخرى.');
      } else {
        setError(authError.message || 'خطأ في تسجيل الدخول عبر جوجل.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-secondary/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <div className="inline-flex w-24 h-24 mb-6 hover:scale-110 transition-transform cursor-pointer">
            <div className="w-full h-full flex items-center justify-center p-2">
               <Logo className="scale-125" showText={false} />
            </div>
          </div>
          <h1 className="text-4xl font-display font-black mb-3 tracking-tighter uppercase leading-none">O.V.9<br/><span className="text-brand-primary">Platform</span></h1>
          <p className="text-slate-500 font-medium tracking-wide">Strategic Management O.V.9 • Phase X</p>
        </div>

        <div className="glass rounded-[2rem] p-8 md:p-10 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-brand-primary to-brand-secondary"></div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${authMethod === 'email' ? 'bg-brand-primary text-brand-dark' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              البريد الإلكتروني
            </button>
            <button
              onClick={() => setAuthMethod('phone')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${authMethod === 'phone' ? 'bg-brand-primary text-brand-dark' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              رقم الهاتف
            </button>
          </div>

          <form onSubmit={handleEmailAction} className="space-y-6">
            {isSignUp && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5"
              >
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">الاسم بالكامل</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-12 text-slate-100 placeholder:text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all group-hover:border-white/20"
                    placeholder="اسمك الكريم"
                    required={isSignUp}
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-brand-primary" size={18} />
                </div>
              </motion.div>
            )}

            {authMethod === 'email' ? (
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">البريد الإلكتروني</label>
                <div className="relative group">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-12 text-slate-100 placeholder:text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all group-hover:border-white/20"
                    placeholder="admin@summit.sa"
                    required={authMethod === 'email'}
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-brand-primary" size={18} />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">رقم الهاتف</label>
                <div className="relative group">
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-12 text-slate-100 placeholder:text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all group-hover:border-white/20 text-left"
                    placeholder="+966 5X XXX XXXX"
                    required={authMethod === 'phone'}
                  />
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-brand-primary" size={18} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">كلمة المرور</label>
                <button type="button" className="text-[10px] text-brand-primary hover:underline font-bold">نسيت كلمة المرور؟</button>
              </div>
              <div className="relative group">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-12 text-slate-100 placeholder:text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all group-hover:border-white/20"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-brand-primary" size={18} />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-400 text-xs font-bold text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20"
              >
                {error}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary text-brand-dark font-black py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 neon-glow disabled:opacity-50 group relative overflow-hidden"
            >
              <span className="relative z-10">
                {loading ? 'جاري التحقق...' : (isSignUp ? 'إنشاء حساب جديد' : 'دخول المنصة')}
              </span>
              {isSignUp ? <UserPlus size={20} className="relative z-10" /> : <LogIn size={20} className="relative z-10" />}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-sm font-bold text-slate-400 hover:text-brand-primary transition-colors"
            >
              {isSignUp ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ انضم إلينا الآن'}
            </button>
          </div>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-brand-dark text-slate-500">أو عبر</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white/[0.02] border border-white/5 py-3.5 rounded-xl hover:bg-white/[0.05] transition-all flex items-center justify-center gap-3 font-bold text-sm tracking-tight"
          >
            <Chrome size={20} className="text-brand-primary" />
            المتابعة عبر بريد Google المعتمد
          </button>
        </div>

        <p className="text-center mt-12 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
          O.V.9 Control Systems • 2026
        </p>
      </motion.div>
    </div>
  );
}
