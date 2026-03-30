'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { getAllCustomers, getAllProducts, getAllOrders, getAllPurchaseOrders } from '@/firebase/firestore';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalPurchaseOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [customersResult, productsResult, ordersResult, posResult] = await Promise.all([
        getAllCustomers(),
        getAllProducts(),
        getAllOrders(),
        getAllPurchaseOrders(),
      ]);

      let totalCustomers = 0;
      let totalProducts = 0;
      let totalOrders = 0;
      let pendingOrders = 0;
      let completedOrders = 0;
      let totalPurchaseOrders = 0;

      if (customersResult.success) {
        totalCustomers = customersResult.customers.length;
      }

      if (productsResult.success) {
        totalProducts = productsResult.products.length;
      }

      if (ordersResult.success) {
        totalOrders = ordersResult.orders.length;
        pendingOrders = ordersResult.orders.filter((o) => o.status === 'pending').length;
        completedOrders = ordersResult.orders.filter((o) => o.status === 'completed').length;
      }

      if (posResult.success) {
        totalPurchaseOrders = posResult.purchaseOrders.length;
      }

      setStats({
        totalCustomers,
        totalProducts,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalPurchaseOrders,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: t('customerManagement'),
      description: t('manageCustomerAccounts'),
      href: '/admin/customers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'from-[#3b82f6] to-[#2563eb]',
      count: stats.totalCustomers,
    },
    {
      title: t('productManagement'),
      description: t('manageProductCatalogue'),
      href: '/admin/products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'from-[#10b981] to-[#059669]',
      count: stats.totalProducts,
    },
    {
      title: t('priceManagement'),
      description: t('setCustomPricesPerCustomer'),
      href: '/admin/prices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-[#d4a853] to-[#b8913f]',
      count: null,
    },
    {
      title: t('manageOrders'),
      description: t('viewManageAllOrders'),
      href: '/admin/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'from-[#8b5a2b] to-[#704623]',
      count: stats.pendingOrders,
    },
    {
      title: t('purchaseOrders'),
      description: t('createAndManagePOs'),
      href: '/admin/purchase-orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 3H5a2 2 0 00-2 2v14m0 0l4-4m-4 4h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.5a2.5 2.5 0 100-5H18m0 0l-4 4m4-4l-4-4" />
        </svg>
      ),
      color: 'from-[#6366f1] to-[#4f46e5]',
      count: stats.totalPurchaseOrders,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="badge badge-primary">Admin</span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard')}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{t('manageBusinessEasily')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="px-4 py-2 bg-[#10b981]/10 text-[#059669] dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-semibold border border-[#10b981]/20">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {menuItems.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            className="card group hover:scale-[1.02] transform transition-all duration-300 hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg`}>
                {item.icon}
              </div>
              {item.count !== null && (
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#10b981] transition-colors">{item.count}</div>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-[#10b981] transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{item.description}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card card-gradient">
        <div className="card-header">
          <h2 className="card-title dark:text-gray-100">{t('quickActions')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('commonTasks')}</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/customers?action=add"
              className="group p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-[#5d8a3c] hover:bg-[#5d8a3c]/5 dark:hover:bg-[#5d8a3c]/10 transition-all duration-300 text-center"
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">👤</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">{t('addCustomer')}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('createNewCustomer')}</p>
            </Link>
            <Link
              href="/admin/products?action=add"
              className="group p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-[#10b981] hover:bg-[#10b981]/5 dark:hover:bg-[#10b981]/10 transition-all duration-300 text-center"
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">📦</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">{t('addProduct')}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('addToCatalog')}</p>
            </Link>
            <Link
              href="/admin/orders?filter=pending"
              className="group p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-[#f59e0b] hover:bg-[#f59e0b]/5 dark:hover:bg-[#f59e0b]/10 transition-all duration-300 text-center"
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">📋</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">{t('viewPendingOrders')}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{stats.pendingOrders} {t('waiting')}</p>
            </Link>
            <Link
              href="/admin/purchase-orders"
              className="group p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-[#6366f1] hover:bg-[#6366f1]/5 dark:hover:bg-[#6366f1]/10 transition-all duration-300 text-center"
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">📄</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">{t('purchaseOrders')}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{stats.totalPurchaseOrders} {t('created')}</p>
            </Link>
            <Link
              href="/admin/prices"
              className="group p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-[#d4a853] hover:bg-[#d4a853]/5 dark:hover:bg-[#d4a853]/10 transition-all duration-300 text-center"
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">💰</div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">{t('updatePrices')}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('setCustomPricing')}</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
