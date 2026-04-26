import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, CheckCircle, XCircle, Search, ShieldCheck, 
  Lock, Smartphone, Trash2, Copy, Shirt
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config/firebase';

export default function AdminStoreDash({ setView }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return; 

    const q = query(
      collection(db, 'artifacts', APP_ID, 'private', 'data', 'orders'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

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

  const generateSMS = (order) => {
      return `Hello ${order.name}, your prebook order for the ${order.team} jersey (Name: ${order.jerseyName}, No: ${order.jerseyNumber}, Size: ${order.jerseySize}) is confirmed. Please collect from Al Moeid or ZBSM Ground ~10 days before Eid. Order ID: #${order.serialNumber}`;
  };

  const handleApprove = async (order) => {
    if (!window.confirm(`Approve order for ${order.name}?`)) return;

    try {
      const approvedOrders = orders.filter(o => o.status === 'approved' && o.serialNumber);
      const nextSerial = approvedOrders.length > 0 
          ? Math.max(...approvedOrders.map(o => o.serialNumber)) + 1 
          : 1;

      const orderRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'orders', order.id);
      
      await updateDoc(orderRef, { 
        status: 'approved',
        serialNumber: nextSerial,
        approvedAt: Date.now() 
      });

      const message = generateSMS({ ...order, serialNumber: nextSerial });
      navigator.clipboard.writeText(message);
      alert(`Order Approved!\n\nThe following SMS has been copied to your clipboard:\n\n"${message}"`);

    } catch (error) {
      console.error("Error approving:", error);
      alert("Failed to approve order.");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm(`Are you sure you want to REJECT this order?`)) return;
    try {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'private', 'data', 'orders', id), { status: 'rejected' });
    } catch (error) {
      console.error("Error rejecting:", error);
    }
  };

  const handleDelete = async (order) => {
      if (!window.confirm(`WARNING: Permanently DELETE this order?`)) return;
      try {
          await deleteDoc(doc(db, 'artifacts', APP_ID, 'private', 'data', 'orders', order.id));
      } catch (error) {
          console.error("Error deleting:", error);
      }
  };

  const handleCopySMS = (order) => {
      const message = generateSMS(order);
      navigator.clipboard.writeText(message);
      alert(`SMS Copied:\n\n"${message}"`);
  };

  if (!isAuthenticated) {
      return (
          <div className="flex items-center justify-center min-h-[60vh] px-4 animate-fadeIn">
              <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                      <Lock className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Store Admin</h2>
                  <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Enter Password" className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:ring-2 focus:ring-blue-400 text-center tracking-widest font-mono text-lg mb-4" />
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-md">Unlock Store Desk</button>
                  <button type="button" onClick={() => setView('admin-dash')} className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">Back to Main Admin</button>
              </form>
          </div>
      );
  }

  const filteredOrders = orders.filter(o => {
    const matchesStatus = filter === 'all' || o.status === filter;
    const matchesSearch = 
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.mobileNumber.includes(searchTerm) ||
      o.paymentTxid.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-[95%] mx-auto pb-12 animate-fadeIn">
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" /> Store Orders Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Manage jersey prebooks and payments.</p>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="text-xs font-bold text-red-500 bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 transition">Lock</button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex overflow-x-auto bg-slate-100 p-1 rounded-xl">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {f}
                  </button>
              ))}
          </div>
          <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400" />
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4"># Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Jersey Specs</th>
                <th className="p-4">Payment (419 TK)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 && (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No orders found.</td></tr>
              )}
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-mono font-extrabold text-blue-600">
                      {order.serialNumber ? `#${order.serialNumber}` : '-'}
                  </td>
                  <td className="p-4">
                      <p className="font-bold text-slate-800 text-sm">{order.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase">{new Date(order.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                  </td>
                  <td className="p-4">
                      <p className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block uppercase mb-1">{order.team}</p>
                      <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold font-mono text-slate-800">{order.jerseyName} <span className="text-slate-400">({order.jerseyNumber})</span></p>
                          <span className="text-[10px] font-extrabold text-white bg-slate-800 px-1.5 py-0.5 rounded">{order.jerseySize}</span>
                      </div>
                  </td>
                  <td className="p-4">
                      <div className="flex items-center gap-1 mb-1 text-slate-600">
                          <Smartphone className="w-3.5 h-3.5" /> <span className="text-sm font-mono font-semibold">{order.mobileNumber}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">TXID: </span>
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{order.paymentTxid}</span>
                  </td>
                  <td className="p-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${order.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : order.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                          {order.status}
                      </span>
                  </td>
                  <td className="p-4 text-right">
                      {order.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                              <button onClick={() => handleApprove(order)} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-lg transition" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => handleReject(order.id)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition" title="Reject"><XCircle className="w-4 h-4" /></button>
                          </div>
                      ) : (
                          <div className="flex items-center justify-end gap-2">
                              {order.status === 'approved' && (
                                  <button onClick={() => handleCopySMS(order)} className="px-2 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-700 hover:text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition"><Copy className="w-3.5 h-3.5" /> SMS</button>
                              )}
                              <button onClick={() => handleDelete(order)} className="p-1.5 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
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
