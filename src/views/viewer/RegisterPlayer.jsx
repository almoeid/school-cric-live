import React, { useState, useRef } from 'react';
import { User, Image as ImageIcon, Phone, CalendarDays, Award, Target, Info, CreditCard, Send, Loader2 } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, APP_ID } from '../../config/firebase';

export default function RegisterPlayer({ setView }) {
  const fileInputRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [batch, setBatch] = useState('');
  const [role, setRole] = useState('');
  const [paymentTxid, setPaymentTxid] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: null, text: '' });

  // Generate batch dropdown options from 1990 to 2026
  const batches = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);
  const roles = ["Batsman", "Bowler", "Allrounder", "Batting Allrounder", "Bowling Allrounder"];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitMessage({ type: 'error', text: 'Picture must be smaller than 5MB.' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setSubmitMessage({ type: 'error', text: 'Please upload an image file (e.g., .jpg, .png).' });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage({ type: null, text: '' });

    if (!name || !mobileNumber || !batch || !role || !imageFile || !paymentTxid) {
      setSubmitMessage({ type: 'error', text: 'Please fill in all required fields and upload a picture.' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload Image to Firebase Storage
      const storageRef = ref(storage, `${APP_ID}/player_registrations/${Date.now()}_${imageFile.name}`);
      const uploadSnapshot = await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(uploadSnapshot.ref);

      // 2. Save Data to Firestore
      const registrationData = {
        name,
        mobileNumber,
        batch,
        role,
        paymentTxid,
        imageUrl,
        status: 'pending',
        timestamp: Date.now(),
      };

      await addDoc(collection(db, 'artifacts', APP_ID, 'private', 'registrations'), registrationData);

      setSubmitMessage({ type: 'success', text: 'Registration submitted successfully! Please wait for admin approval.' });
      
      // Clear form
      setName(''); setMobileNumber(''); setBatch(''); setRole(''); setPaymentTxid(''); setImageFile(null); setImagePreview(null);
      
      setTimeout(() => setView('home'), 3000);

    } catch (error) {
      console.error('Registration Error:', error);
      setSubmitMessage({ type: 'error', text: 'Failed to submit registration. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 pt-4 animate-fadeIn">
      
      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 mb-8 text-white shadow-xl">
        <div className="flex items-center gap-5">
           <div className="bg-white p-4 rounded-2xl shadow-inner shrink-0">
             <Target className="w-8 h-8 md:w-10 md:h-10 text-emerald-600" />
           </div>
           <div>
             <span className="bg-emerald-500/50 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider border border-emerald-400/50">Registration Open</span>
             <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-2">ZBSM Elite Cup 2026</h1>
             <p className="text-emerald-100 mt-1 md:mt-2 text-sm md:text-base font-medium">Join the battle and prove your mettle on the field.</p>
           </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-3xl shadow-lg border border-slate-100 space-y-8">
        
        {submitMessage.text && (
            <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-3 border ${
                submitMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {submitMessage.text}
            </div>
        )}

        {/* Player Info Section */}
        <section>
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
             <User className="w-5 h-5 text-emerald-500" />
             <h2 className="text-lg md:text-xl font-bold text-slate-800">Player Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="Full Name" icon={User}>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Munna Kumar" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all" />
            </InputGroup>

            <InputGroup label="Mobile Number" icon={Phone}>
              <input type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required placeholder="017xxxxxxxx" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all" />
            </InputGroup>

            <InputGroup label="Batch" icon={CalendarDays}>
                <select value={batch} onChange={(e) => setBatch(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all appearance-none">
                    <option value="" disabled>Select Batch</option>
                    {batches.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </InputGroup>

            <InputGroup label="Playing Role" icon={Award}>
                <select value={role} onChange={(e) => setRole(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all appearance-none">
                    <option value="" disabled>Select Role</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </InputGroup>

            <div className="md:col-span-2">
                <InputGroup label="Player Style Picture (Portrait)" icon={ImageIcon}>
                   <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-2 border-dashed border-slate-200 rounded-xl p-5 hover:border-emerald-400 transition-all bg-slate-50">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-xl object-cover shadow-sm border border-slate-200" />
                        ) : (
                            <div className="w-24 h-24 rounded-xl bg-white flex items-center justify-center text-slate-300 border border-slate-200 shadow-sm">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Upload Image</p>
                            <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, or WEBP. Max 5MB.</p>
                            <button type="button" onClick={() => fileInputRef.current.click()} className="mt-3 text-xs bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-lg font-bold hover:bg-emerald-200 transition-colors">
                                {imagePreview ? 'Change Image' : 'Select File'}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                        </div>
                   </div>
                </InputGroup>
            </div>
          </div>
        </section>

        {/* Payment Info Section */}
        <section>
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
             <CreditCard className="w-5 h-5 text-emerald-500" />
             <h2 className="text-lg md:text-xl font-bold text-slate-800">Registration Fee</h2>
          </div>
          
          <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 mb-6 flex items-start gap-4">
              {/* FIXED: Swapped MessageSquareCheck to Info */}
              <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                  <p className="text-sm text-slate-700 leading-relaxed">Send the registration fee to the number below via <b>bKash</b> or <b>Nagad</b> (Personal). Then, enter the Transaction ID (TXID) or the phone number you sent it from.</p>
                  <div className="mt-3 inline-block bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-sm font-mono font-bold text-emerald-700 text-lg">
                      01700770376
                  </div>
              </div>
          </div>

          <InputGroup label="Enter bKash/Nagad Number or TXID" icon={Phone}>
              <input type="text" value={paymentTxid} onChange={(e) => setPaymentTxid(e.target.value)} required placeholder="e.g. 017xxxxxxxx or 9X8Y7Z6W" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-mono" />
          </InputGroup>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
           <button type="button" onClick={() => setView('home')} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
           <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white shadow-md hover:bg-emerald-600 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all">
             {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit</>}
           </button>
        </div>
      </form>
    </div>
  );
}

function InputGroup({ label, icon: Icon, children }) {
  return (
    <div className="w-full">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
         <Icon className="w-3.5 h-3.5 text-slate-400" />
         {label}
      </label>
      {children}
    </div>
  );
}
