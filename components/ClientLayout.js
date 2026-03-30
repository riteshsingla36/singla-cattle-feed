'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken, logoutCustomer } from '@/firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useAuthState } from '@/hooks/useAuthState';

export const ClientLayout = ({ children }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuthState();

  // Compute impersonating directly from sessionStorage on each render
  // This will be re-evaluated whenever the component re-renders (e.g., when user changes)
  const impersonating = sessionStorage.getItem('isImpersonating') === 'true';

  const handleSwitchBack = async () => {
    try {
      const adminUid = sessionStorage.getItem('originalAdminUid');
      const adminPhone = sessionStorage.getItem('originalAdminPhone');
      if (!adminUid) {
        alert('No admin session found to switch back to');
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('No user is currently logged in');
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch('/api/admin/switch-back', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ adminUid, adminPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch back to admin');
      }

      await signInWithCustomToken(auth, data.customToken);
      sessionStorage.removeItem('originalAdminUid');
      sessionStorage.removeItem('isImpersonating');
      alert('Successfully switched back to admin account');
    } catch (err) {
      alert('Failed to switch back: ' + err.message);
      console.error('Switch back error:', err);
    }
  };

  const handleLogout = async () => {
    await logoutCustomer();
    router.push('/login');
  };

  // If this is login or register page, show without navigation
  if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <nav className="bg-blue-600 text-white shadow-lg dark:bg-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold">
                {t('appName')}
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <ThemeToggle />

              {user && (
                <>
                  <Link
                    href="/dashboard"
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    {t('dashboard')}
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      {t('admin')}
                    </Link>
                  )}

                  <Link
                    href="/prices"
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    {t('prices')}
                  </Link>

                  <Link
                    href="/orders"
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    {t('orders')}
                  </Link>

                  <Link
                    href="/change-password"
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    {t('changePassword')}
                  </Link>

                  {impersonating && (
                    <button
                      onClick={handleSwitchBack}
                      className="px-3 py-2 rounded-md text-sm font-medium bg-orange-600 hover:bg-orange-700"
                    >
                      {t('switchBackToAdmin')}
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    {t('logout')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
