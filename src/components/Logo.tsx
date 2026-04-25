import React from 'react';
import { motion } from 'motion/react';
import { usePWA } from '../hooks/usePWA';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', showText = true }) => {
  const { isStandalone } = usePWA();

  return (
    <div className={`flex items-center gap-4 ${className}`} dir="ltr">
      <div className="relative w-14 h-14 flex items-center justify-center">
        {isStandalone ? (
          // Vision-inspired Logo for Standalone/Desktop
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">
            <defs>
              <linearGradient id="vision-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            
            {/* The "V" Shape inspired by Vision style */}
            <motion.path
              d="M20 30 L50 80 L80 30"
              fill="none"
              stroke="url(#vision-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            
            {/* Crown/Star detail */}
            <motion.path
              d="M40 20 L50 10 L60 20"
              fill="none"
              stroke="#4ade80"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
            />

            {/* Circular Orbit */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#vision-gradient)"
              strokeWidth="1"
              strokeDasharray="4 4"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
          </svg>
        ) : (
          // Original O.V.9 Logo
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="50%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            
            {/* Layer 1 (Outer) */}
            <motion.path
              d="M50 5 Q 75 5, 90 25 T 95 50 T 80 80 T 50 95 T 15 85 T 5 50 T 15 20 T 50 5"
              fill="none"
              stroke="url(#logo-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.15 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
            
            {/* Layer 2 */}
            <motion.path
              d="M50 15 Q 70 12, 82 30 T 85 50 T 75 75 T 50 85 T 20 78 T 15 50 T 25 22 T 50 15"
              fill="none"
              stroke="url(#logo-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.3 }}
              transition={{ duration: 1.8, ease: "easeInOut", delay: 0.2 }}
            />

            {/* Layer 3 */}
            <motion.path
              d="M50 25 Q 65 22, 72 35 T 75 50 T 68 68 T 50 75 T 30 68 T 25 50 T 32 30 T 50 25"
              fill="none"
              stroke="url(#logo-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ duration: 1.6, ease: "easeInOut", delay: 0.4 }}
            />

            {/* Layer 4 */}
            <motion.path
              d="M50 35 Q 58 32, 62 42 T 65 50 T 60 62 T 50 65 T 38 60 T 35 50 T 40 38 T 50 35"
              fill="none"
              stroke="url(#logo-gradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: 1.4, ease: "easeInOut", delay: 0.6 }}
            />
            
            {/* Layer 5 (Inner most ring) */}
            <motion.path
              d="M50 42 C 54 41, 58 45, 58 50 C 58 55, 54 59, 50 58 C 46 57, 42 54, 42 50 C 42 45, 46 42, 50 42"
              fill="none"
              stroke="url(#logo-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.9 }}
              transition={{ duration: 1.2, ease: "easeInOut", delay: 0.8 }}
            />
            
            {/* Center Dot */}
            <motion.circle
              cx="50"
              cy="50"
              r="4.5"
              fill="url(#logo-gradient)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 1 }}
            />
          </svg>
        )}
      </div>
      
      {showText && (
        <span className="text-3xl font-display font-black tracking-tighter bg-gradient-to-r from-[#4ade80] to-[#22d3ee] bg-clip-text text-transparent pb-1">
          {isStandalone ? "VISION 2030" : "O.V.9"}
        </span>
      )}
    </div>
  );
};

