import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, APP_ID } from '../../config/firebase';
import { Crown, Trophy, Clock, History, CheckCircle2, XCircle, Wallet, Users, Zap } from 'lucide-react';

const TEAMS_INFO = [
  { id: 't1', name: 'Retro Rockets', logo: '/teamlogo/RetroRockets.png' },
  { id: 't2', name: 'Storm Challengers', logo: '/teamlogo/StormChallengers.png' },
  { id: 't3', name: 'Evergreen Thirteen', logo: '/teamlogo/EvergreenThirteen.png' },
  { id: 't4', name: 'Dark Horses', logo: '/teamlogo/DarkHorses.png' },
  { id: 't5', name: 'Fourteen Phoenix', logo: '/teamlogo/FourteenPhoenix.png' },
  { id: 't6', name: 'Prime Riders', logo: '/teamlogo/PrimeRiders.png' },
  { id: 't7', name: 'Duronto Ekadosh', logo: '/teamlogo/DurontoEkadosh.png' },
  { id: 't8', name: 'Invictus Sixteen', logo: '/teamlogo/InvictusSixteen.png' },
  { id: 't9', name: 'Cric Masters', logo: '/teamlogo/CricMasters.png' }
];

export default function BroadcastScreen() {
  const [auctionState, setAuctionState] = useState(null);
  const [teamWallets, setTeamWallets] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Overlay States
  const [dbOverlayTeam, setDbOverlayTeam] = useState(null);
  const [renderOverlay, setRenderOverlay] = useState(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const renderOverlayRef = useRef(null);

  // Time & Audio Trackers
  const audioTracker = useRef({ soldId: null, lastBid: 0, activePlayerId: null });
  const [timeOffset, setTimeOffset] = useState(0);

  // 1. CLOCK SYNC ENGINE (Fixes the 22-second drift)
  useEffect(() => {
    fetch('https://worldtimeapi.org/api/timezone/Etc/UTC')
      .then(response => response.json())
      .then(data => {
        const trueGlobalTime = new Date(data.utc_datetime).getTime();
        const localDeviceTime = Date.now();
        setTimeOffset(trueGlobalTime - localDeviceTime);
      })
      .catch(error => console.error("Could not sync with global clock:", error));
  }, []);

  // 2. REAL-TIME FIREBASE SYNC
  useEffect(() => {
    const unsubAuction = onSnapshot(doc(db, 'artifacts', APP_ID, 'auction', 'current'), (docSnap) => {
      if (docSnap.exists()) setAuctionState(docSnap.data());
    });

    const unsubWallets = onSnapshot(doc(db, 'artifacts', APP_ID, 'auction', 'wallets'), (docSnap) => {
      if (docSnap.exists()) setTeamWallets(docSnap.data());
    });

    const unsubOverlay = onSnapshot(doc(db, 'artifacts', APP_ID, 'auction', 'overlay'), (docSnap) => {
      if (docSnap.exists()) {
          setDbOverlayTeam(docSnap.data().teamId);
      }
    });

    return () => { unsubAuction(); unsubWallets(); unsubOverlay(); };
  }, []);

  // 3. OVERLAY ANIMATION ENGINE
  useEffect(() => {
      if (dbOverlayTeam) {
          setIsAnimatingOut(false);
          setRenderOverlay(dbOverlayTeam);
          renderOverlayRef.current = dbOverlayTeam;
      } else if (renderOverlayRef.current) {
          setIsAnimatingOut(true);
          const timer = setTimeout(() => {
              setRenderOverlay(null);
              renderOverlayRef.current = null;
              setIsAnimatingOut(false);
          }, 400); 
          return () => clearTimeout(timer);
      }
  }, [dbOverlayTeam]);

  // 4. SMART AUDIO ENGINE
  useEffect(() => {
    if (!auctionState) return;
    
    const currentPlayerId = auctionState.playerData?.id;

    if (auctionState.status === 'sold' && audioTracker.current.soldId !== currentPlayerId) {
        try {
            const audio = new Audio('/sold.mp3');
            audio.play().catch(e => console.log("Audio play blocked by browser."));
        } catch (error) { console.error("Audio error:", error); }
        audioTracker.current.soldId = currentPlayerId;
    }

    if (auctionState.status === 'active') {
        if (audioTracker.current.activePlayerId !== currentPlayerId) {
            audioTracker.current.activePlayerId = currentPlayerId;
            audioTracker.current.lastBid = auctionState.currentBid;
        } 
        else if (auctionState.currentBid > audioTracker.current.lastBid && auctionState.highestBidder !== null) {
            try {
                const audio = new Audio('/cash.mp3');
                audio.play().catch(e => console.log("Audio play blocked by browser."));
            } catch (error) { console.error("Audio error:", error); }
            audioTracker.current.lastBid = auctionState.currentBid;
        }
    }
  }, [auctionState]);

  // 5. PERFECT SYNCED TIMER (Uses Offset!)
  useEffect(() => {
    if (!auctionState || auctionState.status !== 'active') {
      setTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const trueNow = Date.now() + timeOffset; 
      const remaining = Math.max(0, Math.floor((auctionState.endTime - trueNow) / 1000));
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [auctionState, timeOffset]);

  // 6. COMPUTE BROADCAST STATS
  const { topPlayer, recentTrades } = useMemo(() => {
      const allSold = [];
      let highest = null;

      Object.entries(teamWallets).forEach(([teamId, wallet]) => {
          if (wallet.players) {
              wallet.players.forEach(p => {
                  const trade = { ...p, teamName: TEAMS_INFO.find(t=>t.id===teamId)?.name, teamLogo: TEAMS_INFO.find(t=>t.id===teamId)?.logo };
                  allSold.push(trade);
                  if (!highest || p.price > highest.price) highest = trade;
              });
          }
      });

      const recent = allSold.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 4);
      return { topPlayer: highest, recentTrades: recent };
  }, [teamWallets]);

  const player = auctionState?.playerData;
  const isWarningTime = timeLeft <= 5 && auctionState?.status === 'active';
  const leaderTeamInfo = TEAMS_INFO.find(t => t.name === auctionState?.highestBidderName);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050b14] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#050b14] to-black text-white font-sans flex flex-col overflow-hidden select-none">
      
      {/* 🚨 PREMIUM ANIMATIONS INJECTED 🚨 */}
      <style>
        {`
          @keyframes confettiFall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes breathe {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
          @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes stamp {
            0% { transform: scale(2); opacity: 0; }
            50% { transform: scale(0.9); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes overlayEnter {
            0% { opacity: 0; transform: translateY(80px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1.1); }
          }
          @keyframes overlayExit {
            0% { opacity: 1; transform: translateY(0) scale(1.1); }
            100% { opacity: 0; transform: translateY(80px) scale(0.95); }
          }
          @keyframes fadeOutCustom {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }

          .confetti-piece { animation: confettiFall linear forwards; }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-breathe { animation: breathe 4s ease-in-out infinite; }
          .animate-shimmer { animation: shimmer 2.5s infinite; }
          .animate-gradient-flow { animation: gradientFlow 4s ease infinite; background-size: 200% auto; }
          .animate-stamp { animation: stamp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          .animate-overlayEnter { animation: overlayEnter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
          .animate-overlayExit { animation: overlayExit 0.4s cubic-bezier(0.8, 0, 0.8, 0.2) forwards; }
          .animate-fadeOutCustom { animation: fadeOutCustom 0.4s ease forwards; }
        `}
      </style>

      {/* FULL-SCREEN CINEMATIC SOLD UI WITH CONFETTI */}
      {auctionState?.status === 'sold' && (
        <div className="absolute inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fadeIn overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 100 }).map((_, i) => (
                    <div 
                        key={i} 
                        className="confetti-piece absolute top-[-10%] w-3 h-8 rounded-sm"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${Math.random() * 2 + 2}s`,
                            backgroundColor: ['#facc15', '#3b82f6', '#10b981', '#ef4444', '#a855f7'][Math.floor(Math.random()*5)]
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 flex flex-col items-center transform scale-110">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-amber-500 blur-[100px] opacity-50 rounded-full animate-breathe"></div>
                    <img src={player?.imageUrl || '/api/placeholder/400/400'} className="w-72 h-72 object-cover rounded-full border-[10px] border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.8)] relative z-10" alt="Sold Player" />
                </div>
                
                <h2 className="text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 uppercase tracking-tight mb-4 drop-shadow-2xl text-center max-w-[1200px] break-words line-clamp-2">
                    {player?.name}
                </h2>
                
                <p className="text-5xl text-slate-200 font-bold mb-10 flex items-center gap-4">
                    SOLD TO <span className="text-amber-400 font-black uppercase text-6xl drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">{auctionState.highestBidderName}</span>
                </p>
                
                <div className="bg-slate-900/80 backdrop-blur-sm px-24 py-8 rounded-[4rem] border-2 border-amber-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-shimmer"></div>
                    <p className="text-amber-500/80 uppercase tracking-widest font-black text-xl text-center mb-2">Final Winning Bid</p>
                    <p className="text-8xl text-emerald-400 font-mono font-black drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">৳{auctionState.currentBid.toLocaleString()}</p>
                </div>
            </div>
        </div>
      )}

      {/* FULL-SCREEN CINEMATIC UNSOLD UI */}
      {auctionState?.status === 'unsold' && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fadeIn overflow-hidden">
            <div className="absolute inset-0 bg-red-900/20 animate-breathe blur-[150px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center transform scale-110">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-red-600 blur-[100px] opacity-30 rounded-full animate-pulse"></div>
                    <img src={player?.imageUrl || '/api/placeholder/400/400'} className="w-72 h-72 object-cover rounded-full border-[10px] border-slate-700 shadow-[0_0_80px_rgba(239,68,68,0.2)] relative z-10 grayscale-[60%]" alt="Unsold Player" />
                </div>
                
                <h2 className="text-5xl lg:text-6xl font-black text-slate-300 uppercase tracking-tight mb-8 drop-shadow-2xl text-center max-w-[1200px] break-words line-clamp-2">
                    {player?.name}
                </h2>
                
                <div className="bg-slate-900/90 backdrop-blur-sm px-24 py-8 rounded-[4rem] border-4 border-red-600/80 shadow-[0_20px_50px_rgba(239,68,68,0.3)] animate-stamp relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent animate-shimmer"></div>
                    <p className="text-8xl text-red-500 font-black uppercase tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">UNSOLD</p>
                </div>
            </div>
        </div>
      )}

      {/* ADMIN SQUAD OVERLAY WITH SMOOTH SLIDE IN & OUT */}
      {renderOverlay && (
          <div className={`absolute inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-10 ${isAnimatingOut ? 'animate-fadeOutCustom' : 'animate-fadeIn'}`}>
              {(() => {
                  const teamInfo = TEAMS_INFO.find(t => t.id === renderOverlay);
                  const wallet = teamWallets[renderOverlay] || { purse: 150000, players: [] };
                  return (
                      <div className={`bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center w-[1200px] relative overflow-hidden ${isAnimatingOut ? 'animate-overlayExit' : 'animate-overlayEnter'}`}>
                          <div className="absolute inset-0 bg-blue-500/10 animate-breathe blur-[100px]"></div>
                          
                          <div className="flex items-center justify-between w-full relative z-10 mb-8 gap-8">
                              <div className="flex items-center gap-6">
                                  <img src={teamInfo?.logo} className="w-32 h-32 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] bg-white rounded-full p-3 border-[4px] border-slate-700" alt="logo"/>
                                  <h1 className="text-5xl font-black uppercase tracking-tight text-white leading-tight drop-shadow-md">{teamInfo?.name}</h1>
                              </div>
                              
                              <div className="flex gap-6">
                                  <div className="bg-slate-950/80 px-8 py-5 rounded-3xl border border-slate-700 text-center shadow-inner flex flex-col justify-center min-w-[250px]">
                                      <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2 flex items-center justify-center gap-2"><Wallet className="w-4 h-4 text-emerald-400"/> Remaining Purse</p>
                                      <p className="text-4xl font-mono font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">৳{wallet.purse.toLocaleString()}</p>
                                  </div>
                                  <div className="bg-slate-950/80 px-8 py-5 rounded-3xl border border-slate-700 text-center shadow-inner flex flex-col justify-center min-w-[200px]">
                                      <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2 flex items-center justify-center gap-2"><Users className="w-4 h-4 text-blue-400"/> Squad Size</p>
                                      <p className="text-4xl font-black text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">{wallet.players.length} <span className="text-2xl text-slate-600">/ 15</span></p>
                                  </div>
                              </div>
                          </div>

                          <div className="w-full relative z-10 bg-slate-950/60 p-8 rounded-3xl border border-slate-700/50 min-h-[300px]">
                              <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-6 flex items-center gap-3 border-b border-slate-700 pb-4">
                                  <Users className="w-5 h-5 text-blue-400"/> Acquired Players
                              </p>
                              
                              {wallet.players.length === 0 ? (
                                  <div className="flex items-center justify-center h-48">
                                      <p className="text-slate-500 font-bold uppercase tracking-widest text-2xl drop-shadow-md">No players acquired yet</p>
                                  </div>
                              ) : (
                                  <div className="grid grid-cols-3 gap-5">
                                      {wallet.players.map((p, i) => (
                                          <div key={i} className="flex items-center gap-4 bg-slate-900/80 rounded-2xl p-3.5 border border-slate-700 shadow-md hover:bg-slate-800 transition-colors">
                                              <img src={p.imageUrl || '/api/placeholder/50/50'} className="w-12 h-12 rounded-xl object-cover border border-slate-600 shrink-0 bg-slate-950" alt="pic"/>
                                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                  <p className="text-white font-bold text-sm uppercase truncate leading-tight mb-1" title={p.name}>{p.name}</p>
                                                  <p className="text-emerald-400 font-mono font-black text-[15px]">৳{p.price.toLocaleString()}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>
                  );
              })()}
          </div>
      )}

      {/* HEADER: ELITE CUP BRANDING */}
      <div className="h-[100px] px-10 flex items-center justify-between border-b border-white/10 bg-slate-900/80 backdrop-blur-sm z-10 shrink-0 shadow-lg">
          <div className="flex items-center gap-6">
              <img src="/elitecuplogo.png" alt="Elite Cup" className="h-[70px] object-contain drop-shadow-md" />
              <div className="w-px h-12 bg-slate-700"></div>
              <h1 className="text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 animate-gradient-flow drop-shadow-sm">
                  ZBSM ELITE CUP 2026
              </h1>
          </div>
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-6 py-3 rounded-full">
              <span className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span></span>
              <span className="text-red-400 font-bold uppercase tracking-widest text-xl drop-shadow-md">Live Auction Broadcast</span>
          </div>
      </div>

      {/* MAIN CONTENT 12-COLUMN GRID */}
      <div className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-hidden h-[calc(100vh-100px)]">
          
          {/* LEFT: MAIN STAGE */}
          <div className="col-span-8 bg-slate-800/30 border border-slate-700/50 rounded-[3rem] p-10 relative flex flex-col shadow-2xl backdrop-blur-sm h-full overflow-hidden">
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3 animate-breathe"></div>

              {!player ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                      <div className="relative flex items-center justify-center mb-8">
                         <div className="absolute inset-0 border-8 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                         <div className="w-24 h-24 border-8 border-transparent"></div>
                      </div>
                      <h2 className="text-4xl font-black uppercase tracking-widest text-slate-400 drop-shadow-md">Awaiting Auctioneer...</h2>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col relative z-10 h-full">

                      <div className="flex gap-10 flex-1 min-h-0 items-center">
                          
                          <div className="w-[40%] shrink-0 relative flex flex-col justify-center h-full animate-float">
                              <img src={player.imageUrl || '/api/placeholder/400/400'} alt={player.name} className="w-full aspect-[4/5] object-cover rounded-3xl border border-slate-600 shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-slate-900" />
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-700 to-blue-500 text-white text-3xl font-black px-8 py-3 rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.5)] border-2 border-blue-400 uppercase tracking-widest whitespace-nowrap">
                                  {player.id || 'N/A'}
                              </div>
                          </div>
                          
                          <div className="w-[60%] flex flex-col justify-center">
                              <span className="inline-flex px-6 py-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-lg font-bold uppercase tracking-widest mb-6 w-fit items-center gap-2">
                                  <Zap className="w-5 h-5 text-blue-400"/> Now Auctioning
                              </span>
                              
                              <h2 className="text-5xl lg:text-6xl font-black tracking-tight text-white mb-8 uppercase leading-tight w-full drop-shadow-lg break-words line-clamp-2" title={player.name}>
                                  {player.name}
                              </h2>
                              
                              <div className="flex flex-wrap gap-4 mb-10">
                                  <span className="px-6 py-3 rounded-2xl border border-slate-700/80 text-slate-300 text-xl font-bold uppercase tracking-wider bg-slate-900/60 backdrop-blur-sm shadow-inner">{player.role}</span>
                                  <span className="px-6 py-3 rounded-2xl border border-slate-700/80 text-slate-300 text-xl font-bold uppercase tracking-wider bg-slate-900/60 backdrop-blur-sm shadow-inner">Batch {player.batch}</span>
                                  <span className="px-6 py-3 rounded-2xl border border-slate-700/80 text-slate-400 text-xl font-bold uppercase tracking-wider bg-slate-900/60 backdrop-blur-sm shadow-inner">Base: ৳{(player.basePrice||1000).toLocaleString()}</span>
                              </div>

                              <div className="bg-slate-900/90 backdrop-blur-md rounded-[3rem] p-10 border border-slate-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-full relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>

                                  <p className="text-slate-400 uppercase tracking-widest text-xl font-bold mb-4 flex items-center gap-3">
                                      Current Bid <span className={`w-4 h-4 rounded-full ${auctionState.status === 'active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-slate-700'}`}></span>
                                  </p>
                                  
                                  <p className="text-[100px] leading-none font-black font-mono tracking-tight text-emerald-400 mb-10 drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                      ৳{auctionState.currentBid.toLocaleString()}
                                  </p>
                                  
                                  {/* THE BILLION-DOLLAR LEADER UI */}
                                  {auctionState.highestBidderName ? (
                                      <div className="flex items-center gap-5 bg-emerald-950/40 px-8 py-5 rounded-[2rem] border border-emerald-500/30 w-fit relative overflow-hidden shadow-lg">
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent -translate-x-full animate-shimmer"></div>
                                          
                                          {leaderTeamInfo && (
                                              <div className="bg-white p-2 rounded-xl shrink-0 shadow-md">
                                                  <img src={leaderTeamInfo.logo} className="w-10 h-10 object-contain" alt="logo"/>
                                              </div>
                                          )}
                                          <div className="flex flex-col relative z-10">
                                              <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-[0.2em] mb-1">Current Leader</span>
                                              <span className="text-white font-black text-2xl uppercase leading-none drop-shadow-md">{auctionState.highestBidderName}</span>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-5 bg-slate-950/80 px-8 py-5 rounded-[2rem] border border-slate-700 w-fit shadow-inner">
                                          <div className="relative flex h-5 w-5 shrink-0">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                                          </div>
                                          <span className="text-slate-400 font-bold uppercase tracking-[0.2em] text-lg">Awaiting Opening Bid</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* Timer Bar */}
                      <div className="mt-8 shrink-0">
                          <div className="flex justify-between items-end mb-4 px-2">
                              <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3"><Clock className="w-8 h-8"/> Time Remaining</span>
                              <span className={`text-6xl font-black tracking-widest drop-shadow-lg ${isWarningTime ? 'text-red-500 animate-pulse drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]' : 'text-slate-200'}`}>
                                  {auctionState.status === 'waiting' ? 'WAITING...' : `${timeLeft}S`}
                              </span>
                          </div>
                          <div className="w-full h-8 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700 shadow-inner p-1">
                              <div className={`h-full transition-all duration-200 ease-linear rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] ${isWarningTime ? 'bg-gradient-to-r from-red-600 to-red-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} style={{ width: `${Math.min(100, (timeLeft / 30) * 100)}%` }}></div>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {/* RIGHT: WIDGETS */}
          <div className="col-span-4 flex flex-col gap-8 h-full shrink-0 min-w-0">
              
              <div className="bg-slate-900/80 border border-slate-700/50 rounded-[3rem] p-8 relative overflow-hidden backdrop-blur-md shrink-0 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-900/20 animate-breathe opacity-50"></div>
                  
                  <h3 className="text-amber-500 font-bold uppercase tracking-widest text-base flex items-center gap-3 mb-6 relative z-10">
                      <Crown className="w-6 h-6 text-amber-400"/> Highest Bid So Far
                  </h3>
                  
                  {topPlayer ? (
                      <div className="flex items-center gap-6 relative z-10">
                          <img src={topPlayer.imageUrl || '/api/placeholder/100/100'} className="w-28 h-28 rounded-[2rem] object-cover border-2 border-amber-500/40 shrink-0 bg-black shadow-[0_10px_20px_rgba(0,0,0,0.5)]" alt="Top"/>
                          <div className="min-w-0 flex-1">
                              <p className="text-3xl font-black text-white uppercase truncate mb-2 drop-shadow-md">{topPlayer.name}</p>
                              <div className="flex items-center gap-2 mb-3 bg-amber-500/10 w-fit px-3 py-1.5 rounded-xl border border-amber-500/20 backdrop-blur-sm">
                                  <img src={topPlayer.teamLogo} className="w-5 h-5 object-contain shrink-0" alt="logo"/>
                                  <p className="text-sm font-bold text-amber-300 uppercase truncate tracking-wider">{topPlayer.teamName}</p>
                              </div>
                              <p className="text-4xl font-mono font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">৳{topPlayer.price.toLocaleString()}</p>
                          </div>
                      </div>
                  ) : (
                      <div className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-lg relative z-10">No players sold yet</div>
                  )}
              </div>

              <div className="bg-slate-800/30 border border-slate-700/50 rounded-[3rem] p-8 flex-1 flex flex-col backdrop-blur-md min-h-0 shadow-2xl relative overflow-hidden">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-base flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-5 shrink-0 relative z-10">
                      <History className="w-6 h-6"/> Recent Trades
                  </h3>
                  
                  <div className="flex-1 flex flex-col justify-between relative z-10 pb-4">
                      {recentTrades.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-slate-600 font-bold uppercase tracking-widest text-center text-lg">Waiting for first sale...</div>
                      ) : (
                          recentTrades.map((trade, idx) => (
                              <div key={idx} className="bg-slate-900/50 border border-slate-700/60 rounded-3xl p-5 flex items-center gap-5 w-full hover:bg-slate-800 transition-colors shadow-sm">
                                  <img src={trade.imageUrl || '/api/placeholder/60/60'} className="w-16 h-16 rounded-[1.2rem] object-cover border border-slate-600 shrink-0 bg-slate-950" alt="Pic"/>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xl font-black text-white uppercase truncate leading-tight mb-2 drop-shadow-sm">{trade.name}</p>
                                      <div className="flex items-center gap-3">
                                          <span className="text-lg font-mono font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">৳{trade.price.toLocaleString()}</span>
                                          <div className="flex items-center gap-2 shrink-0 min-w-0 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-700/80">
                                              <img src={trade.teamLogo} className="w-4 h-4 object-contain shrink-0" alt="logo"/>
                                              <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase truncate tracking-wider">{trade.teamName}</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>

                  <div className="absolute bottom-4 right-8 opacity-20 text-[9px] uppercase tracking-[0.4em] font-black text-white pointer-events-none z-10">
                     Proudly Developed by Al Moeid
                  </div>
              </div>

          </div>

      </div>
    </div>
  );
}