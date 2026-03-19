import React from 'react';
import { 
  Calendar, Clock, Trophy, ChevronRight, Activity, 
  BookOpen, Info, Heart, Image as ImageIcon, Moon 
} from 'lucide-react';
import LiveBadge from '../../components/LiveBadge';
import TeamLogo from '../../components/TeamLogo';
import { formatOvers } from '../../utils/helpers';

export default function HomeView({ matches, tournaments, setCurrentMatch, setSelectedTournament, setView }) {
  
  const liveMatches = matches.filter(m => m.status === 'Live');
  const scheduledMatches = matches.filter(m => m.status === 'Scheduled');
  const completedMatches = matches
    .filter(m => m.status === 'Completed' || m.status === 'Concluding')
    .sort((a, b) => {
        const dateA = a.timestamp?.seconds ? new Date(a.timestamp.seconds * 1000) : new Date(a.timestamp);
        const dateB = b.timestamp?.seconds ? new Date(b.timestamp.seconds * 1000) : new Date(b.timestamp);
        return dateB - dateA;
    });

  const getDateString = (timestamp) => {
      if (!timestamp) return '';
      const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-6">
      
      {/* EID MUBARAK BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 rounded-2xl shadow-lg p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-20px] right-[-20px] opacity-10">
            <Moon className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <Moon className="w-8 h-8 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-400 drop-shadow-sm">
                    Eid Mubarak!
                </h2>
                <p className="text-emerald-50 text-sm md:text-base font-medium mt-1">
                    Wishing you joy, peace, and great cricket from the ZBSM Community.
                </p>
            </div>
        </div>
      </div>

      {/* LIVE MATCHES */}
      {liveMatches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {liveMatches.map(match => (
            <div 
              key={match.id} 
              onClick={() => { setCurrentMatch(match); setView('match'); }} 
              className="group bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 rounded-2xl shadow-xl hover:shadow-emerald-900/20 border border-slate-800/50 overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-all duration-300 relative"
            >
              <div className="absolute top-4 right-4 z-10"><LiveBadge /></div>
              
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="p-6 text-white relative z-10">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex-1 flex justify-center"><TeamLogo name={match.teamA} color={match.teamAColor} logo={match.teamALogo} /></div>
                   <div className="flex-none px-4 text-center">
                     <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300">
                       {match.score}/{match.wickets}
                     </span>
                   </div>
                   <div className="flex-1 flex justify-center"><TeamLogo name={match.teamB} color={match.teamBColor} logo={match.teamBLogo} /></div>
                </div>
                
                <div className="text-center">
                   <div className="inline-flex items-center gap-2 bg-slate-800/50 px-4 py-1.5 rounded-full text-sm font-medium text-emerald-300 border border-slate-700/50">
                     <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                     {match.battingTeam} Batting ({formatOvers(match.legalBalls)} Ov)
                   </div>
                </div>

                {match.currentInnings === 2 && (
                  <div className="text-center text-xs font-semibold bg-emerald-500/20 text-emerald-200 mt-4 py-2 px-4 rounded-xl border border-emerald-500/30">
                    Need {match.target - match.score} off {(match.totalOvers * 6) - match.legalBalls} balls
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SCHEDULED */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center tracking-tight">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" /> Upcoming Fixtures
        </h3>
        <div className="space-y-3">
           {scheduledMatches.length === 0 && (
             <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-500 text-sm">
               No matches scheduled at the moment.
             </div>
           )}
           {scheduledMatches.map(m => {
              const tourney = tournaments.find(t => t.id === m.tournamentId);
              return (
                <div 
                  key={m.id} 
                  className="group bg-white p-5 rounded-xl shadow-sm hover:shadow-md border border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 transition-all duration-200 relative overflow-hidden"
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div>
                        <div className="font-bold text-base text-slate-800 group-hover:text-blue-600 transition-colors">
                          {m.teamA} <span className="text-slate-400 font-medium px-1">vs</span> {m.teamB}
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5 flex items-center font-medium">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {new Date(m.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})} 
                        <span className="mx-2 text-slate-300">•</span> 
                        <span className="text-slate-600">{m.stage}</span>
                        </div>
                    </div>
                    {tourney && (
                        <span className="inline-flex self-start sm:self-auto text-[11px] bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-100 transition-colors">
                            {tourney.name}
                        </span>
                    )}
                </div>
              );
           })}
        </div>
      </div>

      {/* TOURNAMENTS */}
      <div>
       <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center tracking-tight">
         <Trophy className="w-5 h-5 mr-2 text-amber-500" /> Tournaments
       </h3>
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tournaments.map(t => (
            <div 
              key={t.id} 
              onClick={() => { setSelectedTournament(t); setView('tournament-details'); }} 
              className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-xl cursor-pointer border border-slate-100 hover:border-amber-200 flex flex-col items-center text-center transform hover:-translate-y-1 transition-all duration-300 group"
            >
               <div className="w-14 h-14 mb-3 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-300">
                   {t.logo ? <img src={t.logo} alt={t.name} className="w-full h-full object-cover" /> : <Trophy className="w-6 h-6 text-amber-600" />}
               </div>
               <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{t.name}</h4>
               <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full mt-auto">
                 {t.teamIds.length} Teams
               </span>
            </div>
          ))}
       </div>
      </div>

      {/* RECENT RESULTS */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">Recent Results</h3>
        <div className="space-y-3">
            {completedMatches.length === 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-500 text-sm">
                No matches completed yet.
              </div>
            )}
            {completedMatches.slice(0, 10).map(m => {
                const tourney = tournaments.find(t => t.id === m.tournamentId);
                return (
                    <div 
                        key={m.id} 
                        onClick={() => { setCurrentMatch(m); setView('match'); }} 
                        className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
                    >
                        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                            <div className="flex items-center gap-2">
                                {tourney ? (
                                    <>
                                        {tourney.logo ? <img src={tourney.logo} alt="T" className="w-5 h-5 rounded-full object-cover shadow-sm" /> : <Trophy className="w-3.5 h-3.5 text-blue-500" />}
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{tourney.name}</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Friendly Match</span>
                                )}
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{getDateString(m.timestamp)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-bold text-slate-800 text-base flex items-center gap-3">
                                    <span className={m.score > m.target ? "text-slate-900" : "text-slate-500"}>{m.teamA}</span>
                                    <span className="text-xs font-semibold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">VS</span>
                                    <span className={m.score <= m.target ? "text-slate-900" : "text-slate-500"}>{m.teamB}</span>
                                </div>
                                <div className="text-sm font-semibold text-emerald-600 mt-1.5 flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                  {m.result || 'Match Ended'}
                                </div>
                            </div>
                            <div className="bg-white border border-slate-100 shadow-sm p-2 rounded-full group-hover:bg-blue-50 group-hover:border-blue-200 transition-all duration-200">
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-16 pt-10 border-t border-slate-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 text-slate-800 font-extrabold text-2xl tracking-tight">
             <Activity className="w-7 h-7 text-emerald-500" /> ZBSMCric<span className="text-slate-400 font-light">.Live</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8">
              <button onClick={() => setView('rules')} className="text-sm text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1.5 transition-colors">
                  <BookOpen className="w-4 h-4" /> Rules
              </button>
              <button onClick={() => setView('gallery')} className="text-sm text-slate-500 hover:text-purple-600 font-semibold flex items-center gap-1.5 transition-colors">
                  <ImageIcon className="w-4 h-4" /> Gallery
              </button>
              <button onClick={() => setView('about')} className="text-sm text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1.5 transition-colors">
                  <Info className="w-4 h-4" /> About Us
              </button>
          </div>

          <p className="text-sm text-slate-400 font-medium">
              © 2026 ZBSM Cricket. Made with <Heart className="w-4 h-4 inline text-rose-500 mx-0.5 animate-pulse" /> for the game.
          </p>
      </div>

    </div>
  );
}
