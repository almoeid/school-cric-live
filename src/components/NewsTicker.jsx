import React from 'react';
import { Zap } from 'lucide-react';

export default function NewsTicker({ news }) {
  if (!news) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-slate-800 to-slate-900 rounded-xl shadow-md p-1 flex items-center gap-3 overflow-hidden border border-slate-700/50">
      {/* Badge */}
      <div className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1.5 rounded-lg font-extrabold text-xs uppercase tracking-widest shrink-0 z-10 shadow-sm">
        <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
        Breaking
      </div>
      
      {/* Sliding/Truncated Text */}
      <div className="text-sm font-medium text-blue-50 truncate w-full pr-4">
        {news}
      </div>
    </div>
  );
}
