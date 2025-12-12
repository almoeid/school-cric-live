import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image as ImageIcon, Calendar, MapPin, ZoomIn, X, PlusCircle } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import Modal from '../../components/Modal';
import { auth, db, APP_ID } from '../../config/firebase';

export default function GalleryView({ setView }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Check if user is logged in as Admin (not anonymous)
  const isAdmin = auth.currentUser && !auth.currentUser.isAnonymous;

  // --- FETCH MEMORIES FROM FIRESTORE ---
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'memories'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoryList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMemories(memoryList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching memories:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- IMAGE COMPRESSION & UPLOAD ---
  const handleUpload = async (e) => {
      e.preventDefault();
      const file = e.target.image.files[0];
      if (!file) return alert("Please select an image");
      
      // Basic compression to avoid hitting Firestore limits (1MB per doc)
      // We aim for ~100KB-200KB max for thumbnails/gallery
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = async () => {
              const canvas = document.createElement('canvas');
              // Resize logic: Max width 800px
              const MAX_WIDTH = 800;
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Get Base64 string (JPEG quality 0.7)
              const base64String = canvas.toDataURL('image/jpeg', 0.7);

              try {
                // Save to Firestore
                await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'memories'), {
                  src: base64String,
                  category: e.target.category.value,
                  caption: e.target.caption.value,
                  date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  timestamp: serverTimestamp()
                });
                setIsUploading(false);
              } catch (err) {
                console.error("Error uploading memory:", err);
                alert("Failed to upload. Image might be too large or network error.");
              }
          };
      };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* --- PROFESSIONAL HERO HEADER --- */}
      <div className="bg-gray-900 text-white -mt-4 -mx-4 pt-12 pb-36 px-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#A855F7 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="max-w-4xl mx-auto relative z-10 text-center">
             {/* Nav - HIDDEN ON MOBILE */}
             <div className="absolute left-0 top-0 hidden md:block">
                <button 
                    onClick={() => setView('home')} 
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all backdrop-blur-md"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <ImageIcon className="w-8 h-8 text-purple-400" />
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
                    Gallery & <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">Memories</span>
                </h1>
                <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                    Relive the best moments, victories, and celebrations from the ZBSM Cricket community.
                </p>
                
                {/* Admin Upload Trigger - Only show if admin */}
                {isAdmin && (
                  <button 
                      onClick={() => setIsUploading(true)}
                      className="mt-6 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 mx-auto transition-all backdrop-blur-sm border border-white/10"
                  >
                      <PlusCircle className="w-4 h-4" /> Add Photo
                  </button>
                )}
            </div>
        </div>
      </div>

      {/* --- FLOATING GALLERY GRID --- */}
      <div className="max-w-4xl mx-auto px-4 -mt-24 relative z-20">
          {loading ? (
             <div className="flex justify-center py-20">
                 <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : memories.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-lg border border-dashed border-gray-300">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No memories shared yet.</p>
                  {isAdmin && <p className="text-xs text-gray-400 mt-1">Click 'Add Photo' to get started!</p>}
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {memories.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedImage(item)}
                        className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all border-4 border-white bg-gray-100"
                      >
                          <img 
                            src={item.src} 
                            alt={item.caption} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          />
                          
                          {/* Professional Gradient Overlay */}
                          {/* Mobile: Always visible (opacity-100). Desktop: Visible on hover (group-hover:opacity-100) */}
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                              <span className="inline-block px-2 py-0.5 bg-purple-600/80 rounded text-[10px] font-bold text-white uppercase tracking-wider mb-2 w-fit backdrop-blur-sm">{item.category}</span>
                              <p className="text-white font-bold text-sm leading-tight mb-1">{item.caption}</p>
                              <div className="flex items-center gap-2 text-gray-300 text-[10px] font-medium">
                                  <Calendar className="w-3 h-3" /> {item.date}
                              </div>
                          </div>

                          {/* Zoom Icon - Visible on hover/active */}
                          <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-md p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75 transform translate-y-2 group-hover:translate-y-0">
                              <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                      </div>
                  ))}
              </div>
          )}

          <div className="mt-12 text-center pb-8">
              <p className="text-gray-400 text-sm italic">"Cricket is not just a game, it's an emotion."</p>
              
               {/* Back Button for Mobile at Bottom */}
               <div className="md:hidden flex justify-center mt-6">
                  <button 
                      onClick={() => setView('home')} 
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200"
                  >
                      <ArrowLeft className="w-4 h-4" /> Back to Home
                  </button>
              </div>
          </div>
      </div>

      {/* --- LIGHTBOX MODAL --- */}
      {selectedImage && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
              >
                  <X className="w-6 h-6" />
              </button>

              <div className="max-w-5xl w-full flex flex-col items-center">
                  <div className="relative w-full max-h-[75vh] flex items-center justify-center mb-6">
                      <img 
                        src={selectedImage.src} 
                        alt={selectedImage.caption} 
                        className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" 
                      />
                  </div>
                  
                  <div className="text-center text-white max-w-2xl">
                      <span className="inline-block px-3 py-1 bg-purple-600 border border-purple-500 rounded-full text-xs font-bold text-white mb-3 shadow-lg">
                          {selectedImage.category}
                      </span>
                      <h3 className="text-2xl font-bold mb-2 tracking-tight">{selectedImage.caption}</h3>
                      <div className="flex items-center justify-center gap-6 text-sm text-gray-400 font-medium">
                          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {selectedImage.date}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> ZBSM Grounds</span>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- UPLOAD MODAL --- */}
      {isUploading && (
          <Modal title="Upload Memory" onClose={() => setIsUploading(false)}>
              <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Photo</label>
                      <input name="image" type="file" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" required />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Caption</label>
                      <input name="caption" className="w-full p-2 border rounded text-sm" placeholder="e.g. Winning Moment" required />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                      <select name="category" className="w-full p-2 border rounded text-sm">
                          <option>Match Highlights</option>
                          <option>Victory Cup</option>
                          <option>Awards</option>
                          <option>Team Spirit</option>
                          <option>Crowd</option>
                      </select>
                  </div>
                  <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition">Post Memory</button>
              </form>
          </Modal>
      )}

    </div>
  );
}