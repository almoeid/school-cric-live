import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Trophy, ChevronRight, Activity, BookOpen, Info, Heart, Image as ImageIcon, Zap, TrendingUp, Users } from 'lucide-react';
import LiveBadge from '../../components/LiveBadge';
import TeamLogo from '../../components/TeamLogo';
import { formatOvers } from '../../utils/helpers';

export default function HomeView({ matches, tournaments, setCurrentMatch, setSelectedTournament, setView }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

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

  const totalMatches = matches.filter(m => m.status === 'Completed' || m.status === 'Concluding').length;
  const totalTeams = [...new Set(matches.flatMap(m => [m.teamA, m.teamB]))].filter(Boolean).length;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }} className="min-h-screen bg-[#0a0a0f]">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-64 h-64 bg-yellow-400/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative px-4 pt-10 pb-8">
          {/* Brand */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-white font-black text-lg tracking-tight leading-none">ZBSM<span className="text-emerald-400">Cric</span></div>
                <div className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-medium">Live Scoring</div>
              </div>
            </div>
            {liveMatches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-[11px] font-bold uppercase tracking-wide">{liveMatches.length} Live</span>
              </div>
            )}
          </div>

          {/* Hero headline */}
          <div className="mb-6">
            <h1 className="text-4xl font-black text-white leading-[1.05] tracking-tight mb-2">
              Cricket.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Live.</span>
            </h1>
            <p className="text-gray-500 text-sm font-medium">ZBSM School • Real-time scores & stats</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { label: 'Tournaments', value: tournaments.length, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
              { label: 'Matches', value: totalMatches, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              { label: 'Teams', value: totalTeams, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 text-center">
                <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center mx-auto mb-1.5`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <div className="text-white font-black text-xl leading-none">{value}</div>
                <div className="text-gray-500 text-[10px] font-medium mt-0.5 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-8 pb-24">

        {/* ── LIVE MATCHES ── */}
        {liveMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-red-500 rounded-full" />
              <span className="text-white font-black text-base uppercase tracking-wide">Live Now</span>
            </div>
            <div className="space-y-3">
              {liveMatches.map(match => (
                <div
                  key={match.id}
                  onClick={() => { setCurrentMatch(match); setView('match'); }}
                  className="relative overflow-hidden rounded-2xl cursor-pointer group"
                  style={{ background: 'linear-gradient(135deg, #0f2818 0%, #0a1a0f 50%, #111 100%)' }}
                >
                  {/* Glow border */}
                  <div className="absolute inset-0 rounded-2xl border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors" />
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

                  <div className="relative p-5">
                    {/* Live badge + stage */}
                    <div className="flex items-center justify-between mb-4">
                      <LiveBadge />
                      {match.stage && (
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{match.stage}</span>
                      )}
                    </div>

                    {/* Score display */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <TeamLogo name={match.teamA} color={match.teamAColor} logo={match.teamALogo} size="sm" />
                        <div>
                          <div className="text-white font-bold text-sm leading-tight">{match.teamA}</div>
                          <div className="text-gray-500 text-[10px]">
                            {match.battingTeam === match.teamA ? 'Batting' : 'Bowling'}
                          </div>
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-emerald-400 font-black text-3xl tracking-tighter leading-none">
                          {match.score}/{match.wickets}
                        </div>
                        <div className="text-gray-500 text-[10px] font-medium mt-0.5">
                          {formatOvers(match.legalBalls)}/{match.totalOvers} ov
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-row-reverse">
                        <TeamLogo name={match.teamB} color={match.teamBColor} logo={match.teamBLogo} size="sm" />
                        <div className="text-right">
                          <div className="text-white font-bold text-sm leading-tight">{match.teamB}</div>
                          <div className="text-gray-500 text-[10px]">
                            {match.battingTeam === match.teamB ? 'Batting' : 'Bowling'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chase equation */}
                    {match.currentInnings === 2 && match.target && (
                      <div className="bg-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between">
                        <span className="text-gray-400 text-xs font-medium">Need</span>
                        <span className="text-yellow-400 font-black text-sm">
                          {match.target - match.score} runs
                        </span>
                        <span className="text-gray-500 text-[10px]">off</span>
                        <span className="text-white font-black text-sm">
                          {(match.totalOvers * 6) - match.legalBalls} balls
                        </span>
                      </div>
                    )}

                    {/* Tap hint */}
                    <div className="flex items-center justify-end mt-3 gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide">View Live</span>
                      <ChevronRight className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TOURNAMENTS ── */}
        {tournaments.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-yellow-400 rounded-full" />
              <span className="text-white font-black text-base uppercase tracking-wide">Tournaments</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tournaments.map(t => {
                const tMatches = matches.filter(m => m.tournamentId === t.id);
                const completed = tMatches.filter(m => m.status === 'Completed' || m.status === 'Concluding').length;
                return (
                  <div
                    key={t.id}
                    onClick={() => { setSelectedTournament(t); setView('tournament-details'); }}
                    className="bg-white/[0.04] border border-white/[0.07] hover:border-yellow-400/30 rounded-2xl p-4 cursor-pointer group transition-all"
                  >
                    <div className="w-10 h-10 bg-yellow-400/10 rounded-xl flex items-center justify-center mb-3 overflow-hidden group-hover:bg-yellow-400/20 transition-colors">
                      {t.logo
                        ? <img src={t.logo} alt={t.name} className="w-full h-full object-cover rounded-xl" />
                        : <Trophy className="w-5 h-5 text-yellow-400" />
                      }
                    </div>
                    <div className="text-white font-bold text-sm leading-tight mb-1 truncate">{t.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-[10px]">{t.teamIds.length} teams</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-500 text-[10px]">{completed} played</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-yellow-400 text-[10px] font-bold">View</span>
                      <ChevronRight className="w-3 h-3 text-yellow-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── UPCOMING FIXTURES ── */}
        {scheduledMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-blue-400 rounded-full" />
              <span className="text-white font-black text-base uppercase tracking-wide">Upcoming</span>
            </div>
            <div className="space-y-2">
              {scheduledMatches.map(m => {
                const tourney = tournaments.find(t => t.id === m.tournamentId);
                return (
                  <div
                    key={m.id}
                    onClick={() => { setCurrentMatch(m); setView('match'); }}
                    className="bg-white/[0.03] border border-white/[0.06] hover:border-blue-400/30 rounded-2xl p-4 flex items-center justify-between group transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-blue-400/10 rounded-xl flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-bold text-sm truncate">{m.teamA} <span className="text-gray-600 font-medium">vs</span> {m.teamB}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-600" />
                          <span className="text-gray-500 text-[10px]">
                            {new Date(m.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {m.stage && <span className="text-gray-600 text-[10px]">· {m.stage}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tourney && (
                        <span className="hidden sm:block text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg font-bold uppercase tracking-wide truncate max-w-[80px]">
                          {tourney.name}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RECENT RESULTS ── */}
        {completedMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-gray-400 rounded-full" />
              <span className="text-white font-black text-base uppercase tracking-wide">Recent Results</span>
            </div>
            <div className="space-y-2">
              {completedMatches.slice(0, 10).map(m => {
                const tourney = tournaments.find(t => t.id === m.tournamentId);
                return (
                  <div
                    key={m.id}
                    onClick={() => { setCurrentMatch(m); setView('match'); }}
                    className="bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.14] rounded-2xl p-4 cursor-pointer group transition-all"
                  >
                    {/* Top meta row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        {tourney ? (
                          <>
                            {tourney.logo
                              ? <img src={tourney.logo} alt="T" className="w-3.5 h-3.5 rounded-full object-cover" />
                              : <Trophy className="w-3 h-3 text-yellow-500" />
                            }
                            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500/80">{tourney.name}</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Friendly</span>
                        )}
                        {m.stage && <span className="text-gray-700 text-[10px]">· {m.stage}</span>}
                      </div>
                      <span className="text-[10px] text-gray-600">{getDateString(m.timestamp)}</span>
                    </div>

                    {/* Teams + result */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamLogo name={m.teamA} color={m.teamAColor} logo={m.teamALogo} size="sm" />
                        <div>
                          <div className="text-white font-bold text-sm">
                            {m.teamA} <span className="text-gray-600 text-xs font-normal">vs</span> {m.teamB}
                          </div>
                          <div className="text-emerald-400 text-xs font-medium mt-0.5">{m.result || 'Match Ended'}</div>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center group-hover:bg-white/[0.08] transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="pt-6 border-t border-white/[0.06]">
          <div className="flex justify-center gap-6 mb-6">
            {[
              { label: 'Rules', icon: BookOpen, view: 'rules', color: 'text-gray-400 hover:text-white' },
              { label: 'Gallery', icon: ImageIcon, view: 'gallery', color: 'text-gray-400 hover:text-purple-400' },
              { label: 'About', icon: Info, view: 'about', color: 'text-gray-400 hover:text-blue-400' },
            ].map(({ label, icon: Icon, view, color }) => (
              <button
                key={label}
                onClick={() => setView(view)}
                className={`flex flex-col items-center gap-1.5 transition-colors ${color}`}
              >
                <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center hover:bg-white/[0.08] transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
              </button>
            ))}
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-md flex items-center justify-center">
                <Activity className="w-3 h-3 text-white" />
              </div>
              <span className="text-white font-black text-sm tracking-tight">ZBSM<span className="text-emerald-400">Cric</span>.Live</span>
            </div>
            <p className="text-gray-600 text-[10px]">
              © 2025 ZBSM Cricket · Made with <Heart className="w-2.5 h-2.5 inline text-red-500 mx-0.5" /> for the game
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
