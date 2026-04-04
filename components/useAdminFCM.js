'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { db } from '@/firebase/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

/**
 * When an admin logs in, sends INIT_FCM postMessage to the React Native WebView
 * so the native app initializes FCM and saves the Android token.
 * Then receives the native token back from the WebView and saves it to Firestore
 * via the authenticated web client SDK (bypassing the permission-denied issue).
 * On logout, sends LOGOUT message.
 */
export function useAdminFCM(isAdmin) {
  useEffect(() => {
    if (!isAdmin && typeof window === 'undefined') return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && isAdmin) {
        // Tell the React Native WebView to initialize FCM for this admin UID
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'INIT_FCM',
              uid: user.uid,
            })
          );
        }
      } else if (!user) {
        // Tell the React Native WebView to clean up FCM on logout
        if (window.ReactNativeWebView) {
          const userSnapshot = auth.currentUser || {};
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'LOGOUT',
              uid: userSnapshot.uid || '',
            })
          );
        }
      }
    });

    return () => unsubscribe();
  }, [isAdmin]);

  /*
   * Save the native FCM token received from the RN WebView to Firestore.
   * Called from ClientLayout.js which listens for the NATIVE_FCM_TOKEN message.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = async (event) => {
      const detail = event.detail;
      if (!detail || !detail.token) return;

      const token = detail.token;
      console.log('💾 Saving native FCM token to Firestore:', token.slice(0, 20) + '...');

      const user = auth.currentUser;
      if (!user) {
        console.error('Cannot save FCM token: user not authenticated in web');
        return;
      }

      try {
        await setDoc(doc(db, 'customers', user.uid, 'fcmTokens', token), {
          token,
          platform: 'android',
          device: `android-${Date.now()}`,
          lastUsed: new Date().toISOString(),
        });
        console.log('✅ Native FCM token saved to Firestore for uid:', user.uid);
      } catch (error) {
        console.error('Error saving native FCM token:', error);
      }
    };

    window.addEventListener('fcmToken', handler);
    return () => window.removeEventListener('fcmToken', handler);
  }, []);
}
