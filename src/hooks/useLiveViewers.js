import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, set, onDisconnect, push, remove, serverTimestamp } from "firebase/database";

export default function useLiveViewers(matchId) {
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!matchId) return;

    const db = getDatabase();
    // Reference to the list of viewers for this match
    const matchViewersRef = ref(db, `live_matches/${matchId}/viewers`);
    const connectedRef = ref(db, ".info/connected");

    // 1. Create a unique reference for THIS user session immediately
    const myViewerRef = push(matchViewersRef);

    // 2. Monitor connection state
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // If we disconnect uncleanly (crash/network loss), remove this node
        onDisconnect(myViewerRef).remove();

        // Add user to the list
        set(myViewerRef, {
          joinedAt: serverTimestamp(),
          device: navigator.userAgent
        });
      }
    });

    // 3. Listen for changes in the viewer count
    const unsubscribeCount = onValue(matchViewersRef, (snapshot) => {
      if (snapshot.exists()) {
        // accurately count the number of children in the node
        setViewerCount(snapshot.size); 
      } else {
        setViewerCount(0);
      }
    });

    // 4. CLEANUP (The Fix)
    // This runs when the component unmounts (you leave the page or refresh)
    return () => {
      // Remove THIS user immediately
      remove(myViewerRef);
      // Cancel the onDisconnect listener so it doesn't fire later
      onDisconnect(myViewerRef).cancel();
      // Unsubscribe from updates
      unsubscribeConnected();
      unsubscribeCount();
    };
  }, [matchId]);

  return viewerCount;
}