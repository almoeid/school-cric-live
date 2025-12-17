import React from 'react';

const InningsScorecard = ({ 
  teamName, 
  score, 
  wickets, 
  overs, 
  extras, 
  battingStats, 
  bowlingStats, 
  matchResult, 
  mom,
  // --- NEW PROPS ---
  players = [],      // The full list of players for this team
  matchStatus        // To decide between "Yet to Bat" vs "Did Not Bat"
}) => {
  
  // FIX: SORT BY ASSIGNED NUMBER
  const sortedBatters = Object.entries(battingStats || {})
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => (a.number || 999) - (b.number || 999));

  const sortedBowlers = Object.entries(bowlingStats || {})
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => (a.number || 999) - (b.number || 999));

  // --- NEW LOGIC: Calculate who hasn't batted ---
  const battedPlayerNames = sortedBatters.map(b => b.name);
  
  const yetToBatPlayers = players.filter(p => {
      const pName = typeof p === 'string' ? p : p.name;
      // Filter out players who are already in the batting stats
      return !battedPlayerNames.includes(pName);
  });

  // Determine label based on match status
  const dnbLabel = (matchStatus === 'Completed' || matchStatus === 'Concluding') 
      ? "Did Not Bat" 
      : "Yet to Bat";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="bg-gray-900 text-white p-3 flex justify-between items-center">
        <h3 className="font-bold text-sm uppercase">{teamName} Innings</h3>
        <span className="text-xs bg-gray-700 px-2 py-1 rounded">{score}/{wickets} ({overs})</span>
      </div>

      {/* Batting */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase border-b">
            <tr>
              <th className="p-2 w-1/3">Batter</th>
              <th className="p-2 text-right">R</th>
              <th className="p-2 text-right">B</th>
              <th className="p-2 text-right">4s</th>
              <th className="p-2 text-right">6s</th>
              <th className="p-2 text-right">SR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedBatters.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-gray-400">No batting data yet.</td></tr>}
            {sortedBatters.map((player) => {
              const sr = player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(0) : 0;
              return (
                <tr key={player.name} className={player.out ? "opacity-60" : "font-semibold"}>
                  <td className="p-2"><div className="font-bold text-gray-800">{player.name}</div><div className="text-[10px] text-gray-400">{player.dismissal || (player.out ? 'out' : 'not out')}</div></td>
                  <td className="p-2 text-right font-bold">{player.runs}</td><td className="p-2 text-right text-gray-500">{player.balls}</td><td className="p-2 text-right text-gray-400">{player.fours}</td><td className="p-2 text-right text-gray-400">{player.sixes}</td><td className="p-2 text-right text-gray-500">{sr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Extras */}
      <div className="p-2 bg-gray-50 border-t border-b border-gray-100 text-xs flex justify-between font-bold text-gray-600"><span>Extras</span><span>{extras || 0}</span></div>

      {/* --- NEW SECTION: YET TO BAT / DID NOT BAT --- */}
      {yetToBatPlayers.length > 0 && (
          <div className="px-3 py-2 bg-white border-b border-gray-100 text-xs leading-relaxed">
              <span className="font-bold text-gray-700 uppercase mr-2">{dnbLabel}:</span>
              <span className="text-gray-500">
                  {yetToBatPlayers.map((p, i) => {
                      const name = typeof p === 'string' ? p : p.name;
                      return (
                          <span key={i}>
                              {name}{i < yetToBatPlayers.length - 1 ? ", " : ""}
                          </span>
                      );
                  })}
              </span>
          </div>
      )}

      {/* Bowling */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm text-left mt-2">
          <thead className="bg-gray-50 text-gray-500 uppercase border-b">
            <tr><th className="p-2 w-1/3">Bowler</th><th className="p-2 text-right">O</th><th className="p-2 text-right">M</th><th className="p-2 text-right">R</th><th className="p-2 text-right">W</th><th className="p-2 text-right">Eco</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {sortedBowlers.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-gray-400">No bowling data yet.</td></tr>}
            {sortedBowlers.map((bowler) => {
              const eco = bowler.balls > 0 ? ((bowler.runs / bowler.balls) * 6).toFixed(1) : 0;
              const oversText = `${Math.floor(bowler.balls / 6)}.${bowler.balls % 6}`;
              return (
                <tr key={bowler.name}>
                  <td className="p-2 font-semibold text-gray-700">{bowler.name}</td>
                  <td className="p-2 text-right">{oversText}</td><td className="p-2 text-right text-gray-400">0</td><td className="p-2 text-right">{bowler.runs}</td><td className="p-2 text-right font-bold text-green-600">{bowler.wickets}</td><td className="p-2 text-right text-gray-500">{eco}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Match Result Footer & MOM */}
      {matchResult && (
          <div className="p-3 bg-green-50 border-t border-green-100 text-sm">
              <div className="text-green-800 font-bold text-center mb-1">{matchResult}</div>
              {mom && (
                  <div className="text-center text-xs text-purple-600 font-medium">
                      MOM: {mom}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default InningsScorecard;
