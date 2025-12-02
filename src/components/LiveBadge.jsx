import React from 'react';

const LiveBadge = () => (
  <div className="flex items-center space-x-1 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
    </span>
    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">LIVE</span>
  </div>
);

export default LiveBadge;