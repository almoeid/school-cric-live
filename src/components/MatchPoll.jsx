import React from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import useMatchPoll from '../hooks/useMatchPoll';

export default function MatchPoll({ matchId, teamA, teamB, colorA, colorB }) {
  const { votes, hasVoted, castVote, loading } = useMatchPoll(matchId);

  // Calculate percentages
  const totalVotes = (votes.teamA || 0) + (votes.teamB || 0);
  const percentA = totalVotes === 0 ? 50 : Math.round(((votes.teamA || 0) / totalVotes) * 100);
  const percentB = totalVotes === 0 ? 50 : 100 - percentA;

  if (loading) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Who will win?
        </h3>
        {hasVoted && (
          <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Voted
          </span>
        )}
      </div>

      {!hasVoted ? (
        // STATE 1: VOTING BUTTONS
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => castVote('teamA')}
            className="py-3 px-4 rounded-lg font-bold text-sm transition-all transform active:scale-95 border-2 hover:opacity-90"
            style={{ borderColor: colorA || '#2563eb', color: colorA || '#2563eb', backgroundColor: `${colorA}10` || '#eff6ff' }}
          >
            {teamA}
          </button>
          <button
            onClick={() => castVote('teamB')}
            className="py-3 px-4 rounded-lg font-bold text-sm transition-all transform active:scale-95 border-2 hover:opacity-90"
            style={{ borderColor: colorB || '#f97316', color: colorB || '#f97316', backgroundColor: `${colorB}10` || '#fff7ed' }}
          >
            {teamB}
          </button>
        </div>
      ) : (
        // STATE 2: RESULTS BAR
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-bold mb-1">
            <span style={{ color: colorA }}>{percentA}% {teamA}</span>
            <span style={{ color: colorB }}>{teamB} {percentB}%</span>
          </div>
          
          <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
            {/* Team A Bar */}
            <div 
              className="h-full transition-all duration-1000 ease-out"
              style={{ width: `${percentA}%`, backgroundColor: colorA || '#3b82f6' }}
            />
            {/* Team B Bar */}
            <div 
              className="h-full transition-all duration-1000 ease-out"
              style={{ width: `${percentB}%`, backgroundColor: colorB || '#f97316' }}
            />
          </div>
          
          <div className="text-center text-xs text-gray-400 mt-2">
            Total votes: {totalVotes.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}