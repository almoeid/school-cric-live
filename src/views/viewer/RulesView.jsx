import React from 'react';
import { ArrowLeft, BookOpen, Calculator, Award, Star } from 'lucide-react';

export default function RulesView({ setView }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* --- PROFESSIONAL HERO HEADER --- */}
      <div className="bg-gray-900 text-white -mt-4 -mx-4 pt-12 pb-36 px-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="max-w-3xl mx-auto relative z-10 text-center">
             {/* Nav - HIDDEN ON MOBILE */}
             <div className="absolute left-0 top-0 hidden md:block">
                <button 
                    onClick={() => setView('home')} 
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all backdrop-blur-md"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <BookOpen className="w-8 h-8 text-yellow-400" />
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
                    Rules & <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-300">Points</span>
                </h1>
                <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                    Understand the scoring system, MVP calculations, and Net Run Rate logic used in our tournaments.
                </p>
            </div>
        </div>
      </div>

      {/* --- FLOATING CONTENT --- */}
      <div className="max-w-3xl mx-auto px-4 -mt-24 relative z-20 space-y-8">
        
        {/* Section 1: MVP Points */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-2 bg-yellow-50 rounded-lg"><Award className="w-6 h-6 text-yellow-600" /></div>
                <h2 className="font-bold text-gray-800 text-xl">MVP & Fantasy Points</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-6">
                Points are calculated automatically after every ball to determine the <strong>Man of the Match</strong> and <strong>Player of the Tournament</strong>.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <h3 className="font-bold text-sm text-blue-600 mb-4 flex items-center"><Star className="w-4 h-4 mr-2 fill-blue-600" /> Batting Points</h3>
                    <ul className="text-sm space-y-3 text-gray-700">
                        <li className="flex justify-between items-center border-b border-gray-200 pb-2"><span>Per Run</span> <span className="font-bold bg-white px-2 py-0.5 rounded shadow-sm">1 pt</span></li>
                        <li className="flex justify-between items-center border-b border-gray-200 pb-2"><span>Boundary (4) Bonus</span> <span className="font-bold text-green-600 bg-white px-2 py-0.5 rounded shadow-sm">+1 pt</span></li>
                        <li className="flex justify-between items-center border-b border-gray-200 pb-2"><span>Six (6) Bonus</span> <span className="font-bold text-green-600 bg-white px-2 py-0.5 rounded shadow-sm">+2 pts</span></li>
                        <li className="flex justify-between items-center border-b border-gray-200 pb-2"><span>Half Century (50)</span> <span className="font-bold text-purple-600 bg-white px-2 py-0.5 rounded shadow-sm">+10 pts</span></li>
                        <li className="flex justify-between items-center"><span>Century (100)</span> <span className="font-bold text-purple-600 bg-white px-2 py-0.5 rounded shadow-sm">+20 pts</span></li>
                    </ul>
                </div>

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <h3 className="font-bold text-sm text-green-600 mb-4 flex items-center"><Star className="w-4 h-4 mr-2 fill-green-600" /> Bowling Points</h3>
                    <ul className="text-sm space-y-3 text-gray-700">
                        <li className="flex justify-between items-center border-b border-gray-200 pb-2"><span>Per Wicket</span> <span className="font-bold bg-white px-2 py-0.5 rounded shadow-sm">25 pts</span></li>
                        <li className="flex justify-between items-center border-b border-gray-200 pb-2"><span>3 Wicket Haul</span> <span className="font-bold text-purple-600 bg-white px-2 py-0.5 rounded shadow-sm">+10 pts</span></li>
                        <li className="flex justify-between items-center border-b border-gray-200 pb-2"><span>5 Wicket Haul</span> <span className="font-bold text-purple-600 bg-white px-2 py-0.5 rounded shadow-sm">+20 pts</span></li>
                        <li className="flex justify-between items-center text-xs text-gray-400 italic"><span>*Maidens do not currently award points.</span></li>
                    </ul>
                </div>
            </div>
        </div>

        {/* Section 2: NRR Rules */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-2 bg-blue-50 rounded-lg"><Calculator className="w-6 h-6 text-blue-600" /></div>
                <h2 className="font-bold text-gray-800 text-xl">Net Run Rate (NRR)</h2>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl mb-6 text-center font-mono text-sm text-gray-700 border border-gray-200">
                NRR = (Run Rate For) - (Run Rate Against)
            </div>

            <div className="bg-red-50 p-5 rounded-xl border border-red-100 flex gap-4">
                <div className="shrink-0 pt-1">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">!</div>
                </div>
                <div>
                    <h3 className="font-bold text-red-800 mb-2">Important "All Out" Rule</h3>
                    <p className="text-sm text-red-700 leading-relaxed mb-3">
                        If a team is <strong>All Out</strong> (loses all 10 wickets) before batting their full quota of overs, the calculation considers them to have batted the <strong>Full Quota of Overs</strong> (e.g., 20 overs), NOT the actual overs they survived.
                    </p>
                    <p className="text-xs text-red-600/70 italic bg-white/50 p-2 rounded">
                        Example: If Team A is all out for 100 in 15 overs (in a 20 over match), their Run Rate is 100/20 = 5.0, not 100/15 = 6.66.
                    </p>
                    
                </div>
            </div>
        </div>
        
        {/* Back Button for Mobile at Bottom */}
         <div className="md:hidden flex justify-center mt-8">
            <button 
                onClick={() => setView('home')} 
                className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
        </div>

        {/* VERSION & DEVELOPER INFO */}
        <div className="text-center pt-8">
            <p className="text-xs text-gray-400"> Version 1.0.0 • Developed with ❤️ by Al Moeid</p>
        </div>
      </div>
    </div>
  );
}