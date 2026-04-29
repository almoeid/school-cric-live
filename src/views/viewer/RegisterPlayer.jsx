import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Image as ImageIcon, Phone, CalendarDays, Award, Target, Info, 
  CreditCard, Send, Loader2, CheckCircle, XCircle, PhoneCall, Hash, Copy, Shirt, Clock, Lock 
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, APP_ID } from '../../config/firebase';

export default function RegisterPlayer({ setView }) {
  // --- MANUAL MASTER SWITCH ---
  // Change this to `false` to manually lock the form at any time.
  const IS_REGISTRATION_OPEN = false; 

  const fileInputRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [batch, setBatch] = useState('');
  const [role, setRole] = useState('');
  const [jerseyName, setJerseyName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [jerseySize, setJerseySize] = useState('');
  const [paymentTxid, setPaymentTxid] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState({ show: false, type: null, text: '' });
  const [copied, setCopied] = useState(false);
  
  // Advanced Countdown State
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
  const [isClosed, setIsClosed] = useState(false);

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false, type: null, text: '' }), 4000);
  };

  // --- Real-time Advanced Countdown Timer (Ends May 1, 2026 00:00 BST - Midnight after April 30) ---
  useEffect(() => {
    const targetDate = new Date('2026-05-01T00:00:00+06:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setIsClosed(true);
        return;
      }

      // Format with leading zeros for a professional look (e.g., 03 instead of 3)
      const days = Math.floor(difference / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((difference % (1000 * 60)) / 1000).toString().padStart(2, '0');

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);
  const batches = ["School Batch", "Madrasa", ...years]; 
  const roles = ["Batsman", "Bowler", "Allrounder", "Batting Allrounder", "Bowling Allrounder"];
  const jerseySizes = ["M", "L", "XL", "XXL", "XXXL"];

  const feeAmount = (batch === 'School Batch' || String(batch) === '2026') ? '200' : '500';

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= 11) setMobileNumber(val);
  };

  const handleJerseyNumberChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= 3) setJerseyNumber(val);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('error', 'Picture must be smaller than 10MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('error', 'Please upload an image file (e.g., .jpg, .png).');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText('01701597310');
    setCopied(true);
    showToast('success', 'Number copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!IS_REGISTRATION_OPEN || isClosed) {
      showToast('error', 'Registration is closed.');
      return;
    }

    if (!name || !mobileNumber || !batch || !role || !jerseyName || !jerseyNumber || !jerseySize || !imageFile || !paymentTxid) {
      showToast('error', 'Please fill in all required fields and upload a picture.');
      return;
    }

    if (mobileNumber.length !== 11 || !mobileNumber.startsWith('01')) {
        showToast('error', 'Mobile number must start with 01 and be exactly 11 digits.');
        return;
    }

    setIsSubmitting(true);

    try {
      const storageRef = ref(storage, `${APP_ID}/player_registrations/${Date.now()}_${imageFile.name}`);
      const uploadSnapshot = await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(uploadSnapshot.ref);

      const registrationData = {
        name,
        mobileNumber,
        batch,
        role,
        jerseyName,
        jerseyNumber,
        jerseySize, 
        paymentTxid,
        imageUrl,
        status: 'pending',
        timestamp: Date.now(),
      };

      await addDoc(collection(db, 'artifacts', APP_ID, 'private', 'data', 'registrations'), registrationData);

      setIsSuccess(true);

    } catch (error) {
      console.error('Registration Error:', error);
      showToast('error', `Failed: ${error.message}`);
      setIsSubmitting(false);
    } 
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto pb-16 pt-10 px-4 text-center animate-fadeIn">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-emerald-100 flex flex-col items-center relative overflow-hidden">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-emerald-50 to-white"></div>
           
           <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 relative z-10 animate-bounce">
               <CheckCircle className="w-12 h-12 text-white" />
           </div>
           
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-3 relative z-10">Registration Successful!</h2>
           
           <p className="text-slate-600 mb-8 font-medium max-w-md mx-auto leading-relaxed relative z-10">
               Your application for the <b>ZBSM Elite Cup 2026</b> has been submitted securely. Please wait while our admins verify your payment and approve your profile.
           </p>
           
           <button 
              onClick={() => setView('home')} 
              className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-slate-800 hover:-translate-y-0.5 transition-all w-full sm:w-auto relative z-10"
           >
              Back to Live Scores
           </button>
        </div>
      </div>
    );
  }

  const TimeBox = ({ value, label }) => (
    <div className="flex flex-col items-center min-w-[36px] sm:min-w-[40px]">
        <span className="text-base sm:text-lg font-extrabold text-white leading-none">{value}</span>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-emerald-200/80 mt-1">{label}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-16 pt-4 px-2 sm:px-0 animate-fadeIn relative">
      
      {/* Toast Notification */}
      <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
          <div className={`px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold border ${
              toast.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-emerald-600 text-white border-emerald-700'
          }`}>
              {toast.type === 'error' ? <XCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
              {toast.text}
          </div>
      </div>

      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 md:p-8 mb-6 md:mb-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-start md:items-center gap-4 md:gap-5 z-10 w-full md:w-auto">
           <div className="bg-white p-3 md:p-4 rounded-2xl shadow-inner shrink-0 mt-1 md:mt-0">
             <Target className="w-7 h-7 md:w-10 md:h-10 text-emerald-600" />
           </div>
           
           <div className="flex-1">
             <span className={`inline-block text-[10px] md:text-xs font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider border mb-1 ${(!IS_REGISTRATION_OPEN || isClosed) ? 'bg-slate-500/50 border-slate-400/50' : 'bg-emerald-500/50 border-emerald-400/50'}`}>
               {(!IS_REGISTRATION_OPEN || isClosed) ? 'Registration Closed' : 'Registration Open'}
             </span>
             <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-1 leading-tight">ZBSM Elite Cup 2026</h1>
             <p className="text-emerald-100 mt-1.5 text-xs md:text-sm font-medium">Join the battle and prove your mettle on the field.</p>
             
             {/* Professional Boxed Timer Layout */}
             {(!IS_REGISTRATION_OPEN || isClosed) ? (
                <div className="mt-4 inline-flex items-center gap-2 bg-red-500/20 text-red-100 px-4 py-2.5 rounded-xl font-bold border border-red-500/30 text-sm shadow-sm backdrop-blur-sm">
                    <Lock className="w-4 h-4" /> Form Locked
                </div>
             ) : (
                <div className="mt-4 flex flex-wrap items-center gap-3 bg-slate-900/20 w-fit px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner">
                    <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-emerald-200">
                        <Clock className="w-3.5 h-3.5 animate-pulse" /> Ends In
                    </div>
                    <div className="w-px h-6 bg-white/20 hidden sm:block"></div>
                    <div className="flex items-center gap-1 font-mono">
                        <TimeBox value={timeLeft.days} label="Days" />
                        <span className="text-emerald-300/50 font-bold mb-3">:</span>
                        <TimeBox value={timeLeft.hours} label="Hrs" />
                        <span className="text-emerald-300/50 font-bold mb-3">:</span>
                        <TimeBox value={timeLeft.minutes} label="Min" />
                        <span className="text-emerald-300/50 font-bold mb-3">:</span>
                        <TimeBox value={timeLeft.seconds} label="Sec" />
                    </div>
                </div>
             )}
           </div>
        </div>
        
        <a href="tel:01701597310" className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors px-4 py-3 md:px-5 rounded-xl border border-white/30 backdrop-blur-sm shrink-0 w-full md:w-auto z-10">
            <PhoneCall className="w-5 h-5" />
            <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Support Hotline</p>
                <p className="text-sm md:text-base font-extrabold font-mono tracking-tight">01701597310</p>
            </div>
        </a>
      </div>

      {/* --- FORM OR CLOSED UI --- */}
      {(!IS_REGISTRATION_OPEN || isClosed) ? (
        <div className="bg-white p-10 md:p-14 rounded-3xl shadow-lg border border-slate-100 text-center flex flex-col items-center animate-fadeIn">
           <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border border-red-100 shadow-inner">
               <Lock className="w-8 h-8 text-red-500" />
           </div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-3">Registration is Closed</h2>
           <p className="text-slate-500 font-medium max-w-md mx-auto mb-8 leading-relaxed">
               We're sorry, but the player registration phase for the <b>ZBSM Elite Cup 2026</b> has officially ended. Thank you for your overwhelming interest!
           </p>
           <button onClick={() => setView('home')} className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 hover:-translate-y-0.5 transition-all">
               Back to Live Scores
           </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-5 md:p-10 rounded-3xl shadow-lg border border-slate-100 space-y-8">
          {/* Player Info Section */}
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
               <User className="w-5 h-5 text-emerald-500" />
               <h2 className="text-lg md:text-xl font-bold text-slate-800">Player Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <InputGroup label="Full Name" icon={User}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Munna Kumar" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all" />
              </InputGroup>

              <InputGroup label="Mobile Number" icon={Phone}>
                <input type="tel" value={mobileNumber} onChange={handleMobileChange} required placeholder="017xxxxxxxx" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-mono" />
              </InputGroup>

              <InputGroup label="Batch" icon={CalendarDays}>
                  <select value={batch} onChange={(e) => setBatch(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all appearance-none">
                      <option value="" disabled>Select Batch</option>
                      {batches.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              </InputGroup>

              <InputGroup label="Playing Role" icon={Award}>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all appearance-none">
                      <option value="" disabled>Select Role</option>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
              </InputGroup>

              <InputGroup label="Jersey Name" icon={User}>
                <input type="text" value={jerseyName} onChange={(e) => setJerseyName(e.target.value.toUpperCase())} required placeholder="e.g. MUNNA" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all uppercase" />
              </InputGroup>

              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Jersey No." icon={Hash}>
                  <input type="tel" value={jerseyNumber} onChange={handleJerseyNumberChange} required placeholder="e.g. 10" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-mono" />
                </InputGroup>

                <InputGroup label="Size" icon={Shirt}>
                    <select value={jerseySize} onChange={(e) => setJerseySize(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all appearance-none">
                        <option value="" disabled>Size</option>
                        {jerseySizes.map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                </InputGroup>
              </div>

              <div className="md:col-span-2">
                  <InputGroup label="Player Style Picture (Portrait)" icon={ImageIcon}>
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-2 border-dashed border-slate-200 rounded-xl p-5 hover:border-emerald-400 transition-all bg-slate-50">
                          {imagePreview ? (
                              <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-xl object-cover shadow-sm border border-slate-200 shrink-0" />
                          ) : (
                              <div className="w-24 h-24 rounded-xl bg-white flex items-center justify-center text-slate-300 border border-slate-200 shadow-sm shrink-0">
                                  <ImageIcon className="w-8 h-8" />
                              </div>
                          )}
                          <div>
                              <p className="text-sm font-semibold text-slate-700">Upload Image</p>
                              <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, or WEBP. Max 10MB.</p>
                              <button type="button" onClick={() => fileInputRef.current.click()} className="mt-3 text-xs bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold hover:bg-emerald-200 transition-colors w-full sm:w-auto">
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
            
            <div className="bg-emerald-50/50 p-4 md:p-5 rounded-2xl border border-emerald-100 mb-6 flex flex-col sm:flex-row sm:items-start gap-4">
                <Info className="w-6 h-6 text-emerald-500 shrink-0 hidden sm:block mt-0.5" />
                <div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      রেজিস্ট্রেশন ফি <strong className="text-emerald-700 font-extrabold text-base transition-all">{feeAmount}tk</strong> নিচের নম্বরে <b>bKash</b> অথবা <b>Nagad</b> (Personal) এর মাধ্যমে Send Money করুন। এরপর, Transaction ID (TXID) অথবা যে নম্বর থেকে টাকা পাঠিয়েছেন তা নিচের বক্সে লিখুন।
                    </p>
                    
                    <div className="mt-4 flex items-center gap-2">
                        <div className="bg-white px-5 py-2.5 rounded-xl border border-emerald-200 shadow-sm font-mono font-extrabold text-emerald-700 text-lg md:text-xl tracking-wider">
                            01701597310
                        </div>
                        <button 
                          type="button" 
                          onClick={handleCopyNumber}
                          className="p-3 bg-white border border-emerald-200 shadow-sm rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Copy Number"
                        >
                          {copied ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            <InputGroup label="Enter bKash/Nagad Number or TXID" icon={Phone}>
                <input type="text" value={paymentTxid} onChange={(e) => setPaymentTxid(e.target.value)} required placeholder="e.g. 017xxxxxxxx or 9X8Y7Z6W" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-mono text-lg" />
            </InputGroup>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 md:gap-4 pt-4">
             <button type="button" onClick={() => setView('home')} className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
             <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 sm:py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white shadow-md hover:bg-emerald-600 hover:shadow-lg disabled:opacity-70 transition-all">
               {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Send className="w-5 h-5" /> Submit</>}
             </button>
          </div>
        </form>
      )}
    </div>
  );
}

function InputGroup({ label, icon: Icon, children }) {
  return (
    <div className="w-full">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
         <Icon className="w-3.5 h-3.5 text-emerald-500" />
         {label}
      </label>
      {children}
    </div>
  );
}
