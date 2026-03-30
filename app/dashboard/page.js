'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '@/firebase/auth';
import { getCustomerOrders, getQRCodeSettings, getAllCustomers } from '@/firebase/firestore';
import Link from 'next/link';
import OrderDetailsModal from '@/components/OrderDetailsModal';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loadingQR, setLoadingQR] = useState(true);
  const [adminWhatsAppNumbers, setAdminWhatsAppNumbers] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchQRCodeSettings();
    fetchAdmins();
  }, []);

  const fetchOrders = async () => {
    try {
      const user = getCurrentUser();
      if (!user) return;

      const result = await getCustomerOrders(user.uid);
      if (result.success) {
        setOrders(result.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCodeSettings = async () => {
    try {
      const result = await getQRCodeSettings();
      if (result.success && result.settings) {
        setQrCodeUrl(result.settings.qrCodeUrl || '');
        setUpiId(result.settings.upiId || '');
      }
    } catch (error) {
      console.error('Error fetching QR code settings:', error);
    } finally {
      setLoadingQR(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const result = await getAllCustomers();
      if (result.success && result.customers) {
        const admins = result.customers
          .filter(customer => customer.isAdmin)
          .map(customer => customer.phone)
          .filter(phone => phone); // Only include non-null phones
        setAdminWhatsAppNumbers(admins);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const totalSpent = orders.filter((o) => o.status === 'completed').reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'completed':
      case 'delivered':
        return <span className="badge badge-success">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-error">Cancelled</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your overview</p>
        </div>
        <Link href="/checkout" className="btn-primary flex items-center space-x-2 shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Place Order</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="stat-card-icon bg-[#10b981]/10 text-[#10b981]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div>
            <p className="stat-label">{t('totalOrders')}</p>
            <p className="stat-value">{orders.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="stat-card-icon bg-[#f59e0b]/10 text-[#f59e0b]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="stat-label">{t('pendingOrders')}</p>
            <p className="stat-value text-[#f59e0b]">{pendingCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="stat-card-icon bg-[#10b981]/10 text-[#10b981]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="stat-label">{t('completedOrders')}</p>
            <p className="stat-value text-[#10b981]">{completedCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">₹{totalSpent.toFixed(2)} total</p>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="card-title">{t('recentOrders')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your latest orders</p>
          </div>
          <Link href="/orders" className="btn-outline text-sm flex items-center space-x-1">
            <span>View All</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="empty-state">
              <div className="spinner-lg mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="empty-state-title">No orders yet</h3>
              <p className="empty-state-description">Get started by placing your first order and explore our product catalog.</p>
              <Link href="/checkout" className="btn-primary inline-flex items-center space-x-2 mt-6">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Start Shopping</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th>{t('orderId') || 'Order ID'}</th>
                      <th>{t('orderDate')}</th>
                      <th>{t('items') || 'Items'}</th>
                      <th>{t('orderTotal')}</th>
                      <th>{t('orderStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="table-row">
                        <td className="font-medium">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-[#10b981] hover:text-[#059669] font-semibold"
                          >
                            #{order.id.substring(0, 8)}
                          </button>
                        </td>
                        <td className="text-gray-600 dark:text-gray-300">{formatDate(order.createdAt)}</td>
                        <td className="text-gray-600 dark:text-gray-300">{order.items?.length || 0} {t('items') || 'items'}</td>
                        <td className="font-semibold text-gray-900 dark:text-gray-100">₹{order.totalAmount?.toFixed(2) || '0.00'}</td>
                        <td>{getStatusBadge(order.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-[#10b981] hover:text-[#059669] font-semibold text-lg"
                      >
                        #{order.id.substring(0, 8)}
                      </button>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Date:</span>
                        <span className="text-gray-900 dark:text-gray-100">{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Items:</span>
                        <span className="text-gray-900 dark:text-gray-100">{order.items?.length || 0} {t('items') || 'items'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Total:</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">₹{order.totalAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onPaymentUploaded={fetchOrders}
        showShareButton={true}
        adminWhatsAppNumbers={adminWhatsAppNumbers}
        qrCodeUrl={qrCodeUrl}
        upiId={upiId}
      />
    </div>
  );
}
