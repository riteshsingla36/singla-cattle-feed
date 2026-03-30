'use client';

import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/firebase/auth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export const AdminNav = ({ children }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = async () => {
    const { logoutCustomer } = await import('@/firebase/auth');
    await logoutCustomer();
    localStorage.removeItem('isAdmin');
    router.push('/login');
  };

  // Primary navigation items (always visible on desktop)
  const primaryNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { name: t('Customers'), href: '/admin/customers', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { name: t('Products'), href: '/admin/products', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )},
    { name: t('Orders'), href: '/admin/orders', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )},
  ];

  // Secondary navigation items (in "More" dropdown)
  const moreNavigation = [
    { name: t('Set Prices'), href: '/admin/prices', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { name: 'Purchase Orders', href: '/admin/purchase-orders', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 3H5a2 2 0 00-2 2v14m0 0l4-4m-4 4h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.5a2.5 2.5 0 100-5H18m0 0l-4 4m4-4l-4-4" />
      </svg>
    )},
    { name: 'Settings', href: '/admin/settings', icon: (
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
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-[#2d3748] to-[#1a202c] dark:from-gray-900 dark:to-gray-700 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center space-x-3 p-6 border-b border-white/10">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight text-white">Singla Traders</span>
              <span className="text-xs text-yellow-400 font-medium uppercase tracking-wider">Admin Panel</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {primaryNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all"
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}

            {/* More section in mobile */}
            <div className="pt-4 border-t border-white/10">
              <p className="px-4 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider">More</p>
              {moreNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all"
                  onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-white/10 p-4 space-y-4">
            {user && (
              <div className="text-white">
                <p className="text-sm font-medium">{user.displayName || 'Admin'}</p>
                <p className="text-xs text-yellow-400">Administrator</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Header */}
      <nav className="bg-gradient-to-r from-[#2d3748] to-[#1a202c] dark:from-gray-900 dark:to-gray-700 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + Hamburger */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
                {/* <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div> */}
                <div className="flex flex-col">
                  <span className="text-lg font-bold leading-tight">Singla Traders</span>
                  <span className="text-xs text-yellow-400 font-medium uppercase tracking-wider">Admin Panel</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {primaryNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="admin-nav-link px-3 py-2 flex items-center space-x-2 text-sm"
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}

              {/* More dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="admin-nav-link px-3 py-2 flex items-center space-x-2 text-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>More</span>
                </button>

                {moreMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMoreMenuOpen(false)}
                    ></div>
                    <div className="absolute top-full right-0 z-20 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {moreNavigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setMoreMenuOpen(false)}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {user && (
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-white">{user.displayName || 'Admin'}</p>
                  <p className="text-xs text-yellow-400">Administrator</p>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
