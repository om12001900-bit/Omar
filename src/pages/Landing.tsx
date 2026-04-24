import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Target, Layers, Briefcase, Eye } from 'lucide-react';

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-dark">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none bg-hero-gradient" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 glass rounded-xl flex items-center justify-center neon-glow">
            <span className="text-brand-primary font-display font-bold text-xl">O</span>
          </div>
          <span className="text-2xl font-display font-bold tracking-wider">V.9</span>
        </div>
        <Link 
          to="/login" 
          className="px-6 py-2 rounded-full glass hover:bg-white/10 transition-all font-medium text-sm md:text-base border border-brand-primary/20"
        >
          دخول
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 md:pt-20 pb-20 md:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-right"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-tight mb-8">
              إدارة الـرؤيـة <br />
              <span className="text-gradient">
                بمفهوم مستقبلي
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-xl lg:ml-0 lg:mr-0 mx-auto leading-relaxed">
              O.V.9 هي المنصة المتكاملة لمتابعة الأهداف، المستهدفات، والكيانات (الهئ) والمشاريع (المش). 
              صممت لتكون بوصلتك في تحقيق الرؤية بكفاءة عالية ووضوح تام.
            </p>
            <div className="flex flex-wrap gap-4 md:gap-6 justify-center lg:justify-start">
              <Link 
                to="/dashboard" 
                className="w-full md:w-auto px-8 py-4 bg-brand-primary text-brand-dark rounded-2xl font-bold text-lg hover:scale-105 transition-transform neon-glow flex items-center justify-center gap-3"
              >
                ابدأ الآن
                <Eye size={20} />
              </Link>
              <button className="w-full md:w-auto px-8 py-4 rounded-2xl glass font-bold text-lg hover:bg-white/10 transition-all">
                تعرف على المزيد
              </button>
            </div>
          </motion.div>

          {/* Futuristic Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            <div className="relative w-full aspect-square glass rounded-[4rem] flex items-center justify-center">
               {/* Orbital Rings */}
               <div className="absolute w-[85%] h-[85%] border border-brand-primary/5 rounded-full animate-[spin_10s_linear_infinite]" />
               <div className="absolute w-[65%] h-[65%] border border-brand-secondary/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
               <div className="absolute w-[45%] h-[45%] border border-brand-primary/20 rounded-full animate-[spin_20s_linear_infinite]" />
               
               <div className="z-10 text-center">
                  <div className="text-8xl font-display font-extrabold text-white mb-4 drop-shadow-[0_0_30px_rgba(74,222,128,0.3)]">O.V.9</div>
                  <div className="text-brand-primary tracking-[0.5em] text-xl font-bold uppercase">Vision Platform</div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Features */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mt-24 md:mt-32">
          {[
            { icon: LayoutDashboard, title: "المتابعة", desc: "نظرة شاملة على تقدمك", color: "text-brand-primary" },
            { icon: Target, title: "الأهداف", desc: "تخطيط دقيق للمستقبل", color: "text-brand-secondary" },
            { icon: Layers, title: "الهئ", desc: "تنظيم المؤسسات والكيانات", color: "text-emerald-400" },
            { icon: Briefcase, title: "المش", desc: "إدارة المشاريع والمراحل", color: "text-teal-400" }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * i }}
              className="p-8 glass rounded-3xl hover:border-brand-primary/40 transition-all cursor-default group"
            >
              <div className={`w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 transition-transform`}>
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-500 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>

  );
}
