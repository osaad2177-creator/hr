// ============================================================
// Firebase Configuration
// Replace with your actual Firebase project config
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyD8ZQc9X0369LSP_OhFI6rSkm_Z7c3Il-I",
  authDomain: "my-hr-92b9c.firebaseapp.com",
  projectId: "my-hr-92b9c",
  storageBucket: "my-hr-92b9c.firebasestorage.app",
  messagingSenderId: "112741774097",
  appId: "1:112741774097:web:d37189773a1036830312b0",
  measurementId: "G-LLT85TYM0K"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth
export const auth = getAuth(app);

// Firestore with offline persistence
export const db =
  getApps().length === 1
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      })
    : getFirestore(app);

// Storage
export const storage = getStorage(app);

// Cloud Functions
export const functions = getFunctions(app, 'us-central1');

// FCM Messaging (browser only)
export const getMessagingInstance = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};

// Connect emulators in development
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;
