import React from 'react';
import { Calendar, Clock, Trophy, ChevronRight, Activity, BookOpen, Info, Heart, Image as ImageIcon } from 'lucide-react';
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
    <div className="space-y-8">
      
      {/* LIVE MATCHES */}
      {liveMatches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveMatches.map(match => (
            <div key={match.id} onClick={() => { setCurrentMatch(match); setView('match'); }} className="bg-gradient-to-br from-green-700 to-gray-900 rounded-2xl shadow-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition relative">
              <div className="absolute top-4 right-4"><LiveBadge /></div>
              <div className="p-5 text-white">
                <div className="flex justify-between items-center mb-4">
                   <TeamLogo name={match.teamA} color={match.teamAColor} logo={match.teamALogo} />
                   <span className="font-bold text-lg">{match.score}/{match.wickets}</span>
                   <TeamLogo name={match.teamB} color={match.teamBColor} logo={match.teamBLogo} />
                </div>
                <div className="text-center text-sm text-green-200">
                   {match.battingTeam} Batting ({formatOvers(match.legalBalls)} Ov)
                </div>
                {match.currentInnings === 2 && (
                  <div className="text-center text-xs font-bold bg-white/10 mt-2 py-1 rounded animate-pulse">
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
        <h3 className="font-bold text-gray-800 mb-3 flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-500" /> Upcoming Fixtures</h3>
        <div className="space-y-3">
           {scheduledMatches.length === 0 && <p className="text-gray-400 text-sm">No matches scheduled.</p>}
           {scheduledMatches.map(m => {
              const tourney = tournaments.find(t => t.id === m.tournamentId);
              return (
                <div key={m.id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center border-l-4 border-blue-500">
                    <div>
                        <div className="font-bold text-sm text-gray-800">{m.teamA} vs {m.teamB}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(m.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})} • {m.stage}
                        </div>
                    </div>
                    {tourney && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold uppercase border border-blue-100">
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
       <h3 className="font-bold text-gray-800 mb-3 flex items-center"><Trophy className="w-5 h-5 mr-2 text-yellow-500" /> Tournaments</h3>
       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {tournaments.map(t => (
            <div key={t.id} onClick={() => { setSelectedTournament(t); setView('tournament-details'); }} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer border border-gray-100 flex flex-col items-center text-center">
               <div className="w-10 h-10 mb-2 rounded-full bg-yellow-50 flex items-center justify-center overflow-hidden">
                   {t.logo ? <img src={t.logo} alt={t.name} className="w-full h-full object-cover" /> : <Trophy className="w-5 h-5 text-yellow-600" />}
               </div>
               <h4 className="font-bold text-gray-800 text-sm">{t.name}</h4>
               <p className="text-[10px] text-gray-500">{t.teamIds.length} Teams</p>
            </div>
          ))}
       </div>
      </div>

      {/* RECENT RESULTS */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">Recent Results</h3>
        <div className="space-y-2">
            {completedMatches.length === 0 && <p className="text-gray-400 text-sm italic">No matches completed yet.</p>}
            {completedMatches.slice(0, 10).map(m => {
                const tourney = tournaments.find(t => t.id === m.tournamentId);
                return (
                    <div 
                        key={m.id} 
                        onClick={() => { setCurrentMatch(m); setView('match'); }} 
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2 cursor-pointer hover:border-blue-300 transition-all group"
                    >
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2 mb-1">
                            <div className="flex items-center gap-2">
                                {tourney ? (
                                    <>
                                        {tourney.logo ? <img src={tourney.logo} alt="T" className="w-4 h-4 rounded-full object-cover" /> : <Trophy className="w-3 h-3 text-blue-500" />}
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{tourney.name}</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Friendly Match</span>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400">{getDateString(m.timestamp)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                    <span className={m.score > m.target ? "text-black" : "text-gray-600"}>{m.teamA}</span>
                                    <span className="text-xs text-gray-300">vs</span>
                                    <span className={m.score <= m.target ? "text-black" : "text-gray-600"}>{m.teamB}</span>
                                </div>
                                <div className="text-xs font-medium text-green-600 mt-1">{m.result || 'Match Ended'}</div>
                            </div>
                            <div className="bg-gray-50 p-1.5 rounded-full group-hover:bg-blue-50 transition-colors">
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-12 pt-8 border-t border-gray-200 text-center pb-8">
          <div className="flex items-center justify-center gap-2 mb-4 text-gray-400 font-bold text-xl">
             <Activity className="w-6 h-6 text-green-500" /> ZBSMCric.Live
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 mb-6">
              <button onClick={() => setView('rules')} className="text-sm text-gray-600 hover:text-blue-600 font-medium flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> Rules
              </button>
              {/* NEW: GALLERY BUTTON */}
              <button onClick={() => setView('gallery')} className="text-sm text-gray-600 hover:text-purple-600 font-medium flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> Gallery
              </button>
              <button onClick={() => setView('about')} className="text-sm text-gray-600 hover:text-blue-600 font-medium flex items-center gap-1">
                  <Info className="w-4 h-4" /> About Us
              </button>
          </div>

          <p className="text-xs text-gray-400">
              © 2025 ZBSM Cricket. Made with <Heart className="w-3 h-3 inline text-red-400 mx-0.5" /> for the game.
          </p>
      </div>

    </div>
  );
}