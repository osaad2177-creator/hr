import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyD8ZQc9X0369LSP_OhFI6rSkm_Z7c3Il-I",
  authDomain: "my-hr-92b9c.firebaseapp.com",
  projectId: "my-hr-92b9c",
  storageBucket: "my-hr-92b9c.firebasestorage.app",
  messagingSenderId: "112741774097",
  appId: "1:112741774097:web:d37189773a1036830312b0",
  measurementId: "G-LLT85TYM0K"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

export default app;
