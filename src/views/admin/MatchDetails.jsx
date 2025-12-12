import React, { useState, useEffect } from 'react';
// Imports necessary icons
import { Mic, Activity, Circle, Share2, Check, TrendingUp, User, Crown, Award, Eye } from 'lucide-react'; 
// --- RECHARTS IMPORTS ---
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- FIREBASE IMPORTS ---
import { getFirestore, doc, updateDoc, onSnapshot } from "firebase/firestore";

// --- CUSTOM HOOK ---
// Ensure this path matches where you saved the hook file
import useLiveViewers from '../../hooks/useLiveViewers'; 

import LiveBadge from '../../components/LiveBadge';
import TeamLogo from '../../components/TeamLogo';
import InningsScorecard from '../../components/InningsScorecard';
import { formatOvers, calculateRunRate } from '../../utils/helpers';

export default function MatchDetails({ currentMatch, setView }) {
  const [activeTab, setActiveTab] = useState('scorecard');
  const [copied, setCopied] = useState(false);
  const [storedViews, setStoredViews] = useState(currentMatch?.views || 0);

  // --- USE THE LIVE HOOK ---
  const liveCount = useLiveViewers(currentMatch?.id);

  // --- SYNC & PERSIST VIEWS ---
  useEffect(() => {
    if (!currentMatch?.id) return;

    // 1. Listen to the document in real-time to get the latest 'views' from Firestore
    // This ensures we always have the true "Total Views" even if this client refreshes.
    const db = getFirestore();
    const matchRef = doc(db, "matches", currentMatch.id);
    
    const unsubscribe = onSnapshot(matchRef, (docSnap) => {
        if (docSnap.exists()) {
            setStoredViews(docSnap.data().views || 0);
        }
    });

    return () => unsubscribe();
  }, [currentMatch?.id]);

  useEffect(() => {
    if (!currentMatch?.id || !liveCount) return;

    // 2. If the current LIVE count is higher than what Firestore has, update Firestore immediately.
    // This captures the "Peak" viewership.
    if (liveCount > storedViews) {
      const db = getFirestore();
      const matchRef = doc(db, "matches", currentMatch.id);
      
      // We update the local state immediately for UI responsiveness...
      setStoredViews(liveCount);
      
      // ...and persist to DB
      updateDoc(matchRef, { 
        views: liveCount 
      }).catch(err => console.error("Error syncing peak views:", err));
    }
  }, [liveCount, storedViews, currentMatch?.id]);


  if (!currentMatch) return null;

  // --- VIEW COUNT DISPLAY LOGIC ---
  // If Live: Show the higher of (Realtime Count vs Stored Peak) to avoid flickering down
  // If Completed: Show the Stored Peak from Firestore
  const displayViews = currentMatch.status === 'Live' ? Math.max(liveCount, storedViews) : storedViews;
  const viewLabel = currentMatch.status === 'Live' ? 'watching now' : 'total views';
  
  // --- CALCULATIONS & HELPERS ---

  const formatViewCount = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // 1. Partnership 
  const getPartnership = () => {
      let runs = 0;
      let balls = 0;
      const timeline = currentMatch.timeline || [];
      
      for (let event of timeline) {
          if (event.isWicket) break; 
          if (event.type === 'legal') {
              runs += event.runs;
              balls++;
          } else if (event.type === 'wide' || event.type === 'nb') {
              runs += (event.runs + 1); 
              if (event.type === 'nb') balls++; 
          }
      }
      return { runs, balls };
  };

  // 2. Projected Score
  const getProjectedScore = () => {
      if (currentMatch.legalBalls === 0) return 0;
      const crr = parseFloat(calculateRunRate(currentMatch.score, currentMatch.legalBalls)); 
      return Math.floor(crr * currentMatch.totalOvers);
  };

  // 3. Fall Of Wickets 
  const getFOW = () => {
      const timeline = [...(currentMatch.timeline || [])].reverse(); 
      let wickets = [];
      let score = 0;
      let balls = 0;
      
      timeline.forEach(ball => {
          let r = ball.runs;
          if (ball.type === 'wide' || ball.type === 'nb') r++; 
          score += r;
          if (ball.type === 'legal' || ball.type === 'bye' || ball.type === 'legbye') balls++;
          
          if (ball.isWicket) {
              const playerOutName = ball.dismissalInfo?.playerOut || (ball.dismissalInfo?.who === 'striker' ? ball.striker : ball.nonStriker);
              wickets.push({
                  score: score,
                  wickets: wickets.length + 1,
                  name: playerOutName,
                  over: formatOvers(balls)
              });
          }
      });
      return wickets.reverse(); 
  };

  // 4. Manhattan Graph Data
  const getManhattanData = () => {
      const timeline = [...(currentMatch.timeline || [])].reverse(); 
      const oversData = [];
      let runsInOver = 0;
      let wicketsInOver = 0;
      let legalBallsInOver = 0;
      let currentOver = 1;

      timeline.forEach(ball => {
          let runs = ball.runs;
          if (ball.type === 'wide' || ball.type === 'nb') runs += 1; 
          
          runsInOver += runs;
          if (ball.isWicket) wicketsInOver++;

          if (ball.type === 'legal' || ball.type === 'bye' || ball.type === 'legbye' || ball.type === 'nb') {
              legalBallsInOver++;
          }

          if (legalBallsInOver === 6) {
              oversData.push({ over: currentOver, runs: runsInOver, wickets: wicketsInOver });
              currentOver++;
              runsInOver = 0;
              wicketsInOver = 0;
              legalBallsInOver = 0;
          }
      });

      // Add any remaining partial over
      if (legalBallsInOver > 0 || runsInOver > 0 || wicketsInOver > 0) {
           oversData.push({ over: currentOver, runs: runsInOver, wickets: wicketsInOver, partial: true });
      }
    
      // Fill remaining overs up to totalOvers
      const totalOvers = parseInt(currentMatch.totalOvers || 20);
      const playedOvers = oversData.length;
      
      if (totalOvers > playedOvers) {
          for (let i = playedOvers + 1; i <= totalOvers; i++) {
              oversData.push({ over: i, runs: 0, wickets: 0, placeholder: true });
          }
      }
    
      return oversData;
  };

  // --- RENDERERS ---
  const renderFOWSection = (list, teamName) => {
    if (!list || list.length === 0) return null;
    return (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wider">Fall of Wickets ({teamName})</h3>
            <div className="flex flex-wrap gap-2">
                {list.map((w, i) => (
                    <div key={i} className="text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-100 flex items-center gap-2">
                        <span className="font-bold text-red-600">{i + 1}-{w.score}</span> 
                        <span className="text-gray-500">({w.name || w.batter || 'Unknown'}, {w.over} ov)</span>
                    </div>
                ))}
            </div>
        </div>
    );
  };
    
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

  const partnership = getPartnership();
  const projected = getProjectedScore();
  const currentFowList = getFOW(); 
  const manhattanData = getManhattanData();

  return (
    <div className="space-y-6 pb-20">
      <div id="printable-area" className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gray-900 text-white p-4 md:p-6 relative">
           
           {/* Share Button (Mobile) */}
           <button onClick={shareMatch} className="md:hidden absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10">
               {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4 text-white" />}
           </button>
           
           {/* Header Content */}
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2 pt-4 md:pt-0 relative">
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                 <TeamLogo name={currentMatch.teamA} color={currentMatch.teamAColor} logo={currentMatch.teamALogo} size="sm" />
                 <span className="font-bold opacity-90 text-lg md:text-xl tracking-wide truncate">{currentMatch.teamA}</span>
              </div>
              
              <div className="flex items-center justify-center md:justify-end w-full md:w-auto gap-4 pt-4 md:pt-0">
                  <div className="flex items-center gap-3 flex-row-reverse md:flex-row">
                     <span className="font-bold opacity-90 text-lg md:text-xl tracking-wide truncate">{currentMatch.teamB}</span>
                     <TeamLogo name={currentMatch.teamB} color={currentMatch.teamBColor} logo={currentMatch.teamBLogo} size="sm" />
                  </div>
                  {/* Desktop Share Button */}
                  <button onClick={shareMatch} className="hidden md:flex items-center justify-center p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors ml-2">
                    {copied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5 text-white" />}
                  </button>
              </div>
           </div>
           
           {/* Score & Stats & Badges (All Centered Together) */}
           <div className="text-center mb-6 pt-4 md:pt-8"> 
              
              <div className="flex flex-col items-center justify-center gap-2 mb-3">
                  {/* Views Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm border transition-colors ${currentMatch.status === 'Live' ? 'bg-red-500/20 border-red-500/30 text-red-100' : 'bg-white/10 border-white/10 text-gray-200'}`}>
                      <Eye className={`w-3 h-3 ${currentMatch.status === 'Live' ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                      <span>{formatViewCount(displayViews)} {viewLabel}</span>
                  </div>
                  {/* Status Badge */}
                  <div className="transform scale-90 md:scale-100">
                      {currentMatch.status === 'Live' ? <LiveBadge /> : <div className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">COMPLETED</div>}
                  </div>
              </div>

              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-2">{currentMatch.score}/{currentMatch.wickets}</h1>
              
              {(currentMatch.status === 'Live') && (
                <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-xs md:text-sm text-gray-300 mb-3 font-medium">
                    <div className="bg-gray-800 px-2 py-1 rounded">PShip: <span className="text-white font-bold">{partnership.runs} ({partnership.balls})</span></div>
                    <div className="bg-gray-800 px-2 py-1 rounded">Projected: <span className="text-white font-bold">{projected}</span></div>
                </div>
              )}

              <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm font-medium text-gray-400">
                 <span className="bg-gray-800 px-2 py-1 rounded">Overs: {formatOvers(currentMatch.legalBalls)} / {currentMatch.totalOvers}</span>
                 <span className="bg-gray-800 px-2 py-1 rounded">CRR: {calculateRunRate(currentMatch.score, currentMatch.legalBalls)}</span>
                 <span className="text-green-400 bg-gray-800 px-2 py-1 rounded">Extras: {currentMatch.extras || 0}</span>
              </div>
              
              {(currentMatch.status === 'Completed' || currentMatch.status === 'Concluding') ? (
                 <div className="mt-6 flex flex-col items-center justify-center">
                     <div className="text-yellow-400 font-bold text-lg md:text-xl animate-pulse bg-white/10 px-4 py-2 rounded-lg inline-block mb-3">
                         {currentMatch.result}
                     </div>
                     {currentMatch.mom && (
                         <div className="inline-flex items-center gap-2 bg-purple-900/50 text-purple-200 px-3 py-1.5 rounded-full text-sm font-medium border border-purple-700/50">
                             <Award className="w-4 h-4 text-purple-400" />
                             <span>MOM: <span className="font-bold text-white">{currentMatch.mom}</span></span>
                         </div>
                     )}
                 </div>
              ) : (
                 currentMatch.currentInnings === 2 && (
                    <div className="mt-6 flex flex-col items-center">
                        <div className="text-white-500 font-bold text-sm uppercase tracking-widest mb-1">Target: {currentMatch.target}</div>
                        <div className="text-green-400 font-bold animate-pulse text-lg md:text-xl">
                            {currentMatch.battingTeam} Need {currentMatch.target - currentMatch.score} off {(currentMatch.totalOvers * 6) - currentMatch.legalBalls} balls
                        </div>
                    </div>
                 )
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
               </div>
           )}
        </div>
        
        <div className="flex border-b border-gray-200 overflow-x-auto">
           <button onClick={() => setActiveTab('scorecard')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'scorecard' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Scorecard</button>
           <button onClick={() => setActiveTab('analysis')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'analysis' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Analysis</button>
           <button onClick={() => setActiveTab('info')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'info' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Info</button>
           <button onClick={() => setActiveTab('timeline')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'timeline' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Timeline</button>
        </div>

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
                    {renderFOWSection(currentMatch.innings1.fow, currentMatch.innings1.teamName)}
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
             {renderFOWSection(currentFowList, currentMatch.battingTeam)}
           </div>
        )}

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