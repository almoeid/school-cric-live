import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc, writeBatch, serverTimestamp, deleteDoc, getDocs, query } from 'firebase/firestore';
import { Play, Trophy, Activity, Database, PlusCircle, Edit2, Trash2, AlertTriangle, Save, X, Upload, User, Crown, Shield, Users, CheckSquare } from 'lucide-react';
import { db, APP_ID, auth } from '../../config/firebase';
import { formatOvers, getInitials } from '../../utils/helpers';
import TeamLogo from '../../components/TeamLogo';
import Modal from '../../components/Modal'; 

export default function AdminDashboard({ matches, teams, tournaments, setView, setCurrentMatch, setSelectedTournament }) {
  const [dashView, setDashView] = useState('main'); 
  const [isLoading, setIsLoading] = useState(false);
  
  const [tossResult, setTossResult] = useState(null);
  const [isTossing, setIsTossing] = useState(false);

  const [newMatchForm, setNewMatchForm] = useState({ teamAId: '', teamBId: '', batFirst: '', overs: 10, venue: 'ZBSM BAZAR GROUND', isScheduled: false });
  
  const [selectingXI, setSelectingXI] = useState(false);
  const [teamAXI, setTeamAXI] = useState([]);
  const [teamBXI, setTeamBXI] = useState([]);

  const createEmptyPlayer = () => ({ name: '', role: 'Batter', isCaptain: false, isWk: false, photo: '' });
  
  const [newTeamForm, setNewTeamForm] = useState({ 
      name: '', 
      color: '#2563EB', 
      logo: '', 
      players: Array(16).fill().map(createEmptyPlayer) 
  });
  
  const [newTournamentForm, setNewTournamentForm] = useState({ name: '', overs: 10, logo: '', teamIds: [] });
  const [newFixtureForm, setNewFixtureForm] = useState({ teamAId: '', teamBId: '', stage: 'Group Stage', date: '', time: '', venue: 'ZBSM BAZAR GROUND' });
  
  const [editingTeam, setEditingTeam] = useState(null);
  const [activeTournament, setActiveTournament] = useState(null);

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || 'Unknown';

  const withTimeout = (promise, ms = 8000) => {
      return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out. Check internet.")), ms))
      ]);
  };

  const processImage = (file, callback) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const scale = 150 / Math.max(img.width, img.height);
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              callback(canvas.toDataURL('image/jpeg', 0.7)); 
          };
      };
  };

  const handleImageUpload = (e, setter, field = 'logo') => {
      if(e.target.files[0]) processImage(e.target.files[0], (base64) => setter(prev => ({ ...prev, [field]: base64 })));
  };

  const handlePlayerPhotoUpload = (e, index, isEditing = false) => {
      if (e.target.files[0]) {
          processImage(e.target.files[0], (base64) => {
              const setter = isEditing ? setEditingTeam : setNewTeamForm;
              setter(prev => {
                  const newPlayers = [...prev.players];
                  if (typeof newPlayers[index] === 'string') {
                      newPlayers[index] = { name: newPlayers[index], role: 'Batter', photo: base64 };
                  } else {
                      newPlayers[index] = { ...newPlayers[index], photo: base64 };
                  }
                  return { ...prev, players: newPlayers };
              });
          });
      }
  };

  const updatePlayerField = (index, field, value, isEditing = false) => {
      const setter = isEditing ? setEditingTeam : setNewTeamForm;
      setter(prev => {
          const newPlayers = [...prev.players];
          if (typeof newPlayers[index] === 'string') {
              newPlayers[index] = { name: newPlayers[index], role: 'Batter', isCaptain: false, isWk: false, photo: '' };
          }
          if (field === 'isCaptain' && value === true) {
              newPlayers.forEach(p => { if (typeof p === 'object') p.isCaptain = false; });
          }
          if (field === 'isWk' && value === true) {
              newPlayers.forEach(p => { if (typeof p === 'object') p.isWk = false; });
          }
          newPlayers[index] = { ...newPlayers[index], [field]: value };
          return { ...prev, players: newPlayers };
      });
  };

  const performToss = () => {
      setIsTossing(true);
      setTossResult(null);
      setTimeout(() => {
          const result = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
          setTossResult(result);
          setIsTossing(false);
      }, 1500);
  };

  const togglePlayerInXI = (player, teamSide) => {
      const list = teamSide === 'A' ? teamAXI : teamBXI;
      const setList = teamSide === 'A' ? setTeamAXI : setTeamBXI;
      const pName = typeof player === 'string' ? player : player.name;
      const exists = list.some(p => (typeof p === 'string' ? p : p.name) === pName);
      const playerObject = typeof player === 'string' ? { name: player, role: 'Batter', isCaptain: false, isWk: false, photo: '' } : player;
      if (exists) {
          setList(list.filter(p => (typeof p === 'string' ? p : p.name) !== pName));
      } else {
          if (list.length >= 11) return alert("Max 11 players allowed!");
          setList([...list, playerObject]);
      }
  };

  const initiateMatchStart = (matchId = null) => {
      if (matchId) {
          const match = matches.find(m => m.id === matchId);
          if (!match) throw new Error("Match not found");
          setNewMatchForm({ 
              teamAId: match.teamAId, 
              teamBId: match.teamBId, 
              batFirst: '',
              overs: match.totalOvers || 10, 
              venue: match.venue || 'ZBSM BAZAR GROUND', 
              isScheduled: true, 
              matchId: matchId 
          });
          setDashView('create-match');
          return;
      }
      if (!newMatchForm.teamAId || !newMatchForm.teamBId) return alert("Select both teams first.");
      if (!newMatchForm.batFirst) return alert("Please complete the toss/batting first selection.");
      const teamA = teams.find(t => t.id === newMatchForm.teamAId);
      const teamB = teams.find(t => t.id === newMatchForm.teamBId);
      setTeamAXI(teamA.players.slice(0, 11));
      setTeamBXI(teamB.players.slice(0, 11));
      setSelectingXI(true); 
  };

  const confirmMatchStart = async () => {
      if (teamAXI.length !== 11 || teamBXI.length !== 11) {
          if(!window.confirm(`Standard cricket requires 11 players.\n\nTeam A: ${teamAXI.length}\nTeam B: ${teamBXI.length}\n\nStart anyway?`)) return;
      }
      setIsLoading(true);
      setTossResult(null);
      try {
        const teamA = teams.find(t => t.id === newMatchForm.teamAId);
        const teamB = teams.find(t => t.id === newMatchForm.teamBId);
        const isTeamABatting = newMatchForm.batFirst === 'A';
        const battingTeam = isTeamABatting ? teamA : teamB;
        const bowlingTeam = isTeamABatting ? teamB : teamA;
        const matchInitData = {
            teamA: teamA.name, teamAId: teamA.id, teamALogo: teamA.logo || '', teamAColor: teamA.color,
            teamAPlayers: teamAXI,
            teamB: teamB.name, teamBId: teamB.id, teamBLogo: teamB.logo || '', teamBColor: teamB.color,
            teamBPlayers: teamBXI,
            battingTeam: battingTeam.name, battingTeamId: battingTeam.id,
            bowlingTeam: bowlingTeam.name, bowlingTeamId: bowlingTeam.id,
            score: 0, wickets: 0, legalBalls: 0, overs: 0, totalOvers: parseInt(newMatchForm.overs),
            timeline: [], status: 'Live', currentInnings: 1, target: null, extras: 0,
            striker: '', nonStriker: '', bowler: '', 
            battingStats: {}, bowlingStats: {}, innings1: null,
            venue: newMatchForm.venue,
            timestamp: serverTimestamp(),
            scorerEmail: auth.currentUser?.email || 'Anonymous', 
            scorerName: auth.currentUser?.displayName || 'Official Scorer'
        };
        if (newMatchForm.isScheduled) {
            await withTimeout(updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', newMatchForm.matchId), matchInitData));
            setCurrentMatch({ id: newMatchForm.matchId, ...matchInitData });
        } else {
            const ref = await withTimeout(addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), { ...matchInitData, matchType: 'Friendly' }));
            setCurrentMatch({ id: ref.id, ...matchInitData });
        }
        setSelectingXI(false);
        setNewMatchForm({ teamAId: '', teamBId: '', batFirst: '', overs: 10, venue: 'ZBSM BAZAR GROUND', isScheduled: false });
        setView('admin-score');
      } catch(err) { alert(err.message); } finally { setIsLoading(false); }
  };

  const startScheduledMatch = (matchId) => {
      initiateMatchStart(matchId);
  };

  const handleCreateTeam = async () => {
    if (!newTeamForm.name) return alert("Team Name required!");
    const validPlayers = newTeamForm.players.filter(p => (typeof p === 'string' ? p.trim() : p.name.trim()) !== '');
    if (validPlayers.length < 2) return alert("Add at least 2 players.");
    setIsLoading(true);
    try {
        await withTimeout(addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'teams'), {
            name: newTeamForm.name, color: newTeamForm.color, logo: newTeamForm.logo, players: validPlayers, timestamp: serverTimestamp()
        }));
        setNewTeamForm({ name: '', color: '#2563EB', logo: '', players: Array(16).fill().map(createEmptyPlayer) });
        alert("Team Created!");
    } catch (err) { alert("Error: " + err.message); } finally { setIsLoading(false); }
  };

  const handleUpdateTeam = async () => {
     if (!editingTeam || !editingTeam.name) return alert("Team name required");
     setIsLoading(true);
     try {
        const validPlayers = editingTeam.players.filter(p => {
             if (typeof p === 'string') return p.trim() !== '';
             if (p && typeof p.name === 'string') return p.name.trim() !== '';
             return false;
        });
        await withTimeout(updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'teams', editingTeam.id), {
            name: editingTeam.name, color: editingTeam.color, logo: editingTeam.logo, players: validPlayers
        }));
        setEditingTeam(null);
        alert("Team Updated Successfully!");
     } catch (err) { alert("Error updating team: " + err.message); } finally { setIsLoading(false); }
  };

  const deleteTeam = async (teamId) => {
    if(!window.confirm("Are you sure you want to delete this team? This cannot be undone.")) return;
    setIsLoading(true);
    try {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'teams', teamId));
        alert("Team deleted successfully");
    } catch (err) { alert("Error deleting team: " + err.message); } finally { setIsLoading(false); }
  };

  const wipeAllData = async () => {
      const confirm1 = window.confirm("⚠️ DANGER: Are you sure you want to DELETE ALL DATA?");
      if (!confirm1) return;
      const confirm2 = window.confirm("‼️ FINAL WARNING: This will delete ALL Matches, Teams, and Tournaments permanently. Confirm?");
      if (!confirm2) return;
      setIsLoading(true);
      try {
          const deleteCollection = async (collName) => {
              const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', collName));
              const snapshot = await getDocs(q);
              const batch = writeBatch(db);
              snapshot.docs.forEach((doc) => { batch.delete(doc.ref); });
              await batch.commit();
          };
          await Promise.all([deleteCollection('matches'), deleteCollection('teams'), deleteCollection('tournaments')]);
          setCurrentMatch(null);
          setSelectedTournament(null);
          alert("💥 System Wiped. All data has been deleted.");
      } catch (err) { alert("Error wiping data: " + err.message); } finally { setIsLoading(false); }
  };

  const createTournament = async () => {
     if (!newTournamentForm.name || newTournamentForm.teamIds.length < 2) return alert("Need name and 2+ teams.");
     setIsLoading(true);
     try {
        await withTimeout(addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tournaments'), { ...newTournamentForm, timestamp: serverTimestamp() }));
        setNewTournamentForm({ name: '', overs: 10, logo: '', teamIds: [] });
        alert("Tournament Created!"); setDashView('tournaments'); 
     } catch (err) { alert("Error: " + err.message); } finally { setIsLoading(false); }
  };

  const deleteMatch = async (matchId) => {
      if(!window.confirm("Are you sure you want to delete this match fixture?")) return;
      setIsLoading(true);
      try {
          await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', matchId));
          alert("Match deleted successfully");
      } catch (err) { alert("Error deleting match: " + err.message); } finally { setIsLoading(false); }
  };

  const deleteTournament = async (id) => {
      if (!window.confirm("Delete this Tournament? (Matches will remain)")) return;
      setIsLoading(true);
      try {
          await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tournaments', id));
          alert("Tournament Deleted.");
      } catch(e) { alert(e.message); }
      setIsLoading(false);
  };

  const addFixture = async () => { 
      if (!newFixtureForm.teamAId || !newFixtureForm.teamBId || !newFixtureForm.date) return alert("Fill all fields");
      if (newFixtureForm.teamAId === newFixtureForm.teamBId) return alert("Cannot select the same team for both sides!");
      setIsLoading(true);
      try {
        const teamA = teams.find(t => t.id === newFixtureForm.teamAId);
        const teamB = teams.find(t => t.id === newFixtureForm.teamBId);
        const scheduleTime = new Date(`${newFixtureForm.date}T${newFixtureForm.time || '10:00'}`).toISOString();
        const matchData = {
            teamA: teamA.name, teamAId: teamA.id, teamALogo: teamA.logo || '', teamAPlayers: teamA.players || [], teamAColor: teamA.color,
            teamB: teamB.name, teamBId: teamB.id, teamBLogo: teamB.logo || '', teamBPlayers: teamB.players || [], teamBColor: teamB.color,
            battingTeam: '', bowlingTeam: '', score: 0, wickets: 0, legalBalls: 0, overs: 0, totalOvers: parseInt(activeTournament.overs),
            timeline: [], status: 'Scheduled', currentInnings: 1, target: null, extras: 0,
            tournamentId: activeTournament.id, stage: newFixtureForm.stage, 
            scheduledTime: scheduleTime, venue: newFixtureForm.venue, timestamp: serverTimestamp()
        };
        await withTimeout(addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), matchData));
        setNewFixtureForm({ teamAId: '', teamBId: '', stage: 'Group Stage', date: '', time: '', venue: 'ZBSM BAZAR GROUND' });
        alert("Fixture Added");
    } catch (err) { alert("Error: " + err.message); } finally { setIsLoading(false); }
  };

  const renderPlayerInput = (p, i, isEditing) => {
      const player = typeof p === 'string' ? { name: p, role: 'Batter', photo: '', isCaptain: false, isWk: false } : p;
      return (
        <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200 mb-2">
            <div className="relative w-10 h-10 shrink-0 group cursor-pointer">
                <input type="file" accept="image/*" onChange={(e) => handlePlayerPhotoUpload(e, i, isEditing)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {player.photo ? (
                    <img src={player.photo} className="w-10 h-10 rounded-full object-cover border border-gray-300" alt="Player" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-300 group-hover:bg-gray-100 transition-colors"><User className="w-5 h-5" /></div>
                )}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
                <input value={player.name} onChange={(e) => updatePlayerField(i, 'name', e.target.value, isEditing)} className="col-span-2 p-1 border rounded text-sm" placeholder={`Player ${i+1}`} />
                <select value={player.role} onChange={(e) => updatePlayerField(i, 'role', e.target.value, isEditing)} className="p-1 border rounded text-xs bg-white">
                    <option>Batter</option><option>Bowler</option><option>All Rounder</option><option>WK-Batter</option>
                </select>
            </div>
            <div className="flex gap-1">
                <button onClick={() => updatePlayerField(i, 'isCaptain', !player.isCaptain, isEditing)} className={`p-1 rounded ${player.isCaptain ? 'bg-yellow-100 text-yellow-600' : 'text-gray-300 hover:bg-gray-100'}`} title="Captain"><Crown className="w-4 h-4" /></button>
                <button onClick={() => updatePlayerField(i, 'isWk', !player.isWk, isEditing)} className={`p-1 rounded w-6 h-6 flex items-center justify-center text-[9px] font-bold ${player.isWk ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:bg-gray-100'}`} title="Wicket Keeper">WK</button>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6">

      {/* MAIN VIEW */}
      {dashView === 'main' && (
        <>
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setDashView('create-match')} className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition flex flex-col items-center justify-center text-center border-b-4 border-green-500"><Play className="w-8 h-8 text-green-600 mb-2" /> <span className="font-bold text-lg">Friendly Match</span></button>
             <button onClick={() => setDashView('tournaments')} className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition flex flex-col items-center justify-center text-center border-b-4 border-yellow-500"><Trophy className="w-8 h-8 text-yellow-500 mb-2" /> <span className="font-bold text-lg">Tournaments</span></button>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-green-100">
             <h3 className="font-bold text-green-800 mb-4 flex items-center"><Activity className="w-5 h-5 mr-2 animate-pulse" /> Live Matches</h3>
             {matches.filter(m => m.status === 'Live' || m.status === 'Concluding').length === 0 && <p className="text-gray-400 text-sm italic">No matches currently live.</p>}
             {matches.filter(m => m.status === 'Live' || m.status === 'Concluding').map(m => (
               <div key={m.id} className="flex flex-col p-4 bg-green-50 border border-green-200 rounded-xl mb-3 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                     <div className="font-bold text-gray-800 text-lg flex items-center gap-2"><TeamLogo name={m.teamA} logo={m.teamALogo} color={m.teamAColor} size="sm" /> vs <TeamLogo name={m.teamB} logo={m.teamBLogo} color={m.teamBColor} size="sm" /></div>
                     <button onClick={() => { setCurrentMatch(m); setView('admin-score'); }} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-green-700 transition">RESUME</button>
                  </div>
                  <div className="flex justify-between items-end"><div className="text-2xl text-green-700 font-mono font-bold">{m.score}/{m.wickets} <span className="text-gray-500 font-sans font-normal text-sm ml-2">Overs: {formatOvers(m.legalBalls)}/{m.totalOvers}</span></div></div>
               </div>
             ))}
          </div>
          <button onClick={() => setDashView('teams')} className="w-full p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition flex flex-col items-center justify-center text-center border-b-4 border-blue-500"><Users className="w-8 h-8 text-blue-600 mb-2" /> <span className="font-bold text-lg">Manage Teams</span></button>
        </>
      )}

      {/* CREATE MATCH VIEW */}
      {dashView === 'create-match' && (
        <div className="bg-white p-6 rounded-xl shadow-md">
           <h2 className="text-xl font-bold mb-6">Start Match</h2>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <select className="p-3 border rounded-lg bg-gray-50" onChange={e => setNewMatchForm({...newMatchForm, teamAId: e.target.value})} value={newMatchForm.teamAId} disabled={newMatchForm.isScheduled}><option value="">Select Team A</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <select className="p-3 border rounded-lg bg-gray-50" onChange={e => setNewMatchForm({...newMatchForm, teamBId: e.target.value})} value={newMatchForm.teamBId} disabled={newMatchForm.isScheduled}><option value="">Select Team B</option>{teams.filter(t => t.id !== newMatchForm.teamAId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
           </div>
           <div className="grid grid-cols-2 gap-4 mb-4">
             <div><label className="text-xs font-bold text-gray-500">Overs</label><input type="number" value={newMatchForm.overs} onChange={e => setNewMatchForm({...newMatchForm, overs: e.target.value})} className="w-full p-3 border rounded-lg" /></div>
             <div><label className="text-xs font-bold text-gray-500">Batting 1st</label><select className="w-full p-3 border rounded-lg" onChange={e => setNewMatchForm({...newMatchForm, batFirst: e.target.value})}><option value="">Select</option>{newMatchForm.teamAId && <option value="A">{getTeamName(newMatchForm.teamAId)}</option>}{newMatchForm.teamBId && <option value="B">{getTeamName(newMatchForm.teamBId)}</option>}</select></div>
           </div>
           <div className="mb-4"><label className="text-xs font-bold text-gray-500">Venue</label><select className="w-full p-3 border rounded-lg bg-gray-50" value={newMatchForm.venue} onChange={e => setNewMatchForm({...newMatchForm, venue: e.target.value})}><option>ZBSM BAZAR GROUND</option><option>ZBSM SCHOOL GROUND</option></select></div>
           <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
               <div className="flex justify-center items-center mb-3"><div className={`w-16 h-16 rounded-full border-4 border-yellow-500 flex items-center justify-center text-xl font-bold text-yellow-600 shadow-md ${isTossing ? 'animate-spin' : ''} ${tossResult ? 'bg-yellow-100' : 'bg-white'}`}>{isTossing ? '...' : (tossResult || '?')}</div></div>
               {tossResult && <div className="text-sm font-bold text-gray-800 mb-3">Result: <span className="text-blue-600 text-lg ml-1">{tossResult}</span></div>}
               <button onClick={performToss} disabled={isTossing} className="px-6 py-2 bg-yellow-500 text-white rounded-full text-sm font-bold hover:bg-yellow-600 transition shadow-sm">Flip Coin</button>
           </div>
           <button onClick={() => initiateMatchStart()} disabled={!newMatchForm.batFirst || isLoading} className={`w-full text-white py-3 rounded-lg font-bold ${isLoading ? 'bg-gray-400' : 'bg-green-600'}`}>{isLoading ? 'Starting...' : 'Select Playing XI & Start'}</button>
           <button onClick={() => setDashView('main')} disabled={isLoading} className="w-full mt-2 text-gray-500">Cancel</button>
        </div>
      )}

      {/* TEAMS VIEW */}
      {dashView === 'teams' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Manage Teams</h2><button onClick={()=>setDashView('main')} className="text-sm text-gray-500">Back</button></div>
           <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-600">
              <h3 className="text-lg font-bold mb-4 flex items-center"><PlusCircle className="w-5 h-5 mr-2" /> Create New Team</h3>
              <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                      <input value={newTeamForm.name} onChange={e => setNewTeamForm({...newTeamForm, name: e.target.value})} className="w-full p-2 border rounded mb-2" placeholder="Team Name" />
                      <input type="color" value={newTeamForm.color} onChange={e => setNewTeamForm({...newTeamForm, color: e.target.value})} className="w-full h-10 p-1 border rounded" />
                  </div>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-2 w-24 h-24 relative hover:bg-gray-50 cursor-pointer">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewTeamForm)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {newTeamForm.logo ? <img src={newTeamForm.logo} alt="Preview" className="w-full h-full object-cover rounded" /> : <div className="text-center"><Upload className="w-6 h-6 text-gray-400 mx-auto" /><span className="text-[10px] text-gray-400">Logo</span></div>}
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 max-h-96 overflow-y-auto pr-1">
                 {newTeamForm.players.map((p, i) => renderPlayerInput(p, i, false))}
              </div>
              <button onClick={handleCreateTeam} disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">{isLoading ? 'Saving...' : 'Save Team'}</button>
           </div>
           {teams.map(team => (
             <div key={team.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                <div className="flex items-center space-x-3"><TeamLogo name={team.name} color={team.color} logo={team.logo} /><div className="font-bold">{team.name}</div></div>
                <div className="flex gap-2">
                    <button onClick={() => setEditingTeam(team)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><Edit2 className="w-4 h-4 text-gray-600" /></button>
                    <button onClick={() => deleteTeam(team.id)} className="p-2 bg-red-100 rounded-full hover:bg-red-200"><Trash2 className="w-4 h-4 text-red-600" /></button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* TOURNAMENTS VIEW */}
      {dashView === 'tournaments' && (
         <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Tournaments</h2><button onClick={()=>setDashView('main')} className="text-sm text-gray-500">Back</button></div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
               <h3 className="font-bold mb-2">Create New</h3>
               <div className="flex gap-2 mb-2">
                   <input placeholder="Tournament Name" className="w-full p-2 border rounded" value={newTournamentForm.name} onChange={e=>setNewTournamentForm({...newTournamentForm, name: e.target.value})} />
                   <div className="border border-dashed rounded p-1 w-12 h-12 relative flex items-center justify-center">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewTournamentForm, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {newTournamentForm.logo ? <img src={newTournamentForm.logo} className="w-full h-full object-cover rounded" /> : <Upload className="w-4 h-4 text-gray-400" />}
                   </div>
               </div>
               <div className="mb-2 max-h-32 overflow-y-auto border p-2 rounded">{teams.map(t => (<label key={t.id} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded"><input type="checkbox" checked={newTournamentForm.teamIds.includes(t.id)} onChange={e => {const ids = newTournamentForm.teamIds; if(e.target.checked) setNewTournamentForm({...newTournamentForm, teamIds: [...ids, t.id]}); else setNewTournamentForm({...newTournamentForm, teamIds: ids.filter(id=>id!==t.id)});}} /><span>{t.name}</span></label>))}</div>
               <button onClick={createTournament} disabled={isLoading} className="w-full bg-black text-white py-2 rounded font-bold">{isLoading ? 'Creating...' : 'Create Tournament'}</button>
            </div>
            {tournaments.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {t.logo ? <img src={t.logo} alt="T" className="w-10 h-10 rounded object-cover" /> : <Trophy className="w-6 h-6 text-yellow-500" />}
                        <div><h3 className="font-bold text-lg">{t.name}</h3><p className="text-xs text-gray-500">{t.teamIds.length} Teams</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={()=>{setActiveTournament(t); setDashView('manage-tournament')}} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs font-bold">Manage</button>
                        <button onClick={() => deleteTournament(t.id)} className="bg-red-50 text-red-600 p-1.5 rounded hover:bg-red-200"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
         </div>
      )}

      {/* MANAGE TOURNAMENT VIEW */}
      {dashView === 'manage-tournament' && activeTournament && (
         <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-bold">{activeTournament.name}</h2>
               <button onClick={()=>setDashView('tournaments')} className="text-sm text-gray-500">Back</button>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
               <h3 className="font-bold mb-3 text-sm uppercase text-gray-500">Add Fixture</h3>
               <div className="grid grid-cols-2 gap-2 mb-2">
                  <select className="p-2 border rounded" onChange={e=>setNewFixtureForm({...newFixtureForm, teamAId: e.target.value})}><option value="">Team A</option>{teams.filter(t=>activeTournament.teamIds.includes(t.id)).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  <select className="p-2 border rounded" onChange={e=>setNewFixtureForm({...newFixtureForm, teamBId: e.target.value})}><option value="">Team B</option>{teams.filter(t=>activeTournament.teamIds.includes(t.id)).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
               </div>
               <div className="grid grid-cols-2 gap-2 mb-2">
                  <input type="date" className="p-2 border rounded" onChange={e=>setNewFixtureForm({...newFixtureForm, date: e.target.value})} />
                  <input type="time" className="p-2 border rounded" onChange={e=>setNewFixtureForm({...newFixtureForm, time: e.target.value})} />
               </div>
               <select className="w-full p-2 border rounded mb-2" value={newFixtureForm.stage} onChange={e=>setNewFixtureForm({...newFixtureForm, stage: e.target.value})}>
                 <option value="Group Stage">Group Stage</option>
                 <option value="Qualifier 1">Qualifier 1</option>
                 <option value="Qualifier 2">Qualifier 2</option>
                 <option value="Eliminator">Eliminator</option>
                 <option value="Semi Final">Semi Final</option>
                 <option value="Final">Final</option>
               </select>
               <div className="mb-4">
                  <label className="text-xs font-bold text-gray-500">Venue</label>
                  <select className="w-full p-2 border rounded bg-gray-50" value={newFixtureForm.venue} onChange={e => setNewFixtureForm({...newFixtureForm, venue: e.target.value})}>
                     <option>ZBSM BAZAR GROUND</option>
                     <option>ZBSM SCHOOL GROUND</option>
                    <option>ZBSM 2NO GATE GROUND</option>
                  </select>
               </div>
               <button onClick={addFixture} disabled={isLoading} className="w-full bg-green-600 text-white py-2 rounded font-bold">{isLoading ? 'Adding...' : 'Add to Schedule'}</button>
            </div>

{/* FIXTURES LIST */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
               <h3 className="font-bold mb-3">Fixtures in this Tournament</h3>
               {matches.filter(m => m.tournamentId === activeTournament.id).length === 0 ? (
                   <p className="text-sm text-gray-400 italic">No fixtures added yet.</p>
               ) : (
                   [...matches.filter(m => m.tournamentId === activeTournament.id)]
                       .sort((a, b) => {
                           const order = { Scheduled: 0, Live: 1, Concluding: 2, Completed: 3 };
                           const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
                           if (diff !== 0) return diff;
                           // Scheduled: soonest first (ascending); Completed: most recent first (descending)
                           const dateA = new Date(a.scheduledTime || a.timestamp);
                           const dateB = new Date(b.scheduledTime || b.timestamp);
                           return a.status === 'Scheduled' ? dateA - dateB : dateB - dateA;
                       })
                       .map((m) => {
                           const isCompleted = m.status === 'Completed' || m.status === 'Concluding';
                           const isLive = m.status === 'Live';
                           const matchDate = m.scheduledTime
                               ? new Date(m.scheduledTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                               : null;
                           const allSorted = [...matches.filter(tm => tm.tournamentId === activeTournament.id)]
                               .sort((a, b) => new Date(a.scheduledTime || a.timestamp) - new Date(b.scheduledTime || b.timestamp));
                           const matchNo = allSorted.findIndex(tm => tm.id === m.id) + 1;
                           return (
                               <div key={m.id} className={`p-3 border-b last:border-0 ${isLive ? 'bg-green-50' : ''}`}>
                                   <div className="flex justify-between items-center mb-1.5">
                                       <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded">M{matchNo}</span>
                                           <span className="text-[10px] font-bold text-gray-400 uppercase">{m.stage}</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                           {matchDate && <span className="text-[10px] text-gray-400">{matchDate}</span>}
                                           {isLive && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded animate-pulse">LIVE</span>}
                                       </div>
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <div>
                                           <span className="font-bold text-gray-800 text-sm">{m.teamA} vs {m.teamB}</span>
                                           {isCompleted && m.result ? (
                                               <div className="text-xs text-green-700 font-medium mt-0.5">{m.result}</div>
                                           ) : isLive ? (
                                               <div className="text-xs text-green-600 font-mono mt-0.5">{m.score}/{m.wickets} ({m.overs || 0} ov)</div>
                                           ) : (
                                               <div className="text-xs text-orange-500 mt-0.5">Scheduled</div>
                                           )}
                                       </div>
                                       <div className="flex items-center gap-2">
                                           {m.status === 'Scheduled' && (
                                               <button onClick={() => startScheduledMatch(m.id)} className="bg-black text-white px-3 py-1 rounded text-xs font-bold">START</button>
                                           )}
                                           <button
                                               onClick={() => { setCurrentMatch(m); setView('match'); }}
                                               className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                               title="View Match"
                                           >
                                               <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                   <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                               </svg>
                                           </button>
                                           <button onClick={() => deleteMatch(m.id)} className="bg-red-100 text-red-600 p-1.5 rounded hover:bg-red-200" title="Delete">
                                               <Trash2 className="w-4 h-4" />
                                           </button>
                                       </div>
                                   </div>
                               </div>
                           );
                       })
               )}
            </div>
         </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
         <Modal title="Edit Team" onClose={() => setEditingTeam(null)}>
             <div className="space-y-3">
                 <div className="flex gap-4">
                     <div className="flex-1">
                        <div><label className="text-xs font-bold text-gray-500">Team Name</label><input value={editingTeam.name} onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})} className="w-full p-2 border rounded" /></div>
                        <div className="mt-2"><label className="text-xs font-bold text-gray-500">Color</label><input type="color" value={editingTeam.color} onChange={(e) => setEditingTeam({...editingTeam, color: e.target.value})} className="w-full h-10 p-1 border rounded" /></div>
                     </div>
                     <div className="mt-4 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-2 w-24 h-24 relative hover:bg-gray-50 cursor-pointer">
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setEditingTeam)} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {editingTeam.logo ? <img src={editingTeam.logo} alt="Preview" className="w-full h-full object-cover rounded" /> : <div className="text-center"><Upload className="w-6 h-6 text-gray-400 mx-auto" /><span className="text-[10px] text-gray-400">Logo</span></div>}
                     </div>
                 </div>
                 <div className="max-h-96 overflow-y-auto space-y-2 p-1">
                    {editingTeam.players.map((p, i) => renderPlayerInput(p, i, true))}
                 </div>
                 <button onClick={handleUpdateTeam} className="w-full bg-green-600 text-white py-3 rounded font-bold mt-4 flex items-center justify-center"><Save className="w-4 h-4 mr-2" /> Save Changes</button>
             </div>
         </Modal>
      )}

      {/* SELECT XI MODAL */}
      {selectingXI && (
           <Modal title="Select Playing XI" onClose={() => setSelectingXI(false)}>
               <div className="space-y-6">
                   <div>
                       <h3 className="font-bold text-blue-800 mb-2 flex justify-between">{getTeamName(newMatchForm.teamAId)} <span className={teamAXI.length === 11 ? "text-green-600" : "text-red-500"}>{teamAXI.length}/11</span></h3>
                       <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded">
                           {teams.find(t => t.id === newMatchForm.teamAId)?.players.map((p, i) => {
                               const pName = typeof p === 'string' ? p : p.name;
                               const isSelected = teamAXI.some(tp => (typeof tp === 'string' ? tp : tp.name) === pName);
                               if (pName.trim() === '') return null;
                               return (
                                   <div key={i} onClick={() => togglePlayerInXI(p, 'A')} className={`p-2 text-sm border rounded cursor-pointer flex items-center gap-2 ${isSelected ? 'bg-blue-100 border-blue-500' : 'bg-white'}`}>
                                       <CheckSquare className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-300'}`} /> {pName}
                                   </div>
                               );
                           })}
                       </div>
                   </div>
                   <div>
                       <h3 className="font-bold text-orange-800 mb-2 flex justify-between">{getTeamName(newMatchForm.teamBId)} <span className={teamBXI.length === 11 ? "text-green-600" : "text-red-500"}>{teamBXI.length}/11</span></h3>
                       <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded">
                           {teams.find(t => t.id === newMatchForm.teamBId)?.players.map((p, i) => {
                               const pName = typeof p === 'string' ? p : p.name;
                               const isSelected = teamBXI.some(tp => (typeof tp === 'string' ? tp : tp.name) === pName);
                               if (pName.trim() === '') return null;
                               return (
                                   <div key={i} onClick={() => togglePlayerInXI(p, 'B')} className={`p-2 text-sm border rounded cursor-pointer flex items-center gap-2 ${isSelected ? 'bg-orange-100 border-orange-500' : 'bg-white'}`}>
                                       <CheckSquare className={`w-4 h-4 ${isSelected ? 'text-orange-600' : 'text-gray-300'}`} /> {pName}
                                   </div>
                               );
                           })}
                       </div>
                   </div>
                   <button onClick={confirmMatchStart} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg">Confirm XI & Start Match</button>
               </div>
           </Modal>
       )}

    </div>
  );
}
