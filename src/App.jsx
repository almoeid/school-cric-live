import React, { useState, useEffect, Suspense } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Activity, Lock, Shield } from 'lucide-react';

import { auth, db, APP_ID } from './config/firebase';
import LoadingSpinner from './components/LoadingSpinner';
import Watermark from './components/Watermark';

// --- LAZY LOAD COMPONENTS ---
const HomeView = React.lazy(() => import('./views/viewer/HomeView'));
const AdminDashboard = React.lazy(() => import('./views/admin/AdminDashboard'));
const MatchDetails = React.lazy(() => import('./views/admin/MatchDetails'));
const ScoringView = React.lazy(() => import('./views/viewer/ScoringView'));
const TournamentDetails = React.lazy(() => import('./views/viewer/TournamentDetails'));

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminPin, setAdminPin] = useState('');

  // --- AUTH & LIVE DATA SYNC ---
  useEffect(() => {
    const initAuth = async () => {
       try { await signInAnonymously(auth); } catch(e) { console.error("Auth Failed:", e); }
    };
    initAuth();
    onAuthStateChanged(auth, (u) => {
        setUser(u);
        setTimeout(() => setLoading(false), 2000);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubMatches = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), orderBy('timestamp', 'desc')), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(data);
      
      // Auto-update the open match if it changes live
      if (currentMatch) {
        const updated = data.find(m => m.id === currentMatch.id);
        if (updated) setCurrentMatch(updated);
      }
      setLoading(false);
    }, (err) => console.error("Match Sync Error:", err));

    const unsubTeams = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'teams'), orderBy('name', 'asc')), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTournaments = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tournaments'), orderBy('timestamp', 'desc')), (snap) => {
       setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubMatches(); unsubTeams(); unsubTournaments(); };
  }, [user, currentMatch?.id]);

  // --- ROUTING LOGIC (Handle Shared Links) ---
  useEffect(() => {
      // Wait for data to load before routing
      if (matches.length === 0 && tournaments.length === 0) return;

      const params = new URLSearchParams(window.location.search);
      const sharedMatchId = params.get('matchId');
      const sharedTournamentId = params.get('tournamentId');

      // Handle Match Link
      if (sharedMatchId && !currentMatch && view !== 'match') {
          const foundMatch = matches.find(m => m.id === sharedMatchId);
          if (foundMatch) {
              setCurrentMatch(foundMatch);
              setView('match');
          }
      }
      
      // Handle Tournament Link
      if (sharedTournamentId && !selectedTournament && view !== 'tournament-details') {
           const foundTournament = tournaments.find(t => t.id === sharedTournamentId);
           if (foundTournament) {
               setSelectedTournament(foundTournament);
               setView('tournament-details');
           }
      }
  }, [matches, tournaments, currentMatch, selectedTournament, view]);

  const handleAdminLogin = () => {
    if (adminPin === '657585') { setView('admin-dash'); setAdminPin(''); } 
    else { alert('Incorrect PASS'); }
  };
  
  // Helper to go home and clean URL
  const goHome = () => {
      setView('home');
      setCurrentMatch(null);
      setSelectedTournament(null);
      // Remove IDs from URL without reloading
      window.history.pushState({}, '', window.location.pathname);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-20 relative">
      <nav className="bg-gray-900 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div onClick={goHome} className="flex items-center space-x-2 cursor-pointer font-bold text-xl tracking-tight">
             <Activity className="text-green-400" /> <span>ZBSMCric<span className="text-green-400">.Live</span></span>
          </div>
          <div className="flex space-x-4">
             {(view === 'admin-dash' || view.startsWith('admin-')) && <button onClick={() => setView('admin-dash')} className="text-xs font-bold bg-green-600 px-3 py-1.5 rounded-full">ADMIN DASH</button>}
             <button onClick={() => view === 'admin-login' ? setView('home') : setView('admin-login')}>
                {view.startsWith('admin') ? <Shield className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5" />}
             </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4">
        <Suspense fallback={<div className="p-4 text-center">Loading Component...</div>}>
            {view === 'home' && (
                <HomeView 
                    matches={matches} 
                    tournaments={tournaments} 
                    setCurrentMatch={setCurrentMatch} 
                    setSelectedTournament={setSelectedTournament} 
                    setView={setView} 
                />
            )}

            {view === 'admin-login' && (
            <div className="flex flex-col items-center justify-center pt-20">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Lock className="w-8 h-8 text-green-600" /></div>
                    <h2 className="text-xl font-bold mb-4">Scorer Login</h2>
                    <input type="password" value={adminPin} onChange={e => setAdminPin(e.target.value)} placeholder="Type Your Pass" className="w-full p-3 border rounded-lg text-center text-xl tracking-widest mb-4" />
                    <button onClick={handleAdminLogin} className="w-full bg-black text-white py-3 rounded-lg font-bold">Access Dashboard</button>
                </div>
            </div>
            )}

            {view === 'admin-dash' && (
                <AdminDashboard 
                    matches={matches} 
                    teams={teams} 
                    tournaments={tournaments} 
                    setView={setView} 
                    setCurrentMatch={setCurrentMatch} 
                    setSelectedTournament={setSelectedTournament} 
                />
            )}

            {view === 'admin-score' && currentMatch && (
                <ScoringView currentMatch={currentMatch} teams={teams} setView={setView} />
            )}

            {view === 'match' && currentMatch && (
                <MatchDetails currentMatch={currentMatch} setView={setView} />
            )}

            {view === 'tournament-details' && selectedTournament && (
                <TournamentDetails 
                    tournament={selectedTournament} 
                    matches={matches} 
                    teams={teams} 
                    setView={setView} 
                    setCurrentMatch={setCurrentMatch}
                />
            )}
        </Suspense>
      </div>

      <Watermark />
    </div>
  );
}