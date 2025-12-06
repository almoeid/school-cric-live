import React from 'react';
import { User, TrendingUp, Activity, ArrowLeft } from 'lucide-react';
import TeamLogo from '../../components/TeamLogo';

export default function PlayerCareer({ player, matches, setView }) {
  if (!player) return null;

  // --- CAREER STATS CALCULATION ---
  const stats = {
      matches: 0,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      fifties: 0,
      hundreds: 0,
      hs: 0,
      outs: 0,
      wickets: 0,
      overs: 0,
      runsConceded: 0,
      fiveWickets: 0,
      bestBowling: { w: 0, r: 999 }
  };

  matches.forEach(m => {
      // Ensure match is valid and completed/live
      if (!m.battingStats && !m.bowlingStats && !m.innings1) return;

      const processInnings = (batting, bowling) => {
          if (batting && batting[player.name]) {
              const p = batting[player.name];
              stats.matches++; // This is rough, ideally check roster
              stats.runs += (p.runs || 0);
              stats.balls += (p.balls || 0);
              stats.fours += (p.fours || 0);
              stats.sixes += (p.sixes || 0);
              if (p.out) stats.outs++;
              if ((p.runs || 0) > stats.hs) stats.hs = p.runs;
              if (p.runs >= 50 && p.runs < 100) stats.fifties++;
              if (p.runs >= 100) stats.hundreds++;
          }
          if (bowling && bowling[player.name]) {
              const b = bowling[player.name];
              stats.wickets += (b.wickets || 0);
              stats.runsConceded += (b.runs || 0);
              // Approximate balls from overs if exact balls not saved
              const balls = (b.balls || 0) > 0 ? b.balls : (Math.floor(b.overs || 0) * 6); 
              stats.overs += (balls / 6);
              if (b.wickets >= 5) stats.fiveWickets++;
              
              if (b.wickets > stats.bestBowling.w || (b.wickets === stats.bestBowling.w && b.runs < stats.bestBowling.r)) {
                  stats.bestBowling = { w: b.wickets, r: b.runs };
              }
          }
      };

      // Check current state
      processInnings(m.battingStats, m.bowlingStats);
      // Check innings 1 if it exists
      if (m.innings1) processInnings(m.innings1.battingStats, m.innings1.bowlingStats);
  });

  const battingAvg = stats.outs > 0 ? (stats.runs / stats.outs).toFixed(2) : stats.runs;
  const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(2) : 0;
  const bowlingAvg = stats.wickets > 0 ? (stats.runsConceded / stats.wickets).toFixed(2) : '-';
  const economy = stats.overs > 0 ? (stats.runsConceded / stats.overs).toFixed(2) : 0;

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-3xl mx-auto">
            <div className="bg-gray-900 p-6 text-white relative">
                <button onClick={() => setView('home')} className="absolute top-4 left-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><ArrowLeft className="w-5 h-5" /></button>
                <div className="flex flex-col items-center mt-4">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-green-500 overflow-hidden mb-4 shadow-lg">
                        {player.photo ? <img src={player.photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-gray-400" />}
                    </div>
                    <h1 className="text-3xl font-bold">{player.name}</h1>
                    <div className="text-sm text-gray-400 mt-1 uppercase tracking-widest">{player.role || 'Player'} • {player.team || 'Unknown Team'}</div>
                </div>
            </div>

            <div className="p-6">
                {/* BATTING */}
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-blue-600" /> Career Batting</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-black text-blue-700">{stats.runs}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Runs</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-black text-blue-700">{stats.hs}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">High Score</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-black text-blue-700">{battingAvg}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Average</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-black text-blue-700">{strikeRate}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Strike Rate</div>
                    </div>
                    <div className="col-span-2 md:col-span-4 grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-gray-50 p-2 rounded"><strong>{stats.fifties}</strong> 50s</div>
                        <div className="bg-gray-50 p-2 rounded"><strong>{stats.hundreds}</strong> 100s</div>
                        <div className="bg-gray-50 p-2 rounded"><strong>{stats.sixes}</strong> 6s</div>
                    </div>
                </div>

                {/* BOWLING */}
                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Activity className="w-5 h-5 mr-2 text-green-600" /> Career Bowling</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-black text-green-700">{stats.wickets}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Wickets</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-black text-green-700">{stats.bestBowling.w}/{stats.bestBowling.r}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Best</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-black text-green-700">{bowlingAvg}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Average</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-black text-green-700">{economy}</div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Economy</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}