import React, { useState, useEffect, useRef } from 'react';
// Imports
import { Mic, Activity, Circle, Share2, Check, TrendingUp, User, Crown, Award, Eye, Flame, Heart, HandMetal, ThumbsUp, Trophy, Sparkles, Target } from 'lucide-react'; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// ADDED 'increment' to imports for accurate view counting
import { getFirestore, doc, updateDoc, onSnapshot, increment } from "firebase/firestore";

// --- CUSTOM HOOKS & COMPONENTS ---
import useLiveViewers from '../../hooks/useLiveViewers'; 
import useMatchReactions from '../../hooks/useMatchReactions'; 
import MatchPoll from '../../components/MatchPoll'; 

import LiveBadge from '../../components/LiveBadge';
import TeamLogo from '../../components/TeamLogo';
import InningsScorecard from '../../components/InningsScorecard';
import { formatOvers, calculateRunRate } from '../../utils/helpers';

export default function MatchDetails({ currentMatch, setView }) {
  const [activeTab, setActiveTab] = useState('scorecard');
  const [copied, setCopied] = useState(false);
  const [storedViews, setStoredViews] = useState(currentMatch?.views || 0);

  // --- HOOKS ---
  const liveCount = useLiveViewers(currentMatch?.id);
  const { reactions, sendReaction } = useMatchReactions(currentMatch?.id); 
  
  // Ref to ensure we only count the view once per session
  const viewCounted = useRef(false);

  // --- SYNC VIEWS (ACCURATE HIT COUNTER) ---
// --- SYNC VIEWS (HYBRID: HITS + PEAK) ---
// --- SYNC VIEWS (SAFE MODE: HITS + PEAK) ---
  useEffect(() => {
    if (!currentMatch?.id) return;
    
    const db = getFirestore();
    const matchRef = doc(db, "matches", currentMatch.id);

    // 1. Listen for real-time updates (Read Only)
    const unsubscribe = onSnapshot(matchRef, (docSnap) => {
        if (docSnap.exists()) {
            setStoredViews(docSnap.data().views || 0);
        }
    }, (error) => {
        console.log("View listener warning:", error.message);
    });

    // 2. Safely Update View Count (Write)
    const updateViews = async () => {
        try {
            // Hit Counter: Only runs once per session
            if (!viewCounted.current) {
                viewCounted.current = true;
                // Use increment(1) for accurate counting
                await updateDoc(matchRef, { views: increment(1) });
            }

            // Peak Sync: If Live > Total, force update
            if (liveCount > storedViews) {
                await updateDoc(matchRef, { views: liveCount });
            }
        } catch (err) {
            // If the document doesn't exist (e.g. deleted match), this catches the error
            // so the app doesn't crash.
            console.warn("Could not update view count (Match may be deleted):", err.message);
        }
    };

    updateViews();

    return () => unsubscribe();
  }, [currentMatch?.id, liveCount, storedViews]);

  if (!currentMatch) return null;

  const isCompleted = currentMatch.status === 'Completed' || currentMatch.status === 'Concluding';
  
  // FIX: Display Live Count if Live, otherwise display Total Hits from DB
  const displayViews = currentMatch.status === 'Live' ? liveCount : (storedViews || 0);
  const viewLabel = currentMatch.status === 'Live' ? 'watching now' : 'total views';
  
  // --- HELPERS ---

  const formatViewCount = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // Determine Logos for the Completed Split View
  const getInningsLogos = () => {
      if (!currentMatch?.innings1) return { logo1: '', logo2: '', color1: '', color2: '' };
      
      const isTeamAFirst = currentMatch.innings1.teamName === currentMatch.teamA;
      return {
          logo1: isTeamAFirst ? currentMatch.teamALogo : currentMatch.teamBLogo,
          color1: isTeamAFirst ? currentMatch.teamAColor : currentMatch.teamBColor,
          logo2: isTeamAFirst ? currentMatch.teamBLogo : currentMatch.teamALogo,
          color2: isTeamAFirst ? currentMatch.teamBColor : currentMatch.teamAColor
      };
  };
  const { logo1, logo2, color1, color2 } = getInningsLogos();

  // Determine Logos for LIVE View
  const getLiveTeamAssets = () => {
      const isBattingTeamA = currentMatch.battingTeam === currentMatch.teamA;
      return {
          battingLogo: isBattingTeamA ? currentMatch.teamALogo : currentMatch.teamBLogo,
          battingColor: isBattingTeamA ? currentMatch.teamAColor : currentMatch.teamBColor,
          bowlingLogo: isBattingTeamA ? currentMatch.teamBLogo : currentMatch.teamALogo,
          bowlingColor: isBattingTeamA ? currentMatch.teamBColor : currentMatch.teamAColor,
      };
  };
  const { battingLogo, battingColor, bowlingLogo, bowlingColor } = getLiveTeamAssets();

  const getRecentBalls = () => {
      if (!currentMatch.timeline) return [];
      return [...currentMatch.timeline].slice(0, 8).reverse();
  };

  const getPartnershipData = () => {
      let totalRuns = 0; let totalBalls = 0; let p1Runs = 0; let p2Runs = 0;
      const strikerName = currentMatch.striker || "Batter 1";
      const nonStrikerName = currentMatch.nonStriker || "Batter 2";
      const timeline = currentMatch.timeline || [];
      
      for (let event of timeline) {
          if (event.isWicket) break; 
          let ballRuns = event.runs;
          if (event.type === 'wide' || event.type === 'nb') ballRuns += (event.runs + 1); 
          totalRuns += ballRuns;
          if (event.type === 'legal') totalBalls++;
          if (event.type === 'nb') totalBalls++; 

          if(event.striker === strikerName) p1Runs += event.runs;
          else if(event.striker === nonStrikerName) p2Runs += event.runs;
          else { p1Runs += (event.runs / 2); p2Runs += (event.runs / 2); }
      }
      const p1Percent = totalRuns === 0 ? 50 : (p1Runs / totalRuns) * 100;
      const p2Percent = 100 - p1Percent;
      return { totalRuns, totalBalls, p1Runs: Math.floor(p1Runs), p2Runs: Math.ceil(p2Runs), p1Percent, p2Percent, strikerName, nonStrikerName };
  };

  // --- CALCULATION HELPERS ---
  const getProjectedScore = () => {
      if (currentMatch.legalBalls === 0) return 0;
      const crr = parseFloat(calculateRunRate(currentMatch.score, currentMatch.legalBalls)); 
      return Math.floor(crr * currentMatch.totalOvers);
  };

  const getEquation = () => {
      if(!currentMatch.target) return null;
      const runsNeeded = currentMatch.target - currentMatch.score;
      const ballsRemaining = (parseInt(currentMatch.totalOvers) * 6) - parseInt(currentMatch.legalBalls);
      return { runsNeeded, ballsRemaining };
  };

  // --- Calculate Required Run Rate (RRR) ---
  const getRRR = () => {
      const eq = getEquation();
      if (!eq || eq.ballsRemaining <= 0) return '0.00';
      const rrrVal = (eq.runsNeeded / eq.ballsRemaining) * 6;
      return rrrVal < 0 ? '0.00' : rrrVal.toFixed(2);
  };

  const getManhattanData = () => {
      const timeline = [...(currentMatch.timeline || [])].reverse(); 
      const oversData = [];
      let runsInOver = 0; let wicketsInOver = 0; let legalBallsInOver = 0; let currentOver = 1;
      timeline.forEach(ball => {
          let runs = ball.runs;
          if (ball.type === 'wide' || ball.type === 'nb') runs += 1; 
          runsInOver += runs;
          if (ball.isWicket) wicketsInOver++;
          if (ball.type === 'legal' || ball.type === 'bye' || ball.type === 'legbye' || ball.type === 'nb') { legalBallsInOver++; }
          if (legalBallsInOver === 6) {
              oversData.push({ over: currentOver, runs: runsInOver, wickets: wicketsInOver });
              currentOver++; runsInOver = 0; wicketsInOver = 0; legalBallsInOver = 0;
          }
      });
      if (legalBallsInOver > 0 || runsInOver > 0 || wicketsInOver > 0) {
           oversData.push({ over: currentOver, runs: runsInOver, wickets: wicketsInOver, partial: true });
      }
      const totalOvers = parseInt(currentMatch.totalOvers || 20);
      const playedOvers = oversData.length;
      if (totalOvers > playedOvers) {
          for (let i = playedOvers + 1; i <= totalOvers; i++) { oversData.push({ over: i, runs: 0, wickets: 0, placeholder: true }); }
      }
      return oversData;
  };

  // --- RENDERERS ---
    
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.placeholder) return null;
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-xs relative z-50">
          <p className="font-bold mb-1">Over {label}</p>
          <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${data.wickets > 0 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
              <span>Runs: <span className="font-bold">{data.runs}</span></span>
          </div>
          {data.wickets > 0 && (
              <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>Wickets: <span className="font-bold">{data.wickets}</span></span>
              </div>
          )}
           {data.partial && <p className="text-gray-400 italic mt-1">(In progress)</p>}
        </div>
      );
    }
    return null;
  };

  const shareMatch = () => {
    const slug = `${currentMatch.teamA} vs ${currentMatch.teamB}`.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-");
    const url = `${window.location.origin}${window.location.pathname}?matchId=${currentMatch.id}&match=${slug}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const getLastActionText = (match) => {
    if (!match.timeline || match.timeline.length === 0) return "Match Started";
    const lastBall = match.timeline[0];
    let action = "";
    if (lastBall.isWicket) action = "WICKET";
    else if (lastBall.type === 'wide') action = "WIDE";
    else if (lastBall.type === 'nb') action = "NO BALL";
    else if (lastBall.runs === 4) action = "FOUR";
    else if (lastBall.runs === 6) action = "SIX";
    else if (lastBall.runs === 0) action = "DOT";
    else action = `${lastBall.runs} Run${lastBall.runs !== 1 ? 's' : ''}`;
    return `${lastBall.striker} to ${lastBall.bowler}, ${action}`;
  };

  const getFormattedTime = () => {
      if (!currentMatch.timestamp) return "Unknown";
      const date = currentMatch.timestamp.seconds ? new Date(currentMatch.timestamp.seconds * 1000) : new Date(currentMatch.timestamp);
      return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getBallNumber = (index) => {
      let count = parseInt(currentMatch.legalBalls || 0);
      for(let i = 0; i < index; i++) { if(currentMatch.timeline[i].type === 'legal') count--; }
      return formatOvers(count);
  };

  const getBatterStats = (name) => {
      const stats = currentMatch.battingStats?.[name] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
      const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(0) : 0;
      return { ...stats, sr };
  };

  const getBowlerStats = (name) => {
      const stats = currentMatch.bowlingStats?.[name] || { overs: 0, runs: 0, wickets: 0, balls: 0 };
      const eco = stats.balls > 0 ? ((stats.runs / stats.balls) * 6).toFixed(1) : 0;
      const oversDisplay = formatOvers(stats.balls);
      return { ...stats, eco, oversDisplay };
  };

  const renderPlayerCard = (p, i) => {
    const player = typeof p === 'string' ? { name: p, role: 'Player', photo: '', isCaptain: false, isWk: false } : p;
    return (
      <div key={i} className="flex items-center gap-3 p-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center shadow-sm">
          {player.photo ? <img src={player.photo} alt={player.name} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-800 text-sm truncate">{player.name}</span>
            {player.isCaptain && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
            {player.isWk && <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1 rounded shrink-0">WK</span>}
          </div>
          <div className="text-xs text-gray-500 truncate">{player.role || 'Player'}</div>
        </div>
      </div>
    );
  };

  const strikerStats = getBatterStats(currentMatch.striker);
  const nonStrikerStats = getBatterStats(currentMatch.nonStriker);
  const bowlerStats = getBowlerStats(currentMatch.bowler);

  const partnershipData = getPartnershipData(); 
  const projected = getProjectedScore();
  const equation = getEquation(); 
  const rrr = getRRR(); 
  const manhattanData = getManhattanData();
  const recentBalls = getRecentBalls();

  return (
    <div className="space-y-6 pb-20">
      <div id="printable-area" className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* --- DARK HEADER SECTION --- */}
        <div className="bg-gray-900 text-white p-4 md:p-6 relative">
           
           {/* MOBILE SHARE BUTTON */}
           <button onClick={shareMatch} className="md:hidden absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10">
               {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4 text-white" />}
           </button>
           
           {/* Header Content (Teams) - Hidden on Mobile if Live, Hidden Always if Completed */}
           {!isCompleted && (
               <div className="hidden md:flex flex-col md:flex-row justify-between items-center gap-4 mb-2 pt-4 md:pt-0 relative px-2 md:px-0">
                  <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                     <TeamLogo name={currentMatch.teamA} color={currentMatch.teamAColor} logo={currentMatch.teamALogo} size="sm" />
                     <span className="font-bold opacity-90 text-lg md:text-xl tracking-wide truncate">{currentMatch.teamA}</span>
                  </div>
                  
                  <div className="flex items-center justify-center md:justify-end w-full md:w-auto gap-4 pt-4 md:pt-0">
                      <div className="flex items-center gap-3 flex-row-reverse md:flex-row">
                         <span className="font-bold opacity-90 text-lg md:text-xl tracking-wide truncate">{currentMatch.teamB}</span>
                         <TeamLogo name={currentMatch.teamB} color={currentMatch.teamBColor} logo={currentMatch.teamBLogo} size="sm" />
                      </div>
                      
                      {/* DESKTOP SHARE BUTTON */}
                      <button onClick={shareMatch} className="hidden md:flex items-center justify-center p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors ml-2">
                        {copied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5 text-white" />}
                      </button>
                  </div>
               </div>
           )}
           
           {/* Score & Stats & Badges */}
           <div className="text-center mb-6 pt-4 md:pt-8"> 
              
              {/* Views & Status Pills */}
              <div className="flex flex-col items-center justify-center gap-2 mb-3">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm border transition-colors ${currentMatch.status === 'Live' ? 'bg-red-500/20 border-red-500/30 text-red-100' : 'bg-white/10 border-white/10 text-gray-200'}`}>
                      <Eye className={`w-3 h-3 ${currentMatch.status === 'Live' ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                      <span>{formatViewCount(displayViews)} {viewLabel}</span>
                  </div>
                  <div className="transform scale-90 md:scale-100">
                      {currentMatch.status === 'Live' ? <LiveBadge /> : <div className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">COMPLETED</div>}
                  </div>
              </div>

              {/* --- DYNAMIC SCORE DISPLAY --- */}
              {isCompleted && currentMatch.innings1 ? (
                  /* COMPLETED: SPLIT SCORE */
                  <div className="flex justify-center items-end gap-2 md:gap-12 mb-4 animate-in fade-in zoom-in duration-500 mt-2">
                      <div className="text-right flex flex-col items-end w-[45%] md:w-auto">
                          <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 opacity-80 truncate w-full text-right">{currentMatch.innings1.teamName}</div>
                          <div className="flex items-center justify-end gap-2 md:gap-3">
                              <span className="text-2xl md:text-5xl font-black text-gray-300 tracking-tighter shadow-lg drop-shadow-md">{currentMatch.innings1.score}/{currentMatch.innings1.wickets}</span>
                              <div className="shrink-0"><TeamLogo name={currentMatch.innings1.teamName} color={color1} logo={logo1} size="sm" /></div>
                          </div>
                          <div className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-widest mt-1 mr-1">{currentMatch.innings1.overs} ov</div>
                      </div>

                      {/* FIXED VS ALIGNMENT */}
                      <div className="text-gray-500 font-black text-xl md:text-3xl italic pb-3 md:pb-6 opacity-60">VS</div>

                      <div className="text-left flex flex-col items-start w-[45%] md:w-auto">
                          <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 opacity-80 truncate w-full text-left">{currentMatch.battingTeam}</div>
                          <div className="flex items-center justify-start gap-2 md:gap-3">
                              <div className="shrink-0"><TeamLogo name={currentMatch.battingTeam} color={color2} logo={logo2} size="sm" /></div>
                              <span className="text-2xl md:text-5xl font-black text-white tracking-tighter shadow-lg drop-shadow-md">{currentMatch.score}/{currentMatch.wickets}</span>
                          </div>
                          <div className="text-xs md:text-sm text-gray-400 font-bold uppercase tracking-widest mt-1 ml-1">{formatOvers(currentMatch.legalBalls)} ov</div>
                      </div>
                  </div>
              ) : (
                  /* LIVE MATCH */
                  <div className="mb-2">
                      {/* LIVE LAYOUT (Logos Flanking Score) */}
                      <div className="flex justify-center items-center gap-3 md:gap-6 animate-in fade-in zoom-in duration-500">
                          {/* Batting Team Logo (Left) */}
                          <div className="md:hidden opacity-80 scale-90">
                             <TeamLogo name={currentMatch.battingTeam} color={battingColor} logo={battingLogo} size="sm" />
                          </div>

                          <h1 className="text-5xl md:text-7xl font-black tracking-tighter shadow-lg drop-shadow-md">{currentMatch.score}/{currentMatch.wickets}</h1>

                          {/* Bowling Team Logo (Right) */}
                          <div className="md:hidden opacity-80 scale-90">
                             <TeamLogo name={currentMatch.bowlingTeam} color={bowlingColor} logo={bowlingLogo} size="sm" />
                          </div>
                      </div>
                      
                      {/* MOBILE FULL TEAM NAMES (WHO IS BATTING?) + VS */}
                      <div className="md:hidden flex items-center justify-center gap-3 mt-3 px-1 w-full">
                          {/* Batting Team */}
                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)] shrink-0"></div>
                              <span className="text-[10px] font-bold text-white uppercase tracking-wide leading-tight">{currentMatch.battingTeam}</span>
                          </div>
                          {/* VS */}
                          <div className="text-center text-[10px] font-black text-gray-600 italic shrink-0">VS</div>
                          {/* Bowling Team */}
                          <div className="flex items-center justify-start gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-tight">{currentMatch.bowlingTeam}</span>
                          </div>
                      </div>
                  </div>
              )}
              
              {(currentMatch.status === 'Live') && (
                <div className="flex flex-col items-center justify-center gap-2 mb-6 mt-4">
                    
                    {/* INNINGS 2: TARGET EQUATION (Narrow Screen Fixed) */}
                    {currentMatch.currentInnings === 2 && equation && (
                        <div className="animate-in slide-in-from-bottom-2 fade-in duration-700 w-full flex flex-col items-center">
                            {/* UPDATED: Reduced padding, forced single line, centered, responsive font */}
                            <div className="bg-gradient-to-r from-blue-900/60 to-blue-800/60 border border-blue-500/30 px-3 py-2 md:px-6 md:py-2.5 rounded-full flex items-center justify-center gap-1.5 md:gap-2 shadow-lg backdrop-blur-md whitespace-nowrap max-w-[95%]">
                                <Target className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 animate-pulse shrink-0" />
                                <span className="text-blue-100 text-[10px] xs:text-xs md:text-sm font-bold tracking-wide truncate">
                                    {currentMatch.battingTeam} need <span className="text-yellow-400 text-sm md:text-lg">{equation.runsNeeded}</span> runs in <span className="text-white text-sm md:text-lg">{equation.ballsRemaining}</span> balls
                                </span>
                            </div>
                            
                            {/* FIX: Target is now pure white and bold */}
                            <div className="text-[10px] text-white font-bold uppercase tracking-widest mt-1.5 opacity-100">Target: {currentMatch.target}</div>
                        </div>
                    )}

                    {/* INNINGS 1: PROJECTED SCORE (Only shown in 1st innings) */}
                    {currentMatch.currentInnings === 1 && (
                        <div className="bg-gray-800/80 border border-gray-700 px-3 py-1.5 rounded-full text-xs md:text-sm text-gray-300 font-medium">
                            Projected: <span className="text-white font-bold">{projected}</span>
                        </div>
                    )}
                </div>
              )}

              {!isCompleted && (
                  <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm font-medium text-gray-400">
                     <span className="bg-gray-800 px-2 py-1 rounded">Overs: {formatOvers(currentMatch.legalBalls)} / {currentMatch.totalOvers}</span>
                     <span className="bg-gray-800 px-2 py-1 rounded">CRR: {calculateRunRate(currentMatch.score, currentMatch.legalBalls)}</span>
                     
                     {/* --- RRR BADGE (Shows in 2nd Innings) --- */}
                     {currentMatch.currentInnings === 2 && (
                        <span className={`bg-gray-800 px-2 py-1 rounded border border-gray-700 
                           ${parseFloat(rrr) > 12 ? 'text-red-500 font-bold animate-pulse' : 
                             parseFloat(rrr) > 9 ? 'text-orange-400 font-bold' : 'text-blue-400'}`}>
                           RRR: {rrr}
                        </span>
                     )}
                     
                     <span className="text-green-400 bg-gray-800 px-2 py-1 rounded">Extras: {currentMatch.extras || 0}</span>
                  </div>
              )}
              
              {/* --- ULTIMATE PREMIUM WINNER BANNER --- */}
              {(currentMatch.status === 'Completed' || currentMatch.status === 'Concluding') && (
                 <div className="mt-6 relative overflow-hidden group rounded-xl max-w-lg mx-auto mb-2 shadow-2xl ring-1 ring-emerald-500/30">
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer transition-transform"></div>
                     <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/40 via-emerald-500/20 to-emerald-600/40"></div>
                     <div className="relative bg-black/30 backdrop-blur-md px-6 py-4 rounded-xl flex flex-col items-center justify-center gap-2">
                         <div className="flex items-center gap-3">
                             <Trophy className="w-6 h-6 text-yellow-300 shrink-0 drop-shadow-[0_0_10px_rgba(253,224,71,0.5)]" />
                             <span className="text-white font-bold tracking-wide uppercase text-sm md:text-lg text-center drop-shadow-md">
                                 {currentMatch.result}
                             </span>
                         </div>
                         {currentMatch.mom && (
                             <div className="mt-2">
                                 <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-900/80 to-yellow-900/80 text-amber-100 px-4 py-1.5 rounded-full text-xs font-bold border border-amber-500/50 shadow-lg">
                                     <Sparkles className="w-3 h-3 text-yellow-300" />
                                     <span>MOM: <span className="text-white tracking-wide">{currentMatch.mom}</span></span>
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
              )}
           </div>

           {/* Mini-Scorecard */}
           {(currentMatch.status === 'Live' || currentMatch.status === 'Concluding') && (
               <div className="border-t border-gray-800 pt-4 mt-4 space-y-4">
                   <div>
                       <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{currentMatch.battingTeam} Batting</h4>
                       <div className="grid grid-cols-12 gap-1 md:gap-2 text-xs md:text-sm font-medium text-gray-300 border-b border-gray-800 pb-2 mb-2">
                            <div className="col-span-5">Batter</div><div className="col-span-2 text-right">R</div><div className="col-span-2 text-right">B</div><div className="col-span-1 text-right">4s</div><div className="col-span-1 text-right">6s</div><div className="col-span-1 text-right">SR</div>
                       </div>
                       {currentMatch.striker && (
                           <div className="grid grid-cols-12 gap-1 md:gap-2 text-xs md:text-sm items-center mb-1">
                               <div className="col-span-5 text-white font-bold flex items-center"><span className="truncate">{currentMatch.striker}</span><Circle className="w-2 h-2 md:w-2.5 md:h-2.5 fill-green-500 text-green-500 ml-2 shrink-0 animate-pulse" /></div>
                               <div className="col-span-2 text-right font-bold text-white">{strikerStats.runs}</div><div className="col-span-2 text-right">{strikerStats.balls}</div><div className="col-span-1 text-right text-gray-400">{strikerStats.fours}</div><div className="col-span-1 text-right text-gray-400">{strikerStats.sixes}</div><div className="col-span-1 text-right text-gray-400">{strikerStats.sr}</div>
                           </div>
                       )}
                       {currentMatch.nonStriker && (
                           <div className="grid grid-cols-12 gap-1 md:gap-2 text-xs md:text-sm items-center">
                               <div className="col-span-5 text-gray-300 truncate">{nonStrikerStats.name || currentMatch.nonStriker}</div>
                               <div className="col-span-2 text-right font-bold">{nonStrikerStats.runs}</div><div className="col-span-2 text-right">{nonStrikerStats.balls}</div><div className="col-span-1 text-right text-gray-500">{nonStrikerStats.fours}</div><div className="col-span-1 text-right text-gray-500">{nonStrikerStats.sixes}</div><div className="col-span-1 text-right text-gray-500">{nonStrikerStats.sr}</div>
                           </div>
                       )}
                       
                       {/* --- PARTNERSHIP CARD (Under Batsmen) --- */}
                       {(currentMatch.status === 'Live') && (
                           <div className="mt-3">
                               <div className="bg-white/10 rounded-lg p-2.5 w-full border border-white/5">
                                   <div className="flex justify-between text-[10px] text-gray-300 font-bold mb-1 px-1">
                                       <span>{partnershipData.strikerName} ({partnershipData.p1Runs})</span>
                                       <span>{partnershipData.nonStrikerName} ({partnershipData.p2Runs})</span>
                                   </div>
                                   <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden flex">
                                       <div style={{width: `${partnershipData.p1Percent}%`}} className="h-full bg-green-500"></div>
                                       <div style={{width: `${partnershipData.p2Percent}%`}} className="h-full bg-blue-500"></div>
                                   </div>
                                   <div className="text-center text-[10px] text-gray-400 mt-1">
                                       Current Partnership: <span className="text-white font-bold">{partnershipData.totalRuns}</span> runs ({partnershipData.totalBalls} balls)
                                   </div>
                               </div>
                           </div>
                       )}
                   </div>
                   
                   <div>
                       <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 mt-4">{currentMatch.bowlingTeam} Bowling</h4>
                       <div className="grid grid-cols-12 gap-1 md:gap-2 text-xs md:text-sm font-medium text-gray-300 border-b border-gray-800 pb-2 mb-2">
                            <div className="col-span-5">Bowler</div><div className="col-span-2 text-right">O</div><div className="col-span-1 text-right">M</div><div className="col-span-2 text-right">R</div><div className="col-span-1 text-right">W</div><div className="col-span-1 text-right">Eco</div>
                       </div>
                       {currentMatch.bowler && (
                           <div className="grid grid-cols-12 gap-1 md:gap-2 text-xs md:text-sm items-center">
                               <div className="col-span-5 text-white font-bold truncate">{currentMatch.bowler}</div>
                               <div className="col-span-2 text-right">{bowlerStats.oversDisplay}</div><div className="col-span-1 text-right text-gray-400">0</div><div className="col-span-2 text-right">{bowlerStats.runs}</div><div className="col-span-1 text-right font-bold text-white">{bowlerStats.wickets}</div><div className="col-span-1 text-right text-gray-400">{bowlerStats.eco}</div>
                           </div>
                       )}
                   </div>
                   {currentMatch.timeline && currentMatch.timeline.length > 0 && (
                       <div className="bg-gray-800/60 rounded-full px-4 py-3 text-xs text-gray-300 flex items-center justify-center italic border border-gray-700 mt-4 text-center">
                           <Mic className="w-3 h-3 mr-2 text-green-500 shrink-0" /><span>{getLastActionText(currentMatch)}</span>
                       </div>
                   )}

                   {/* --- RECENT BALLS STRIP (Under Commentary) --- */}
                   {(currentMatch.status === 'Live') && (
                        <div className="flex justify-center items-center gap-2 mt-3 animate-in fade-in zoom-in duration-500 border-t border-gray-800 pt-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-1">Recent:</span>
                            <div className="flex gap-1.5 overflow-hidden">
                                {recentBalls.length === 0 && <span className="text-xs text-gray-600 italic">No balls yet</span>}
                                {recentBalls.map((ball, i) => (
                                    <div 
                                        key={i} 
                                        className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold border border-gray-800 shadow-sm
                                            ${ball.isWicket ? 'bg-red-600 text-white' 
                                            : ball.runs === 4 ? 'bg-blue-600 text-white' 
                                            : ball.runs === 6 ? 'bg-purple-600 text-white' 
                                            : (ball.type && (ball.type === 'wide' || ball.type === 'nb')) ? 'bg-orange-500 text-black' 
                                            : 'bg-white text-gray-900'}`}
                                    >
                                        {ball.isWicket ? 'W' : (ball.type && ball.type !== 'legal' ? ball.type.toUpperCase().substring(0,2) : ball.runs)}
                                    </div>
                                ))}
                            </div>
                        </div>
                   )}
               </div>
           )}
        </div>
        
        {/* --- POLLS & REACTIONS SECTION --- */}
        {(currentMatch.status === 'Live') && (
            <div className="px-4 md:px-6 mt-4">
               {/* Poll */}
               <MatchPoll 
                  matchId={currentMatch.id} 
                  teamA={currentMatch.teamA} 
                  teamB={currentMatch.teamB} 
                  colorA={currentMatch.teamAColor || '#3b82f6'} 
                  colorB={currentMatch.teamBColor || '#f97316'} 
               />
               
               {/* Reactions */}
               <div className="flex justify-center gap-4 mt-2 mb-4">
                   <button onClick={() => sendReaction('fire')} className="flex flex-col items-center gap-1 group">
                       <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors shadow-sm">
                           <Flame className="w-5 h-5 text-orange-500" />
                       </div>
                       <span className="text-[10px] font-bold text-gray-500">{reactions.fire || 0}</span>
                   </button>
                   <button onClick={() => sendReaction('clap')} className="flex flex-col items-center gap-1 group">
                       <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors shadow-sm">
                           <ThumbsUp className="w-5 h-5 text-blue-500" />
                       </div>
                       <span className="text-[10px] font-bold text-gray-500">{reactions.clap || 0}</span>
                   </button>
                   <button onClick={() => sendReaction('heart')} className="flex flex-col items-center gap-1 group">
                       <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors shadow-sm">
                           <Heart className="w-5 h-5 text-pink-500" />
                       </div>
                       <span className="text-[10px] font-bold text-gray-500">{reactions.heart || 0}</span>
                   </button>
                   <button onClick={() => sendReaction('wicket')} className="flex flex-col items-center gap-1 group">
                       <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors shadow-sm">
                           <HandMetal className="w-5 h-5 text-red-600" />
                       </div>
                       <span className="text-[10px] font-bold text-gray-500">{reactions.wicket || 0}</span>
                   </button>
               </div>
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
           <button onClick={() => setActiveTab('scorecard')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'scorecard' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Scorecard</button>
           <button onClick={() => setActiveTab('analysis')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'analysis' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Analysis</button>
           <button onClick={() => setActiveTab('info')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'info' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Info</button>
           <button onClick={() => setActiveTab('timeline')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'timeline' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Timeline</button>
        </div>

        {/* 1. SCORECARD TAB */}
        {activeTab === 'scorecard' && (
           <div className="p-4 bg-gray-50 overflow-x-auto">
             {currentMatch.innings1 && (
                 <>
                    <InningsScorecard 
                        teamName={currentMatch.innings1.teamName} 
                        score={currentMatch.innings1.score} 
                        wickets={currentMatch.innings1.wickets} 
                        overs={currentMatch.innings1.overs} 
                        extras={currentMatch.innings1.extras} 
                        battingStats={currentMatch.innings1.battingStats || {}} 
                        bowlingStats={currentMatch.innings1.bowlingStats || {}} 
                    />
                    {/* FOW SECTION REMOVED */}
                 </>
             )}
             <InningsScorecard 
                teamName={currentMatch.battingTeam} 
                score={currentMatch.score} 
                wickets={currentMatch.wickets} 
                overs={formatOvers(currentMatch.legalBalls)} 
                extras={currentMatch.extras} 
                battingStats={currentMatch.battingStats || {}} 
                bowlingStats={currentMatch.bowlingStats || {}} 
                matchResult={currentMatch.result} 
                mom={currentMatch.mom} 
             />
             {/* FOW SECTION REMOVED */}
           </div>
        )}

        {/* 2. INFO TAB */}
        {activeTab === 'info' && (
           <div className="p-4 bg-gray-50 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                 <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 text-sm uppercase tracking-wide">Match Info</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"> 
                   <div><p className="text-gray-400 text-xs uppercase font-bold">Date & Time</p><p className="font-semibold text-gray-800 mt-1">{getFormattedTime()}</p></div>
                   <div><p className="text-gray-400 text-xs uppercase font-bold">Venue</p><p className="font-semibold text-gray-800 mt-1">{currentMatch.venue || 'Not Selected'}</p></div>
                   <div><p className="text-gray-400 text-xs uppercase font-bold">Toss</p><p className="font-semibold text-gray-800 mt-1">{currentMatch.innings1 ? `${currentMatch.innings1.teamName} batted first` : `${currentMatch.battingTeam} elected to bat`}</p></div>
                   <div>
                     <p className="text-gray-400 text-xs uppercase font-bold">Official Scorer</p>
                     <p className="font-bold text-blue-600 mt-1 flex items-center gap-1"><User className="w-3 h-3" /> {currentMatch.scorerName || 'Admin'}</p>
                   </div>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center gap-2">
                    <TeamLogo name={currentMatch.teamA} color={currentMatch.teamAColor} logo={currentMatch.teamALogo} size="sm" />
                    <h4 className="font-bold text-sm text-blue-900">{currentMatch.teamA} XI</h4>
                  </div>
                  <div className="p-1">
                    {currentMatch.teamAPlayers?.length > 0 ? currentMatch.teamAPlayers.map((p, i) => renderPlayerCard(p, i)) : <p className="text-center text-gray-400 text-xs py-4">No players listed</p>}
                </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-orange-50 p-3 border-b border-orange-100 flex items-center gap-2">
                    <TeamLogo name={currentMatch.teamB} color={currentMatch.teamBColor} logo={currentMatch.teamBLogo} size="sm" />
                    <h4 className="font-bold text-sm text-orange-900">{currentMatch.teamB} XI</h4>
                  </div>
                  <div className="p-1">
                    {currentMatch.teamBPlayers?.length > 0 ? currentMatch.teamBPlayers.map((p, i) => renderPlayerCard(p, i)) : <p className="text-center text-gray-400 text-xs py-4">No players listed</p>}
                </div>
                </div>
              </div>
           </div>
        )}

        {/* 3. ANALYSIS TAB */}
        {activeTab === 'analysis' && (
            <div className="p-6 bg-white min-h-[400px]">
                <h3 className="font-bold text-gray-700 mb-6 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" /> Runs per Over (Manhattan)
                </h3>
                
                {manhattanData.length === 0 ? (
                    <p className="text-center text-gray-400 py-10">Not enough data yet (requires at least one complete over).</p>
                ) : (
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={manhattanData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="over" label={{ value: 'Overs', position: 'insideBottom', offset: -15, fontSize: 12, fill: '#9ca3af' }} tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={{stroke: '#e5e7eb'}} />
                                <YAxis label={{ value: 'Runs', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: '#9ca3af' }} tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                <Bar dataKey="runs" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {manhattanData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.wickets > 0 ? '#ef4444' : '#3b82f6'} fillOpacity={entry.placeholder ? 0 : 1} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-2 text-xs font-bold text-gray-600">
                            <div className="flex items-center"><div className="w-3 h-3 bg-blue-500 mr-2 rounded-sm"></div> Runs</div>
                            <div className="flex items-center"><div className="w-3 h-3 bg-red-500 mr-2 rounded-sm"></div> Wicket Over</div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* 4. TIMELINE TAB */}
        {activeTab === 'timeline' && (
            <div className="p-4 bg-gray-50 space-y-2">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center"><Activity className="w-4 h-4 mr-2" /> Ball by Ball Timeline</h3>
              {(!currentMatch.timeline || currentMatch.timeline.length === 0) && <div className="text-center text-gray-400 p-4 italic">No balls bowled yet.</div>}
              {currentMatch.timeline?.map((ball, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="text-xs font-mono font-bold text-gray-400 w-8 text-right">{getBallNumber(index)}</div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${ball.isWicket ? 'bg-red-500 text-white' : ball.runs === 4 ? 'bg-blue-500 text-white' : ball.runs === 6 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{ball.isWicket ? 'W' : ball.type !== 'legal' ? ball.type.toUpperCase() : ball.runs}</div>
                          <div className="text-sm">
                              <div className="font-semibold text-gray-800">{ball.bowler} to {ball.striker}</div>
                              <div className="text-xs text-gray-500">{ball.isWicket ? `OUT (${ball.dismissalInfo?.type || 'Wicket'})` : ball.type === 'wide' ? 'Wide Ball' : ball.type === 'nb' ? 'No Ball' : `${ball.runs} Run${ball.runs !== 1 ? 's' : ''}`}</div>
                          </div>
                      </div>
                      <div className="text-[10px] text-gray-400 shrink-0">{new Date(ball.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}