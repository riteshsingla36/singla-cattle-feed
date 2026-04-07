import { auth } from './firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { signInWithCustomToken as signInWithCustomTokenFirebase } from 'firebase/auth';

// Helper: Convert phone number to email format for Firebase Auth
// Firebase doesn't support phone+password directly, so we use email+password
// with email format: phone@cattlefeed.local
const phoneToEmail = (phone) => `${phone}@cattlefeed.local`;

// Customer registration with phone number and password
export const registerCustomer = async (phone, password, name) => {
  try {
    const email = phoneToEmail(phone);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with name
    await updateProfile(user, { displayName: name });

    return { success: true, user, message: 'Registration successful' };
  } catch (error) {
    return { success: false, error: error.message, message: error.message };
  }
};

// Customer login with phone number and password
export const loginCustomer = async (phone, password) => {
  try {
    const email = phoneToEmail(phone);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return { success: true, user, message: 'Login successful' };
  } catch (error) {
    return { success: false, error: error.message, message: error.message };
  }
};

// Change password
export const changePassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, message: 'No user logged in' };
    }

    await updatePassword(user, newPassword);
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    return { success: false, error: error.message, message: error.message };
  }
};

// Logout
export const logoutCustomer = async () => {
  try {
    await signOut(auth);
    // Clear admin status from storage
    localStorage.removeItem('isAdmin');
    // Clear single-device session tracking
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('currentSessionTimestamp');
    // Clear impersonation state
    sessionStorage.removeItem('originalAdminUid');
    sessionStorage.removeItem('isImpersonating');
    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    return { success: false, error: error.message, message: error.message };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChanged = (callback) => {
  return auth.onAuthStateChanged(callback);
};

// Send password reset email (optional feature)
export const sendPasswordReset = async (phone) => {
  try {
    const email = phoneToEmail(phone);
    // Note: you'd need to import sendPasswordResetEmail from firebase/auth
    // For now, we'll skip this as users can change password from profile
    return { success: false, message: 'Contact admin to reset password' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Generate a new session ID for single-device enforcement
export const generateSessionId = () => {
  // Support older WebViews that don't have crypto.randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Re-export Firebase Auth functions for external use (e.g., impersonation)
export { signInWithCustomTokenFirebase as signInWithCustomToken };

// Export auth instance
export { auth };
