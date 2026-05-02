import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db, APP_ID } from '../../config/firebase';
import { Gavel, Clock, Trophy, Shield, Zap } from 'lucide-react';

export default function LiveAuction({ currentTeamId }) {
  const [auctionState, setAuctionState] = useState(null);
  const [player, setPlayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBidding, setIsSubmitting] = useState(false);

  // 1. REAL-TIME FIREBASE SYNC
  useEffect(() => {
    // Listen to the central auction state
    const auctionRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');
    
    const unsubscribe = onSnapshot(auctionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAuctionState(data);
        setPlayer(data.playerData); // Admin will push current player data here
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. PERFECT SYNCED TIMER
  useEffect(() => {
    if (!auctionState || auctionState.status !== 'active') {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((auctionState.endTime - now) / 1000));
      setTimeLeft(remaining);
      
      // If time hits 0 locally, wait for Admin to officially mark as 'sold'
    }, 100);

    return () => clearInterval(interval);
  }, [auctionState]);

  // 3. SECURE BIDDING TRANSACTION
  const handleBid = async () => {
    if (!auctionState || auctionState.status !== 'active' || isBidding) return;
    setIsSubmitting(true);

    const auctionRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(auctionRef);
        if (!sfDoc.exists()) throw "Auction document does not exist!";
        
        const data = sfDoc.data();
        
        // Safety checks
        if (data.status !== 'active') throw "Auction paused or ended.";
        if (Date.now() > data.endTime) throw "Time is up!";
        if (data.highestBidder === currentTeamId) throw "You already hold the highest bid!";

        // Calculate dynamic increment
        let increment = data.currentBid < 20000 ? 1000 : Math.floor(data.currentBid / 10000) * 1000;
        const newBid = data.currentBid + increment;

        // Calculate new time (If <= 5 seconds remaining, extend to 10 seconds)
        let newEndTime = data.endTime;
        if (data.endTime - Date.now() <= 5000) {
          newEndTime = Date.now() + 10000; 
        }

        // Apply the bid
        transaction.update(auctionRef, {
          currentBid: newBid,
          highestBidder: currentTeamId,
          endTime: newEndTime
        });
      });
    } catch (error) {
      console.error("Bid failed:", error);
      // Optional: Add a toast notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!auctionState || !player) {
    return (
      <div className="min-h-screen bg-[#0a0606] flex items-center justify-center">
        <h2 className="text-[#d4af37] font-bold animate-pulse tracking-widest uppercase">Waiting for Auctioneer...</h2>
      </div>
    );
  }

  // Calculate progress bar width (max 30s)
  const progressPercentage = Math.min(100, (timeLeft / 30) * 100);
  const isWarningTime = timeLeft <= 5;

  return (
    <div className="min-h-screen bg-[#0a0606] text-white p-4 font-sans flex flex-col items-center pt-10">
      
      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black italic tracking-wider text-white drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
          LIVE AUCTION
        </h1>
        <p className="text-[#d4af37] font-bold tracking-[0.3em] uppercase text-xs mt-2">ZBSM Elite Court</p>
      </div>

      {/* MAIN CARD */}
      <div className="w-full max-w-3xl bg-[#120d0c] border border-[#3a2a18] rounded-2xl p-6 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        
        {/* SOLD OVERLAY */}
        {auctionState.status === 'sold' && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <Gavel className="w-20 h-20 text-[#d4af37] mb-4 drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]" />
            <h2 className="text-5xl font-black text-white uppercase tracking-widest mb-2">SOLD</h2>
            <p className="text-2xl text-[#d4af37] font-bold">To: {auctionState.highestBidderName}</p>
            <p className="text-xl text-white mt-2 font-mono">Final Bid: {auctionState.currentBid.toLocaleString()}</p>
          </div>
        )}

        {/* PLAYER INFO HEADER */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 pb-8 border-b border-[#3a2a18]">
          <img 
            src={player.imageUrl || '/api/placeholder/150/150'} 
            alt={player.name} 
            className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover border-2 border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          />
          <div className="text-center sm:text-left flex-1 mt-2">
            <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-1">Now Auctioning</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-3">
              {player.name}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 rounded border border-[#d4af37]/50 text-[#d4af37] text-xs font-bold uppercase tracking-wider bg-[#d4af37]/10">
                {player.role}
              </span>
              <span className="px-3 py-1 rounded border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider bg-slate-800/50">
                Batch {player.batch}
              </span>
            </div>
          </div>
        </div>

        {/* CURRENT BID SECTION */}
        <div className="text-center mb-10">
          <p className="text-[#d4af37] uppercase tracking-[0.2em] text-sm font-bold mb-4">Current Bid</p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-[0_0_15px_rgba(212,175,55,0.5)] flex items-center justify-center">
               <span className="text-black font-extrabold text-lg">৳</span>
            </div>
            <span className="text-5xl md:text-7xl font-black font-mono tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {auctionState.currentBid.toLocaleString()}
            </span>
          </div>
          <p className="text-slate-500 font-medium mt-3 text-sm">
            Highest Bidder: <span className="text-white font-bold">{auctionState.highestBidderName || 'None'}</span>
          </p>
          <p className="text-slate-600 text-xs mt-1">Base Price: {player.basePrice.toLocaleString()}</p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10">
          <StatBox label="Matches" value={player.matches || 0} />
          <StatBox label="Batting Avg" value={player.avg || 0} />
          <StatBox label="Wickets" value={player.wickets || 0} />
        </div>

        {/* PROGRESS BAR TIMER */}
        <div className="mb-8">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-200 ease-linear ${isWarningTime ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-[#d4af37]'}`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className={`text-center mt-3 text-sm font-bold tracking-widest ${isWarningTime ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
            {timeLeft}S REMAINING
          </p>
        </div>

        {/* ACTION BUTTON */}
        <button 
          onClick={handleBid}
          disabled={auctionState.status !== 'active' || isBidding || auctionState.highestBidder === currentTeamId}
          className={`w-full py-5 rounded-xl text-xl font-black uppercase tracking-widest transition-all duration-200 shadow-xl
            ${auctionState.highestBidder === currentTeamId 
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' 
              : 'bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] active:scale-95'
            }`}
        >
          {auctionState.highestBidder === currentTeamId ? 'You Hold Highest Bid' : 'Place Bid'}
        </button>

      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="border border-[#3a2a18] rounded-xl p-4 flex flex-col items-center justify-center bg-[#1a1311]">
      <span className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mb-2 text-center">{label}</span>
      <span className="text-xl md:text-3xl font-black text-white">{value}</span>
    </div>
  );
}