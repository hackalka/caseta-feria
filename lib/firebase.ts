import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB6_1m_Cpx4PowfpNq1nXwpLHm2RAOvy8w',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'casetaferia-1bd4f.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://casetaferia-1bd4f-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'casetaferia-1bd4f',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'casetaferia-1bd4f.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '404103026231',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:404103026231:web:1f5bbcc26828f20969d1b2'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const database = getDatabase(app);
