import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// --- 🚨 CACHE BUSTER: FORCE CLEAR OLD SERVICE WORKERS FOR ALL USERS 🚨 ---
// This runs before anything else. If it finds an old Service Worker, 
// it deletes it and forces the browser to pull fresh files from Vercel.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister().then((successful) => {
        if (successful) {
          console.log("💥 Rogue Service Worker destroyed! Reloading for fresh files...");
          // Force a hard reload from the server, bypassing local cache
          window.location.reload(); 
        }
      });
    }
  });
}
// --------------------------------------------------------------------------

// --- DEBUGGING LOGS (Check Console) ---
console.log("🚀 Starting App...");
console.log("Environment Check:", {
  HasAPIKey: !!import.meta.env.VITE_API_KEY,
  Mode: import.meta.env.MODE
});

try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error("Cannot find element with id 'root' in index.html");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  // --- EMERGENCY ERROR DISPLAY ---
  // This forces the error to show on the white screen
  console.error("💥 CRITICAL RENDER ERROR:", error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; background: #fff0f0; color: #d8000c; border: 2px solid red; margin: 20px;">
      <h1>💥 The App Crashed</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <pre style="background: #fff; padding: 10px; border-radius: 5px; overflow: auto;">${error.stack}</pre>
      <p><em>Check the Console (F12) for more details.</em></p>
    </div>
  `;
}