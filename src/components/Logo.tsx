import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', showText = true }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`} dir="ltr">
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Organic Concentric Shapes (Simplified Ripple Effect) */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          
          {/* Outer Ring - Wobbly */}
          <motion.path
            d="M50 12 C 70 10, 85 20, 88 45 C 91 70, 75 88, 50 90 C 25 92, 10 75, 12 50 C 14 25, 30 14, 50 12"
            fill="none"
            stroke="url(#logo-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.2 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
          
          {/* Middle Ring 1 - Wobbly */}
          <motion.path
            d="M50 20 C 68 18, 80 32, 78 52 C 76 72, 65 80, 50 78 C 35 76, 22 68, 20 50 C 18 32, 32 22, 50 20"
            fill="none"
            stroke="url(#logo-gradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 1.8, ease: "easeInOut", delay: 0.2 }}
          />

          {/* Middle Ring 2 - Wobbly */}
          <motion.path
            d="M50 30 C 62 28, 70 38, 68 50 C 66 62, 58 70, 50 68 C 42 66, 30 58, 32 50 C 34 42, 38 32, 50 30"
            fill="none"
            stroke="url(#logo-gradient)"
            strokeWidth="4.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.4 }}
          />
          
          {/* Inner Ring - Wobbly */}
          <motion.path
            d="M50 40 C 56 39, 60 42, 60 50 C 60 58, 56 61, 50 60 C 44 59, 40 56, 40 50 C 40 44, 44 41, 50 40"
            fill="none"
            stroke="url(#logo-gradient)"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.6 }}
          />
          
          {/* Center Circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="5"
            fill="url(#logo-gradient)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.9 }}
          />
        </svg>
      </div>
      
      {showText && (
        <span className="text-2xl font-display font-black tracking-tighter bg-gradient-to-r from-[#4ade80] to-[#22d3ee] bg-clip-text text-transparent">
          O.V.9
        </span>
      )}
    </div>
  );
};
