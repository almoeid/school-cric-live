import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserCheck, Clock, CheckCircle, XCircle, 
  Search, ShieldCheck, Lock, Smartphone, Filter, Trash2, Edit, MessageSquare, X,
  UserPlus, Image as ImageIcon, Send, Loader2, Download, Sparkles,
  Link as LinkIcon, DollarSign, ListOrdered, ChevronDown, ArrowUp, ArrowDown, Plus
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, APP_ID } from '../../config/firebase';
import { cropToFace } from '../../utils/faceCropper';

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
  const [batchFilter, setBatchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATES ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
      name: '', mobileNumber: '', batch: '', role: '', 
      jerseyName: '', jerseyNumber: '', jerseySize: '', paymentTxid: ''
  });
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState(null);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // --- SMART CROP STATE ---
  const [croppingId, setCroppingId] = useState(null);

  // --- EXPORT DROPDOWN + CUSTOM EXPORT STATE ---
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  const [showCustomExportModal, setShowCustomExportModal] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState([]); // ordered list of player IDs

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

  // --- Click-outside handler for export dropdown ---
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (e) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
            setShowExportMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

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

  // --- EXPORT ROSTER (DEFAULT SERIAL ORDER) ---
  const handleExportRoster = () => {
      setShowExportMenu(false);
      const approvedPlayers = registrations
          .filter(r => r.status === 'approved' && r.serialNumber)
          .sort((a, b) => a.serialNumber - b.serialNumber)
          .map(r => ({
              id: `ZBSM-${String(r.serialNumber).padStart(2, '0')}`,
              name: r.name,
              role: r.role,
              batch: String(r.batch),
              basePrice: r.basePrice || 1000,
              imageUrl: r.imageUrl,
              status: 'pending'
          }));

      if (approvedPlayers.length === 0) {
          alert('No approved players with serial numbers to export.');
          return;
      }

      const dataStr = JSON.stringify(approvedPlayers, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'players.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  // --- OPEN CUSTOM SERIAL EXPORT MODAL ---
  const openCustomExportModal = () => {
      setCustomSelectedIds([]);
      setShowCustomExportModal(true);
      setShowExportMenu(false);
  };

  // --- CUSTOM EXPORT: ADD / REMOVE / REORDER ---
  const handleAddToCustom = (id) => {
      setCustomSelectedIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const handleRemoveFromCustom = (id) => {
      setCustomSelectedIds(prev => prev.filter(pid => pid !== id));
  };

  const handleMoveCustomUp = (idx) => {
      if (idx <= 0) return;
      setCustomSelectedIds(prev => {
          const next = [...prev];
          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
          return next;
      });
  };

  const handleMoveCustomDown = (idx) => {
      setCustomSelectedIds(prev => {
          if (idx >= prev.length - 1) return prev;
          const next = [...prev];
          [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
          return next;
      });
  };

  // --- EXPORT WITH CUSTOM SERIAL ORDER ---
  const handleCustomExport = () => {
      const approvedMap = new Map(
          registrations.filter(r => r.status === 'approved').map(r => [r.id, r])
      );

      const customRoster = customSelectedIds
          .map((pid, idx) => {
              const r = approvedMap.get(pid);
              if (!r) return null;
              return {
                  id: `ZBSM-${String(r.serialNumber).padStart(2, '0')}`,
                  name: r.name,
                  role: r.role,
                  batch: String(r.batch),
                  basePrice: r.basePrice || 1000,
                  imageUrl: r.imageUrl,
                  status: 'pending'
              };
          })
          .filter(Boolean);

      if (customRoster.length === 0) {
          alert('Please select at least one player for the custom export.');
          return;
      }

      const dataStr = JSON.stringify(customRoster, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'players_custom.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShowCustomExportModal(false);
      setCustomSelectedIds([]);
  };

  // --- BASE PRICE HANDLER (inline quick edit) ---
  const handleSetBasePrice = async (reg) => {
      const current = reg.basePrice || 1000;
      const input = window.prompt(`Set base price for ${reg.name} (in BDT):`, current);
      if (input === null) return; // user cancelled

      const newPrice = parseInt(input, 10);
      if (isNaN(newPrice) || newPrice < 0) {
          alert('Please enter a valid non-negative number.');
          return;
      }

      try {
          const regRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', reg.id);
          await updateDoc(regRef, { basePrice: newPrice });
      } catch (error) {
          console.error('Failed to update base price:', error);
          alert('Failed to update base price.');
      }
  };

  // --- CHANGE PICTURE URL HANDLER ---
  const handleChangeImageUrl = async (reg) => {
      const current = reg.imageUrl || '';
      const input = window.prompt(`Paste a new picture URL for ${reg.name}:`, current);
      if (input === null) return; // user cancelled

      const trimmed = input.trim();
      if (!trimmed) {
          alert('Please enter a valid URL.');
          return;
      }

      // Soft validation — must look like a URL
      if (!/^https?:\/\//i.test(trimmed)) {
          alert('URL must start with http:// or https://');
          return;
      }

      try {
          const regRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', reg.id);
          await updateDoc(regRef, { 
              imageUrl: trimmed,
              imageUpdatedAt: Date.now()
          });
      } catch (error) {
          console.error('Failed to update image URL:', error);
          alert('Failed to update picture URL.');
      }
  };

  // --- TOGGLE UNPAID STATUS ---
  const handleToggleUnpaid = async (reg) => {
      const newUnpaid = !reg.unpaid;
      const action = newUnpaid 
          ? `Mark ${reg.name} as UNPAID? A red indicator will appear on their row.`
          : `Mark ${reg.name} as PAID? The unpaid indicator will be removed.`;
      if (!window.confirm(action)) return;

      try {
          const regRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', reg.id);
          await updateDoc(regRef, { 
              unpaid: newUnpaid,
              unpaidUpdatedAt: Date.now()
          });
      } catch (error) {
          console.error('Failed to toggle paid status:', error);
          alert('Failed to update payment status.');
      }
  };

  // --- SMART CROP HANDLER ---
  const handleSmartCrop = async (reg) => {
      if (!reg.imageUrl) {
          alert('No image to process for this player.');
          return;
      }

      if (!window.confirm(`Auto-crop ${reg.name}'s image to a 500x500 face-zoomed portrait?\n\nThis will replace the current image. The first run loads a small face-detection model (~190KB).`)) {
          return;
      }

      setCroppingId(reg.id);

      try {
          const blob = await cropToFace(reg.imageUrl, 500);

          const storageRef = ref(storage, `${APP_ID}/player_registrations/cropped_${reg.id}_${Date.now()}.jpg`);
          const uploadSnapshot = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
          const newImageUrl = await getDownloadURL(uploadSnapshot.ref);

          const regRef = doc(db, 'artifacts', APP_ID, 'private', 'data', 'registrations', reg.id);
          await updateDoc(regRef, {
              imageUrl: newImageUrl,
              imageCroppedAt: Date.now()
          });

      } catch (error) {
          console.error('Smart crop failed:', error);
          alert(`Smart crop failed: ${error.message}\n\nIf this is a CORS error, you may need to configure CORS on your Firebase Storage bucket.`);
      } finally {
          setCroppingId(null);
      }
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
      setEditForm({ ...reg, basePrice: reg.basePrice || 1000 });
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
              basePrice: parseInt(editForm.basePrice, 10) || 1000,
              updatedAt: Date.now()
          });
          setShowEditModal(false);
          setEditForm(null);
      } catch (error) {
          console.error("Error saving edits:", error);
          alert("Failed to save changes.");
      }
  };

  // --- MANUAL ADD HANDLERS ---
  const handleAddImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          if (file.size > 10 * 1024 * 1024) {
              alert('Picture must be smaller than 10MB.');
              return;
          }
          setAddImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => setAddImagePreview(reader.result);
          reader.readAsDataURL(file);
      }
  };

  const handleAddSubmit = async (e) => {
      e.preventDefault();

      if (!addForm.name || !addForm.mobileNumber || !addForm.batch || !addForm.role || !addForm.jerseyName || !addForm.jerseyNumber || !addForm.jerseySize || !addImageFile || !addForm.paymentTxid) {
          alert('Please fill in all required fields and upload a picture.');
          return;
      }

      if (addForm.mobileNumber.length !== 11 || !addForm.mobileNumber.startsWith('01')) {
          alert('Mobile number must start with 01 and be exactly 11 digits.');
          return;
      }

      setIsAddSubmitting(true);

      try {
          let fileToUpload = addImageFile;
          let uploadName = addImageFile.name;
          try {
              const tempUrl = URL.createObjectURL(addImageFile);
              const cropped = await cropToFace(tempUrl, 500);
              URL.revokeObjectURL(tempUrl);
              fileToUpload = cropped;
              uploadName = `cropped_${Date.now()}.jpg`;
          } catch (cropErr) {
              console.warn('Auto-crop failed, uploading original:', cropErr.message);
          }

          const storageRef = ref(storage, `${APP_ID}/player_registrations/${Date.now()}_${uploadName}`);
          const uploadSnapshot = await uploadBytes(storageRef, fileToUpload);
          const imageUrl = await getDownloadURL(uploadSnapshot.ref);

          const registrationData = {
              name: addForm.name,
              mobileNumber: addForm.mobileNumber,
              batch: addForm.batch,
              role: addForm.role,
              jerseyName: addForm.jerseyName.toUpperCase(),
              jerseyNumber: addForm.jerseyNumber,
              jerseySize: addForm.jerseySize,
              paymentTxid: addForm.paymentTxid,
              imageUrl,
              basePrice: 1000, // default, can be edited later via inline price button
              status: 'pending',
              timestamp: Date.now(),
          };

          await addDoc(collection(db, 'artifacts', APP_ID, 'private', 'data', 'registrations'), registrationData);

          setShowAddModal(false);
          setAddForm({ name: '', mobileNumber: '', batch: '', role: '', jerseyName: '', jerseyNumber: '', jerseySize: '', paymentTxid: '' });
          setAddImageFile(null);
          setAddImagePreview(null);
          alert('Player added successfully! They are now in the Pending list awaiting approval.');

      } catch (error) {
          console.error('Manual Registration Error:', error);
          alert(`Failed: ${error.message}`);
      } finally {
          setIsAddSubmitting(false);
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

  const stats = {
    total: baseFiltered.length,
    pending: baseFiltered.filter(r => r.status === 'pending').length,
    approved: baseFiltered.filter(r => r.status === 'approved').length,
  };

  const filteredRegistrations = baseFiltered.filter(reg => {
      if (filter === 'all') return true;
      if (filter === 'unpaid') return reg.status === 'approved' && reg.unpaid;
      return reg.status === filter;
  });

  // --- DERIVED LISTS FOR CUSTOM EXPORT MODAL ---
  const approvedForExport = registrations.filter(r => r.status === 'approved');
  const customSelectedSet = new Set(customSelectedIds);
  const availableForCustom = approvedForExport.filter(r => !customSelectedSet.has(r.id));
  const selectedForCustom = customSelectedIds
      .map(id => approvedForExport.find(r => r.id === id))
      .filter(Boolean);

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Loading Secured Dashboard...</div>;

  return (
    <div className="max-w-[95%] mx-auto pb-12 animate-fadeIn relative">
      
      {/* --- ADD PLAYER MODAL --- */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                  <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 p-5 flex items-center justify-between z-10 rounded-t-3xl">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-emerald-500" /> Manual Registration
                      </h2>
                      <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleAddSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                          <input type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none" required placeholder="e.g. Munna Kumar"/>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                          <input type="tel" value={addForm.mobileNumber} onChange={e => setAddForm({...addForm, mobileNumber: e.target.value.replace(/\D/g, '')})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none font-mono" required placeholder="017xxxxxxxx" maxLength={11}/>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Batch</label>
                          <select value={addForm.batch} onChange={e => setAddForm({...addForm, batch: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none" required>
                              <option value="" disabled>Select Batch</option>
                              {batches.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                          <select value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none" required>
                              <option value="" disabled>Select Role</option>
                              {roles.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Jersey Name</label>
                          <input type="text" value={addForm.jerseyName} onChange={e => setAddForm({...addForm, jerseyName: e.target.value.toUpperCase()})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none uppercase" required placeholder="e.g. MUNNA"/>
                      </div>
                      <div className="flex gap-3">
                          <div className="space-y-1 flex-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Jersey No.</label>
                              <input type="tel" value={addForm.jerseyNumber} onChange={e => setAddForm({...addForm, jerseyNumber: e.target.value.replace(/\D/g, '')})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none font-mono" required placeholder="10" maxLength={3}/>
                          </div>
                          <div className="space-y-1 flex-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Size</label>
                              <select value={addForm.jerseySize} onChange={e => setAddForm({...addForm, jerseySize: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none" required>
                                  <option value="" disabled>Size</option>
                                  {jerseySizes.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Payment TXID / Cash Note</label>
                          <input type="text" value={addForm.paymentTxid} onChange={e => setAddForm({...addForm, paymentTxid: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none font-mono" required placeholder="e.g. CASH or 9X8Y7Z6W"/>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Player Picture (Portrait) — auto face-cropped to 500×500</label>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-emerald-400 transition-all bg-slate-50 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              {addImagePreview ? (
                                  <img src={addImagePreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover shadow-sm border border-slate-200 shrink-0" />
                              ) : (
                                  <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center text-slate-300 border border-slate-200 shadow-sm shrink-0">
                                      <ImageIcon className="w-6 h-6" />
                                  </div>
                              )}
                              <div>
                                  <p className="text-sm font-semibold text-slate-700">{addImagePreview ? 'Change Image' : 'Upload Image'}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, or WEBP. Max 10MB.</p>
                                  <input type="file" ref={fileInputRef} onChange={handleAddImageChange} accept="image/*" className="hidden" />
                              </div>
                          </div>
                      </div>
                      <p className="sm:col-span-2 text-[10px] text-slate-400 -mt-2">Base price defaults to ৳1000. You can change it from the dashboard later.</p>
                      
                      <div className="sm:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
                          <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
                          <button type="submit" disabled={isAddSubmitting} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white shadow-md hover:bg-emerald-600 disabled:opacity-70">
                              {isAddSubmitting ? <><Loader2 className="w-4 h-4 animate-spin"/> Saving...</> : <><UserPlus className="w-4 h-4"/> Add Player</>}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      {/* --- END ADD MODAL --- */}

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
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Payment TXID / Number</label>
                          <input type="text" value={editForm.paymentTxid} onChange={e => setEditForm({...editForm, paymentTxid: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none font-mono" required />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Base Price (৳)</label>
                          <input type="number" min="0" value={editForm.basePrice} onChange={e => setEditForm({...editForm, basePrice: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none font-mono" placeholder="1000" />
                      </div>
                      
                      <div className="sm:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
                          <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
                          <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-500 text-white shadow-md hover:bg-blue-600">Save Changes</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      {/* --- END EDIT MODAL --- */}

      {/* --- CUSTOM SERIAL EXPORT MODAL --- */}
      {showCustomExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col">
                  <div className="bg-white/95 backdrop-blur-sm border-b border-slate-100 p-5 flex items-center justify-between z-10 rounded-t-3xl shrink-0">
                      <div>
                          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                              <ListOrdered className="w-5 h-5 text-purple-500" /> Custom Serial Export
                          </h2>
                          <p className="text-xs text-slate-500 mt-1 font-medium">Click players to add them in your preferred order. Their original ZBSM IDs are preserved — only the JSON array order changes.</p>
                      </div>
                      <button onClick={() => setShowCustomExportModal(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors shrink-0">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 overflow-hidden">
                      {/* AVAILABLE PLAYERS (LEFT) */}
                      <div className="border-r border-slate-100 flex flex-col overflow-hidden">
                          <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
                              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                                  <Users className="w-4 h-4" /> Available Players
                                  <span className="ml-auto bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{availableForCustom.length}</span>
                              </h3>
                          </div>
                          <div className="flex-1 overflow-y-auto p-3 space-y-2">
                              {availableForCustom.length === 0 ? (
                                  <p className="text-center text-slate-400 text-sm font-medium py-8">All approved players selected.</p>
                              ) : (
                                  availableForCustom.map(r => (
                                      <button
                                          key={r.id}
                                          type="button"
                                          onClick={() => handleAddToCustom(r.id)}
                                          className="w-full flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 transition text-left group"
                                      >
                                          <img src={r.imageUrl || '/api/placeholder/40/40'} alt={r.name} className="w-10 h-10 rounded-lg object-cover object-top bg-slate-200 border border-slate-200 shrink-0" />
                                          <div className="min-w-0 flex-1">
                                              <p className="font-bold text-sm text-slate-800 truncate">{r.name}</p>
                                              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate">
                                                  #{r.serialNumber} • {r.role}
                                              </p>
                                          </div>
                                          <span className="shrink-0 p-1.5 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition">
                                              <Plus className="w-4 h-4" />
                                          </span>
                                      </button>
                                  ))
                              )}
                          </div>
                      </div>

                      {/* SELECTED ORDER (RIGHT) */}
                      <div className="flex flex-col overflow-hidden">
                          <div className="p-4 bg-purple-50 border-b border-purple-100 shrink-0">
                              <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-2">
                                  <ListOrdered className="w-4 h-4" /> Selected Order
                                  <span className="ml-auto bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">{selectedForCustom.length}</span>
                              </h3>
                          </div>
                          <div className="flex-1 overflow-y-auto p-3 space-y-2">
                              {selectedForCustom.length === 0 ? (
                                  <p className="text-center text-slate-400 text-sm font-medium py-8">Click players on the left to add them in your preferred serial order.</p>
                              ) : (
                                  selectedForCustom.map((r, idx) => (
                                      <div
                                          key={r.id}
                                          className="flex items-center gap-2 p-2 rounded-xl border border-purple-100 bg-purple-50/50"
                                      >
                                          <span className="font-mono font-extrabold text-slate-400 text-sm shrink-0 w-6 text-right">
                                              {idx + 1}.
                                          </span>
                                          <span className="font-mono font-extrabold text-purple-700 bg-white border border-purple-200 px-2 py-1 rounded text-xs shrink-0 w-16 text-center">
                                              ZBSM-{String(r.serialNumber).padStart(2, '0')}
                                          </span>
                                          <img src={r.imageUrl || '/api/placeholder/40/40'} alt={r.name} className="w-10 h-10 rounded-lg object-cover object-top bg-slate-200 border border-slate-200 shrink-0" />
                                          <div className="min-w-0 flex-1">
                                              <p className="font-bold text-sm text-slate-800 truncate">{r.name}</p>
                                              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate">
                                                  {r.role}
                                              </p>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                  type="button"
                                                  onClick={() => handleMoveCustomUp(idx)}
                                                  disabled={idx === 0}
                                                  className="p-1.5 rounded-lg bg-white text-slate-500 hover:bg-purple-500 hover:text-white border border-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-500"
                                                  title="Move up"
                                              >
                                                  <ArrowUp className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                  type="button"
                                                  onClick={() => handleMoveCustomDown(idx)}
                                                  disabled={idx === selectedForCustom.length - 1}
                                                  className="p-1.5 rounded-lg bg-white text-slate-500 hover:bg-purple-500 hover:text-white border border-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-500"
                                                  title="Move down"
                                              >
                                                  <ArrowDown className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                  type="button"
                                                  onClick={() => handleRemoveFromCustom(r.id)}
                                                  className="p-1.5 rounded-lg bg-white text-red-500 hover:bg-red-500 hover:text-white border border-red-100 transition"
                                                  title="Remove from list"
                                              >
                                                  <X className="w-3.5 h-3.5" />
                                              </button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="border-t border-slate-100 p-4 flex justify-between items-center bg-slate-50 shrink-0">
                      <p className="text-xs text-slate-500 font-medium">
                          {selectedForCustom.length > 0 
                              ? `Will export ${selectedForCustom.length} player${selectedForCustom.length === 1 ? '' : 's'} in your custom order — original ZBSM IDs preserved.`
                              : 'Select at least one player to export.'}
                      </p>
                      <div className="flex gap-3">
                          <button type="button" onClick={() => setShowCustomExportModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
                          <button 
                              type="button" 
                              onClick={handleCustomExport} 
                              disabled={selectedForCustom.length === 0}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-purple-500 text-white shadow-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <Download className="w-4 h-4" /> Export Custom JSON
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      {/* --- END CUSTOM EXPORT MODAL --- */}


      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pt-4 gap-4">
        <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 shrink-0" /> Registration Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Approve players, assign serials, and send SMS.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-emerald-500 px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition shadow-md">
                <UserPlus className="w-4 h-4" /> Add Player
            </button>

            {/* --- EXPORT DROPDOWN --- */}
            <div className="relative flex-1 sm:flex-none" ref={exportMenuRef}>
                <button 
                    onClick={() => setShowExportMenu(prev => !prev)} 
                    className="w-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 px-4 py-2.5 rounded-xl hover:bg-slate-200 transition shrink-0"
                >
                    <Download className="w-4 h-4" /> Export Roster
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>
                {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30 animate-fadeIn">
                        <button 
                            onClick={handleExportRoster} 
                            className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition flex items-start gap-3"
                        >
                            <Download className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold">Default Serial</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Export by approval order (ZBSM-01, 02...)</p>
                            </div>
                        </button>
                        <div className="border-t border-slate-100" />
                        <button 
                            onClick={openCustomExportModal} 
                            className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-600 transition flex items-start gap-3"
                        >
                            <ListOrdered className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold">Custom Serial...</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Pick players one-by-one in your own order</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            <button onClick={() => setIsAuthenticated(false)} className="text-xs sm:text-sm font-bold text-red-500 bg-red-50 px-4 py-2.5 rounded-xl hover:bg-red-100 transition shrink-0">
                Lock 
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total Requests" count={stats.total} icon={Users} color="blue" />
        <StatCard title="Pending" count={stats.pending} icon={Clock} color="amber" />
        <StatCard title="Approved" count={stats.approved} icon={UserCheck} color="emerald" />
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
              <div className="flex overflow-x-auto bg-slate-100 p-1 rounded-xl w-full lg:w-fit custom-scrollbar">
                  {['all', 'pending', 'approved', 'unpaid', 'rejected'].map(f => (
                      <button 
                          key={f} onClick={() => setFilter(f)}
                          className={`px-4 py-2 lg:py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 lg:flex-none ${
                              filter === f 
                                  ? (f === 'unpaid' ? 'bg-white text-red-600 shadow-sm' : 'bg-white text-emerald-600 shadow-sm')
                                  : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                          {f}
                      </button>
                  ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  
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
              {filteredRegistrations.map(reg => {
                const isUnpaid = reg.status === 'approved' && reg.unpaid;
                return (
                <tr 
                    key={reg.id} 
                    className={`hover:bg-slate-50/50 transition ${isUnpaid ? 'bg-red-50/40 border-l-4 border-l-red-400' : ''}`}
                >
                  
                  <td className="p-4">
                      {reg.serialNumber ? (
                          <span className="font-mono font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              #{reg.serialNumber}
                          </span>
                      ) : (
                          <span className="text-slate-300 font-mono text-xs">-</span>
                      )}
                  </td>

                  <td className="p-4 flex items-center gap-3">
                      <a 
                          href={reg.imageUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className={`shrink-0 block rounded-xl ${isUnpaid ? 'ring-2 ring-red-500 ring-offset-2 animate-pulse' : ''}`}
                      >
                        <img 
                            src={reg.imageUrl || '/api/placeholder/40/40'} 
                            alt={reg.name} 
                            className={`w-12 h-12 rounded-xl object-cover object-top bg-slate-200 shadow-sm hover:scale-110 transition-transform ${
                                isUnpaid ? 'border-2 border-red-500' : 'border border-slate-200'
                            }`} 
                            title={isUnpaid ? 'UNPAID — click to view full image' : 'Click to view full image'} 
                        />
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
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">
                              Batch {reg.batch}
                          </span>
                          <button 
                              onClick={() => handleSetBasePrice(reg)} 
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-widest transition border ${
                                  reg.basePrice 
                                      ? 'text-purple-600 bg-purple-50 border-purple-100 hover:bg-purple-100' 
                                      : 'text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100 border-dashed'
                              }`}
                              title="Click to set base price"
                          >
                              ৳{reg.basePrice || 1000}{!reg.basePrice && ' (default)'}
                          </button>
                      </div>
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
                      <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                              reg.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' :
                              reg.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                              'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                          }`}>
                              {reg.status}
                          </span>
                          {isUnpaid && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-red-100 text-red-700 border border-red-300 shadow-sm animate-pulse">
                                  <DollarSign className="w-2.5 h-2.5" /> Unpaid
                              </span>
                          )}
                      </div>
                  </td>

                  <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                          
                          <button 
                              onClick={() => handleSmartCrop(reg)} 
                              disabled={croppingId === reg.id}
                              className="p-1.5 bg-purple-50 text-purple-500 hover:bg-purple-500 hover:text-white rounded-lg transition disabled:opacity-50 disabled:cursor-wait" 
                              title="Auto-crop to 500×500 face portrait"
                          >
                              {croppingId === reg.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                  <Sparkles className="w-4 h-4" />
                              )}
                          </button>

                          <button 
                              onClick={() => handleChangeImageUrl(reg)} 
                              className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition" 
                              title="Change picture URL"
                          >
                              <LinkIcon className="w-4 h-4" />
                          </button>

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
                                  {reg.status === 'approved' && (
                                      <>
                                          <button 
                                              onClick={() => handleToggleUnpaid(reg)} 
                                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                                                  reg.unpaid 
                                                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' 
                                                      : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                              }`}
                                              title={reg.unpaid ? 'Click to mark as PAID (remove indicator)' : 'Click to mark as UNPAID'}
                                          >
                                              <DollarSign className="w-3.5 h-3.5" /> 
                                              {reg.unpaid ? 'Mark Paid' : 'Unpaid'}
                                          </button>
                                          <button onClick={() => handleCopySMS(reg)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-700 hover:text-white rounded-lg font-bold text-xs transition" title="Copy SMS Message">
                                              <MessageSquare className="w-3.5 h-3.5" /> Copy SMS
                                          </button>
                                      </>
                                  )}
                                  <button onClick={() => handleDelete(reg)} className="p-1.5 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-lg transition border border-transparent hover:border-red-600" title="Permanently Delete">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </>
                          )}
                      </div>
                  </td>
                </tr>
              );})}
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