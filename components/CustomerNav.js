'use client';

import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, signInWithCustomToken } from '@/firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export const CustomerNav = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switchBackLoading, setSwitchBackLoading] = useState(false);
  const impersonating = typeof window !== 'undefined' && sessionStorage.getItem('isImpersonating') === 'true';

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
  }, []);

  const handleLogout = async () => {
    const { logoutCustomer } = await import('@/firebase/auth');
    await logoutCustomer();
    localStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const handleSwitchBack = async () => {
    setSwitchBackLoading(true);
    try {
      const adminUid = sessionStorage.getItem('originalAdminUid');
      const adminPhone = sessionStorage.getItem('originalAdminPhone');

      if (!adminUid) {
        alert(t('noAdminSession'));
        setSwitchBackLoading(false);
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert(t('noUserLoggedIn'));
        setSwitchBackLoading(false);
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
      sessionStorage.removeItem('originalAdminPhone');
      sessionStorage.removeItem('isImpersonating');
      alert(t('switchedBackSuccess'));
    } catch (err) {
      alert(`${t('failedSwitchBack')}: ${err.message}`);
      console.error('Switch back error:', err);
    } finally {
      setSwitchBackLoading(false);
    }
  };

  const isActive = (href) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const navigation = [
    { name: t('dashboard'), href: '/dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { name: t('prices'), href: '/prices', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { name: t('orders'), href: '/orders', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )},
    { name: t('placeOrder'), href: '/checkout', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { name: t('settings'), href: '/change-password', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:hidden shadow-xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center space-x-3 p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 bg-[#10b981] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">ST</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Singla Traders</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Cattle Feed</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.href)
                    ? 'bg-[#10b981]/10 text-[#10b981] font-semibold'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {user && (
              <div className="text-gray-900 dark:text-gray-100">
                <p className="text-sm font-medium">{user.displayName || 'Customer'}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{t('logout')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Header */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + Hamburger */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <Link href="/dashboard" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#10b981] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">ST</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Singla Traders</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Cattle Feed</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            {user && (
              <div className="hidden md:flex items-center space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                      isActive(item.href)
                        ? 'bg-[#10b981]/10 text-[#10b981]'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {user && (
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.displayName || 'Customer'}</p>
                </div>
              )}

              {user && impersonating && (
                <button
                  onClick={handleSwitchBack}
                  disabled={switchBackLoading}
                  className="flex items-center space-x-2 px-2 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('switchBackToAdmin')}
                >
                  {switchBackLoading ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  <span className="hidden md:inline">
                    {switchBackLoading ? t('loading') + '...' : t('switchBack')}
                  </span>
                </button>
              )}

              {user && (
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-all"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
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
