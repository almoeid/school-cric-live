import React from 'react';
import { Zap } from 'lucide-react';

export default function NewsTicker({ news }) {
  if (!news) return null;

  return (
    <div className="bg-slate-900 rounded-xl shadow-md p-1.5 flex items-center overflow-hidden border border-slate-700/50 relative">
      
      {/* Badge - Stays fixed on the left */}
      <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider z-10 shadow-sm shrink-0">
        <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
        Breaking
      </div>
      
      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative flex items-center h-full ml-2">
        <style>
          {`
            .marquee-content {
              display: inline-block;
              white-space: nowrap;
              /* MAGIC FIX: This makes it start exactly at the right edge of any screen size */
              padding-left: 100%; 
              /* 20s is the speed. Lower is faster. */
              animation: marquee 40s linear infinite; 
            }
            .marquee-content:hover {
              animation-play-state: paused;
            }
            @keyframes marquee {
              0% { transform: translate(0, 0); }
              100% { transform: translate(-100%, 0); }
            }
          `}
        </style>
        <div className="marquee-content text-sm font-medium text-slate-200">
          {news}
        </div>
      </div>
    </div>
  );
}
