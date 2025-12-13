import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, runTransaction } from "firebase/database";

export default function useMatchPoll(matchId) {
  const [votes, setVotes] = useState({ teamA: 0, teamB: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load vote status from local storage on mount
  useEffect(() => {
    const voted = localStorage.getItem(`poll_voted_${matchId}`);
    if (voted) setHasVoted(true);
  }, [matchId]);

  // Listen to Realtime Database for vote counts
  useEffect(() => {
    if (!matchId) return;
    const db = getDatabase();
    const pollRef = ref(db, `polls/${matchId}`);

    const unsubscribe = onValue(pollRef, (snapshot) => {
      if (snapshot.exists()) {
        setVotes(snapshot.val());
      } else {
        setVotes({ teamA: 0, teamB: 0 });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId]);

  // Function to cast a vote
  const castVote = async (teamKey) => {
    if (hasVoted) return;

    const db = getDatabase();
    const voteRef = ref(db, `polls/${matchId}/${teamKey}`);

    // Use transaction to ensure atomic increment (prevents race conditions)
    await runTransaction(voteRef, (currentVotes) => {
      return (currentVotes || 0) + 1;
    });

    // Save to local storage so they can't vote again immediately
    localStorage.setItem(`poll_voted_${matchId}`, 'true');
    setHasVoted(true);
  };

  return { votes, hasVoted, castVote, loading };
}