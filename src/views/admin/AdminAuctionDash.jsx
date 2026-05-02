import React, { useState, useEffect, useRef, useMemo } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, runTransaction, getDoc } from 'firebase/firestore';
import { Play, Pause, Gavel, Users, Shield, XCircle, CheckCircle, Loader, AlertCircle, RotateCcw, Banknote, UploadCloud, Edit2, Check, X, History, RefreshCw, Clock } from 'lucide-react';
import { db, APP_ID } from '../../config/firebase';

const TEAMS_INFO = [
  { id: 't1', name: 'Retro Rockets', logo: '/teamlogo/RetroRockets.png' },
  { id: 't2', name: 'Storm Challengers', logo: '/teamlogo/StormChallengers.png' },
  { id: 't3', name: 'Evergreen Thirteen', logo: '/teamlogo/EvergreenThirteen.png' },
  { id: 't4', name: 'Dark Horses', logo: '/teamlogo/DarkHorses.png' },
  { id: 't5', name: 'Fourteen Phoenix', logo: '/teamlogo/FourteenPhoenix.png' },
  { id: 't6', name: 'Prime Riders', logo: '/teamlogo/PrimeRiders.png' },
  { id: 't7', name: 'Duronto Ekadosh', logo: '/teamlogo/DurontoEkadosh.png' },
  { id: 't8', name: 'Invictus Sixteen', logo: '/teamlogo/InvictusSixteen.png' },
  { id: 't9', name: 'Cric Masters', logo: '/teamlogo/CricMasters.png' }
];

export default function AdminAuctionDash() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [auctionState, setAuctionState] = useState(null);
  const [teamWallets, setTeamWallets] = useState({});
  const [roster, setRoster] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [manualSellTeam, setManualSellTeam] = useState('t1');
  const [manualSellPrice, setManualSellPrice] = useState('');
  
  const [addBalanceTeam, setAddBalanceTeam] = useState('t1');
  const [addBalanceAmount, setAddBalanceAmount] = useState('');

  const [editingPurseTeam, setEditingPurseTeam] = useState(null);
  const [tempPurseValue, setTempPurseValue] = useState('');
  
  const [overlayTeamSelect, setOverlayTeamSelect] = useState('t1');

  const pushOverlayToStream = async (e) => {
      if (e) e.preventDefault();
      await setDoc(doc(db, 'artifacts', APP_ID, 'auction', 'overlay'), {
          teamId: overlayTeamSelect,
          timestamp: Date.now()
      });
  };

  const closeOverlay = async (e) => {
      if (e) e.preventDefault();
      await setDoc(doc(db, 'artifacts', APP_ID, 'auction', 'overlay'), {
          teamId: null,
          timestamp: Date.now()
      });
  };

  const handleForceSync = async () => {
      if (auctionState?.playerData) {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'auction', 'current'), {
              lastSyncPing: Date.now() 
          });
          alert("Force sync signal sent to all screens!");
      } else {
          alert("No player currently on screen to sync.");
      }
  };

  const [lastSoldPopup, setLastSoldPopup] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubAuction = onSnapshot(doc(db, 'artifacts', APP_ID, 'auction', 'current'), (docSnap) => {
      if (docSnap.exists()) setAuctionState(docSnap.data() || null);
    });

    const unsubTeams = onSnapshot(doc(db, 'artifacts', APP_ID, 'auction', 'wallets'), (docSnap) => {
      if (docSnap.exists()) {
        setTeamWallets(docSnap.data() || {});
      } else {
        const initialWallets = {};
        TEAMS_INFO.forEach(t => { initialWallets[t.id] = { purse: 150000, players: [] }; });
        setDoc(docSnap.ref, initialWallets);
      }
    });

    const unsubRoster = onSnapshot(doc(db, 'artifacts', APP_ID, 'auction', 'roster'), (docSnap) => {
        if (docSnap.exists()) {
            setRoster(docSnap.data().players || []);
        } else {
            setRoster([]);
        }
    });

    return () => { unsubAuction(); unsubTeams(); unsubRoster(); };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!auctionState || auctionState.status !== 'active') {
      setTimeLeft(0);
      return;
    }
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((auctionState.endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && !isProcessing) {
          setIsProcessing(true);
          if (auctionState.highestBidder) {
              processSale(auctionState.highestBidder, auctionState.currentBid, auctionState.highestBidderName, auctionState.playerData);
          } else {
              processUnsold(auctionState.playerData);
          }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [auctionState, isProcessing]);

  const recentTrades = useMemo(() => {
      const trades = [];
      Object.entries(teamWallets).forEach(([teamId, wallet]) => {
          if (wallet.players) {
              wallet.players.forEach(p => {
                  trades.push({
                      ...p,
                      teamName: TEAMS_INFO.find(t => t.id === teamId)?.name || 'Unknown',
                      teamLogo: TEAMS_INFO.find(t => t.id === teamId)?.logo
                  });
              });
          }
      });
      return trades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);
  }, [teamWallets]);

  const handleLogin = (e) => {
      e.preventDefault();
      if (passwordInput === 'ash75M') {
          setIsAuthenticated(true);
          setAuthError(false);
      } else {
          setAuthError(true);
          setPasswordInput('');
      }
  };

  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const playersData = JSON.parse(event.target.result);
              if (!Array.isArray(playersData)) throw "JSON must be an array of players.";
              
              await setDoc(doc(db, 'artifacts', APP_ID, 'auction', 'roster'), { players: playersData });
              alert(`Successfully loaded ${playersData.length} players into the roster!`);
              
              if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (error) {
              alert("Error parsing JSON file. Please ensure it is formatted correctly. Error: " + error);
          }
      };
      reader.readAsText(file);
  };

  // 🚨 FIXED: Ensure fresh time tracking states for new player 🚨
  const pushToScreen = async (player) => {
      if (!player) return;
      await setDoc(doc(db, 'artifacts', APP_ID, 'auction', 'current'), {
          status: 'waiting',
          playerData: player,
          currentBid: player.basePrice || 1000,
          highestBidder: null,
          highestBidderName: null,
          endTime: 0,
          bannedTeamId: null, 
          refundOwedToTeamId: null,
          extraTimeAdded: 0, 
          timeRequests: [], // Permanent history clears for new player
          pendingTimeRequests: [] // Temporary alert clears for new player
      });
  };

  const loadNextPendingPlayer = async () => {
      const rosterRef = doc(db, 'artifacts', APP_ID, 'auction', 'roster');
      const rosterDoc = await getDoc(rosterRef);
      
      if (rosterDoc.exists()) {
          const currentRoster = rosterDoc.data().players || [];
          const nextPlayer = currentRoster.find(p => p.status === 'pending');
          
          if (nextPlayer) {
              await pushToScreen(nextPlayer);
          } else {
              await setDoc(doc(db, 'artifacts', APP_ID, 'auction', 'current'), { status: 'idle', playerData: null });
              alert("All players have been processed!");
          }
      }
  };

  const processSale = async (teamId, price, teamName, playerToSell) => {
      if (!playerToSell) return;
      
      try {
          await runTransaction(db, async (transaction) => {
              const walletsRef = doc(db, 'artifacts', APP_ID, 'auction', 'wallets');
              const rosterRef = doc(db, 'artifacts', APP_ID, 'auction', 'roster');
              const currentRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');

              const walletDoc = await transaction.get(walletsRef);
              const rosterDoc = await transaction.get(rosterRef);
              const currentDoc = await transaction.get(currentRef);

              const refundTeamId = currentDoc.exists() ? currentDoc.data().refundOwedToTeamId : null;

              const wallets = walletDoc.data() || {};
              if (!wallets[teamId]) wallets[teamId] = { purse: 150000, players: [] };
              if (!wallets[teamId].players) wallets[teamId].players = [];

              if (wallets[teamId].purse < price) throw "Team does not have enough purse remaining!";

              wallets[teamId].purse -= price;
              wallets[teamId].players.push({
                  id: playerToSell.id || 'N/A',
                  name: playerToSell.name || 'Unknown',
                  price: price,
                  role: playerToSell.role || 'Player',
                  imageUrl: playerToSell.imageUrl || '',
                  basePrice: playerToSell.basePrice || 1000,
                  timestamp: Date.now()
              });

              if (refundTeamId && wallets[refundTeamId]) {
                  wallets[refundTeamId].purse += price;
              }

              const currentRoster = rosterDoc.exists() ? rosterDoc.data().players || [] : [];
              const updatedPlayers = currentRoster.map(p => p.id === playerToSell.id ? { ...p, status: 'sold' } : p);

              const walletUpdates = { [teamId]: wallets[teamId] };
              if (refundTeamId && wallets[refundTeamId]) {
                  walletUpdates[refundTeamId] = wallets[refundTeamId];
              }

              transaction.update(walletsRef, walletUpdates);
              transaction.update(currentRef, { 
                  status: 'sold', 
                  currentBid: price, 
                  highestBidderName: teamName || 'Unknown Team',
                  bannedTeamId: null,
                  refundOwedToTeamId: null
              });
              transaction.update(rosterRef, { players: updatedPlayers });
          });
          
          setLastSoldPopup({ name: playerToSell.name, price: price, teamName: teamName });
          setTimeout(() => setLastSoldPopup(null), 5000);

          setTimeout(() => {
              loadNextPendingPlayer();
              setIsProcessing(false);
          }, 4000);

      } catch (error) {
          alert(`Transaction Failed: ${error}`);
          setIsProcessing(false);
      }
  };

  const processUnsold = async (playerToSell) => {
      if (!playerToSell) return;
      
      try {
          await runTransaction(db, async (transaction) => {
              const currentRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');
              const rosterRef = doc(db, 'artifacts', APP_ID, 'auction', 'roster');

              const rosterDoc = await transaction.get(rosterRef);

              transaction.update(currentRef, { 
                  status: 'unsold',
                  bannedTeamId: null,
                  refundOwedToTeamId: null
              });

              const currentRoster = rosterDoc.exists() ? rosterDoc.data().players || [] : [];
              const updatedPlayers = currentRoster.map(p => p.id === playerToSell.id ? { ...p, status: 'unsold' } : p);
              transaction.update(rosterRef, { players: updatedPlayers });
          });

          setTimeout(() => {
              loadNextPendingPlayer();
              setIsProcessing(false);
          }, 3000);

      } catch (error) {
          console.error(error);
          setIsProcessing(false);
      }
  };

  const handleRevokePlayer = async (teamId, player) => {
      if(!window.confirm(`PUNISHMENT: Revoke ${player.name} from this team?\n\nThey will be sent back to auction immediately. The team will NOT be refunded now. Instead, whatever amount the player sells for next will be given to this team. They will also be banned from bidding on this player.`)) return;

      try {
          await runTransaction(db, async (transaction) => {
              const walletsRef = doc(db, 'artifacts', APP_ID, 'auction', 'wallets');
              const rosterRef = doc(db, 'artifacts', APP_ID, 'auction', 'roster');
              const currentRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');

              const walletDoc = await transaction.get(walletsRef);
              const rosterDoc = await transaction.get(rosterRef);

              const wallets = walletDoc.data() || {};
              const teamData = wallets[teamId];
              
              teamData.players = teamData.players.filter(p => p.id !== player.id);

              const currentRoster = rosterDoc.exists() ? rosterDoc.data().players || [] : [];
              const updatedPlayers = currentRoster.map(p => p.id === player.id ? { ...p, status: 'pending' } : p);

              transaction.update(walletsRef, { [teamId]: teamData });
              transaction.update(rosterRef, { players: updatedPlayers });

              transaction.set(currentRef, {
                  status: 'waiting',
                  playerData: { ...player, basePrice: player.basePrice || 1000 },
                  currentBid: player.basePrice || 1000,
                  highestBidder: null,
                  highestBidderName: null,
                  endTime: 0,
                  bannedTeamId: teamId, 
                  refundOwedToTeamId: teamId,
                  extraTimeAdded: 0, 
                  timeRequests: [],
                  pendingTimeRequests: []
              });
          });
          alert(`${player.name} has been revoked and sent back to auction!`);
      } catch (error) {
          alert(`Revoke failed: ${error}`);
      }
  };

  // 🚨 FIXED: ONLY CLEAR PENDING REQUESTS SO BUTTON STAYS LOCKED 🚨
  const handleApproveTime = async () => {
      if (!auctionState || auctionState.status !== 'active') return;
      setIsProcessing(true);
      try {
          await runTransaction(db, async (transaction) => {
              const currentRef = doc(db, 'artifacts', APP_ID, 'auction', 'current');
              const docSnap = await transaction.get(currentRef);
              if (!docSnap.exists()) return;
              const data = docSnap.data();
              
              transaction.update(currentRef, {
                  endTime: data.endTime + 40000,
                  extraTimeAdded: (data.extraTimeAdded || 0) + 40000,
                  pendingTimeRequests: [] // Clear ONLY the alert list!
              });
          });
      } catch(err) {
          console.error(err);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAddBalance = async (e) => {
      e.preventDefault();
      if(!addBalanceAmount) return;
      const amount = Number(addBalanceAmount);
      
      const walletsRef = doc(db, 'artifacts', APP_ID, 'auction', 'wallets');
      const currentPurse = teamWallets[addBalanceTeam]?.purse || 0;
      let newTotal = currentPurse + amount;
      
      if(newTotal > 180000) newTotal = 180000;
      
      await updateDoc(walletsRef, {
          [`${addBalanceTeam}.purse`]: newTotal
      });
      
      alert(`Successfully added funds!`);
      setAddBalanceAmount('');
  };

  const handleSaveInlinePurse = async (teamId) => {
      let val = Number(tempPurseValue);
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      if (val > 180000) val = 180000;

      const walletsRef = doc(db, 'artifacts', APP_ID, 'auction', 'wallets');
      await updateDoc(walletsRef, {
          [`${teamId}.purse`]: val
      });
      setEditingPurseTeam(null);
  };

  const handleManualSellSubmit = (e) => {
      e.preventDefault();
      const price = Number(manualSellPrice);
      const tName = TEAMS_INFO.find(t=>t.id === manualSellTeam)?.name || 'Unknown Team';
      setShowSellModal(false);
      setIsProcessing(true);
      processSale(manualSellTeam, price, tName, auctionState.playerData);
  };

  const handleEmergencyReset = async () => {
      const confirmInput = window.prompt("WARNING: This will reset all team budgets to 150k, clear all team squads, and set all players back to 'pending'.\n\nType 'reset' below to confirm:");
      
      if(confirmInput !== 'reset') {
          alert("Reset cancelled.");
          return;
      }
      
      try {
          const initialWallets = {};
          TEAMS_INFO.forEach(t => { initialWallets[t.id] = { purse: 150000, players: [] }; });
          await setDoc(doc(db, 'artifacts', APP_ID, 'auction', 'wallets'), initialWallets);
          
          await setDoc(doc(db, 'artifacts', APP_ID, 'auction', 'current'), { status: 'idle', playerData: null });

          const rosterRef = doc(db, 'artifacts', APP_ID, 'auction', 'roster');
          const rosterSnap = await getDoc(rosterRef);
          if (rosterSnap.exists()) {
              const currentRoster = rosterSnap.data().players || [];
              const pendingRoster = currentRoster.map(p => ({ ...p, status: 'pending' }));
              await updateDoc(rosterRef, { players: pendingRoster });
          }
          
          alert("Auction completely reset! Players are back in the queue.");
      } catch (error) {
          alert(`Reset failed: ${error}`);
      }
  };

  const startAuction = async () => updateDoc(doc(db, 'artifacts', APP_ID, 'auction', 'current'), { status: 'active', endTime: Date.now() + 30000 });
  const pauseAuction = async () => updateDoc(doc(db, 'artifacts', APP_ID, 'auction', 'current'), { status: 'paused' });

  if (!isAuthenticated) {
      return (
          <div className="flex items-center justify-center min-h-[60vh] px-4 animate-fadeIn">
              <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100"><Gavel className="w-8 h-8 text-blue-600" /></div>
                  <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Auctioneer Access</h2>
                  <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Enter Password" className={`w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-center tracking-widest font-mono text-lg mb-4 mt-6 ${authError ? 'border-red-400' : 'border-slate-200'}`} />
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-md">Unlock Command Center</button>
              </form>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-6 px-4 animate-fadeIn relative">
      
      {/* SUCCESS POPUP NOTIFICATION */}
      {lastSoldPopup && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-bounce shadow-2xl">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-3xl shadow-emerald-500/30 flex items-center gap-4 border border-emerald-400">
                  <div className="bg-white/20 p-2.5 rounded-full"><CheckCircle className="w-8 h-8 text-white" /></div>
                  <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 mb-0.5">Player Successfully Sold</p>
                      <p className="text-xl font-black uppercase leading-tight">{lastSoldPopup.name}</p>
                      <p className="text-sm font-medium mt-1">To <span className="font-bold text-amber-300">{lastSoldPopup.teamName}</span> for <span className="font-mono font-black">৳{lastSoldPopup.price.toLocaleString()}</span></p>
                  </div>
              </div>
          </div>
      )}

      {/* MANUAL SELL MODAL */}
      {showSellModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                  <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-3 uppercase">Manual Sell: {auctionState?.playerData?.name || 'Player'}</h2>
                  <form onSubmit={handleManualSellSubmit} className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Select Team</label>
                          <select value={manualSellTeam} onChange={e=>setManualSellTeam(e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700">
                              {TEAMS_INFO.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Final Price</label>
                          <input type="number" required value={manualSellPrice} onChange={e=>setManualSellPrice(e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800" placeholder="e.g. 15000" />
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowSellModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                          <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md">Confirm Sell</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Auctioneer Command</h1>
          </div>
          
          <div className="flex items-center gap-3">
              <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition">
                  <UploadCloud className="w-4 h-4"/> Upload JSON
              </button>
              
              <button onClick={handleForceSync} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition">
                  <RefreshCw className="w-4 h-4"/> Force Sync
              </button>

              <button onClick={handleEmergencyReset} className="flex items-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition">
                  <AlertCircle className="w-4 h-4"/> Reset Auction
              </button>
          </div>
      </div>

     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          
        <div className="lg:col-span-1 bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 text-white flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live Monitor
            </h3>
            
            {auctionState?.playerData ? (
                <div className="flex-1 flex flex-col relative">
                    {isProcessing && <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl"><Loader className="w-8 h-8 text-blue-400 animate-spin mb-2"/><span className="text-xs font-bold uppercase tracking-widest text-blue-300">Processing...</span></div>}
                    
                    <img src={auctionState.playerData.imageUrl || '/api/placeholder/150/150'} className="w-24 h-24 rounded-xl object-cover border border-slate-700 mx-auto mb-4 bg-slate-800" alt="Player" />
                    <div className="text-center mb-6">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase">{auctionState.playerData.id || 'N/A'}</span>
                        <h2 className="text-2xl font-black mt-2 mb-1 uppercase">{auctionState.playerData.name || 'Unknown'}</h2>
                        
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            {auctionState.playerData.role || 'Player'} • Batch {auctionState.playerData.batch || 'N/A'}
                        </p>
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 text-center mb-auto">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Current Bid</p>
                        <p className="text-4xl font-mono font-black text-emerald-400 mb-2">৳{auctionState?.currentBid?.toLocaleString() || 0}</p>
                        <p className="text-xs font-bold text-slate-300">Leader: <span className="text-white uppercase">{auctionState?.highestBidderName || 'None'}</span></p>
                    </div>

                    <div className="mt-6 text-center">
                        <p className={`text-xl font-black font-mono tracking-widest ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{timeLeft}s</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Status: {auctionState?.status || 'idle'}</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                    <p className="font-bold uppercase tracking-widest text-sm">Screen is Empty</p>
                    <button onClick={loadNextPendingPlayer} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500">Load Next Player</button>
                </div>
            )}
        </div>

          <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3 flex items-center justify-between">
                      <span>Timer & Actions</span>
                      <span className="text-[10px] text-slate-400 font-medium normal-case tracking-normal">Auto-sells at 0s</span>
                  </h3>
                  <div className="flex flex-wrap gap-3">
                      <button onClick={startAuction} disabled={!auctionState?.playerData || isProcessing} className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50">
                          <Play className="w-4 h-4" /> Start Bidding
                      </button>
                      <button onClick={pauseAuction} disabled={!auctionState?.playerData || isProcessing} className="flex-1 min-w-[120px] bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50">
                          <Pause className="w-4 h-4" /> Pause
                      </button>
                      <button onClick={()=>setShowSellModal(true)} disabled={!auctionState?.playerData || isProcessing} className="flex-1 min-w-[120px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50">
                          <CheckCircle className="w-4 h-4" /> Manual Sell
                      </button>
                      <button onClick={()=>{setIsProcessing(true); processUnsold(auctionState?.playerData);}} disabled={!auctionState?.playerData || isProcessing} className="flex-1 min-w-[120px] bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50">
                          <XCircle className="w-4 h-4" /> Mark Unsold
                      </button>
                  </div>

                  {/* 🚨 ADMIN APPROVAL PANEL CHECKS PENDING REQUESTS 🚨 */}
                  {auctionState?.pendingTimeRequests?.length > 0 && (
                      <div className="mt-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-2xl p-4 flex items-center justify-between animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                          <div className="flex flex-col">
                              <span className="text-amber-600 text-xs font-black uppercase tracking-widest flex items-center gap-1"><Clock className="w-3 h-3"/> Time Extension Requested!</span>
                              <div className="flex gap-1 mt-1">
                                  {auctionState.pendingTimeRequests.map(tId => <span key={tId} className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">{TEAMS_INFO.find(t=>t.id===tId)?.name}</span>)}
                              </div>
                          </div>
                          <button onClick={handleApproveTime} disabled={isProcessing} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition active:scale-95">
                              Approve +40s
                          </button>
                      </div>
                  )}
              </div>

              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 shadow-sm border border-blue-800">
                  <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-4 border-b border-blue-800/50 pb-3 flex items-center justify-between">
                      <span>Stream Overlay Control</span>
                      <span className="text-[10px] text-blue-400 font-medium normal-case tracking-normal">Stays on screen until hidden</span>
                  </h3>
                  <form className="flex gap-3">
                      <select value={overlayTeamSelect} onChange={e=>setOverlayTeamSelect(e.target.value)} className="flex-1 p-3 rounded-xl border border-blue-700 bg-blue-950 font-bold text-blue-100 outline-none focus:border-blue-400">
                          {TEAMS_INFO.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button onClick={pushOverlayToStream} type="button" className="px-6 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 shadow-lg shadow-blue-500/30 transition uppercase text-xs tracking-wider">
                          Show
                      </button>
                      <button onClick={closeOverlay} type="button" className="px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 shadow-lg shadow-red-500/30 transition uppercase text-xs tracking-wider flex items-center gap-1">
                          <X className="w-4 h-4"/> Hide
                      </button>
                  </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-emerald-500"/> Add Purse Balance
                      </h3>
                      <form onSubmit={handleAddBalance}>
                          <select value={addBalanceTeam} onChange={e=>setAddBalanceTeam(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 mb-3">
                              {TEAMS_INFO.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <input type="number" required value={addBalanceAmount} onChange={e=>setAddBalanceAmount(e.target.value)} placeholder="Amount (e.g. 15000)" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 mb-3" />
                          <div className="flex gap-2 mb-3">
                              <button type="button" onClick={() => setAddBalanceAmount('10000')} className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100">+10k</button>
                              <button type="button" onClick={() => setAddBalanceAmount('20000')} className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100">+20k</button>
                          </div>
                          <button type="submit" className="w-full py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-md transition">Add Funds</button>
                      </form>
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col h-full">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Player Roster Queue</h3>
                      <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                          {roster?.filter(p => p.status === 'pending' || p.status === 'unsold').map((p) => (
                              <div key={p.id} className="flex flex-col p-4 border border-slate-100 rounded-xl mb-3 hover:bg-slate-50 transition gap-3 bg-white shadow-sm">
                                  <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                          <img src={p.imageUrl || '/api/placeholder/40/40'} className="w-full h-full object-cover" alt="Pic"/>
                                      </div>
                                      <div className="flex-1">
                                          <p className="text-sm font-bold text-slate-800 leading-tight uppercase">
                                              {p.name} <span className="text-[10px] text-slate-400 font-mono ml-1 uppercase">{p.id}</span>
                                          </p>
                                          <p className="text-xs text-slate-500 font-medium mt-0.5">{p.role} • ৳{p.basePrice?.toLocaleString()}</p>
                                      </div>
                                  </div>

                                  <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100/50">
                                      <div>
                                          {p.status === 'unsold' && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded uppercase tracking-wider">Unsold</span>}
                                      </div>
                                      <button onClick={() => pushToScreen(p)} disabled={isProcessing} className="px-4 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg hover:bg-blue-100 transition disabled:opacity-50">
                                          Push to Screen
                                      </button>
                                  </div>
                              </div>
                          ))}
                          {roster?.filter(p => p.status !== 'sold').length === 0 && <p className="text-center text-slate-400 font-medium py-4">All players have been sold!</p>}
                      </div>
                  </div>
              </div>

          </div>
      </div>

      <div className="mb-10">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" /> Recent 10 Trades
          </h3>
          {recentTrades.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest shadow-sm">
                  No successful trades yet
              </div>
          ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {recentTrades.map((trade, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 min-w-[250px] flex-shrink-0 flex items-center gap-4 hover:-translate-y-1 transition-transform">
                          <img src={trade.imageUrl || '/api/placeholder/40/40'} className="w-12 h-12 rounded-xl object-cover border border-slate-100 bg-slate-50" alt="player"/>
                          <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-800 uppercase truncate">{trade.name}</p>
                              <div className="flex items-center gap-1.5 mt-1 bg-slate-50 rounded px-1.5 py-0.5 border border-slate-100 w-fit">
                                  <img src={trade.teamLogo} className="w-3 h-3 object-contain" alt="team"/>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[100px]">{trade.teamName}</p>
                              </div>
                              <p className="text-[14px] font-mono font-black text-emerald-600 mt-1">৳{trade.price.toLocaleString()}</p>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-500" /> Franchise Live Status
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEAMS_INFO.map(team => {
              const wallet = teamWallets[team.id] || { purse: 150000, players: [] };
              const playersList = wallet.players || [];
              
              return (
                  <div key={team.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <img src={team.logo} className="w-10 h-10 object-contain drop-shadow-sm bg-white rounded-full border border-slate-200 p-0.5" alt="logo" />
                              <h4 className="font-extrabold text-slate-800 text-sm">{team.name}</h4>
                          </div>
                          <span className="bg-blue-100 text-blue-700 text-xs font-black px-2 py-1 rounded-lg">{playersList.length}/15</span>
                      </div>
                      
                      <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Remaining Purse</span>
                          
                          {editingPurseTeam === team.id ? (
                              <div className="flex items-center gap-1">
                                  <input 
                                      type="number" 
                                      value={tempPurseValue}
                                      onChange={e => setTempPurseValue(e.target.value)}
                                      className="w-24 px-2 py-1 text-sm font-bold text-emerald-700 bg-white border border-emerald-300 rounded outline-none"
                                  />
                                  <button onClick={() => handleSaveInlinePurse(team.id)} className="p-1 text-emerald-600 hover:bg-emerald-200 rounded transition"><Check className="w-4 h-4" /></button>
                                  <button onClick={() => setEditingPurseTeam(null)} className="p-1 text-red-500 hover:bg-red-200 rounded transition"><X className="w-4 h-4" /></button>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2">
                                  <span className="text-xl font-black font-mono text-emerald-700">৳{wallet.purse?.toLocaleString() || '150,000'}</span>
                                  <button 
                                      onClick={() => { setEditingPurseTeam(team.id); setTempPurseValue(wallet.purse || 150000); }} 
                                      className="text-emerald-600/50 hover:text-emerald-600 transition p-1"
                                      title="Edit Balance"
                                  >
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                              </div>
                          )}

                      </div>

                      <div className="p-4 flex-1 bg-white max-h-48 overflow-y-auto">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Acquired Players</p>
                          {playersList.length === 0 ? (
                              <p className="text-xs text-slate-400 font-medium italic">No players purchased yet.</p>
                          ) : (
                              <div className="space-y-2">
                                  {playersList.map((p, i) => (
                                      <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                                          <div className="flex items-center gap-2 min-w-0">
                                              <img src={p.imageUrl || '/api/placeholder/40/40'} className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" alt="pic"/>
                                              <span className="font-bold text-xs text-slate-700 truncate uppercase">{p.name || 'Unknown'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-slate-600 font-mono text-xs font-black shrink-0">৳{p.price?.toLocaleString() || 0}</span>
                                              
                                              <button 
                                                  onClick={() => handleRevokePlayer(team.id, p)} 
                                                  title="Revoke Player & Punish Team" 
                                                  className="text-red-300 hover:text-red-600 transition-colors p-1 bg-white rounded-md border border-slate-200 hover:border-red-200 opacity-0 group-hover:opacity-100"
                                              >
                                                  <RotateCcw className="w-3 h-3" />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              );
          })}
      </div>

    </div>
  );
}