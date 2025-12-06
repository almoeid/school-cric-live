import React, { useState } from 'react';
// Removed Camera icon import
import { Mic, Activity, Circle, Share2, Check, TrendingUp, User, Crown } from 'lucide-react'; 
// Removed html2canvas import

import LiveBadge from '../../components/LiveBadge';
import TeamLogo from '../../components/TeamLogo';
import InningsScorecard from '../../components/InningsScorecard';
import { formatOvers, calculateRunRate } from '../../utils/helpers';

export default function MatchDetails({ currentMatch, setView }) {
  const [activeTab, setActiveTab] = useState('scorecard');
  // Removed isDownloading state
  const [copied, setCopied] = useState(false);

  if (!currentMatch) return null;

  // --- CALCULATIONS & HELPERS ---

  // 1. Calculate Current Partnership 
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
      let currentScore = 0;
      let legalBalls = 0;
      
      timeline.forEach(ball => {
          let runs = ball.runs;
          let extras = 0;
          if (ball.type === 'wide' || ball.type === 'nb') extras = 1; 
          currentScore += (runs + extras);
          
          if (ball.type === 'legal') legalBalls++;
          
          if (ball.isWicket) {
              const playerOutName = ball.dismissalInfo?.playerOut || (ball.dismissalInfo?.who === 'striker' ? ball.striker : ball.nonStriker);

              wickets.push({
                  score: currentScore,
                  wickets: wickets.length + 1,
                  name: playerOutName,
                  over: formatOvers(legalBalls)
              });
          }
      });
      // Reverse FOW list to display 1st wicket first
      return wickets.reverse(); 
  };

  // 4. Worm Graph Data (Cumulative Score per Over)
  const getWormData = () => {
      const timeline = [...(currentMatch.timeline || [])].reverse();
      let data = [{ over: 0, runs: 0 }];
      let currentScore = 0;
      let legalBalls = 0;
      
      timeline.forEach(ball => {
          let runs = ball.runs;
          let extras = 0;
          if (ball.type === 'wide' || ball.type === 'nb') extras = 1;
          currentScore += (runs + extras);
          
          if (ball.type === 'legal') legalBalls++;
          
          // Record at end of every legal over
          if (legalBalls > 0 && legalBalls % 6 === 0) {
              data.push({ over: legalBalls / 6, runs: currentScore });
          }
      });
      
      const currentOvers = parseFloat(formatOvers(currentMatch.legalBalls));
      
      // Add current live score point if the last recorded point isn't the current over.
      if (currentMatch.legalBalls > 0 && data[data.length-1]?.over !== currentOvers) {
          data.push({ over: currentOvers, runs: currentMatch.score });
      }

      return data;
  };


  // --- SHARE LOGIC ---
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

  // --- HELPER: Player Card Renderer (For INFO tab) ---
  const renderPlayerCard = (p, i) => {
    // Handle both old string format and new object format
    const player = typeof p === 'string' ? { name: p, role: 'Player', photo: '', isCaptain: false, isWk: false } : p;
    
    return (
      <div key={i} className="flex items-center gap-3 p-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center shadow-sm">
          {player.photo ? (
            <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-gray-400" />
          )}
        </div>
        
        {/* Details */}
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
  const fowList = getFOW();
  const wormData = getWormData();

  return (
    <div className="space-y-6 pb-20">
      <div id="printable-area" className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gray-900 text-white p-4 md:p-6 relative">
           {/* Share Button (Mobile) */}
           <button onClick={shareMatch} className="md:hidden absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10">
               {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4 text-white" />}
           </button>
           
           {/* Header */}
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pt-2 md:pt-0">
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                 <TeamLogo name={currentMatch.teamA} color={currentMatch.teamAColor} logo={currentMatch.teamALogo} size="sm" />
                 <span className="font-bold opacity-90 text-lg md:text-xl tracking-wide truncate">{currentMatch.teamA}</span>
              </div>
              <div className="order-first md:order-none scale-100">
                  {currentMatch.status === 'Live' ? <LiveBadge /> : <div className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">COMPLETED</div>}
              </div>
              <div className="flex items-center justify-center md:justify-end w-full md:w-auto gap-4">
                  <div className="flex items-center gap-3 flex-row-reverse md:flex-row">
                     <span className="font-bold opacity-90 text-lg md:text-xl tracking-wide truncate">{currentMatch.teamB}</span>
                     <TeamLogo name={currentMatch.teamB} color={currentMatch.teamBColor} logo={currentMatch.teamBLogo} size="sm" />
                  </div>
                  {/* Share Button (Desktop) */}
                  <button onClick={shareMatch} className="hidden md:flex items-center justify-center p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors ml-2">
                    {copied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5 text-white" />}
                  </button>
              </div>
           </div>
           
           {/* Score & Stats */}
           <div className="text-center mb-6">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-2">{currentMatch.score}/{currentMatch.wickets}</h1>
              
              {/* Partnership & Projected Score */}
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
                 <div className="mt-6 text-yellow-400 font-bold text-lg md:text-xl animate-pulse bg-white/10 px-4 py-2 rounded-lg inline-block">{currentMatch.result}</div>
              ) : (
                 currentMatch.currentInnings === 2 && (
                    <div className="mt-6 flex flex-col items-center">
                        <div className="text-white-500 font-bold text-sm uppercase tracking-widest mb-1">Target: {currentMatch.target}</div>
                        <div className="text-green-400 font-bold animate-pulse text-lg md:text-xl">
                            Need {currentMatch.target - currentMatch.score} off {(currentMatch.totalOvers * 6) - currentMatch.legalBalls} balls
                        </div>
                    </div>
                 )
              )}
           </div>

           {/* Mini-Scorecard */}
           {(currentMatch.status === 'Live' || currentMatch.status === 'Concluding') && (
               <div className="border-t border-gray-800 pt-4 mt-4 space-y-4">
                   {/* Batting */}
                   <div>
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
                                <div className="col-span-5 text-gray-300 truncate">{currentMatch.nonStriker}</div>
                                <div className="col-span-2 text-right font-bold">{nonStrikerStats.runs}</div><div className="col-span-2 text-right">{nonStrikerStats.balls}</div><div className="col-span-1 text-right text-gray-500">{nonStrikerStats.fours}</div><div className="col-span-1 text-right text-gray-500">{nonStrikerStats.sixes}</div><div className="col-span-1 text-right text-gray-500">{nonStrikerStats.sr}</div>
                           </div>
                       )}
                   </div>
                   {/* Bowling */}
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
                   {/* Commentary Line */}
                   {currentMatch.timeline && currentMatch.timeline.length > 0 && (
                       <div className="bg-gray-800/60 rounded-full px-4 py-3 text-xs text-gray-300 flex items-center justify-center italic border border-gray-700 mt-4 text-center">
                           <Mic className="w-3 h-3 mr-2 text-green-500 shrink-0" /><span>{getLastActionText(currentMatch)}</span>
                       </div>
                   )}
               </div>
           )}
        </div>
        
        {/* Tabs (Added Analysis tab) */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
           <button onClick={() => setActiveTab('scorecard')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'scorecard' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Scorecard</button>
           <button onClick={() => setActiveTab('info')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'info' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Info</button>
           <button onClick={() => setActiveTab('analysis')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'analysis' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Analysis</button>
           <button onClick={() => setActiveTab('timeline')} className={`flex-1 p-3 text-sm font-bold whitespace-nowrap ${activeTab === 'timeline' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Timeline</button>
        </div>

        {/* 1. SCORECARD TAB (Updated with FOW) */}
        {activeTab === 'scorecard' && (
           <div className="p-4 bg-gray-50 overflow-x-auto">
              {currentMatch.innings1 && (
                 <InningsScorecard teamName={currentMatch.innings1.teamName} score={currentMatch.innings1.score} wickets={currentMatch.innings1.wickets} overs={currentMatch.innings1.overs} extras={currentMatch.innings1.extras} battingStats={currentMatch.innings1.battingStats || {}} bowlingStats={currentMatch.innings1.bowlingStats || {}} />
              )}
              <InningsScorecard teamName={currentMatch.battingTeam} score={currentMatch.score} wickets={currentMatch.wickets} overs={formatOvers(currentMatch.legalBalls)} extras={currentMatch.extras} battingStats={currentMatch.battingStats || {}} bowlingStats={currentMatch.bowlingStats || {}} matchResult={currentMatch.result} mom={currentMatch.mom} />
              
              {/* Fall of Wickets Section */}
              {fowList.length > 0 && (
                  <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase">Fall of Wickets ({currentMatch.battingTeam})</h3>
                      <div className="flex flex-wrap gap-2">
                          {fowList.map((w, i) => (
                              <div key={i} className="text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                  <span className="font-bold text-red-600">{w.wickets}-{w.score}</span> <span className="text-gray-500">({w.name || 'Unknown'}, {w.over})</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
           </div>
        )}

        {/* 2. INFO TAB (Updated with 2x2 Grid and Scorer) */}
        {activeTab === 'info' && (
           <div className="p-4 bg-gray-50 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                 <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 text-sm uppercase tracking-wide">Match Info</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"> 
                    {/* Row 1, Col 1 */}
                    <div><p className="text-gray-400 text-xs uppercase font-bold">Date & Time</p><p className="font-semibold text-gray-800 mt-1">{getFormattedTime()}</p></div>
                    
                    {/* Row 1, Col 2 */}
                    <div><p className="text-gray-400 text-xs uppercase font-bold">Venue</p><p className="font-semibold text-gray-800 mt-1">{currentMatch.venue || 'Not Selected'}</p></div>
                    
                    {/* Row 2, Col 1 */}
                    <div><p className="text-gray-400 text-xs uppercase font-bold">Toss</p><p className="font-semibold text-gray-800 mt-1">{currentMatch.innings1 ? `${currentMatch.innings1.teamName} batted first` : `${currentMatch.battingTeam} elected to bat`}</p></div>
                    
                    {/* Row 2, Col 2 (Official Scorer) */}
                    <div>
                      <p className="text-gray-400 text-xs uppercase font-bold">Official Scorer</p>
                      <p className="font-bold text-blue-600 mt-1 flex items-center gap-1">
                        <User className="w-3 h-3" /> {currentMatch.scorerName || 'Admin'}
                      </p>
                    </div>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team A Roster - Using renderPlayerCard */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center gap-2">
                    <TeamLogo name={currentMatch.teamA} color={currentMatch.teamAColor} logo={currentMatch.teamALogo} size="sm" />
                    <h4 className="font-bold text-sm text-blue-900">{currentMatch.teamA} XI</h4>
                  </div>
                  <div className="p-1">
                    {currentMatch.teamAPlayers?.length > 0 ? 
                      currentMatch.teamAPlayers.map((p, i) => renderPlayerCard(p, i)) : 
                      <p className="text-center text-gray-400 text-xs py-4">No players listed</p>
                    }
                </div>
                </div>

                {/* Team B Roster - Using renderPlayerCard */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-orange-50 p-3 border-b border-orange-100 flex items-center gap-2">
                    <TeamLogo name={currentMatch.teamB} color={currentMatch.teamBColor} logo={currentMatch.teamBLogo} size="sm" />
                    <h4 className="font-bold text-sm text-orange-900">{currentMatch.teamB} XI</h4>
                  </div>
                  <div className="p-1">
                    {currentMatch.teamBPlayers?.length > 0 ? 
                      currentMatch.teamBPlayers.map((p, i) => renderPlayerCard(p, i)) : 
                      <p className="text-center text-gray-400 text-xs py-4">No players listed</p>
                    }
                </div>
                </div>
              </div>
           </div>
        )}

        {/* 3. ANALYSIS TAB (Worm Graph) - FIXED */}
        {activeTab === 'analysis' && (
            <div className="p-6 bg-gray-50">
                <h3 className="font-bold text-gray-700 mb-6 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-green-600" /> Run Rate Worm (Cumulative Score)</h3>
                {currentMatch.legalBalls === 0 ? (
                    <div className="text-center text-gray-400 p-8 italic bg-white rounded-lg border">No data available until the first over is complete.</div>
                ) : (
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="w-full h-64 flex items-end justify-between gap-0 border-b border-l border-gray-300 p-1 relative">
                            {/* Y-Axis Max Score Label */}
                            <span className="absolute left-1 -top-1 font-mono text-gray-500 text-xs">Score</span>
                            
                            {/* Iterate from Over 1 up to Total Overs */}
                            {Array.from({ length: currentMatch.totalOvers }, (_, overIndex) => {
                                const overNumber = overIndex + 1;
                                
                                // Get runs at the end of the specified over
                                const dataPoint = wormData.find(d => d.over === overNumber); 
                                // For the current live over (e.g., 1.2 ov), get the total score. For past overs, use the recorded score.
                                const isCurrentOver = overNumber === Math.floor(currentMatch.legalBalls / 6) + 1;

                                const runsAtOverEnd = dataPoint ? dataPoint.runs : 
                                    (isCurrentOver ? currentMatch.score : 0);
                                
                                const maxScore = Math.max(currentMatch.target || 0, currentMatch.score) + 20;
                                const heightPct = runsAtOverEnd > 0 ? (runsAtOverEnd / maxScore) * 100 : 0;
                                
                                // Determine color based on whether the over is complete or is the current live score
                                const isComplete = dataPoint && dataPoint.over === overNumber;

                                return (
                                    // Bar Segment container. Width is based on total overs.
                                    <div key={overNumber} style={{width: `${100 / currentMatch.totalOvers}%`}} className="h-full flex-1 flex flex-col items-center group relative border-r border-gray-100">
                                        <div style={{height: `${heightPct}%`}} className={`w-3/5 ${isComplete ? 'bg-green-700/70' : runsAtOverEnd > 0 ? 'bg-green-500/50' : 'bg-transparent'} rounded-t hover:bg-green-600 transition-all absolute bottom-0`}>
                                            {/* Tooltip */}
                                            {runsAtOverEnd > 0 && (
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                                                    Over {overNumber}: {runsAtOverEnd} runs
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* X-Axis Labels */}
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span className='w-1/4'>0</span>
                            <span className="font-bold w-1/2 text-center">Overs</span>
                            <span className='w-1/4 text-right'>{currentMatch.totalOvers}</span>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* 4. TIMELINE TAB (Unchanged) */}
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