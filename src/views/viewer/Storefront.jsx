import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Info, Phone, User, Hash, CreditCard, 
  Send, Loader2, CheckCircle, XCircle, Shirt, MapPin, Copy, ChevronLeft
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config/firebase';

// --- MOCK DATABASE OF PRODUCTS ---
// Add new jerseys to this array to automatically expand the store!
const storeProducts = [
  {
    id: 'DurontoEkadosh',
    name: 'Duronto Ekadosh',
    type: 'Player Edition Match Jersey for Fan',
    fabric: 'Thai Mesh (Premium)',
    customization: 'Name & Number Included',
    price: 419,
    image: '/DE.jpg',
    paymentNumber: '01793216517'
  }
];

export default function Storefront({ setView }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [jerseyName, setJerseyName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [jerseySize, setJerseySize] = useState('');
  const [paymentTxid, setPaymentTxid] = useState('');
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState({ show: false, type: null, text: '' });
  const [copied, setCopied] = useState(false);

  const jerseySizes = ["M", "L", "XL", "XXL", "XXXL"];

  // --- ROUTING EFFECT ---
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const itemId = params.get('item');
      if (itemId) {
          const foundProduct = storeProducts.find(p => p.id === itemId);
          if (foundProduct) setSelectedProduct(foundProduct);
      }
  }, []);

  const handleProductClick = (product) => {
      setSelectedProduct(product);
      window.history.pushState({}, '', `/store?item=${product.id}`);
      window.scrollTo(0, 0); 
  };

  const goBackToStore = () => {
      setSelectedProduct(null);
      setIsSuccess(false);
      window.history.pushState({}, '', `/store`);
  };

  // --- HANDLERS ---
  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false, type: null, text: '' }), 4000);
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= 11) setMobileNumber(val);
  };

  const handleJerseyNumberChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= 3) setJerseyNumber(val);
  };

  const handleCopyNumber = () => {
    if(!selectedProduct) return;
    navigator.clipboard.writeText(selectedProduct.paymentNumber);
    setCopied(true);
    showToast('success', 'Payment number copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerName || !mobileNumber || !jerseyName || !jerseyNumber || !jerseySize || !paymentTxid) {
      showToast('error', 'Please fill in all fields.');
      return;
    }

    if (mobileNumber.length !== 11 || !mobileNumber.startsWith('01')) {
        showToast('error', 'Mobile number must start with 01 and be 11 digits.');
        return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        team: selectedProduct.name, 
        name: customerName,
        mobileNumber,
        jerseyName,
        jerseyNumber,
        jerseySize,
        paymentTxid,
        price: selectedProduct.price,
        status: 'pending',
        timestamp: Date.now(),
      };

      await addDoc(collection(db, 'artifacts', APP_ID, 'private', 'data', 'orders'), orderData);
      setIsSuccess(true);
      
      setCustomerName(''); setMobileNumber(''); setJerseyName(''); setJerseyNumber(''); setJerseySize(''); setPaymentTxid('');

    } catch (error) {
      console.error('Order Error:', error);
      showToast('error', `Failed: ${error.message}`);
      setIsSubmitting(false);
    } 
  };

  // --- RENDER SUCCESS STATE ---
  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto pb-16 pt-10 px-4 text-center animate-fadeIn">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-emerald-100 flex flex-col items-center relative overflow-hidden">
           <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 relative z-10 animate-bounce">
               <ShoppingBag className="w-10 h-10 text-white" />
           </div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-3">Prebook Confirmed!</h2>
           <p className="text-slate-600 mb-6 font-medium max-w-md mx-auto leading-relaxed">
               Your order for the <b>{selectedProduct?.name}</b> jersey is pending admin approval. You will receive an SMS confirmation soon. 
           </p>
           <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-8 flex items-start gap-3 text-left w-full">
               <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
               <p className="text-sm font-semibold text-amber-800">
                   Remember to collect your jersey from Al Moeid or the ZBSM Ground approximately 10 days before Eid!
               </p>
           </div>
           <button onClick={goBackToStore} className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all w-full sm:w-auto">
              Continue Shopping
           </button>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN COMPONENT ---
  return (
    <div className="max-w-5xl mx-auto pb-16 pt-4 px-3 sm:px-6 lg:px-8 animate-fadeIn relative">
      
      {/* Toast */}
      <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
          <div className={`px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold border ${toast.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-emerald-600 text-white border-emerald-700'}`}>
              {toast.type === 'error' ? <XCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
              {toast.text}
          </div>
      </div>

      {!selectedProduct ? (
        
        /* --- 1. STORE CATALOG GRID --- */
        <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 mb-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <span className="bg-emerald-500/30 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full text-emerald-300 uppercase tracking-wider border border-emerald-500/30">Official Merchandise</span>
                    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-3">ZBSM Elite Cup 2026 Merchandise</h1>
                    <p className="text-slate-300 mt-1 md:mt-2 text-sm md:text-base font-medium">Support your team. Wear the colors. Own the game.</p>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {storeProducts.map(p => (
                    <div key={p.id} onClick={() => handleProductClick(p)} className="group cursor-pointer bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                        
                        <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                            <img 
                                src={p.image} 
                                alt={p.name} 
                                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out" 
                                onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/400x500?text=Jersey+Coming+Soon"; }} 
                            />
                            {/* FIX: Moved badge to bottom-left */}
                            <div className="absolute bottom-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm z-10">Prebook</div>
                        </div>
                        
                        <div className="p-4 flex flex-col flex-grow">
                            <h3 className="font-extrabold text-slate-800 text-sm md:text-base leading-tight group-hover:text-emerald-600 transition-colors">{p.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{p.type}</p>
                            
                            <div className="mt-auto pt-4 flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-medium">Price</p>
                                    <p className="font-extrabold text-slate-800 text-lg leading-none">৳{p.price}</p>
                                </div>
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">Buy Now</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      ) : (

        /* --- 2. PRODUCT DETAIL & CHECKOUT FORM --- */
        <div className="animate-fadeIn">
            {/* Back Button */}
            <button onClick={goBackToStore} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" /> Back to Catalog
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* Left Column: Product Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        
                        <div className="aspect-[4/5] bg-slate-100 flex items-center justify-center border-b border-slate-100 relative">
                            <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover object-top" />
                            {/* FIX: Moved badge to bottom-left */}
                            <div className="absolute bottom-4 left-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-md z-10">Prebook Only</div>
                        </div>
                        
                        <div className="p-6 md:p-8">
                            <h3 className="font-extrabold text-2xl text-slate-800 mb-1">{selectedProduct.name}</h3>
                            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-6">{selectedProduct.type}</p>
                            
                            <div className="space-y-4 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-start sm:items-center text-sm border-b border-slate-200 pb-3">
                                    <span className="text-slate-500 font-medium shrink-0 mr-4">Fabric</span>
                                    <span className="font-bold text-slate-700 text-right leading-tight">{selectedProduct.fabric}</span>
                                </div>
                                {/* FIX: Adjusted wrapping structure for long text on mobile */}
                                <div className="flex justify-between items-start sm:items-center text-sm pt-1">
                                    <span className="text-slate-500 font-medium shrink-0 mr-4">Customization</span>
                                    <span className="font-bold text-slate-700 text-right leading-tight">{selectedProduct.customization}</span>
                                </div>
                            </div>

                            <div className="flex items-end justify-between">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Price</span>
                                <span className="text-3xl font-extrabold text-slate-800">৳{selectedProduct.price}</span>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Notice */}
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3 shadow-sm">
                        <Info className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-extrabold text-amber-900 mb-1">Delivery Notice</h4>
                            <p className="text-xs font-semibold text-amber-800/80 leading-relaxed">
                                Jerseys will be ready approximately <b>10 days before Eid</b>. Collection is direct from <b>Al Moeid</b> or the <b>ZBSM Ground</b>. No home delivery available.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Form */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-slate-100 space-y-6">
                      
                      <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                          <User className="w-5 h-5 text-emerald-500" /> Customer Details
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <InputGroup label="Full Name" icon={User}>
                              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="e.g. Munna Kumar" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all" />
                          </InputGroup>

                          <InputGroup label="Mobile Number" icon={Phone}>
                              <input type="tel" value={mobileNumber} onChange={handleMobileChange} required placeholder="017xxxxxxxx" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-mono" />
                          </InputGroup>

                          <InputGroup label="Name on Jersey" icon={User}>
                              <input type="text" value={jerseyName} onChange={(e) => setJerseyName(e.target.value.toUpperCase())} required placeholder="e.g. MUNNA" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all uppercase" />
                          </InputGroup>

                          <div className="grid grid-cols-2 gap-3">
                              <InputGroup label="Jersey No." icon={Hash}>
                                  <input type="tel" value={jerseyNumber} onChange={handleJerseyNumberChange} required placeholder="e.g. 10" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-mono" />
                              </InputGroup>

                              <InputGroup label="Size" icon={Shirt}>
                                  <select value={jerseySize} onChange={(e) => setJerseySize(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all appearance-none font-bold text-slate-700">
                                      <option value="" disabled>Select</option>
                                      {jerseySizes.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                              </InputGroup>
                          </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100">
                          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                              <CreditCard className="w-5 h-5 text-emerald-500" /> Payment ({selectedProduct.price} TK)
                          </h2>
                          
                          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-5">
                              <p className="text-sm text-emerald-800 font-medium leading-relaxed mb-3">
                                  Send exactly <b>{selectedProduct.price} TK</b> via bKash or Nagad (Personal) to the number below to secure your prebook.
                              </p>
                              <div className="flex items-center gap-2">
                                  <div className="bg-white px-4 py-2.5 rounded-xl border border-emerald-200 shadow-sm font-mono font-extrabold text-emerald-700 text-lg md:text-xl tracking-wider">
                                      {selectedProduct.paymentNumber}
                                  </div>
                                  <button type="button" onClick={handleCopyNumber} className="p-3 bg-white border border-emerald-200 shadow-sm rounded-xl text-emerald-600 hover:bg-emerald-100 transition-colors" title="Copy Number">
                                      {copied ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                  </button>
                              </div>
                          </div>

                          <InputGroup label="Enter TXID or Last 4 Digits" icon={Phone}>
                              <input type="text" value={paymentTxid} onChange={(e) => setPaymentTxid(e.target.value)} required placeholder="e.g. 9X8Y7Z6W or 1517" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none transition-all font-mono font-bold text-lg" />
                          </InputGroup>
                      </div>

                      <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                          <button type="button" onClick={goBackToStore} className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 sm:py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white shadow-md hover:bg-emerald-600 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all">
                              {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Send className="w-5 h-5" /> Confirm Prebook</>}
                          </button>
                      </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

function InputGroup({ label, icon: Icon, children }) {
  return (
    <div className="w-full">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
         <Icon className="w-3.5 h-3.5 text-emerald-500" />
         {label}
      </label>
      {children}
    </div>
  );
}
