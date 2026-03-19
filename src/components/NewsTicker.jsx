import React from 'react';
import { Zap } from 'lucide-react';

export default function NewsTicker({ news }) {
  if (!news) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-slate-800 to-slate-900 rounded-xl shadow-md p-1 flex items-center overflow-hidden border border-slate-700/50 relative">
      
      {/* Badge - Stays fixed on the left */}
      <div className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-lg font-extrabold text-xs uppercase tracking-widest z-10 shadow-sm shrink-0">
        <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
        Breaking
      </div>
      
      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative flex items-center h-full ml-2 mask-image-fade">
        <style>
          {`
            @keyframes scroll-left {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
            .animate-marquee {
              display: inline-block;
              white-space: nowrap;
              /* 20s controls the speed. Change it to make it faster/slower */
              animation: scroll-left 20s linear infinite; 
            }
            .animate-marquee:hover {
              animation-play-state: paused; /* Pauses when user hovers to read */
            }
          `}
        </style>
        <div className="animate-marquee text-sm font-medium text-blue-50 pr-4">
          {news}
        </div>
      </div>
    </div>
  );
}
