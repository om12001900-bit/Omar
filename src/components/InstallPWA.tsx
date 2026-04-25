import React from 'react';
import { Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWA } from '../hooks/usePWA';

export const InstallPWA: React.FC = () => {
  const { canInstall, installApp, isStandalone } = usePWA();

  if (isStandalone || !canInstall) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={installApp}
      className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-brand-dark rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] transition-all active:scale-95"
    >
      <Download size={14} />
      <span>تحميل التطبيق</span>
    </motion.button>
  );
};
