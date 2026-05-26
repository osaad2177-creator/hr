// ============================================================
// Firebase Authentication Service
// Handles: Login, Register with activation codes, Device locking
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { auth, db } from './config';
import { User, ActivationCode, UserRole } from '@/lib/types/index'
import { logAuditEvent } from './firestore';

// ─── Device Fingerprinting ────────────────────────────────────
export async function getDeviceFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}

// ─── Get Device Info ──────────────────────────────────────────
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    browser: getBrowserName(),
    fingerprint: '',
  };
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

// ─── Validate Activation Code ─────────────────────────────────
export async function validateActivationCode(code: string): Promise<ActivationCode | null> {
  const codesRef = collection(db, 'activationCodes');
  const q = query(codesRef, where('code', '==', code.toUpperCase()), where('isUsed', '==', false));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const codeDoc = snapshot.docs[0];
  const codeData = codeDoc.data() as ActivationCode;
  codeData.id = codeDoc.id;

  // Check expiry
  const expiresAt = (codeData.expiresAt as unknown as Timestamp).toDate();
  if (new Date() > expiresAt) return null;

  return codeData;
}

// ─── Register Employee ────────────────────────────────────────
export async function registerEmployee(
  activationCode: string,
  email: string,
  password: string,
  displayName: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Validate activation code first
    const codeData = await validateActivationCode(activationCode);
    if (!codeData) {
      return { success: false, error: 'Invalid or expired activation code' };
    }

    // Create Firebase Auth user
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;

    await updateProfile(firebaseUser, { displayName });

    // Get device fingerprint
    const deviceId = await getDeviceFingerprint();

    // Build user document
    const userData: User = {
      uid: firebaseUser.uid,
      email,
      displayName,
      role: codeData.role,
      status: 'active',
      phoneNumber,
      deviceId,
      deviceBound: true,
      language: 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save user to Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // If employee role, create employee profile
    if (codeData.role === 'employee') {
      await setDoc(doc(db, 'employees', firebaseUser.uid), {
        ...userData,
        employeeId: generateEmployeeId(),
        departmentId: codeData.departmentId || '',
        managerId: codeData.managerId || '',
        locationIds: codeData.locationIds || [],
        shiftId: codeData.shiftId || '',
        hireDate: serverTimestamp(),
        leaveBalance: {
          annual: 21,
          sick: 14,
          emergency: 3,
          unpaid: 0,
          usedAnnual: 0,
          usedSick: 0,
          usedEmergency: 0,
          usedUnpaid: 0,
          year: new Date().getFullYear(),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Mark activation code as used
    await updateDoc(doc(db, 'activationCodes', codeData.id), {
      isUsed: true,
      usedBy: firebaseUser.uid,
      usedAt: serverTimestamp(),
    });

    // Log audit
    await logAuditEvent({
      userId: firebaseUser.uid,
      userName: displayName,
      userRole: codeData.role,
      action: 'USER_REGISTERED',
      targetType: 'user',
      targetId: firebaseUser.uid,
      details: `New ${codeData.role} registered using activation code`,
    });

    return { success: true, user: userData };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/email-already-in-use') {
      return { success: false, error: 'Email already in use' };
    }
    return { success: false, error: err.message || 'Registration failed' };
  }
}

// ─── Login ────────────────────────────────────────────────────
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      await signOut(auth);
      return { success: false, error: 'User data not found' };
    }

    const userData = userDoc.data() as User;

    // Check account status
    if (userData.status === 'locked') {
      await signOut(auth);
      return { success: false, error: 'Your account has been locked. Contact admin.' };
    }
    if (userData.status === 'inactive') {
      await signOut(auth);
      return { success: false, error: 'Account is inactive. Contact admin.' };
    }

    // Device binding check for employees
    if (userData.role === 'employee' && userData.deviceBound && userData.deviceId) {
      const currentDeviceId = await getDeviceFingerprint();
      if (currentDeviceId !== userData.deviceId) {
        await signOut(auth);
        return {
          success: false,
          error: 'Login from unrecognized device. Contact your admin to reset device authorization.',
        };
      }
    }

    // Update last login
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, user: userData };
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      return { success: false, error: 'Invalid email or password' };
    }
    if (err.code === 'auth/user-not-found') {
      return { success: false, error: 'No account found with this email' };
    }
    if (err.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many failed attempts. Try again later.' };
    }
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

// ─── Logout ───────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ─── Reset Device (Admin only) ────────────────────────────────
export async function resetEmployeeDevice(employeeId: string, adminId: string): Promise<void> {
  await updateDoc(doc(db, 'users', employeeId), {
    deviceId: null,
    deviceBound: false,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'employees', employeeId), {
    deviceId: null,
    deviceBound: false,
    updatedAt: serverTimestamp(),
  });

  await logAuditEvent({
    userId: adminId,
    userName: 'Admin',
    userRole: 'admin',
    action: 'DEVICE_RESET',
    targetType: 'employee',
    targetId: employeeId,
    details: 'Device authorization reset by admin',
  });
}

// ─── Auth State Observer ──────────────────────────────────────
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ─── Helpers ──────────────────────────────────────────────────
function generateEmployeeId(): string {
  const year = new Date().getFullYear().toString().slice(2);
  const random = Math.floor(10000 + Math.random() * 90000);
  return `EMP${year}${random}`;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
