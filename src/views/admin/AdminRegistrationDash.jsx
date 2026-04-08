import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Clock, CheckCircle, XCircle, 
  Search, ShieldCheck, ChevronLeft, Lock, Smartphone
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config/firebase';

export default function AdminRegistrationDash({ setView }) {
  // --- HARDCODED PASSWORD STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch data in real-time
  useEffect(() => {
    if (!isAuthenticated) return; // Only fetch if logged in

    const q = query(
      collection(db, 'artifacts', APP_ID, 'private', 'data', 'registrations'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistrations(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching registrations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // --- PASSWORD HANDLER ---
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

  // --- SMS SENDING FUNCTION ---
  const sendApprovalSMS = async (mobileNumber, playerName, serialNumber) => {
      // NOTE: Replace this URL and token with your actual provider (e.g., BulkSMSBD or AamarSMS)
      const message = `Congratulations ${playerName}! Your registration for ZBSM Elite Cup 2026 is approved. Your Player ID is ZBSM-${serialNumber}.`;
      
      console.log(`[SMS TRIGGERED] Sending to ${mobileNumber}: "${message}"`);
      
      /* --- UNCOMMENT AND FILL THIS OUT WHEN YOU BUY AN SMS PACKAGE ---
      try {
          const response = await fetch('YOUR_SMS_PROVIDER_API_URL', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  api_key: 'YOUR_API_KEY',
                  sender_id: 'YOUR_SENDER_ID',
                  number: mobileNumber,
                  message: message
              })
          });
          const result = await response.json();
          console.log("SMS Response:", result);
      } catch (error) {
          console.error("Failed to send SMS:", error);
      }
      -------------------------------------------------------------- */
  };

  // --- ACTION HANDLERS ---
  const handleApprove = async (reg) => {
    if (!window.confirm(`Approve ${reg.name} and send SMS?`)) return;

    try {
      // Find the highest serial number currently assigned to approve the next one serially
      const approvedRegs = registrations.filter(r => r.status === 'approved' && r.serialNumber);
      const nextSerial = approvedRegs.length > 0 
          ? Math.max(...approvedRegs.map(r => r.serialNumber)) + 1 
          : 1;

      const regRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', reg.id);
      
      await updateDoc(regRef, { 
        status: 'approved',
        serialNumber: nextSerial,
        approvedAt: Date.now() 
      });

      // Trigger the SMS
      await sendApprovalSMS(reg.mobileNumber, reg.name, nextSerial);

    } catch (error) {
      console.error("Error approving:", error);
      alert("Failed to approve. Check console.");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm(`Are you sure you want to REJECT this registration?`)) return;
    try {
      const regRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', id);
      await updateDoc(regRef, { status: 'rejected', updatedAt: Date.now() });
    } catch (error) {
      console.error("Error rejecting:", error);
    }
  };

  // --- RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
      return (
          <div className="flex items-center justify-center min-h-[60vh] px-4 animate-fadeIn">
              <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100 text-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                      <Lock className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Admin Access</h2>
                  <p className="text-slate-500 text-sm mb-6 font-medium">Enter the master password to view registrations.</p>
                  
                  <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter Password" 
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-center tracking-widest font-mono text-lg mb-4 ${authError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'}`}
                  />
                  {authError && <p className="text-red-500 text-xs font-bold mb-4">Incorrect password.</p>}
                  
                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition shadow-md">
                      Unlock Dashboard
                  </button>
                  <button type="button" onClick={() => setView('home')} className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">
                      Cancel
                  </button>
              </form>
          </div>
      );
  }

  // --- RENDER MAIN DASHBOARD ---
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesFilter = filter === 'all' || reg.status === filter;
    const matchesSearch = 
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      reg.mobileNumber.includes(searchTerm) ||
      reg.paymentTxid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.jerseyName && reg.jerseyName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Loading Secured Dashboard...</div>;

  return (
    <div className="max-w-[95%] mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center gap-4">
            <button onClick={() => setView('home')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition border border-slate-100">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
                <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-7 h-7 text-emerald-500" /> Registration Desk
                </h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Approve players, assign serials, and send SMS.</p>
            </div>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="text-sm font-bold text-red-500 bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 transition">
            Lock 
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Requests" count={stats.total} icon={Users} color="blue" />
        <StatCard title="Pending Review" count={stats.pending} icon={Clock} color="amber" />
        <StatCard title="Approved (Serials Assigned)" count={stats.approved} icon={UserCheck} color="emerald" />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between gap-4 mb-6">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                  <button 
                      key={f} onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      {f}
                  </button>
              ))}
          </div>
          
          <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                  type="text" 
                  placeholder="Search name, phone, TXID..." 
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
              />
          </div>
      </div>

      {/* Data Table (Wide for all fields) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4"># Serial</th>
                <th className="p-4">Player & Time</th>
                <th className="p-4">Cricket Profile</th>
                <th className="p-4">Jersey Info</th>
                <th className="p-4">Payment & Contact</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegistrations.length === 0 && (
                  <tr><td colSpan="7" className="p-10 text-center text-slate-400 font-medium">No registrations match this filter.</td></tr>
              )}
              {filteredRegistrations.map(reg => (
                <tr key={reg.id} className="hover:bg-slate-50/50 transition">
                  
                  {/* Serial Number */}
                  <td className="p-4">
                      {reg.serialNumber ? (
                          <span className="font-mono font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              #{reg.serialNumber}
                          </span>
                      ) : (
                          <span className="text-slate-300 font-mono text-xs">-</span>
                      )}
                  </td>

                  {/* Player & Time */}
                  <td className="p-4 flex items-center gap-3">
                      <a href={reg.imageUrl} target="_blank" rel="noreferrer">
                        <img src={reg.imageUrl || '/api/placeholder/40/40'} alt={reg.name} className="w-12 h-12 rounded-xl object-cover bg-slate-200 border border-slate-200 shadow-sm hover:scale-110 transition-transform" title="Click to view full image" />
                      </a>
                      <div>
                          <p className="font-bold text-slate-800 text-sm">{reg.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">
                              {new Date(reg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </p>
                      </div>
                  </td>
                  
                  {/* Cricket Profile */}
                  <td className="p-4">
                      <p className="text-sm font-bold text-slate-700">{reg.role}</p>
                      <p className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mt-1 uppercase tracking-widest">
                          Batch {reg.batch}
                      </p>
                  </td>

                  {/* Jersey Info */}
                  <td className="p-4">
                      <p className="text-sm font-extrabold font-mono text-slate-800 tracking-wider">{reg.jerseyName}</p>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">No. <span className="text-slate-800">{reg.jerseyNumber}</span></p>
                  </td>

                  {/* Payment & Contact */}
                  <td className="p-4">
                      <div className="flex items-center gap-1 mb-1 text-slate-600">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span className="text-sm font-mono font-semibold">{reg.mobileNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">TXID:</span>
                          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{reg.paymentTxid}</span>
                      </div>
                  </td>

                  {/* Status */}
                  <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                          reg.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' :
                          reg.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                      }`}>
                          {reg.status}
                      </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                      {reg.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleApprove(reg)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-lg font-bold text-xs transition" title="Approve & Send SMS">
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => handleReject(reg.id)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition" title="Reject">
                                  <XCircle className="w-4 h-4" />
                              </button>
                          </div>
                      ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                              Processed
                          </span>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper component for stats
function StatCard({ title, count, icon: Icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
                <h3 className="text-3xl font-extrabold text-slate-800">{count}</h3>
            </div>
            <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}
