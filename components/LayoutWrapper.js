'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthState } from '@/hooks/useAuthState';
import { CustomerNav } from '@/components/CustomerNav';
import { AdminNav } from '@/components/AdminNav';
import { LanguageProvider } from '@/context/LanguageContext';

export const LayoutWrapper = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading, initialized } = useAuthState();

  // Effect to handle redirects
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/register'];
    const isPublicPath = publicPaths.includes(pathname);
    const isAdminPath = pathname.startsWith('/admin');

    if (!user && !isPublicPath) {
      router.replace('/login');
      return;
    }

    if (user) {
      if (isAdminPath && !isAdmin) {
        router.replace('/dashboard');
      } else if (!isAdminPath && !isPublicPath && isAdmin) {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, isAdmin, loading, pathname, router]);

  // Public pages (no auth required)
  const isPublicPath = ['/login', '/register'].includes(pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If on public page, render without navigation
  if (isPublicPath) {
    return <LanguageProvider>{children}</LanguageProvider>;
  }

  // If not authenticated, don't render anything (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render with appropriate navigation
  if (pathname.startsWith('/admin') && isAdmin) {
    return <AdminNav>{children}</AdminNav>;
  }

  // For all other authenticated pages, show customer nav
  return <CustomerNav>{children}</CustomerNav>;
};
