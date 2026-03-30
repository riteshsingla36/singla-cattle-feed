'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/firebase/auth';

export const useAuth = (requireAdmin = false) => {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    if (requireAdmin) {
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      if (!isAdmin) {
        router.replace('/dashboard');
      }
    } else {
      // If user is admin but on customer page, redirect to admin
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      if (isAdmin) {
        router.replace('/admin/dashboard');
      }
    }
  }, [router, requireAdmin]);
};
