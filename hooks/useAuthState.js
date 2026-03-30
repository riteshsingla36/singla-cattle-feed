'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { getCustomerByPhone } from '@/firebase/firestore';

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

        // Fetch customer data to check admin status
        try {
          // Convert email back to phone (email format: phone@cattlefeed.local)
          const phone = firebaseUser.email?.split('@')[0];
          if (phone) {
            const customerResult = await getCustomerByPhone(phone);
            if (customerResult.success && customerResult.customer?.isAdmin) {
              setIsAdmin(true);
              localStorage.setItem('isAdmin', 'true');
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
      unsubscribe();
    };
  }, []);

  return { user, isAdmin, loading, initialized };
}
