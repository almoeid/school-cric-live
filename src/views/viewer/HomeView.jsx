import React from 'react';
import { 
  Calendar, Clock, Trophy, ChevronRight, Activity, 
  BookOpen, Info, Heart, Image as ImageIcon, Moon 
} from 'lucide-react';
import LiveBadge from '../../components/LiveBadge';
import TeamLogo from '../../components/TeamLogo';
import NewsTicker from '../../components/NewsTicker';
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
    <div className="space-y-8 max-w-5xl mx-auto pb-6 pt-2">
      
      {/* 1. BREAKING NEWS (Moved to the absolute top like a pro alert bar) */}
      <div className="w-full drop-shadow-sm">
        <NewsTicker 
          news="Batch 2014 kicked off their ZBSM School League 2026 campaign in style, claiming a dominant 52-run victory in their opening match with an all-round performance! BREAKING: Batch 21 secured a strong 32-run win over Batch 2018 in the ZBSM School League, posting the tournament’s highest score of 163/3, with Munna Kumar smashing a brilliant 76 off just 26 balls to earn Man of the Match!" 
        />
      </div>

{/* 2. EID BANNER (Image Version) */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg border border-slate-200/50 group">
        
        {/* Banner Image - Locked to a cinematic widescreen ratio on PC */}
        <img 
          src="/eidbanner.png" 
          alt="Eid Mubarak" 
          className="w-full h-48 md:h-56 lg:h-[350px] xl:h-[400px] object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        
        {/* Smooth Dark Gradient Overlay at the bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-indigo-950/20 to-transparent pointer-events-none"></div>
        
        {/* ZBSM Community Message */}
        <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 flex flex-col items-center md:items-start text-center md:text-left z-10">
            <p className="text-sm md:text-base font-semibold text-white tracking-wide drop-shadow-md">
                Wishing you joy, peace, and great cricket from the ZBSM Community.
            </p>
        </div>
        
      </div>

      {/* 3. LIVE MATCHES (Added a pulsing section header) */}
      {liveMatches.length > 0 && (
        <div>
          {/* New Live Header */}
          <div className="flex items-center gap-2.5 mb-4 px-1">
             <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
             <h3 className="text-lg font-extrabold text-slate-800 tracking-tight uppercase">Live Action</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map(match => (
              <div 
                key={match.id} 
                onClick={() => { setCurrentMatch(match); setView('match'); }} 
                className="group bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-2xl shadow-xl hover:shadow-emerald-900/20 border border-slate-800/50 overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-all duration-300 relative"
              >
                <div className="absolute top-4 right-4 z-10"><LiveBadge /></div>
                
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                <div className="p-6 text-white relative z-10">
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex-1 flex justify-center"><TeamLogo name={match.teamA} color={match.teamAColor} logo={match.teamALogo} /></div>
                     <div className="flex-none px-4 text-center">
                       <span className="font-extrabold text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300">
                         {match.score}/{match.wickets}
                       </span>
                     </div>
                     <div className="flex-1 flex justify-center"><TeamLogo name={match.teamB} color={match.teamBColor} logo={match.teamBLogo} /></div>
                  </div>
                  
                  <div className="text-center">
                     <div className="inline-flex items-center gap-2 bg-slate-800/60 px-4 py-1.5 rounded-full text-sm font-semibold text-emerald-300 border border-slate-700/50 shadow-inner">
                       <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                       {match.battingTeam} Batting ({formatOvers(match.legalBalls)} Ov)
                     </div>
                  </div>

                  {match.currentInnings === 2 && (
                    <div className="text-center text-xs font-bold tracking-wide bg-emerald-500/20 text-emerald-100 mt-5 py-2.5 px-4 rounded-xl border border-emerald-500/30">
                      Need {match.target - match.score} off {(match.totalOvers * 6) - match.legalBalls} balls
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCHEDULED (The rest of your code remains exactly the same below here) */}

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
             <Activity className="w-7 h-7 text-emerald-500" /> 
             <div className="flex items-baseline">
                 <span>ZBSMCric</span>
                 <span className="text-slate-400 font-light">.Live</span>
             </div>
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
