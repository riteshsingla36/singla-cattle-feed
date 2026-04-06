'use client';

import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { getCustomerByPhone, subscribeToSession } from '@/firebase/firestore';

/**
 * Custom hook to track Firebase authentication state and user profile
 * Enforces single-device login: if another device logs in, this session is invalidated
 * Returns: { user, isAdmin, loading, initialized }
 */
export function useAuthState() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const sessionRef = useRef({ unsubscribe: null, currentSessionId: null });

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      // Clean up previous session subscription if any
      if (sessionRef.current.unsubscribe) {
        sessionRef.current.unsubscribe();
        sessionRef.current.unsubscribe = null;
        sessionRef.current.currentSessionId = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);

        // Fetch customer data to check admin status and enabled status
        try {
          const phone = firebaseUser.email?.split('@')[0];
          if (phone) {
            const customerResult = await getCustomerByPhone(phone);
            if (customerResult.success) {
              const customer = customerResult.customer;
              const customerId = customerResult.id;
              const isEnabled = customer.isEnabled !== false;
              if (!isEnabled) {
                console.log('Customer account is disabled, signing out');
                await signOut(auth);
                setIsAdmin(false);
                localStorage.removeItem('isAdmin');
                setUser(null);
              } else {
                if (customer.isAdmin) {
                  setIsAdmin(true);
                  localStorage.setItem('isAdmin', 'true');
                } else {
                  setIsAdmin(false);
                  localStorage.setItem('isAdmin', 'false');
                }

                // Subscribe to session changes for single-device enforcement
                let initialSnapshotReceived = false;

                const unsubSession = subscribeToSession(customerId, (firestoreSessionId) => {
                  if (!isMounted) return;

                  const ownSession = localStorage.getItem('currentSessionId');

                  // First snapshot: DON'T log out
                  if (!initialSnapshotReceived) {
                    initialSnapshotReceived = true;
                    // If localStorage already has a session (from recent login), trust it
                    // and let Firestore catch up later. Otherwise, sync from Firestore.
                    if (!ownSession && firestoreSessionId) {
                      localStorage.setItem('currentSessionId', firestoreSessionId);
                    }
                    return;
                  }

                  // Subsequent snapshots: if Firestore session differs from ours, another device logged in
                  if (ownSession && firestoreSessionId && firestoreSessionId !== ownSession) {
                    console.log('Single-device enforcement: signing out, session invalidated');
                    signOut(auth);
                  }
                });
                sessionRef.current.unsubscribe = unsubSession;
              }
            } else {
              setIsAdmin(false);
              localStorage.setItem('isAdmin', 'false');
            }
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching customer data:', error);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }

      setLoading(false);
      setInitialized(true);
    });

    // Cleanup
    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (sessionRef.current.unsubscribe) {
        sessionRef.current.unsubscribe();
        sessionRef.current.unsubscribe = null;
        sessionRef.current.currentSessionId = null;
      }
    };
  }, []);

  return { user, isAdmin, loading, initialized };
}
