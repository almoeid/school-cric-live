import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, User } from 'lucide-react';
import { updateProfile } from 'firebase/auth'; // Import this to save the name
import { auth, signInWithEmailAndPassword } from '../../config/firebase';

export default function Login({ onLoginSuccess, onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // New State for Scorer Name
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Sign In
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. If name is provided, update the Firebase Profile
      if (name) {
          await updateProfile(userCredential.user, {
              displayName: name
          });
      }

      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      console.error("Login Error:", err);
      if (err.code === 'auth/invalid-credential') {
        setError("Incorrect email or password.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Try again later.");
      } else {
        setError("Failed to login. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gray-900 p-6 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Official Scorer Login</h2>
          <p className="text-gray-400 text-sm">Enter details to access dashboard</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm mb-6 border border-red-100">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* NEW: SCORER NAME INPUT */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Name (Scorer)</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  required
                  className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  required
                  className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="admin@schoolcric.live"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  required
                  className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center shadow-lg transform active:scale-95"
            >
              {loading ? 'Verifying...' : 'Login to Dashboard'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
              ← Back to Live Scores
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Authorized Personnel Only</p>
          </div>
        </div>
      </div>
    </div>
  );
}