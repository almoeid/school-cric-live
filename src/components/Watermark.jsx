import React from 'react';
import { Activity } from 'lucide-react';

const Watermark = () => (
  <div className="fixed bottom-3 right-4 z-50 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
    <a 
      href="https://www.facebook.com/share/1A9UtvPVUH" 
      target="_blank" 
      rel="noopener noreferrer"
      className="bg-black/90 text-white px-3 py-1 rounded-full shadow-lg border border-white/20 flex items-center pointer-events-auto cursor-pointer hover:scale-105 transition-transform no-underline"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest flex items-center m-0">
        <Activity className="w-3 h-3 mr-1 text-green-400" />
        Proudly developed by Al Moeid
      </p>
    </a>
  </div>
);

export default Watermark;