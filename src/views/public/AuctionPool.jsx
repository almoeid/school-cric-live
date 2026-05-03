import React, { useState } from 'react';
import { Search, Filter, Shield, UserPlus, Layers } from 'lucide-react';
// Import your local JSON file here!
import playersData from '../../data/players.json'; 

export default function AuctionPool() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [batchFilter, setBatchFilter] = useState('All Batches');

  const roles = ['All Roles', ...new Set(playersData.map(p => p.role).filter(Boolean))];
  const batches = ['All Batches', ...new Set(playersData.map(p => p.batch).filter(Boolean))].sort();

  const filteredPlayers = playersData.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          player.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || player.role === roleFilter;
    const matchesBatch = batchFilter === 'All Batches' || player.batch === batchFilter;
    
    return matchesSearch && matchesRole && matchesBatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans pb-20 pt-10 px-4 sm:px-8">
      
      <div className="max-w-7xl mx-auto animate-fadeIn">
        
        {/* 1. 🔥 PREMIUM HEADER (Gradient, Glow, Depth) */}
        <div className="relative rounded-[2rem] p-10 md:p-14 mb-10 overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#020617] shadow-2xl">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_40%)]" />
          <Shield className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 -rotate-12 pointer-events-none" />
          
          <div className="relative z-10">
            <span className="inline-block bg-emerald-500/10 text-emerald-400 font-bold px-4 py-1.5 rounded-full text-xs tracking-widest mb-4 backdrop-blur">
              OFFICIAL ROSTER
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
              ZBSM Elite Cup 2026 Player Market
            </h1>
            <p className="text-slate-300 text-lg">
              Scout your targets. Build your strategy. Own the auction.
            </p>
          </div>
        </div>

        {/* 2. 🚀 STICKY FILTERS (Pro UX Move with Glassmorphism) */}
        <div className="sticky top-4 z-30 backdrop-blur-xl bg-white/60 p-4 rounded-3xl shadow-sm border border-white mb-10 flex flex-col md:flex-row gap-4">
            
            {/* Search */}
            <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                <input 
                    type="text" 
                    placeholder="Search player name or ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-800 px-12 py-3.5 rounded-2xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold placeholder-slate-400"
                />
            </div>

            {/* Role Filter */}
            <div className="relative group w-full md:w-56 shrink-0">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                <select 
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-800 px-12 py-3.5 rounded-2xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold uppercase text-[11px] tracking-wider appearance-none cursor-pointer"
                >
                    {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
            </div>

            {/* Batch Filter */}
            <div className="relative group w-full md:w-56 shrink-0">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                <select 
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="w-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-800 px-12 py-3.5 rounded-2xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold uppercase text-[11px] tracking-wider appearance-none cursor-pointer"
                >
                    {batches.map(batch => (
                        <option key={batch} value={batch}>{batch}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* PLAYER GRID */}
        {filteredPlayers.length === 0 ? (
            <div className="text-center py-20 bg-white/50 backdrop-blur border border-slate-200 rounded-[2rem] shadow-sm">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-500 uppercase tracking-widest">No players found</h3>
                <p className="text-slate-400 mt-2 font-medium">Try clearing your filters or search term.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {filteredPlayers.map((player) => (
                    // 3. 🧠 PLAYER CARDS (Depth, Hover State, Hierarchy)
                    <div 
                        key={player.id} 
                        className="group bg-white/90 backdrop-blur-md border border-slate-200 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-blue-200 flex flex-col relative"
                    >
                        {/* 4. ✨ MICRO INTERACTION (Hover glow inside card) */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none z-0" />

                        {/* Image Header */}
                        <div className="relative h-[280px] sm:h-[300px] w-full bg-slate-100 overflow-hidden shrink-0">
                            {/* Cinematic Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-70 z-10" />
                            
                            <img 
                                src={player.imageUrl || '/api/placeholder/400/400'} 
                                alt={player.name} 
                                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                                loading="lazy"
                            />
                            
                            {/* Upgraded ID Tag */}
                            <div className="absolute top-4 left-4 z-20 bg-red-500/90 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-lg shadow-lg">
                                {player.id}
                            </div>
                        </div>

                        {/* Content Area (Using flex-1 to push price to bottom consistently) */}
                        <div className="p-5 sm:p-6 flex flex-col flex-1 relative z-20 bg-transparent">
                            
                            {/* Player Info (Locked min-height prevents uneven cards) */}
                            <div className="flex-1">
                                <h2 className="text-lg xl:text-xl font-black text-slate-800 uppercase tracking-tight mb-1 line-clamp-2 min-h-[56px]" title={player.name}>
                                    {player.name}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                                    {player.role} • Batch {player.batch}
                                </p>
                            </div>

                            {/* 🎯 FIXED ALIGNMENT: Price & Status Box */}
                            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-wrap items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Base Price</p>
                                    <p className="text-2xl font-extrabold text-blue-600 tracking-tight leading-none truncate group-hover:scale-105 origin-left transition-transform">
                                        ৳{player.basePrice.toLocaleString()}
                                    </p>
                                </div>
                                
                                {/* Premium Status Badge */}
                                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full shrink-0 shadow-sm ${
                                    player.status === 'sold' 
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                        : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                                }`}>
                                    {player.status === 'sold' ? 'Sold' : 'Available'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* "More Players Coming Soon" Card */}
                <div className="group bg-white/40 backdrop-blur-md border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center p-8 text-center min-h-[400px] hover:bg-white hover:border-blue-300 transition-all duration-300">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
                        <UserPlus className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-700 uppercase tracking-tight mb-2">More Players Adding Soon</h3>
                    <p className="text-sm font-bold text-slate-400">The market is still expanding. Stay tuned for new franchise targets!</p>
                </div>

            </div>
        )}

      </div>
    </div>
  );
}