import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Clock, CheckCircle, XCircle, 
  Search, ExternalLink, ShieldCheck, ChevronLeft
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config/firebase';

export default function AdminRegistrationDash({ setView }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch data in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', APP_ID, 'private', 'registrations'),
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
  }, []);

  // 2. Computed Stats
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
  };

  // 3. Filter and Search Logic
  const filteredRegistrations = registrations.filter(reg => {
    const matchesFilter = filter === 'all' || reg.status === filter;
    const matchesSearch = 
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      reg.mobileNumber.includes(searchTerm) ||
      reg.paymentTxid.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // 4. Action Handlers (Approve / Reject)
  const handleUpdateStatus = async (id, newStatus, mobileNumber) => {
    if (!window.confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;

    try {
      const regRef = doc(db, 'artifacts', APP_ID, 'private', 'registrations', id);
      await updateDoc(regRef, { 
        status: newStatus,
        updatedAt: Date.now() 
      });

      // --- SMS INTEGRATION SPOT ---
      if (newStatus === 'approved') {
        console.log(`[SYSTEM] Registration Approved. Trigger SMS to ${mobileNumber} here!`);
        // Example: Call your backend Cloud Function here
        // fetch('YOUR_CLOUD_FUNCTION_URL', { method: 'POST', body: JSON.stringify({ phone: mobileNumber }) });
      }

    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Check console.");
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Loading Dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <button onClick={() => setView('admin-dash')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
                <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" /> Registration Desk
                </h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Review and approve Elite Cup players.</p>
            </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Registrations" count={stats.total} icon={Users} color="blue" />
        <StatCard title="Pending Review" count={stats.pending} icon={Clock} color="amber" />
        <StatCard title="Approved Players" count={stats.approved} icon={UserCheck} color="emerald" />
      </div>

      {/* Controls: Search & Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                  <button 
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      {f}
                  </button>
              ))}
          </div>
          
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                  type="text" 
                  placeholder="Search name, phone, or TXID..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
              />
          </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Player</th>
                <th className="p-4">Role & Batch</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Payment Info</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegistrations.length === 0 && (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No registrations found.</td></tr>
              )}
              {filteredRegistrations.map(reg => (
                <tr key={reg.id} className="hover:bg-slate-50/50 transition">
                  {/* Player Profile */}
                  <td className="p-4 flex items-center gap-3">
                      <img src={reg.imageUrl || '/api/placeholder/40/40'} alt={reg.name} className="w-10 h-10 rounded-lg object-cover bg-slate-200 border border-slate-200" />
                      <div>
                          <p className="font-bold text-slate-800 text-sm">{reg.name}</p>
                          <p className="text-xs text-slate-500">{new Date(reg.timestamp).toLocaleDateString()}</p>
                      </div>
                  </td>
                  
                  {/* Role */}
                  <td className="p-4">
                      <p className="text-sm font-semibold text-slate-700">{reg.role}</p>
                      <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-1">Batch {reg.batch}</p>
                  </td>

                  {/* Contact */}
                  <td className="p-4">
                      <p className="text-sm font-mono text-slate-600">{reg.mobileNumber}</p>
                  </td>

                  {/* Payment */}
                  <td className="p-4">
                      <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-400 uppercase">TXID:</span>
                          <span className="text-sm font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded">{reg.paymentTxid}</span>
                      </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                          reg.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          reg.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-amber-50 text-amber-600 border-amber-200'
                      }`}>
                          {reg.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {reg.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {reg.status === 'pending' && <Clock className="w-3 h-3" />}
                          {reg.status}
                      </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                      {reg.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleUpdateStatus(reg.id, 'approved', reg.mobileNumber)} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition" title="Approve">
                                  <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleUpdateStatus(reg.id, 'rejected', reg.mobileNumber)} className="p-2 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition" title="Reject">
                                  <XCircle className="w-4 h-4" />
                              </button>
                          </div>
                      ) : (
                          <span className="text-xs font-semibold text-slate-400">Processed</span>
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
                <p className="text-sm font-bold text-slate-500 mb-1">{title}</p>
                <h3 className="text-3xl font-extrabold text-slate-800">{count}</h3>
            </div>
            <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}
