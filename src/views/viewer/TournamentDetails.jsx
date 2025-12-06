import React, { useState } from 'react';
import { Trophy, Calendar, TrendingUp, Activity, User, ChevronDown, ChevronUp, Crown, Share2, Check, Shield, ChevronRight } from 'lucide-react';
import TeamLogo from '../../components/TeamLogo';

// UPDATED: Added setSelectedPlayer to props
export default function TournamentDetails({ tournament, matches, teams, setView, setCurrentMatch, setSelectedPlayer }) {
  const [activeTab, setActiveTab] = useState('matches');
  const [expandedTeamId, setExpandedTeamId] = useState(null); 
  
  // State for "Show All" toggles in Performers tab
  const [showAllMVP, setShowAllMVP] = useState(false);
  const [showAllBat, setShowAllBat] = useState(false);
  const [showAllBowl, setShowAllBowl] = useState(false);
  const [copied, setCopied] = useState(false); 
  
  // NEW: State for selected team in Teams tab
  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState(null);

  if (!tournament) return null;

  // --- HELPERS ---
  const oversToBalls = (oversStr) => {
      const [overs, balls] = String(oversStr).split('.').map(Number);
      return (overs * 6) + (balls || 0);
  };

  const ballsToOvers = (totalBalls) => {
      return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
  };

  const getPlayerName = (p) => (typeof p === 'string' ? p : p.name);

  const getNRRData = (match, teamId) => {
      let battingInnings = null;
      let bowlingInnings = null;

      if (match.innings1 && match.innings1.teamName === teams.find(t => t.id === teamId)?.name) {
          battingInnings = match.innings1;
          bowlingInnings = { score: match.score, overs: ballsToOvers(match.legalBalls), wickets: match.wickets }; 
      } else if (match.battingTeamId === teamId) {
          battingInnings = { score: match.score, overs: ballsToOvers(match.legalBalls), wickets: match.wickets };
          bowlingInnings = match.innings1;
      }

      if (!battingInnings || !bowlingInnings) return { for: { r: 0, o: 0 }, against: { r: 0, o: 0 } };

      const totalOvers = parseInt(match.totalOvers || tournament.overs);
      
      let runsFor = battingInnings.score;
      let ballsFor = oversToBalls(battingInnings.overs);
      if (battingInnings.wickets >= 10) ballsFor = totalOvers * 6;

      let runsAgainst = bowlingInnings.score;
      let ballsAgainst = oversToBalls(bowlingInnings.overs);
      if (bowlingInnings.wickets >= 10) ballsAgainst = totalOvers * 6;

      return { for: { r: runsFor, b: ballsFor }, against: { r: runsAgainst, b: ballsAgainst } };
  };

  // --- SHARE LOGIC (Professional URL) ---
  const shareTournament = () => {
      // 1. Create a readable slug (e.g. "IPL-2025")
      const slug = tournament.name
        .replace(/[^a-zA-Z0-9 ]/g, "") // Remove special chars
        .replace(/\s+/g, "-"); // Replace spaces with dashes
      
      // 2. Construct URL: Put the Readable Name FIRST so it looks trustworthy
      // Format: domain.com/?tournament=IPL-2025&tournamentId=12345
      const url = `${window.location.origin}${window.location.pathname}?tournament=${slug}&tournamentId=${tournament.id}`;
      
      navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  };

  // --- CLICK HANDLER FOR PLAYERS ---
  const handlePlayerClick = (player) => {
      if (setSelectedPlayer) {
          setSelectedPlayer(player);
          setView('player-career');
      }
  };

  // --- DATA PROCESSING ---
  const tournamentMatches = matches
    .filter(m => m.tournamentId === tournament.id)
    .sort((a, b) => new Date(a.scheduledTime || a.timestamp) - new Date(b.scheduledTime || b.timestamp));

  const finalMatch = tournamentMatches.find(m => m.stage === 'Final' && (m.status === 'Completed' || m.status === 'Concluding'));
  let champion = null;
  if (finalMatch) {
      const winnerName = finalMatch.result.split(' won')[0];
      champion = teams.find(t => t.name === winnerName);
  }

  // 1. POINTS TABLE
  const getPointsTable = () => {
     const tTeams = teams.filter(t => tournament.teamIds.includes(t.id));
     let stats = tTeams.map(t => {
         let played = 0, won = 0, lost = 0, points = 0;
         let nrrRunsFor = 0, nrrBallsFor = 0;
         let nrrRunsAg = 0, nrrBallsAg = 0;
         let history = []; 

         tournamentMatches.forEach((m, index) => {
             if (m.status !== 'Completed' && m.status !== 'Concluding') return;
             if (m.teamAId !== t.id && m.teamBId !== t.id) return;
             
             played++;
             const winnerName = m.result.split(' won')[0];
             const isTie = m.result.includes('Tied');
             let resultChar = 'N'; 
             
             if (!isTie) {
                 if (t.name === winnerName) { won++; points += 2; resultChar = 'W'; } else { lost++; resultChar = 'L'; }
             } else { points += 1; resultChar = 'T'; }

             const nrrData = getNRRData(m, t.id);
             nrrRunsFor += nrrData.for.r;
             nrrBallsFor += nrrData.for.b;
             nrrRunsAg += nrrData.against.r;
             nrrBallsAg += nrrData.against.b;

             history.push({
                 matchNo: index + 1,
                 opponent: m.teamAId === t.id ? m.teamB : m.teamA,
                 result: resultChar,
                 resultDesc: m.result,
                 date: m.scheduledTime || m.timestamp
             });
         });

         const runRateFor = nrrBallsFor > 0 ? (nrrRunsFor / (nrrBallsFor / 6)) : 0;
         const runRateAg = nrrBallsAg > 0 ? (nrrRunsAg / (nrrBallsAg / 6)) : 0;
         const nrr = (runRateFor - runRateAg).toFixed(3);
         const recentForm = [...history].reverse().slice(0, 5);

         return { ...t, played, won, lost, points, nrr, recentForm, history: history.reverse() };
     });

     return stats.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  };

  // 2. PERFORMERS (FIXED: Team Association Logic)
  const getPerformers = () => {
      let players = {};
      
      const initPlayer = (name, teamName) => {
          if (!players[name]) {
              players[name] = { name, team: teamName, matches: 0, batInns: 0, runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, hs: 0, fifties: 0, hundreds: 0, bowlInns: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, bbiW: 0, bbiR: 999, fiveW: 0, points: 0 };
          } else if (players[name].team === 'Unknown' && teamName !== 'Unknown') {
              players[name].team = teamName;
          }
      };

      // Pass 1: Process Matches
      tournamentMatches.filter(m => m.status === 'Completed' || m.status === 'Concluding').forEach(m => {
          // Register from Match Rosters
          const teamAList = m.teamAPlayers || [];
          const teamBList = m.teamBPlayers || [];
          teamAList.forEach(p => { initPlayer(getPlayerName(p), m.teamA); players[getPlayerName(p)].matches++; });
          teamBList.forEach(p => { initPlayer(getPlayerName(p), m.teamB); players[getPlayerName(p)].matches++; });

          // Process Scorecard Stats
          const processStats = (stats, type) => {
              if(!stats) return;
              Object.entries(stats).forEach(([name, data]) => {
                  initPlayer(name, 'Unknown'); // Ensure player exists if not in roster
                  if (type === 'bat') {
                      players[name].batInns++;
                      players[name].runs += (data.runs || 0);
                      players[name].balls += (data.balls || 0);
                      players[name].fours += (data.fours || 0);
                      players[name].sixes += (data.sixes || 0);
                      if (data.out) players[name].outs++;
                      if ((data.runs || 0) > players[name].hs) players[name].hs = data.runs || 0;
                      if (data.runs >= 50 && data.runs < 100) players[name].fifties++;
                      if (data.runs >= 100) players[name].hundreds++;
                      players[name].points += (data.runs || 0) + (data.fours || 0) + ((data.sixes || 0) * 2);
                      if (data.runs >= 50) players[name].points += 10;
                  }
                  if (type === 'bowl') {
                      players[name].bowlInns++;
                      players[name].wickets += (data.wickets || 0);
                      players[name].runsConceded += (data.runs || 0);
                      players[name].ballsBowled += (data.balls || 0);
                      const w = data.wickets || 0; const r = data.runs || 0;
                      if (w > players[name].bbiW || (w === players[name].bbiW && r < players[name].bbiR)) { players[name].bbiW = w; players[name].bbiR = r; }
                      if (w >= 5) players[name].fiveW++;
                      players[name].points += (w * 25);
                      if (w >= 3) players[name].points += 10;
                  }
              });
          };

          processStats(m.battingStats, 'bat');
          processStats(m.bowlingStats, 'bowl');
          processStats(m.innings1?.battingStats, 'bat');
          processStats(m.innings1?.bowlingStats, 'bowl');
      });

      // Pass 2: Global Team Lookup (The Fix for "Unknown")
      Object.values(players).forEach(p => {
          if (p.team === 'Unknown') {
              // Search in all teams registered in the system
              const foundTeam = teams.find(t => 
                  t.players.some(tp => getPlayerName(tp) === p.name)
              );
              if (foundTeam) {
                  p.team = foundTeam.name;
              }
          }
      });

      const playerList = Object.values(players).map(p => {
          const batAvg = p.outs > 0 ? (p.runs / p.outs).toFixed(2) : p.runs;
          const sr = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(2) : 0;
          const bowlAvg = p.wickets > 0 ? (p.runsConceded / p.wickets).toFixed(2) : '-';
          const eco = p.ballsBowled > 0 ? ((p.runsConceded / p.ballsBowled) * 6).toFixed(2) : 0;
          
          const teamInfo = teams.find(t => t.name === p.team);
          const teamLogo = teamInfo ? teamInfo.logo : '';
          let photo = '';
          if(teamInfo) {
              const pObj = teamInfo.players.find(tp => getPlayerName(tp) === p.name);
              if(pObj && typeof pObj === 'object') photo = pObj.photo;
          }

          return { ...p, batAvg, bowlAvg, sr, eco, teamLogo, photo };
      });

      const activePlayers = playerList.filter(p => p.runs > 0 || p.wickets > 0 || p.points > 0);

      return {
          mvp: [...activePlayers].sort((a, b) => b.points - a.points),
          batsmen: [...activePlayers].filter(p => p.runs > 0).sort((a, b) => b.runs - a.runs),
          bowlers: [...activePlayers].filter(p => p.wickets > 0).sort((a, b) => b.wickets - a.wickets)
      };
  };

  const pointsTable = getPointsTable();
  const performers = getPerformers();

  const toggleRow = (teamId) => {
      if (expandedTeamId === teamId) setExpandedTeamId(null);
      else setExpandedTeamId(teamId);
  };

  const getVisibleList = (list, showAll) => {
      return showAll ? list : list.slice(0, 10);
  };

  const renderMatchList = (stageName) => {
      const stageMatches = tournamentMatches.filter(m => m.stage === stageName);
      if (stageMatches.length === 0) return null;
      return (
          <div className="mb-6">
              <h3 className="font-bold text-gray-500 uppercase text-xs mb-3 ml-1">{stageName}</h3>
              <div className="space-y-3">
                  {stageMatches.map((m) => {
                      const globalIndex = tournamentMatches.findIndex(tm => tm.id === m.id) + 1;
                      return (
                          <div 
                             key={m.id} 
                             onClick={() => { 
                                if (setCurrentMatch && typeof setCurrentMatch === 'function') {
                                    console.log("Opening Match:", m.id);
                                    setCurrentMatch(m); 
                                    setView('match'); 
                                } else {
                                    alert("System Error: App missing 'setCurrentMatch'.");
                                }
                             }}
                             className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                          >
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">Match {globalIndex}</span>
                                  <span className="text-xs text-gray-400">{m.scheduledTime ? new Date(m.scheduledTime).toLocaleDateString() : 'Date TBA'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <div className="flex flex-col items-start">
                                      <div className="flex items-center gap-2 font-semibold text-gray-800"><TeamLogo name={m.teamA} color={m.teamAColor} logo={m.teamALogo} size="sm" /> {m.teamA}</div>
                                      <div className="text-xs text-gray-500 pl-10 mt-1">vs</div>
                                      <div className="flex items-center gap-2 font-semibold text-gray-800"><TeamLogo name={m.teamB} color={m.teamBColor} logo={m.teamBLogo} size="sm" /> {m.teamB}</div>
                                  </div>
                                  <div className="text-right">
                                      {m.status === 'Completed' || m.status === 'Concluding' ? (
                                          <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">{m.result}</div>
                                      ) : (
                                          <div className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded border border-orange-100">{m.status === 'Live' ? 'LIVE' : 'Upcoming'}</div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };
  
  // --- NEW: Render Roster Player ---
  const renderRosterPlayer = (p, i) => {
      const player = typeof p === 'string' ? { name: p, role: 'Player', photo: '', isCaptain: false, isWk: false } : p;
      return (
        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                {player.photo ? <img src={player.photo} alt={player.name} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="flex-1">
                <div className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                    {player.name}
                    {player.isCaptain && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                    {player.isWk && <Shield className="w-3 h-3 text-blue-500 fill-blue-500" />}
                </div>
                <div className="text-xs text-gray-500">{player.role || 'Player'}</div>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 pb-20">
       {/* Header */}
       <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center min-w-0">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4 overflow-hidden shrink-0">
                  {tournament.logo ? <img src={tournament.logo} alt={tournament.name} className="w-full h-full object-cover" /> : <Trophy className="w-6 h-6 text-yellow-600" />}
              </div>
              <div className="truncate">
                  <h2 className="text-xl font-bold text-gray-800 truncate">{tournament.name}</h2>
                  <p className="text-xs text-gray-500 truncate">{tournament.teamIds.length} Teams • {tournamentMatches.length} Matches</p>
              </div>
          </div>
          <div className="flex items-center gap-3 ml-2 shrink-0">
              {/* SHARE BUTTON */}
              <button 
                onClick={shareTournament}
                className="p-2 bg-gray-100 rounded-full hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                title="Share Tournament"
              >
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Share2 className="w-5 h-5" />}
              </button>
              <button onClick={() => setView('home')} className="text-sm font-bold text-gray-500 hover:text-black px-2 py-1">Back</button>
          </div>
       </div>

       {/* --- CHAMPION CARD --- */}
       {champion && (
        <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm">
                    <Trophy className="w-10 h-10 text-yellow-100" />
                </div>
                <div className="text-yellow-100 font-bold uppercase tracking-widest text-xs mb-1">Tournament Champions</div>
                <h1 className="text-4xl font-black mb-2 drop-shadow-md">{champion.name}</h1>
                <div className="bg-black/20 px-4 py-1.5 rounded-full text-sm backdrop-blur-sm font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-300" />
                    Won the {tournament.name}
                </div>
            </div>
        </div>
       )}

       {/* Tabs */}
       <div className="flex bg-gray-200 p-1 rounded-lg overflow-x-auto">
          {['matches', 'table', 'teams', 'performers'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-sm font-bold rounded-md capitalize transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{tab}</button>
          ))}
       </div>

       {/* MATCHES TAB */}
       {activeTab === 'matches' && (
           <div>
               {tournamentMatches.length === 0 && <p className="text-center text-gray-400 py-10">No matches scheduled yet.</p>}
               {renderMatchList('Group Stage')}
               {renderMatchList('Semi Final')}
               {renderMatchList('Final')}
           </div>
       )}

       {/* POINTS TABLE TAB */}
       {activeTab === 'table' && (
           <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                     <thead className="text-gray-500 text-xs uppercase bg-gray-50 border-b">
                        <tr>
                           <th className="p-4">Team</th>
                           <th className="p-4 text-center">M</th>
                           <th className="p-4 text-center">W</th>
                           <th className="p-4 text-center">L</th>
                           <th className="p-4 text-center">Form</th>
                           <th className="p-4 text-center font-black text-black">NRR</th>
                           <th className="p-4 text-center font-bold text-black">Pts</th>
                           <th className="p-4 w-8"></th> 
                        </tr>
                     </thead>
                     <tbody>
                        {pointsTable.map((row, i) => (
                           <React.Fragment key={row.id}>
                               <tr 
                                    onClick={() => toggleRow(row.id)} 
                                    className={`cursor-pointer border-b last:border-0 transition-colors ${expandedTeamId === row.id ? 'bg-blue-50' : 'hover:bg-gray-50'} ${i < 4 && expandedTeamId !== row.id ? 'bg-green-50/30' : ''}`}
                               >
                                  <td className="p-4 font-semibold flex items-center whitespace-nowrap">
                                     <span className="w-6 text-gray-400 text-xs">{i+1}</span> 
                                     <div className="flex items-center gap-3">
                                        <div className="shrink-0"><TeamLogo name={row.name} color={row.color} logo={row.logo} size="sm" /></div>
                                        <span className="truncate max-w-[150px]">{row.name}</span>
                                     </div>
                                  </td>
                                  <td className="p-4 text-center">{row.played}</td>
                                  <td className="p-4 text-center font-bold text-green-600">{row.won}</td>
                                  <td className="p-4 text-center text-red-500">{row.lost}</td>
                                  
                                  {/* --- FORM PILLS --- */}
                                  <td className="p-4 text-center">
                                      <div className="flex gap-1 justify-center">
                                          {row.recentForm.map((m, idx) => (
                                              <div 
                                                key={idx} 
                                                title={`vs ${m.opponent}: ${m.resultDesc}`}
                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${m.result === 'W' ? 'bg-green-500' : m.result === 'L' ? 'bg-red-500' : 'bg-gray-400'}`}
                                              >
                                                  {m.result}
                                              </div>
                                          ))}
                                          {row.recentForm.length === 0 && <span className="text-gray-300 text-xs">-</span>}
                                      </div>
                                  </td>
    
                                  <td className="p-4 text-center font-mono text-xs">{row.nrr > 0 ? `+${row.nrr}` : row.nrr}</td>
                                  <td className="p-4 text-center font-bold text-base">{row.points}</td>
                                  <td className="p-4 text-center text-gray-400">
                                      {expandedTeamId === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </td>
                               </tr>
                               
                               {/* --- DROPDOWN ROW CONTENT --- */}
                               {expandedTeamId === row.id && (
                                   <tr className="bg-gray-50">
                                       <td colSpan="8" className="p-0">
                                           <div className="p-4 border-b shadow-inner">
                                               <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                                                   <Activity className="w-3 h-3 mr-2" /> Match History - {row.name}
                                               </h4>
                                               
                                               {row.history.length === 0 ? (
                                                   <p className="text-center text-gray-400 py-2 text-sm">No matches played yet.</p>
                                               ) : (
                                                   <div className="space-y-2">
                                                       {/* History Header */}
                                                       <div className="grid grid-cols-3 text-[10px] font-bold text-gray-400 uppercase px-2">
                                                           <div>Opponent</div>
                                                           <div>Result</div>
                                                           <div className="text-right">Date</div>
                                                       </div>
                                                       {/* History List */}
                                                       {row.history.map((m, idx) => (
                                                           <div key={idx} className="grid grid-cols-3 text-sm p-2 bg-white rounded border border-gray-200 items-center">
                                                               <div className="font-semibold text-gray-700 truncate pr-2">vs {m.opponent}</div>
                                                               <div className={`font-bold text-xs ${m.result === 'W' ? 'text-green-600' : m.result === 'L' ? 'text-red-600' : 'text-gray-600'}`}>
                                                                   {m.resultDesc}
                                                               </div>
                                                               <div className="text-right text-gray-500 text-[10px]">
                                                                   {new Date(m.date).toLocaleDateString()}
                                                               </div>
                                                           </div>
                                                       ))}
                                                   </div>
                                               )}
                                           </div>
                                       </td>
                                   </tr>
                               )}
                           </React.Fragment>
                        ))}
                     </tbody>
                  </table>
              </div>
           </div>
       )}
       
       {/* --- NEW: TEAMS TAB --- */}
       {activeTab === 'teams' && (
           <div>
              {selectedTeamForRoster ? (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <button onClick={() => setSelectedTeamForRoster(null)} className="mb-4 text-sm text-gray-500 flex items-center hover:text-black font-bold"><ChevronDown className="w-4 h-4 rotate-90 mr-1" /> Back to Teams</button>
                      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center gap-4 border-l-4" style={{borderColor: selectedTeamForRoster.color}}>
                          <TeamLogo name={selectedTeamForRoster.name} logo={selectedTeamForRoster.logo} color={selectedTeamForRoster.color} size="lg" />
                          <div>
                              <h2 className="text-2xl font-bold text-gray-800">{selectedTeamForRoster.name}</h2>
                              <p className="text-xs text-gray-500">Full Squad Roster</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedTeamForRoster.players.map((p, i) => renderRosterPlayer(p, i))}
                      </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {teams.filter(t => tournament.teamIds.includes(t.id)).map(team => (
                           <div key={team.id} onClick={() => setSelectedTeamForRoster(team)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all group">
                               <div className="flex items-center gap-3">
                                   <TeamLogo name={team.name} logo={team.logo} color={team.color} size="md" />
                                   <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{team.name}</div>
                               </div>
                               <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                           </div>
                       ))}
                  </div>
              )}
           </div>
       )}

       {activeTab === 'performers' && (
           <div className="space-y-8">
               {/* MVP */}
               <div className="bg-white rounded-xl shadow-sm border border-yellow-200 overflow-hidden">
                   <div className="bg-yellow-50 p-4 border-b border-yellow-200 flex items-center"><Trophy className="w-5 h-5 text-yellow-600 mr-2" /><h3 className="font-bold text-yellow-900">Player of the Tournament</h3></div>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="text-yellow-700 text-xs uppercase bg-yellow-50/50"><tr><th className="p-3 pl-4">Player</th><th className="p-3 text-center">Mat</th><th className="p-3 text-center">Runs</th><th className="p-3 text-center">Wkts</th><th className="p-3 text-right pr-4">Pts</th></tr></thead>
                           <tbody className="divide-y divide-yellow-100">
                               {getVisibleList(performers.mvp, showAllMVP).map((p, i) => (
                                   <tr key={i} onClick={() => handlePlayerClick(p)} className="hover:bg-yellow-50/50 cursor-pointer transition-colors"><td className="p-3 pl-4 font-semibold flex items-center whitespace-nowrap"><span className="w-6 text-yellow-500 font-bold">{i+1}</span><div><div>{p.name}</div><div className="text-xs text-gray-400 font-normal flex items-center gap-1">{p.teamLogo && <TeamLogo name={p.team} logo={p.teamLogo} size="sm" className="w-3 h-3" />} {p.team}</div></div></td><td className="p-3 text-center">{p.matches}</td><td className="p-3 text-center">{p.runs}</td><td className="p-3 text-center">{p.wickets}</td><td className="p-3 text-right pr-4 font-black text-yellow-700">{p.points}</td></tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
                   {performers.mvp.length > 10 && <button onClick={() => setShowAllMVP(!showAllMVP)} className="w-full py-2 text-xs font-bold text-yellow-700 bg-yellow-50/50 hover:bg-yellow-100 transition-colors border-t border-yellow-100">{showAllMVP ? "Show Less" : `Show All (${performers.mvp.length})`}</button>}
               </div>

               <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
                   <div className="bg-blue-50 p-4 border-b border-blue-200 flex items-center"><TrendingUp className="w-5 h-5 text-blue-600 mr-2" /><h3 className="font-bold text-blue-900">Top Batsmen (Runs)</h3></div>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="text-blue-700 text-xs uppercase bg-blue-50/50"><tr><th className="p-3 pl-4 min-w-[150px]">Player</th><th className="p-3 text-center">Mat</th><th className="p-3 text-center">Inns</th><th className="p-3 text-center font-bold text-black">Runs</th><th className="p-3 text-center">HS</th><th className="p-3 text-center">Avg</th><th className="p-3 text-center">SR</th><th className="p-3 text-center">100s</th><th className="p-3 text-center">50s</th><th className="p-3 text-center">4s</th><th className="p-3 text-center">6s</th></tr></thead>
                           <tbody className="divide-y divide-blue-100">
                               {getVisibleList(performers.batsmen, showAllBat).map((p, i) => (
                                   <tr key={i} onClick={() => handlePlayerClick(p)} className="hover:bg-blue-50/50 cursor-pointer transition-colors"><td className="p-3 pl-4 font-semibold flex items-center whitespace-nowrap"><span className="w-6 text-blue-400">{i+1}</span><div><div>{p.name}</div><div className="text-xs text-gray-400 font-normal flex items-center gap-1">{p.teamLogo && <TeamLogo name={p.team} logo={p.teamLogo} size="sm" className="w-3 h-3" />} {p.team}</div></div></td><td className="p-3 text-center">{p.matches}</td><td className="p-3 text-center">{p.batInns}</td><td className="p-3 text-center font-bold text-blue-700">{p.runs}</td><td className="p-3 text-center">{p.hs}</td><td className="p-3 text-center">{p.batAvg}</td><td className="p-3 text-center">{p.sr}</td><td className="p-3 text-center">{p.hundreds}</td><td className="p-3 text-center">{p.fifties}</td><td className="p-3 text-center">{p.fours}</td><td className="p-3 text-center">{p.sixes}</td></tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
                   {performers.batsmen.length > 10 && <button onClick={() => setShowAllBat(!showAllBat)} className="w-full py-2 text-xs font-bold text-blue-700 bg-blue-50/50 hover:bg-blue-100 transition-colors border-t border-blue-100">{showAllBat ? "Show Less" : `Show All (${performers.batsmen.length})`}</button>}
               </div>

               <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden">
                   <div className="bg-green-50 p-4 border-b border-green-200 flex items-center"><Activity className="w-5 h-5 text-green-600 mr-2" /><h3 className="font-bold text-green-900">Top Bowlers (Wickets)</h3></div>
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="text-green-700 text-xs uppercase bg-green-50/50"><tr><th className="p-3 pl-4 min-w-[150px]">Player</th><th className="p-3 text-center">Mat</th><th className="p-3 text-center">Inns</th><th className="p-3 text-center font-bold text-black">Wkts</th><th className="p-3 text-center">BBI</th><th className="p-3 text-center">Avg</th><th className="p-3 text-center">Econ</th><th className="p-3 text-center">Runs</th><th className="p-3 text-center">5w</th></tr></thead>
                           <tbody className="divide-y divide-green-100">
                               {getVisibleList(performers.bowlers, showAllBowl).map((p, i) => (
                                   <tr key={i} onClick={() => handlePlayerClick(p)} className="hover:bg-green-50/50 cursor-pointer transition-colors"><td className="p-3 pl-4 font-semibold flex items-center whitespace-nowrap"><span className="w-6 text-green-400">{i+1}</span><div><div>{p.name}</div><div className="text-xs text-gray-400 font-normal flex items-center gap-1">{p.teamLogo && <TeamLogo name={p.team} logo={p.teamLogo} size="sm" className="w-3 h-3" />} {p.team}</div></div></td><td className="p-3 text-center">{p.matches}</td><td className="p-3 text-center">{p.bowlInns}</td><td className="p-3 text-center font-bold text-green-700">{p.wickets}</td><td className="p-3 text-center">{p.bbiW}/{p.bbiR}</td><td className="p-3 text-center">{p.bowlAvg}</td><td className="p-3 text-center">{p.eco}</td><td className="p-3 text-center">{p.runsConceded}</td><td className="p-3 text-center">{p.fiveW}</td></tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
                   {performers.bowlers.length > 10 && <button onClick={() => setShowAllBowl(!showAllBowl)} className="w-full py-2 text-xs font-bold text-green-700 bg-green-50/50 hover:bg-green-100 transition-colors border-t border-green-100">{showAllBowl ? "Show Less" : `Show All (${performers.bowlers.length})`}</button>}
               </div>
           </div>
       )}
    </div>
  );
}