import React, { useState } from 'react';
import { Lock, ChevronRight, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import LiveAuction from './LiveAuction';

const TEAMS = [
  { id: 't1', name: 'Retro Rockets', logo: '/teamlogo/RetroRockets.png', password: 'rr26' },
  { id: 't2', name: 'Storm Challengers', logo: '/teamlogo/StormChallengers.png', password: 'sc26' },
  { id: 't3', name: 'Evergreen Thirteen', logo: '/teamlogo/EvergreenThirteen.png', password: 'et26' },
  { id: 't4', name: 'Dark Horses', logo: '/teamlogo/DarkHorses.png', password: 'dh26' },
  { id: 't5', name: 'Fourteen Phoenix', logo: '/teamlogo/FourteenPhoenix.png', password: 'fp26' },
  { id: 't6', name: 'Prime Riders', logo: '/teamlogo/PrimeRiders.png', password: 'pr26' },
  { id: 't7', name: 'Duronto Ekadosh', logo: '/teamlogo/DurontoEkadosh.png', password: 'de26' },
  { id: 't8', name: 'Invictus Sixteen', logo: '/teamlogo/InvictusSixteen.png', password: 'is26' },
  { id: 't9', name: 'Cric Masters', logo: '/teamlogo/CricMasters.png', password: 'cm26' }
];

export default function TeamLoginGateway() {
  const [authenticatedTeam, setAuthenticatedTeam] = useState(null);
  
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setPasswordInput('');
    setAuthError(false);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === selectedTeam.password) {
      setAuthenticatedTeam({
        id: selectedTeam.id,
        name: selectedTeam.name,
        logo: selectedTeam.logo
      });
      setSelectedTeam(null);
    } else {
      setAuthError(true);
      setPasswordInput('');
    }
  };

  if (authenticatedTeam) {
    return <LiveAuction currentTeamId={authenticatedTeam.id} currentTeamName={authenticatedTeam.name} />;
  }

  return (
    <div className="max-w-5xl mx-auto pt-8 px-2 sm:px-0 pb-20 animate-fadeIn">
      
      {/* HEADER */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-3">
            <div className="bg-blue-50 p-3 rounded-full border border-blue-100">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
          Franchise Login
        </h1>
        <p className="text-slate-500 font-medium mt-2 max-w-md mx-auto">
          Select your franchise and enter your secure access code to enter the live auction room.
        </p>
      </div>

      {/* TEAM GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {TEAMS.map((team) => (
          <div 
            key={team.id}
            onClick={() => handleTeamClick(team)}
            className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 mb-4">
              <img src={team.logo} alt={team.name} className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />
            </div>
            <h3 className="font-extrabold text-sm md:text-base text-slate-800 group-hover:text-blue-600 transition-colors">
              {team.name}
            </h3>
            <div className="mt-3 flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
              Authenticate <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>

      {/* PASSWORD MODAL OVERLAY */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
            
            <button 
              onClick={() => setSelectedTeam(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-8">
              <img src={selectedTeam.logo} alt={selectedTeam.name} className="w-20 h-20 object-contain mb-4 drop-shadow-md" />
              <h2 className="text-xl font-extrabold text-slate-800">{selectedTeam.name}</h2>
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest border border-slate-200">
                <Lock className="w-3 h-3" /> Restricted Access
              </span>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Passcode"
                  className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-xl text-slate-800 font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${authError ? 'border-red-400 focus:ring-red-500 bg-red-50' : 'border-slate-200'}`}
                  autoFocus
                />
              </div>
              
              {authError && (
                <div className="flex items-center justify-center gap-1.5 text-red-500 text-xs font-bold animate-pulse">
                  <ShieldAlert className="w-4 h-4" /> Incorrect Passcode
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-3.5 bg-blue-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
              >
                Enter Auction
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}