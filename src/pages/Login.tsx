import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Eye, Mail, Lock, LogIn, Chrome } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError('خطأ في تسجيل الدخول. يرجى التحقق من بياناتك.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err: any) {
      setError('خطأ في تسجيل الدخول عبر جوجل.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/5 blur-[150px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 glass rounded-2xl items-center justify-center mb-6 neon-glow border border-brand-primary/20">
            <span className="text-brand-primary font-display font-bold text-3xl">O</span>
          </div>
          <h1 className="text-3xl font-display font-bold mb-2 tracking-tight">مرحباً بك في O.V.9</h1>
          <p className="text-slate-400">قم بتسجيل الدخول للوصول إلى منصة الرؤية</p>
        </div>

        <div className="glass rounded-[2rem] p-8 md:p-10 border border-white/5">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-400 mr-1">البريد الإلكتروني</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-11 text-white focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-all"
                  placeholder="name@example.com"
                  required
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-400 mr-1">كلمة المرور</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-11 text-white focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                {error}
              </p>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary text-brand-dark font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 neon-glow disabled:opacity-50"
            >
              {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
              <LogIn size={20} />
            </button>
          </form>

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
            className="w-full glass border-white/5 py-3 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-3 font-medium"
          >
            <Chrome size={20} className="text-brand-primary" />
            المتابعة باستخدام جوجل
          </button>
        </div>

        <p className="text-center mt-8 text-white/40 text-sm">
          ليس لديك حساب؟ <span className="text-brand-cyan cursor-pointer hover:underline">طلب وصول</span>
        </p>
      </motion.div>
    </div>
  );
}
