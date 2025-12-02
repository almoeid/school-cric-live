import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

// --- CRITICAL DEBUG CHECK ---
if (!firebaseConfig.apiKey) {
  const msg = "🚨 MISSING API KEY: Check .env file in root folder!";
  console.error(msg);
  alert(msg);
}

// Initialize Firebase (NO ANALYTICS to prevent AdBlock crashes)
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Unique ID for your database path
export const APP_ID = 'zbsm-crick-live-v1';