import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Clock, CheckCircle, XCircle, 
  Search, ShieldCheck, Lock, Smartphone, Filter, Trash2, Edit, MessageSquare, X
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config/firebase';

export default function AdminRegistrationDash({ setView }) {
  // --- HARDCODED PASSWORD STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- FILTERS ---
  const [filter, setFilter] = useState('all'); 
  const [roleFilter, setRoleFilter] = useState('all'); 
  const [batchFilter, setBatchFilter] = useState('all'); // NEW: Batch Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // --- EDIT MODAL STATE ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Dropdown Options
  const roles = ["Batsman", "Bowler", "Allrounder", "Batting Allrounder", "Bowling Allrounder"];
  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);
  const batches = ["School Batch", "Madrasa", ...years];
  const jerseySizes = ["M", "L", "XL", "XXL", "XXXL"];

  // 1. Fetch data in real-time
  useEffect(() => {
    if (!isAuthenticated) return; 

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

  // --- SMS HANDLERS ---
  const generateSMS = (playerName, serialNumber) => {
      return `Congratulations ${playerName}! Your registration for ZBSM Elite Cup 2026 is approved. Your Player ID is ZBSM-${serialNumber}.`;
  };

  const handleCopySMS = (reg) => {
      const message = generateSMS(reg.name, reg.serialNumber);
      navigator.clipboard.writeText(message);
      alert(`SMS Copied to Clipboard!\n\n"${message}"`);
  };

  // --- ACTION HANDLERS ---
  const handleApprove = async (reg) => {
    if (!window.confirm(`Approve ${reg.name} and assign a serial number?`)) return;

    try {
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

      // Auto-Copy SMS upon approval
      const message = generateSMS(reg.name, nextSerial);
      navigator.clipboard.writeText(message);
      alert(`Player Approved!\n\nThe following SMS has been automatically copied to your clipboard. You can now paste it into your messaging app:\n\n"${message}"`);

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

  const handleDelete = async (reg) => {
      if (!window.confirm(`WARNING: Are you sure you want to permanently DELETE ${reg.name}? This cannot be undone.`)) return;

      try {
          const regRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', reg.id);
          await deleteDoc(regRef);

          // Fix the serial numbers for everyone else
          if (reg.status === 'approved' && reg.serialNumber) {
              const deletedSerial = reg.serialNumber;
              const playersToUpdate = registrations.filter(r => r.status === 'approved' && r.serialNumber > deletedSerial);
              
              for (const player of playersToUpdate) {
                  const updateRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', player.id);
                  await updateDoc(updateRef, {
                      serialNumber: player.serialNumber - 1
                  });
              }
          }
      } catch (error) {
          console.error("Error deleting:", error);
          alert("Failed to delete record. Check console.");
      }
  };

  // --- EDIT HANDLERS ---
  const openEditModal = (reg) => {
      setEditForm({ ...reg });
      setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
      e.preventDefault();
      try {
          const regRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', editForm.id);
          await updateDoc(regRef, {
              name: editForm.name,
              mobileNumber: editForm.mobileNumber,
              batch: editForm.batch,
              role: editForm.role,
              jerseyName: editForm.jerseyName,
              jerseyNumber: editForm.jerseyNumber,
              jerseySize: editForm.jerseySize || '',
              paymentTxid: editForm.paymentTxid,
              updatedAt: Date.now()
          });
          setShowEditModal(false);
          setEditForm(null);
      } catch (error) {
          console.error("Error saving edits:", error);
          alert("Failed to save changes.");
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
              </form>
          </div>
      );
  }

  // --- FILTER & STATS LOGIC ---
  
  // 1. Filter base array for Role, Batch, and Search (but ignore Status for stats)
  const baseFiltered = registrations.filter(reg => {
    const matchesRole = roleFilter === 'all' || reg.role === roleFilter;
    const matchesBatch = batchFilter === 'all' || String(reg.batch) === String(batchFilter);
    const matchesSearch = 
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      reg.mobileNumber.includes(searchTerm) ||
      reg.paymentTxid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.jerseyName && reg.jerseyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesRole && matchesBatch && matchesSearch;
  });

  // 2. Dynamic Stats (Updates when you select a Batch, Role, or Search!)
  const stats = {
    total: baseFiltered.length,
    pending: baseFiltered.filter(r => r.status === 'pending').length,
    approved: baseFiltered.filter(r => r.status === 'approved').length,
  };

  // 3. Final array for the table (applies the Status tab filter)
  const filteredRegistrations = baseFiltered.filter(reg => filter === 'all' || reg.status === filter);

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Loading Secured Dashboard...</div>;

  return (
    <div className="max-w-[95%] mx-auto pb-12 animate-fadeIn relative">
      
      {/* --- EDIT MODAL OVERLAY --- */}
      {showEditModal && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                  <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 p-5 flex items-center justify-between z-10 rounded-t-3xl">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Edit className="w-5 h-5 text-blue-500" /> Edit Player
                      </h2>
                      <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSaveEdit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                          <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" required />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                          <input type="tel" value={editForm.mobileNumber} onChange={e => setEditForm({...editForm, mobileNumber: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none font-mono" required />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Batch</label>
                          <select value={editForm.batch} onChange={e => setEditForm({...editForm, batch: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                              {batches.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                          <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                              {roles.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Jersey Name</label>
                          <input type="text" value={editForm.jerseyName} onChange={e => setEditForm({...editForm, jerseyName: e.target.value.toUpperCase()})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none uppercase" required />
                      </div>
                      <div className="flex gap-3">
                          <div className="space-y-1 flex-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Jersey No.</label>
                              <input type="tel" value={editForm.jerseyNumber} onChange={e => setEditForm({...editForm, jerseyNumber: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none font-mono" required />
                          </div>
                          <div className="space-y-1 flex-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Size</label>
                              <select value={editForm.jerseySize} onChange={e => setEditForm({...editForm, jerseySize: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                                  {jerseySizes.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Payment TXID / Number</label>
                          <input type="text" value={editForm.paymentTxid} onChange={e => setEditForm({...editForm, paymentTxid: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none font-mono" required />
                      </div>
                      
                      <div className="sm:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
                          <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
                          <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-500 text-white shadow-md hover:bg-blue-600">Save Changes</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      {/* --- END MODAL --- */}


      <div className="flex items-start sm:items-center justify-between mb-6 pt-4">
        <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 shrink-0" /> Registration Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Approve players, assign serials, and send SMS.</p>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="text-xs sm:text-sm font-bold text-red-500 bg-red-50 px-3 sm:px-4 py-2 rounded-lg hover:bg-red-100 transition shrink-0">
            Lock 
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total Requests" count={stats.total} icon={Users} color="blue" />
        <StatCard title="Pending" count={stats.pending} icon={Clock} color="amber" />
        <StatCard title="Approved" count={stats.approved} icon={UserCheck} color="emerald" />
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
              <div className="flex overflow-x-auto bg-slate-100 p-1 rounded-xl w-full lg:w-fit custom-scrollbar">
                  {['all', 'pending', 'approved', 'rejected'].map(f => (
                      <button 
                          key={f} onClick={() => setFilter(f)}
                          className={`px-4 py-2 lg:py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 lg:flex-none ${filter === f ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          {f}
                      </button>
                  ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  
                  {/* NEW: Batch Filter Dropdown */}
                  <div className="relative w-full sm:w-36 shrink-0">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                          value={batchFilter}
                          onChange={(e) => setBatchFilter(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 lg:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none transition"
                      >
                          <option value="all">All Batches</option>
                          {batches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                  </div>

                  {/* Existing Role Filter */}
                  <div className="relative w-full sm:w-40 shrink-0">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 lg:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none transition"
                      >
                          <option value="all">All Roles</option>
                          {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                  </div>

                  <div className="relative w-full sm:w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input 
                          type="text" 
                          placeholder="Search name, phone, TXID..." 
                          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 lg:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
                      />
                  </div>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
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
                  <tr><td colSpan="7" className="p-10 text-center text-slate-400 font-medium">No registrations match your filters.</td></tr>
              )}
              {filteredRegistrations.map(reg => (
                <tr key={reg.id} className="hover:bg-slate-50/50 transition">
                  
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
                      <a href={reg.imageUrl} target="_blank" rel="noreferrer" className="shrink-0 block">
                        <img src={reg.imageUrl || '/api/placeholder/40/40'} alt={reg.name} className="w-12 h-12 rounded-xl object-cover object-top bg-slate-200 border border-slate-200 shadow-sm hover:scale-110 transition-transform" title="Click to view full image" />
                      </a>
                      <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{reg.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider truncate">
                              {new Date(reg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </p>
                      </div>
                  </td>
                  
                  <td className="p-4">
                      <p className="text-sm font-bold text-slate-700">{reg.role}</p>
                      <p className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mt-1 uppercase tracking-widest">
                          Batch {reg.batch}
                      </p>
                  </td>

                  <td className="p-4">
                      <p className="text-sm font-extrabold font-mono text-slate-800 tracking-wider">{reg.jerseyName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-500 font-bold">No. <span className="text-slate-800">{reg.jerseyNumber}</span></p>
                          {reg.jerseySize && (
                              <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {reg.jerseySize}
                              </span>
                          )}
                      </div>
                  </td>

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

                  <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                          reg.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' :
                          reg.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                      }`}>
                          {reg.status}
                      </span>
                  </td>

                  {/* Actions Column */}
                  <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                          
                          {/* Edit Button (Available to all) */}
                          <button onClick={() => openEditModal(reg)} className="p-1.5 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition" title="Edit Player">
                              <Edit className="w-4 h-4" />
                          </button>

                          {reg.status === 'pending' ? (
                              <>
                                  <button onClick={() => handleApprove(reg)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-lg font-bold text-xs transition" title="Approve Player">
                                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button onClick={() => handleReject(reg.id)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition" title="Reject">
                                      <XCircle className="w-4 h-4" />
                                  </button>
                              </>
                          ) : (
                              <>
                                  {/* Copy SMS Button (Only for approved) */}
                                  {reg.status === 'approved' && (
                                      <button onClick={() => handleCopySMS(reg)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-700 hover:text-white rounded-lg font-bold text-xs transition" title="Copy SMS Message">
                                          <MessageSquare className="w-3.5 h-3.5" /> Copy SMS
                                      </button>
                                  )}
                                  <button onClick={() => handleDelete(reg)} className="p-1.5 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-lg transition border border-transparent hover:border-red-600" title="Permanently Delete">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </>
                          )}
                      </div>
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

function StatCard({ title, count, icon: Icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };

    return (
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{count}</h3>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-xl border ${colorClasses[color]}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
        </div>
    );
}
