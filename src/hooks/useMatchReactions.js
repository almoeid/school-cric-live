import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, runTransaction } from "firebase/database";

export default function useMatchReactions(matchId) {
  const [reactions, setReactions] = useState({ fire: 0, heart: 0, clap: 0, wicket: 0 });

  useEffect(() => {
    if (!matchId) return;
    const db = getDatabase();
    const reactRef = ref(db, `reactions/${matchId}`);

    const unsubscribe = onValue(reactRef, (snapshot) => {
      if (snapshot.exists()) {
        setReactions(snapshot.val());
      } else {
        setReactions({ fire: 0, heart: 0, clap: 0, wicket: 0 });
      }
    });

    return () => unsubscribe();
  }, [matchId]);

  const sendReaction = (type) => {
    const db = getDatabase();
    const typeRef = ref(db, `reactions/${matchId}/${type}`);
    runTransaction(typeRef, (current) => (current || 0) + 1);
  };

  return { reactions, sendReaction };
}