import React from 'react';
import { Medal } from 'lucide-react';
import { formatOvers } from '../utils/helpers';

const InningsScorecard = ({ battingStats = {}, bowlingStats = {}, teamName, score, wickets, overs, extras, matchResult, mom }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
    <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
      <h3 className="font-bold text-gray-800">{teamName || 'Team'} Innings</h3>
      <span className="font-bold text-lg">{score || 0}/{wickets || 0} <span className="text-sm font-normal text-gray-500">({overs || '0.0'} ov)</span></span>
    </div>
    
    <table className="w-full text-sm">
      <thead className="bg-gray-100 text-gray-500 font-bold">
        <tr>
           <th className="p-2 text-left">Batter</th>
           <th className="p-2 text-right">R</th>
           <th className="p-2 text-right">B</th>
           <th className="p-2 text-right">4s</th>
           <th className="p-2 text-right">6s</th>
           <th className="p-2 text-right">SR</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {Object.keys(battingStats).length === 0 && (
           <tr><td colSpan="6" className="p-3 text-center text-gray-400 italic">No batting stats available yet</td></tr>
        )}
        {Object.entries(battingStats).map(([name, stats]) => (
           <tr key={name}>
              <td className="p-2">
                 <div className="font-semibold">
                    {name}
                    {!stats.out && <span className="text-green-600 ml-1 font-bold">*</span>}
                 </div>
                 <div className="text-xs text-gray-400">{stats.dismissal || 'not out'}</div>
              </td>
              <td className="p-2 text-right font-bold">{stats.runs || 0}</td>
              <td className="p-2 text-right">{stats.balls || 0}</td>
              <td className="p-2 text-right">{stats.fours || 0}</td>
              <td className="p-2 text-right">{stats.sixes || 0}</td>
              <td className="p-2 text-right">{(( (stats.runs||0) / ((stats.balls||1)) ) * 100).toFixed(0)}</td>
           </tr>
        ))}
        <tr>
           <td className="p-2 font-bold text-right" colSpan="6">Extras: {extras || 0}</td>
        </tr>
      </tbody>
    </table>

    <div className="bg-gray-50 p-2 font-bold text-xs text-gray-500 border-t border-b border-gray-200 mt-2">BOWLING</div>
    <table className="w-full text-sm">
      <thead className="bg-gray-100 text-gray-500 font-bold">
        <tr>
           <th className="p-2 text-left">Bowler</th>
           <th className="p-2 text-right">O</th>
           <th className="p-2 text-right">M</th>
           <th className="p-2 text-right">R</th>
           <th className="p-2 text-right">W</th>
           <th className="p-2 text-right">ECO</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
         {Object.keys(bowlingStats).length === 0 && (
           <tr><td colSpan="6" className="p-3 text-center text-gray-400 italic">No bowling stats available yet</td></tr>
         )}
         {Object.entries(bowlingStats).map(([name, stats]) => (
            <tr key={name}>
               <td className="p-2 font-semibold">{name}</td>
               <td className="p-2 text-right">{formatOvers(stats.balls || 0)}</td>
               <td className="p-2 text-right">0</td>
               <td className="p-2 text-right">{stats.runs || 0}</td>
               <td className="p-2 text-right font-bold">{stats.wickets || 0}</td>
               <td className="p-2 text-right">{(( (stats.runs||0) / ((stats.balls||1)) ) * 6).toFixed(1)}</td>
            </tr>
         ))}
      </tbody>
    </table>

    {mom && matchResult && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Match Summary</h4>
            <div className="text-sm font-bold text-gray-800 mb-1">{matchResult}</div>
            <div className="flex items-center text-purple-700 font-bold text-sm">
                <Medal className="w-4 h-4 mr-1" /> MOM: {mom}
            </div>
        </div>
    )}
  </div>
);

export default InningsScorecard;