import React from 'react';
import { ArrowLeft, Globe, Mail, Users, Rocket, Heart, Code, Database, Zap, Layout } from 'lucide-react';

export default function AboutView({ setView }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* --- PROFESSIONAL HERO HEADER --- */}
      <div className="bg-gray-900 text-white -mt-4 -mx-4 pt-12 pb-36 px-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        
        {/* Background Patterns (Grid & Glow) */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4ADE80 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
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
            
            {/* Hero Text */}
            <div className="mt-4">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
                    Revolutionizing <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">ZBSM Cricket</span>
                </h1>
                <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                    A professional-grade scoring platform built for the passion of the game, free from distractions.
                </p>
            </div>
        </div>
      </div>

      {/* --- FLOATING CONTENT --- */}
      <div className="max-w-3xl mx-auto px-4 -mt-24 relative z-20 space-y-6">
          
          {/* 1. STATS BAR (Fills the visual gap) */}
          <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 text-center">
                  <div className="text-2xl font-black text-gray-800">100+</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Matches</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 text-center">
                  <div className="text-2xl font-black text-blue-600">50+</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teams</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 text-center">
                  <div className="text-2xl font-black text-green-600">10k+</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Runs</div>
              </div>
          </div>

          {/* Meet the Team Section */}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-center gap-2 mb-10">
                  <div className="h-px w-10 bg-gray-200"></div>
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-800 text-lg uppercase tracking-wider">Meet the Team</h3>
                  <div className="h-px w-10 bg-gray-200"></div>
              </div>
              
              {/* Founder (Center Stage) */}
              <div className="flex flex-col items-center mb-12">
                  <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                      <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden relative border-4 border-white shadow-xl">
                          {/* PUT 'almoeid.jpg' IN PUBLIC FOLDER */}
                          <img 
                            src="/almoeid.jpg" 
                            onError={(e) => e.target.src = "https://ui-avatars.com/api/?name=Al+Moeid&background=10B981&color=fff&size=200"} 
                            alt="Al Moeid" 
                            className="w-full h-full object-cover" 
                          />
                      </div>
                  </div>
                  <h4 className="font-bold text-2xl text-gray-900 mt-4">Al Moeid</h4>
                  <p className="text-green-600 font-medium text-sm mb-2">Founder & Developer</p>
                  <p className="text-xs text-gray-400 italic">"Dreaming in code & cricket"</p>
              </div>

              {/* Scorers (Side by Side) - **THIS IS THE LAYOUT I KEPT** */}
              <div className="grid grid-cols-2 gap-8 md:gap-16">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden mb-3 border-4 border-white shadow-md">
                           {/* PUT 'abir.jpg' IN PUBLIC FOLDER */}
                           <img 
                             src="/abir.jpg" 
                             onError={(e) => e.target.src = "https://ui-avatars.com/api/?name=Abir&background=DBEAFE&color=1E40AF&size=150"} 
                             alt="Abir" 
                             className="w-full h-full object-cover" 
                           />
                      </div>
                      <h5 className="font-bold text-lg text-gray-800">Abir</h5>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                          Scorer
                      </span>
                  </div>
                  
                  <div className="flex flex-col items-center text-center">
                      <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden mb-3 border-4 border-white shadow-md">
                           {/* PUT 'shihab.jpg' IN PUBLIC FOLDER */}
                           <img 
                             src="/shihab.jpg" 
                             onError={(e) => e.target.src = "https://ui-avatars.com/api/?name=Shihab&background=DBEAFE&color=1E40AF&size=150"} 
                             alt="Shihab" 
                             className="w-full h-full object-cover" 
                           />
                      </div>
                      <h5 className="font-bold text-lg text-gray-800">Shihab</h5>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                          Scorer
                      </span>
                  </div>
              </div>
          </div> 
          
          {/* 3. OUR STORY */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="mb-6">
                 <h3 className="font-bold text-gray-800 text-lg mb-3 flex items-center">
                    <Globe className="w-5 h-5 text-green-600 mr-2" /> Our Mission
                 </h3>
                 <p className="text-gray-600 leading-relaxed text-sm">
                    To provide a professional-grade scoring experience for local tournaments, ensuring every run, wicket, and milestone is recorded accurately and transparently.
                 </p>
              </div>

              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg"><Rocket className="w-5 h-5 text-purple-600" /></div>
                  <h3 className="font-bold text-gray-800 text-lg">How We Started</h3>
              </div>
              <div className="relative pl-4 border-l-2 border-purple-200">
                  <p className="text-gray-600 text-sm leading-7 italic">
                      "In this 2025 era, having a dedicated platform for our very own school is a blessing. The existing platforms were full of ads and noise. We wanted something pure for the game we love. That's why, at <span className="font-bold text-gray-900">3:54 AM</span> one morning, Al Moeid decided to build this - a clean, professional space for our cricket community. And here we are."
                  </p>
              </div>
          </div>

          {/* 4. TECH STACK (New Section) */}
          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-green-400" /> Built With Modern Tech
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 p-3 rounded-lg flex flex-col items-center gap-2 backdrop-blur-sm">
                      <Layout className="w-6 h-6 text-blue-400" />
                      <span className="text-xs font-bold">React</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg flex flex-col items-center gap-2 backdrop-blur-sm">
                      <Zap className="w-6 h-6 text-yellow-400" />
                      <span className="text-xs font-bold">Vite</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg flex flex-col items-center gap-2 backdrop-blur-sm">
                      <Database className="w-6 h-6 text-orange-400" />
                      <span className="text-xs font-bold">Firebase</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg flex flex-col items-center gap-2 backdrop-blur-sm">
                      <Heart className="w-6 h-6 text-red-400" />
                      <span className="text-xs font-bold">Passion</span>
                  </div>
              </div>
          </div>

          {/* Contact Footer */}
          <div className="text-center pt-8 pb-4">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-600 mb-4 shadow-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  montakimalmoeid@gmail.com
              </div>
              <p className="text-xs text-gray-400"> Version 1.0.0 • Developed with ❤️ by Al Moeid</p>
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
      </div>
    </div>
  );
}