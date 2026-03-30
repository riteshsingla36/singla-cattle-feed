'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { getCustomerByPhone } from '@/firebase/firestore';
import { signOut } from 'firebase/auth';

/**
 * Custom hook to track Firebase authentication state and user profile
 * Returns: { user, isAdmin, loading, initialized }
 */
export function useAuthState() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        setUser(firebaseUser);

        // Fetch customer data to check admin status and enabled status
        try {
          // Convert email back to phone (email format: phone@cattlefeed.local)
          const phone = firebaseUser.email?.split('@')[0];
          if (phone) {
            const customerResult = await getCustomerByPhone(phone);
            if (customerResult.success) {
              const customer = customerResult.customer;
              // Check if customer is enabled (default to true if field missing)
              const isEnabled = customer.isEnabled !== false;
              if (!isEnabled) {
                // Customer is disabled, sign out immediately
                console.log('Customer account is disabled, signing out');
                await signOut(auth);
                setIsAdmin(false);
                localStorage.removeItem('isAdmin');
                setUser(null);
              } else {
                // Customer is enabled, check admin status
                if (customer.isAdmin) {
                  setIsAdmin(true);
                  localStorage.setItem('isAdmin', 'true');
                } else {
                  setIsAdmin(false);
                  localStorage.setItem('isAdmin', 'false');
                }
              }
            } else {
              // Customer record not found, treat as non-admin
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
      unsubscribe();
    };
  }, []);

  return { user, isAdmin, loading, initialized };
}
