import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID } from '../../config/firebase';
import { Gavel, Clock, Trophy, Wallet, Users, XCircle, CheckCircle2 } from 'lucide-react';

const TEAMS_INFO = {
  't1': { name: 'Retro Rockets', logo: '/teamlogo/RetroRockets.png' },
  't2': { name: 'Storm Challengers', logo: '/teamlogo/StormChallengers.png' },
  't3': { name: 'Evergreen Thirteen', logo: '/teamlogo/EvergreenThirteen.png' },
  't4': { name: 'Dark Horses', logo: '/teamlogo/DarkHorses.png' },
  't5': { name: 'Fourteen Phoenix', logo: '/teamlogo/FourteenPhoenix.png' },
  't6': { name: 'Prime Riders', logo: '/teamlogo/PrimeRiders.png' },
  't7': { name: 'Duronto Ekadosh', logo: '/teamlogo/DurontoEkadosh.png' },
  't8': { name: 'Invictus Sixteen', logo: '/teamlogo/InvictusSixteen.png' },
  't9': { name: 'Cric Masters', logo: '/teamlogo/CricMasters.png' }
};

const getIncrement = (currentBid) => {
    if (currentBid < 10000) return 500;
    return Math.floor(currentBid / 10000) * 1000;
};

export default function LiveAuction({ currentTeamId, currentTeamName }) {
  const [auctionState, setAuctionState] = useState(null);
  const [teamWallet, setTeamWallet] = useState({ purse: 150000, players: [] });
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBidding, setIsSubmitting] = useState(false);

  const [timeOffset, setTimeOffset] = useState(0);
  const [isTimeSynced, setIsTimeSynced] = useState(false);

  const myTeam = TEAMS_INFO[currentTeamId];

  // 🚨 SERVER-TRUSTED TIME SYNC — never trust the device clock 🚨
  //
  // CRITICAL: We use onSnapshot with metadata flags rather than getDoc, because
  // Firestore's local cache stores a LOCAL ESTIMATE of serverTimestamp() right
  // after a write — which is just Date.now() on the device. Reading too quickly
  // returns that estimate (= broken offset of ~0). We instead wait for the
  // snapshot where:
  //   - metadata.fromCache === false   (came from server, not cache)
  //   - metadata.hasPendingWrites === false  (server has acknowledged our write)
  //   - data.ts is a resolved Timestamp object (not null)
  //
  // Only then is the timestamp trustworthy. Re-syncs every 20s for clock drift.
  useEffect(() => {
    if (!currentTeamId) return;

    const probeRef = doc(db, 'artifacts', APP_ID, 'timeProbes', currentTeamId);
    let cancelled = false;
    let watcherUnsub = null;
    let watcherTimeout = null;

    const cleanupWatcher = () => {
      if (watcherUnsub) { watcherUnsub(); watcherUnsub = null; }
      if (watcherTimeout) { clearTimeout(watcherTimeout); watcherTimeout = null; }
    };

    const fetchExternalTime = async () => {
      // Multiple HTTPS sources, tried in order. First success wins.
      const sources = [
        async () => {
          const r = await fetch('https://www.cloudflare.com/cdn-cgi/trace');
          const txt = await r.text();
          const m = txt.match(/ts=([\d.]+)/);
          if (m) return parseFloat(m[1]) * 1000;
          throw new Error('cloudflare: no ts');
        },
        async () => {
          const r = await fetch('https://timeapi.io/api/time/current/zone?timeZone=UTC');
          const d = await r.json();
          if (d.dateTime) return new Date(d.dateTime + 'Z').getTime();
          throw new Error('timeapi: no dateTime');
        },
        async () => {
          const r = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
          const d = await r.json();
          if (d.utc_datetime) return new Date(d.utc_datetime).getTime();
          throw new Error('worldtimeapi: no utc_datetime');
        },
      ];
      for (const src of sources) {
        try { return await src(); } catch (_) { /* try next */ }
      }
      throw new Error('All external time sources failed');
    };

    const syncTime = async () => {
      if (cancelled) return;
      cleanupWatcher();

      // ----- 1) FIRESTORE: write probe + watch for server-confirmed snapshot -----
      const firestoreOk = await new Promise((resolve) => {
        const localBefore = Date.now();

        watcherUnsub = onSnapshot(
          probeRef,
          { includeMetadataChanges: true },
          (snap) => {
            if (cancelled) return;
            if (!snap.exists()) return;
            // 🚨 The three guards that prevent the cache-placeholder bug:
            if (snap.metadata.fromCache) return;
            if (snap.metadata.hasPendingWrites) return;
            const ts = snap.data().ts;
            if (!ts || typeof ts.toMillis !== 'function') return;

            const serverTime = ts.toMillis();
            const localAfter = Date.now();
            const localMid = (localBefore + localAfter) / 2;
            const offset = serverTime - localMid;

            setTimeOffset(offset);
            setIsTimeSynced(true);
            cleanupWatcher();
            resolve(true);
          },
          () => resolve(false)
        );

        setDoc(probeRef, { ts: serverTimestamp(), team: currentTeamId }).catch(() => {
          // setDoc rejected (likely Firestore Security Rules) — let the timeout fire
          // and we'll fall through to external sources.
        });

        watcherTimeout = setTimeout(() => resolve(false), 4000);
      });

      if (cancelled) { cleanupWatcher(); return; }
      if (firestoreOk) return;

      // ----- 2) FALLBACK: external HTTPS time sources -----
      try {
        const before = Date.now();
        const externalTime = await fetchExternalTime();
        const after = Date.now();
        if (!cancelled) {
          const localMid = (before + after) / 2;
          setTimeOffset(externalTime - localMid);
          setIsTimeSynced(true);
        }
      } catch (err) {
        console.error('All time sync attempts failed — bidding will remain locked:', err);
      }
    };

    syncTime();
    const interval = setInterval(syncTime, 20000);

    return () => {
      cancelled = true;
      cleanupWatcher();
      clearInterval(interval);
    };
  }, [currentTeamId]);

  useEffect(() => {
    const auctionRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');
    const walletRef = doc(db, 'artifacts', APP_ID, 'auction', 'wallets');

    const unsubAuction = onSnapshot(auctionRef, (docSnap) => {
      if (docSnap.exists()) setAuctionState(docSnap.data());
    });

    const unsubWallet = onSnapshot(walletRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data()[currentTeamId]) {
        setTeamWallet(docSnap.data()[currentTeamId]);
      }
    });

    return () => { unsubAuction(); unsubWallet(); };
  }, [currentTeamId]);

  useEffect(() => {
    if (!auctionState || auctionState.status !== 'active') {
      setTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const trueNow = Date.now() + timeOffset;
      const remaining = Math.max(0, Math.floor((auctionState.endTime - trueNow) / 1000));
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [auctionState, timeOffset]);

  const handleBid = async () => {
    if (!auctionState || auctionState.status !== 'active' || isBidding) return;
    // 🚨 HARD GATE: refuse to even attempt a bid until our offset is verified
    // against the server. This is what blocks the "broken phone clock" exploit.
    if (!isTimeSynced) return;
    setIsSubmitting(true);

    const auctionRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(auctionRef);
        if (!sfDoc.exists()) throw "Auction document does not exist!";

        const data = sfDoc.data();
        const trueNow = Date.now() + timeOffset;

        if (data.status !== 'active') throw "Auction paused or ended.";
        if (trueNow > data.endTime) throw "Time is up!";
        if (data.highestBidder === currentTeamId) throw "You already hold the highest bid!";
        if (data.bannedTeamId === currentTeamId) throw "You are banned from bidding on this player!";

        let newBid;
        if (data.highestBidder === null) {
            newBid = data.currentBid;
        } else {
            newBid = data.currentBid + getIncrement(data.currentBid);
        }

        if (teamWallet.purse < newBid) throw "Insufficient purse!";

        const maxAllowedTime = 30000 + (data.extraTimeAdded || 0);
        const currentRemaining = data.endTime - trueNow;
        // 🚨 Each bid extends the timer by 5 seconds (capped at the configured max).
        const newRemaining = Math.min(currentRemaining + 5000, maxAllowedTime);
        const newEndTime = trueNow + newRemaining;

        transaction.update(auctionRef, {
          currentBid: newBid,
          highestBidder: currentTeamId,
          highestBidderName: currentTeamName,
          endTime: newEndTime
        });
      });
    } catch (error) {
      console.error("Bid failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚨 FIXED: Write to BOTH history and pending arrays so button locks permanently 🚨
  const handleTimeRequest = async () => {
    if (!auctionState || auctionState.status !== 'active' || isBidding) return;
    setIsSubmitting(true);
    const auctionRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');
    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(auctionRef);
            if (!sfDoc.exists()) return;

            const currentReqs = sfDoc.data().timeRequests || [];
            const pendingReqs = sfDoc.data().pendingTimeRequests || [];

            if (!currentReqs.includes(currentTeamId)) {
                transaction.update(auctionRef, {
                    timeRequests: [...currentReqs, currentTeamId], // History (Locks button forever)
                    pendingTimeRequests: [...pendingReqs, currentTeamId] // Alert (Clears when Admin approves)
                });
            }
        });
    } catch (error) {
        console.error("Request failed", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!auctionState || !auctionState.playerData) {
    return (
      <div className="min-h-[80vh] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-12 md:p-16 flex flex-col items-center text-center animate-fadeIn w-full max-w-lg">
            <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-5 sm:mb-6"></div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 uppercase tracking-tight">Waiting for Auctioneer</h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-2">The next player will appear here shortly.</p>
        </div>
      </div>
    );
  }

  const player = auctionState.playerData;
  const maxAllowedSeconds = 30 + ((auctionState.extraTimeAdded || 0) / 1000);
  const progressPercentage = Math.min(100, (timeLeft / maxAllowedSeconds) * 100);
  const isWarningTime = timeLeft <= 5 && auctionState.status === 'active';

  const nextBidAmount = auctionState.highestBidder === null
      ? auctionState.currentBid
      : auctionState.currentBid + getIncrement(auctionState.currentBid);

  const canAfford = teamWallet.purse >= nextBidAmount;
  const squadFull = teamWallet.players.length >= 15;
  const isMyBid = auctionState.highestBidder === currentTeamId;
  const isBanned = auctionState.bannedTeamId === currentTeamId;
  const hasRequestedTime = (auctionState.timeRequests || []).includes(currentTeamId); // 🚨 Button checks permanent history

  let timerDisplay = `${timeLeft}S`;
  if (!isTimeSynced) timerDisplay = 'SYNCING...';
  else if (auctionState.status === 'waiting') timerDisplay = 'WAITING...';
  else if (auctionState.status === 'paused') timerDisplay = 'PAUSED';

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16 sm:pb-20 pt-4 sm:pt-6">

      <div className="max-w-4xl mx-auto px-3 sm:px-4 animate-fadeIn">

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl mb-4 sm:mb-6 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500"></span></span>
                <h1 className="text-sm sm:text-lg font-black text-slate-800 tracking-tight uppercase">ZBSM ELITE CUP Auction</h1>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 bg-slate-50 border border-slate-200 rounded-full py-1.5 px-2 pr-4 sm:pr-5 shadow-inner w-full sm:w-auto justify-center sm:justify-start">
                <img src={myTeam.logo} alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-sm bg-white rounded-full p-1 border border-slate-200 shrink-0" />
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate">{myTeam.name}</span>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1">
                        <span className="text-[11px] sm:text-xs font-black font-mono text-emerald-600 flex items-center gap-1"><Wallet className="w-3 h-3"/> ৳{teamWallet.purse.toLocaleString()}</span>
                        <span className="text-[11px] sm:text-xs font-black text-blue-600 flex items-center gap-1"><Users className="w-3 h-3"/> {teamWallet.players.length}/15</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="w-full bg-gradient-to-br from-slate-900 via-[#0a0f1c] to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-2xl border border-slate-800 relative overflow-hidden mb-6 sm:mb-8">

          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

          {auctionState.status === 'sold' && (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn px-4">
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent"></div>
              <div className="bg-gradient-to-b from-amber-300 to-amber-500 p-5 sm:p-6 rounded-full mb-4 sm:mb-6 shadow-[0_0_50px_rgba(245,158,11,0.5)] transform scale-110 animate-bounce">
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-slate-900" />
              </div>
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 uppercase tracking-tight mb-2 drop-shadow-lg scale-110 transition-transform">SOLD!</h2>
              <p className="text-lg sm:text-2xl md:text-3xl text-slate-200 font-medium z-10 text-center">To <span className="text-amber-400 font-bold uppercase">{auctionState.highestBidderName}</span></p>
              <div className="mt-5 sm:mt-6 bg-slate-800/80 px-6 py-4 sm:px-10 sm:py-5 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-2xl z-10">
                  <p className="text-slate-400 text-[10px] sm:text-sm font-bold uppercase tracking-widest text-center mb-1">Winning Bid</p>
                  <p className="text-3xl sm:text-4xl text-white font-mono font-black">৳{auctionState.currentBid.toLocaleString()}</p>
              </div>
            </div>
          )}

          {auctionState.status === 'unsold' && (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn px-4">
              <div className="bg-slate-800 p-5 sm:p-6 rounded-full mb-4 sm:mb-6 border border-slate-700 shadow-xl">
                  <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-slate-500" />
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 opacity-80">UNSOLD</h2>
              <p className="text-sm sm:text-lg text-slate-500 font-medium text-center">Player returns to the queue.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-10 relative z-10">
            <div className="relative group shrink-0">
                <img src={player.imageUrl || '/api/placeholder/150/150'} alt={player.name} className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-2xl object-cover object-top border-2 border-slate-700 shadow-xl bg-slate-800" />
                <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg border border-blue-400 shadow-md uppercase">
                    {player.id || 'N/A'}
                </div>
            </div>

            <div className="text-center sm:text-left flex-1 mt-1 sm:mt-2 w-full">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-widest mb-2 sm:mb-3">Now Auctioning</span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white mb-3 sm:mb-4 leading-tight uppercase break-words">{player.name}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-700 text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-slate-800/80">{player.role}</span>
                <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-700 text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-slate-800/80">Batch {player.batch}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-700/50 relative z-10 mb-6 sm:mb-8 flex flex-col items-center">
            <p className="text-slate-400 uppercase tracking-widest text-[10px] sm:text-xs font-bold mb-2 sm:mb-3">Current Bid</p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                 <span className="text-emerald-400 font-black text-lg sm:text-xl md:text-2xl">৳</span>
              </div>
              <span className="text-4xl sm:text-5xl md:text-7xl font-black font-mono tracking-tight text-white drop-shadow-md break-all">
                {auctionState.currentBid.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1 mt-3 sm:mt-4 w-full">
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-700 shadow-inner max-w-full">
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-slate-400 text-xs sm:text-sm font-medium truncate">Leader: <span className="text-white font-bold uppercase">{auctionState.highestBidderName || 'None'}</span></p>
                </div>
                <p className="text-slate-500 text-[10px] sm:text-xs font-semibold mt-2">Base Price: ৳{(player.basePrice || 1000).toLocaleString()}</p>
            </div>
          </div>

          <div className="mb-6 sm:mb-8 relative z-10">
            <div className="flex justify-between items-end mb-2 px-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Time Remaining</span>
                <span className={`text-xs sm:text-sm font-black tracking-widest ${isWarningTime ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>{timerDisplay}</span>
            </div>
            <div className="w-full h-2 sm:h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
              <div className={`h-full transition-all duration-200 ease-linear rounded-full ${isWarningTime ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-blue-500'}`} style={{ width: `${progressPercentage}%` }}></div>
            </div>
            {/* Visible only when this device's clock differs from server by >1s.
                Confirms to the user (and to debugging) that their local clock has been corrected. */}
            {isTimeSynced && Math.abs(timeOffset) > 1000 && (
              <p className="mt-2 text-center text-[10px] font-mono text-amber-400/70 tracking-wider">
                ⏱ device clock corrected by {timeOffset > 0 ? '+' : ''}{Math.round(timeOffset / 1000)}s
              </p>
            )}
          </div>

          <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3">
            {!isTimeSynced ? (
                <button disabled className="w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest bg-slate-700/40 text-slate-400 border border-slate-600/40 cursor-not-allowed animate-pulse">Syncing Time...</button>
            ) : isBanned ? (
                <button disabled className="w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/50 cursor-not-allowed">Banned From Bidding</button>
            ) : auctionState.status === 'waiting' ? (
                <button disabled className="w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-not-allowed animate-pulse">Bidding Starting Soon...</button>
            ) : auctionState.status === 'paused' ? (
                <button disabled className="w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-not-allowed">Auction Paused</button>
            ) : !canAfford && !isMyBid ? (
                <button disabled className="w-full py-4 sm:py-5 rounded-2xl text-sm sm:text-lg font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed">Insufficient Purse (Need ৳{nextBidAmount})</button>
            ) : squadFull && !isMyBid ? (
                <button disabled className="w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-not-allowed">Squad Full (15/15)</button>
            ) : isMyBid ? (
                <button disabled className="w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-not-allowed">You Hold Highest Bid</button>
            ) : (
                <button
                  onClick={handleBid}
                  disabled={auctionState.status !== 'active' || isBidding}
                  className="w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest transition-all duration-200 shadow-xl bg-emerald-500 text-white hover:bg-emerald-400 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95"
                >
                  {auctionState.highestBidder === null ? 'Accept Base Price' : `Place Bid ৳${nextBidAmount.toLocaleString()}`}
                </button>
            )}

            {/* TIME REQUEST BUTTON */}
            {auctionState.status === 'active' && !isBanned && (
                hasRequestedTime ? (
                    <button disabled className="w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500/50 border border-amber-500/20 cursor-not-allowed">Extra Time Requested</button>
                ) : (
                    <button onClick={handleTimeRequest} disabled={isBidding} className="w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors shadow-sm active:scale-95">
                        Request +40s Extra Time
                    </button>
                )
            )}
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight mb-3 sm:mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500"/> Your Squad ({teamWallet.players.length}/15)
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 15 }).map((_, index) => {
                const p = teamWallet.players[index];
                if (p) {
                    return (
                        <div key={index} className="bg-white border border-slate-200 rounded-xl p-2 sm:p-3 flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
                            <span className="absolute top-1 left-1.5 text-[8px] font-black text-slate-300">#{index + 1}</span>
                            <img src={p.imageUrl || '/api/placeholder/40/40'} alt={p.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover mb-1.5 sm:mb-2 border border-slate-100 shadow-sm" />
                            <p className="text-[10px] sm:text-xs font-bold text-slate-800 truncate w-full uppercase">{p.name}</p>
                            <p className="text-[10px] font-mono font-black text-emerald-600 mt-0.5">৳{p.price.toLocaleString()}</p>
                        </div>
                    );
                }
                return (
                    <div key={index} className="bg-slate-50 border border-slate-100 border-dashed rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center text-center min-h-[88px] sm:min-h-[100px]">
                        <span className="text-xs font-bold text-slate-300">#{index + 1}</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-300 mt-1">Empty Slot</span>
                    </div>
                );
            })}
        </div>

      </div>
    </div>
  );
}