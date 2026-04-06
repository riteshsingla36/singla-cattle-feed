'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthState } from '@/hooks/useAuthState';
import { CustomerNav } from '@/components/CustomerNav';
import { AdminNav } from '@/components/AdminNav';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import { ToastProvider } from '@/components/Toast';
import { NotificationHandler } from '@/components/NotificationHandler';
import i18n from '@/lib/i18n';

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
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ToastProvider>
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>
    );
  }

  // If on public page, render without navigation but with i18n and theme
  if (isPublicPath) {
    return (
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </I18nextProvider>
    );
  }

  // If not authenticated, don't render anything (will redirect)
  if (!user) {
    return (
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ToastProvider>
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>
    );
  }

  // Render with appropriate navigation and providers
  if (pathname.startsWith('/admin') && isAdmin) {
    return (
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <AdminNav>{children}</AdminNav>
              <NotificationHandler />
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </I18nextProvider>
    );
  }

  // For all other authenticated pages, show customer nav
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <CustomerNav>{children}</CustomerNav>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
};
