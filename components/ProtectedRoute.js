'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/firebase/auth';

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Check admin status if required
    if (requireAdmin) {
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [router, requireAdmin]);

  // Return children if user is authenticated and has proper role
  return children;
};

export const useAuthCheck = (requireAdmin = false) => {
  useEffect(() => {
    const user = getCurrentUser();
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (requireAdmin && !isAdmin) {
      window.location.href = '/dashboard';
    }
  }, [requireAdmin]);
};
