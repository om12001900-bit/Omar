import React from 'react';
import PlanManager from '../../components/PlanManager';

export default function PlanPage() {
  return (
    <div className="p-4 md:p-10 space-y-8 md:space-y-12 text-right pb-24 md:pb-10 max-w-[1600px] mx-auto">
      <div className="relative group p-8 md:p-12 overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0a0a0b] to-[#111112] border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-primary/5 blur-[120px] -translate-y-1/2 rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <PlanManager isGeneral={true} />
        </div>
      </div>
    </div>
  );
}
