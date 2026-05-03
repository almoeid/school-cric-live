import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Shield, UserPlus, Layers, ArrowUp, Check, X, Download, Users, Wallet } from 'lucide-react';
import html2canvas from 'html2canvas';
// Import your local JSON file here!
import playersData from '../../data/players.json'; 

const MAX_BUDGET = 35000;

export default function AuctionPool() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [batchFilter, setBatchFilter] = useState('All Batches');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // SQUAD BUILDER STATES
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null); 

  // Calculate total spent
  const totalSpent = selectedSquad.reduce((sum, player) => sum + player.basePrice, 0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) setShowScrollTop(true);
      else setShowScrollTop(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const togglePlayerSelection = (player) => {
      if (!isBuilderMode) return;
      
      const isAlreadySelected = selectedSquad.some(p => p.id === player.id);
      
      if (isAlreadySelected) {
          setSelectedSquad(prev => prev.filter(p => p.id !== player.id));
      } else {
          if (selectedSquad.length >= 15) {
              alert("Squad is full! You can only select a maximum of 15 players.");
              return;
          }
          
          if (totalSpent + player.basePrice > MAX_BUDGET) {
              const remaining = MAX_BUDGET - totalSpent;
              alert(`Budget exceeded! This player costs ৳${player.basePrice.toLocaleString()}, but you only have ৳${remaining.toLocaleString()} left in your purse.`);
              return;
          }

          setSelectedSquad(prev => [...prev, player]);
      }
  };

  const handleDownloadImage = async () => {
      if (selectedSquad.length === 0) {
          alert("Please select at least 1 player to download your squad.");
          return;
      }
      setIsDownloading(true);
      
      try {
          await document.fonts.ready; // Ensure fonts are fully loaded for mobile compatibility
          
          const element = printRef.current;
          const canvas = await html2canvas(element, { 
              useCORS: true, 
              backgroundColor: '#0f172a',
              scale: 2 // High resolution
          });
          const dataUrl = canvas.toDataURL('image/png');
          
          const link = document.createElement('a');
          link.download = 'My-Dream-15-Squad.png';
          link.href = dataUrl;
          link.click();
      } catch (error) {
          console.error("Error generating image", error);
          alert("Failed to generate image. Please try again.");
      } finally {
          setIsDownloading(false);
      }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans pb-40 pt-10 px-4 sm:px-8 relative">
      
      <div className="max-w-7xl mx-auto animate-fadeIn">
        
        {/* PREMIUM HEADER */}
        <div className="relative rounded-[2rem] p-10 md:p-14 mb-8 overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#020617] shadow-2xl">
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

        {/* 🚨 FIXED: NON-STICKY FILTERS & SQUAD BUILDER TOGGLE 🚨 */}
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 mb-10 flex flex-col xl:flex-row gap-4 relative z-20">
            
            {/* SQUAD BUILDER TOGGLE BUTTON */}
            <button 
                onClick={() => {
                    setIsBuilderMode(!isBuilderMode);
                    if (isBuilderMode) setSelectedSquad([]);
                }}
                className={`flex-shrink-0 px-6 py-3.5 rounded-2xl font-black font-sans uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                    isBuilderMode 
                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-lg'
                }`}
            >
                {isBuilderMode ? <X className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                {isBuilderMode ? 'Exit Squad Builder' : 'Build Your Dream 15'}
            </button>

            {/* 🚨 FIXED: ADDED font-sans TO ALL INPUTS FOR MOBILE COMPATIBILITY 🚨 */}
            {/* Search */}
            <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                <input 
                    type="text" 
                    placeholder="Search player name or ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-12 py-3.5 rounded-2xl shadow-sm hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans font-bold placeholder-slate-400"
                />
            </div>

            {/* Role Filter */}
            <div className="relative group w-full md:w-56 shrink-0">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                <select 
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-12 py-3.5 rounded-2xl shadow-sm hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans font-bold uppercase text-[11px] tracking-wider appearance-none cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-12 py-3.5 rounded-2xl shadow-sm hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans font-bold uppercase text-[11px] tracking-wider appearance-none cursor-pointer"
                >
                    {batches.map(batch => (
                        <option key={batch} value={batch}>{batch}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* PLAYER GRID */}
        {filteredPlayers.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold font-sans text-slate-500 uppercase tracking-widest">No players found</h3>
                <p className="text-slate-400 font-sans mt-2 font-medium">Try clearing your filters or search term.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {filteredPlayers.map((player) => {
                    const isSelected = selectedSquad.some(p => p.id === player.id);
                    const willExceedBudget = !isSelected && (totalSpent + player.basePrice > MAX_BUDGET);
                    
                    return (
                    <div 
                        key={player.id} 
                        onClick={() => togglePlayerSelection(player)}
                        className={`group bg-white/90 backdrop-blur-md border rounded-[2rem] overflow-hidden transition-all duration-300 flex flex-col relative ${
                            isBuilderMode ? 'cursor-pointer hover:shadow-lg' : ''
                        } ${
                            isSelected 
                            ? 'border-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.3)] scale-[1.02] ring-4 ring-emerald-500/20' 
                            : isBuilderMode && willExceedBudget
                            ? 'border-slate-200 opacity-60 grayscale hover:opacity-100 transition-opacity'
                            : 'border-slate-200 hover:shadow-2xl hover:-translate-y-2 hover:border-blue-200'
                        }`}
                    >
                        {isSelected && (
                            <div className="absolute inset-0 z-40 border-4 border-emerald-500 rounded-[2rem] pointer-events-none">
                                <div className="absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                                    <Check className="w-6 h-6" />
                                </div>
                            </div>
                        )}

                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none z-0" />

                        <div className="relative h-[280px] sm:h-[300px] w-full bg-slate-100 overflow-hidden shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-70 z-10" />
                            
                            <img 
                                src={player.imageUrl || '/api/placeholder/400/400'} 
                                alt={player.name} 
                                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                                loading="lazy"
                            />
                            
                            <div className="absolute top-4 left-4 z-20 bg-red-500/90 backdrop-blur text-white text-[10px] font-sans font-bold px-3 py-1 rounded-lg shadow-lg">
                                {player.id}
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 flex flex-col flex-1 relative z-20 bg-transparent">
                            <div className="flex-1">
                                <h2 className="text-lg xl:text-xl font-black font-sans text-slate-800 uppercase tracking-tight mb-1 line-clamp-2 min-h-[56px]" title={player.name}>
                                    {player.name}
                                </h2>
                                <p className="text-[10px] font-bold font-sans text-slate-400 uppercase tracking-wider mb-4">
                                    {player.role} • Batch {player.batch}
                                </p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-wrap items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold font-sans text-slate-400 uppercase mb-0.5">Base Price</p>
                                    <p className={`text-2xl font-extrabold font-sans tracking-tight leading-none truncate group-hover:scale-105 origin-left transition-transform ${isBuilderMode && willExceedBudget ? 'text-red-500' : 'text-blue-600'}`}>
                                        ৳{player.basePrice.toLocaleString()}
                                    </p>
                                </div>
                                
                                <span className={`text-[10px] font-bold font-sans px-3 py-1.5 rounded-full shrink-0 shadow-sm ${
                                    player.status === 'sold' 
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                        : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                                }`}>
                                    {player.status === 'sold' ? 'Sold' : 'Available'}
                                </span>
                            </div>
                        </div>
                    </div>
                )})}

                {!isBuilderMode && (
                    <div className="group bg-white/40 backdrop-blur-md border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center p-8 text-center min-h-[400px] hover:bg-white hover:border-blue-300 transition-all duration-300">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
                            <UserPlus className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black font-sans text-slate-700 uppercase tracking-tight mb-2">More Players Adding Soon</h3>
                        <p className="text-sm font-bold font-sans text-slate-400">The market is still expanding. Stay tuned for new franchise targets!</p>
                    </div>
                )}
            </div>
        )}

      </div>

      {/* FLOATING SQUAD BUILDER COMMAND BAR */}
      {isBuilderMode && (
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] animate-slideUp">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
                          <Users className="w-6 h-6" />
                      </div>
                      <div>
                          <div className="flex items-center gap-3 mb-1">
                              <p className="text-white font-black font-sans text-xl tracking-tight leading-none">Squad Builder</p>
                              <span className="bg-slate-800 text-slate-300 font-sans text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">{selectedSquad.length}/15 Players</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm font-bold font-sans">
                              <Wallet className="w-4 h-4 text-emerald-400" />
                              <p className="text-slate-400">
                                  Spent: <span className="text-emerald-400 font-mono tracking-wider">৳{totalSpent.toLocaleString()}</span> 
                                  <span className="text-slate-600 mx-1">/</span> 
                                  <span className="text-slate-500 font-mono">৳35k Limit</span>
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="hidden lg:flex -space-x-3">
                      {selectedSquad.map(p => (
                          <img key={p.id} src={p.imageUrl} className="w-10 h-10 rounded-full object-cover border-2 border-slate-900 shadow-md" alt={p.name} title={p.name}/>
                      ))}
                      {Array.from({ length: Math.max(0, 15 - selectedSquad.length) }).map((_, i) => (
                          <div key={`empty-${i}`} className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600 bg-slate-800/50 flex items-center justify-center text-slate-600 font-sans text-[10px] font-bold">
                              +
                          </div>
                      ))}
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                          onClick={() => setSelectedSquad([])}
                          className="px-6 py-3 rounded-xl font-bold font-sans text-slate-400 hover:bg-slate-800 transition-colors uppercase text-xs tracking-wider"
                      >
                          Clear
                      </button>
                      <button 
                          onClick={handleDownloadImage}
                          disabled={isDownloading || selectedSquad.length === 0}
                          className="flex-1 md:flex-none px-8 py-3 rounded-xl font-black font-sans bg-emerald-500 text-white hover:bg-emerald-400 transition-colors uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isDownloading ? 'Generating...' : <><Download className="w-4 h-4"/> Save Squad</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 🚨 FIXED: HIGHER Z-INDEX SO BUTTON STAYS ON TOP OF EVERYTHING 🚨 */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-[70] p-4 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 hover:shadow-2xl transition-all duration-300 flex items-center justify-center ${
            showScrollTop && !isBuilderMode ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-6 h-6" />
      </button>

      {/* HIDDEN POSTER GENERATOR */}
      <div className="absolute left-[-9999px] top-[-9999px]">
          <div ref={printRef} className="w-[1080px] min-h-[1080px] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#020617] p-16 flex flex-col font-sans">
              
              <div className="flex items-center justify-between border-b-2 border-slate-700 pb-10 mb-12">
                  <div className="flex items-center gap-6 min-w-0">
                      <img src="/elitecuplogo.png" className="w-32 h-32 object-contain drop-shadow-2xl shrink-0" alt="Logo" />
                      <div className="min-w-0">
                          <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-sm mb-2">Official Draft Selection</p>
                          <h1 className="text-5xl font-black text-white uppercase tracking-tight leading-none mb-2 whitespace-nowrap">My Dream 15</h1>
                          <h2 className="text-3xl font-extrabold text-blue-400 uppercase tracking-tight whitespace-nowrap">ZBSM Elite Cup 2026</h2>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-8 text-right shrink-0">
                      <div>
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-2">Total Spent</p>
                          <p className="text-4xl font-black text-emerald-400 font-mono tracking-tighter whitespace-nowrap">
                              ৳{totalSpent.toLocaleString()}
                              <span className="text-xl text-slate-500 font-sans tracking-normal ml-1">/35k</span>
                          </p>
                      </div>
                      <div className="w-px bg-slate-700 h-16"></div>
                      <div>
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-2">Squad Size</p>
                          <p className="text-5xl font-black text-white font-mono leading-none whitespace-nowrap">
                              {selectedSquad.length}
                              <span className="text-2xl text-slate-500 font-sans">/15</span>
                          </p>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-5 gap-6">
                  {selectedSquad.map((player, index) => (
                      <div key={index} className="bg-slate-800/80 rounded-3xl overflow-hidden border border-slate-600 flex flex-col">
                          <img src={player.imageUrl || '/api/placeholder/200/200'} className="w-full h-48 object-cover object-top" alt="Pic" />
                          <div className="p-4 flex-1 flex flex-col bg-slate-900/50">
                              
                              <h3 className="text-white font-black uppercase text-[13px] leading-normal mb-1 line-clamp-2 pb-1">{player.name}</h3>
                              <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider mb-auto pb-2 leading-relaxed overflow-visible">{player.role}</p>
                              
                              <div className="bg-slate-950 h-10 w-full rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                                  <span className="text-emerald-400 font-mono font-black text-[14px] leading-none text-center -mt-1">৳{player.basePrice.toLocaleString()}</span>
                              </div>

                          </div>
                      </div>
                  ))}
                  {Array.from({ length: Math.max(0, 15 - selectedSquad.length) }).map((_, i) => (
                      <div key={`empty-poster-${i}`} className="bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center min-h-[250px] opacity-50">
                          <UserPlus className="w-12 h-12 text-slate-600 mb-2" />
                          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Empty Slot</p>
                      </div>
                  ))}
              </div>

              <div className="mt-auto pt-12 flex justify-between items-end">
                  <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">ZBSMCric.Live</p>
                  <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">#ZBSMEliteCup2026</p>
              </div>

          </div>
      </div>

    </div>
  );
}