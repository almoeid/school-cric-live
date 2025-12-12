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
const LoginView = React.lazy(() => import('./views/auth/Login')); 
const PlayerCareer = React.lazy(() => import('./views/viewer/PlayerCareer'));
const RulesView = React.lazy(() => import('./views/viewer/RulesView'));
const AboutView = React.lazy(() => import('./views/viewer/AboutView'));
// NEW: Import Gallery View
const GalleryView = React.lazy(() => import('./views/viewer/GalleryView'));

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  
  const [currentMatch, setCurrentMatch] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null); 
  
  const [loading, setLoading] = useState(true);

  // --- 1. AUTH INITIALIZATION ---
  useEffect(() => {
    const initAuth = async () => {
       try { 
           if (!auth.currentUser) await signInAnonymously(auth); 
       } catch(e) { 
           console.error("Auth Init Failed:", e); 
       }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setTimeout(() => setLoading(false), 1500);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. DATA SYNCING ---
  useEffect(() => {
    if (!user) return;

    const unsubMatches = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), orderBy('timestamp', 'desc')), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(data);
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

  // --- 3. ROUTING LOGIC ---
  useEffect(() => {
      // 1. Check Pathname for static pages (/rules, /aboutus, /login)
      const path = window.location.pathname;
      if (path === '/rules') {
          setView('rules');
          return;
      }
      if (path === '/aboutus' || path === '/about') { // Updated to handle both /aboutus and /about
          setView('about');
          return;
      }
      // NEW: Gallery Route
      if (path === '/gallery') {
          setView('gallery');
          return;
      }
      if (path === '/login') {
          setView('login');
          return;
      }

      // 2. Check Query Params for dynamic content
      if (matches.length === 0 && tournaments.length === 0) return;

      const params = new URLSearchParams(window.location.search);
      const sharedMatchId = params.get('matchId');
      const sharedTournamentId = params.get('tournamentId');

      if (sharedMatchId && !currentMatch && view !== 'match') {
          const foundMatch = matches.find(m => m.id === sharedMatchId);
          if (foundMatch) {
              setCurrentMatch(foundMatch);
              setView('match');
          }
      }
      
      if (sharedTournamentId && !selectedTournament && view !== 'tournament-details') {
           const foundTournament = tournaments.find(t => t.id === sharedTournamentId);
           if (foundTournament) {
               setSelectedTournament(foundTournament);
               setView('tournament-details');
           }
      }
  }, [matches, tournaments, currentMatch, selectedTournament, view]);

  // --- HANDLERS ---
  const goHome = () => {
      setView('home');
      setCurrentMatch(null);
      setSelectedTournament(null);
      setSelectedPlayer(null);
      window.history.pushState({}, '', '/');
  };

  const handleLoginClick = () => {
      if (user && !user.isAnonymous) {
          setView('admin-dash');
      } else {
          setView('login');
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-20 relative">
      <nav className="bg-gray-900 text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div onClick={goHome} className="flex items-center space-x-2 cursor-pointer font-bold text-xl tracking-tight">
             <Activity className="text-green-400" /> <span>ZBSMCric<span className="text-green-400">.Live</span></span>
          </div>
          <div className="flex space-x-4 items-center">
             {(user && !user.isAnonymous) && (
                 <button onClick={() => setView('admin-dash')} className="text-xs font-bold bg-green-600 px-3 py-1.5 rounded-full hover:bg-green-700 transition">
                     ADMIN DASH
                 </button>
             )}
             <button onClick={handleLoginClick} className="p-1 rounded-full hover:bg-gray-800 transition">
                {user && !user.isAnonymous ? <Shield className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-gray-400" />}
             </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4">
        <Suspense fallback={<div className="p-10 text-center text-gray-500">Loading...</div>}>
            
            {view === 'home' && (
                <HomeView 
                    matches={matches} 
                    tournaments={tournaments} 
                    setCurrentMatch={setCurrentMatch} 
                    setSelectedTournament={setSelectedTournament} 
                    setView={setView} 
                />
            )}

            {/* INFO PAGES */}
            {view === 'rules' && <RulesView setView={setView} />}
            {view === 'about' && <AboutView setView={setView} />}
            {/* NEW VIEW */}
            {view === 'gallery' && <GalleryView setView={setView} />}

            {view === 'login' && (
                <LoginView 
                    onLoginSuccess={() => setView('admin-dash')} 
                    onCancel={() => setView('home')} 
                />
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
                    setSelectedPlayer={setSelectedPlayer} 
                />
            )}
            
            {view === 'player-career' && selectedPlayer && (
                <PlayerCareer 
                    player={selectedPlayer} 
                    matches={matches} 
                    setView={setView} 
                />
            )}

        </Suspense>
      </div>
      <Watermark />
    </div>
  );
}