'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '@/firebase/auth';
import { getCustomerOrders, getQRCodeSettings, getAllCustomers } from '@/firebase/firestore';
import OrderDetailsModal from '@/components/OrderDetailsModal';

export default function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loadingQR, setLoadingQR] = useState(true);
  const [adminWhatsAppNumbers, setAdminWhatsAppNumbers] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');

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

  // Get date range based on selected option
  const getDateRange = (range) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = now.getFullYear();

    switch (range) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
      case 'last7':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return { start: last7, end: new Date(now.getTime() + 24 * 60 * 60 * 1000 - 1) };
      case 'last30':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return { start: last30, end: new Date(now.getTime() + 24 * 60 * 60 * 1000 - 1) };
      case 'thisMonth':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
      case 'thisFinancialYear':
        // Financial year: April 1 of current year to March 31 of next year
        if (now.getMonth() < 3) { // Jan, Feb, Mar
          return {
            start: new Date(currentYear - 1, 3, 1),
            end: new Date(currentYear, 2, 31, 23, 59, 59, 999)
          };
        }
        return { start: new Date(currentYear, 3, 1), end: new Date(currentYear + 1, 2, 31, 23, 59, 59, 999) };
      case 'prevFinancialYear':
        // Previous financial year: exactly 1 year before current FY
        if (now.getMonth() < 3) { // Jan, Feb, Mar (current FY started last year)
          // Current FY: April 1, (currentYear-1) to March 31, currentYear
          // Previous FY: April 1, (currentYear-2) to March 31, (currentYear-1)
          return {
            start: new Date(currentYear - 2, 3, 1), // April 1 two years ago
            end: new Date(currentYear - 1, 2, 31, 23, 59, 59, 999) // March 31 last year
          };
        }
        // If we're in Apr-Dec (current FY started this year)
        // Current FY: April 1, currentYear to March 31, currentYear+1
        // Previous FY: April 1, (currentYear-1) to March 31, currentYear
        return {
          start: new Date(currentYear - 1, 3, 1), // April 1 last year
          end: new Date(currentYear, 2, 31, 23, 59, 59, 999) // March 31 this year
        };
      case 'custom':
        if (customDateStart && customDateEnd) {
          return { start: new Date(customDateStart), end: new Date(new Date(customDateEnd).getTime() + 24 * 60 * 60 * 1000 - 1) };
        }
        return { start: null, end: null };
      default:
        return { start: null, end: null };
    }
  };

  const shareOnWhatsApp = (order) => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Construct admin order details URL
    const adminOrderUrl = `${window.location.origin}/admin/orders?orderId=${order.id}`;

    let message = `*New Order Details*\n\n`;
    message += `*Order ID:* #${order.id.substring(0, 8)}\n`;
    message += `*Date:* ${formatDate(order.createdAt)}\n`;
    message += `*Customer:* ${order.customerName || 'N/A'}\n`;
    message += `*Status:* ${order.status}\n`;
    message += `*Payment Status:* ${order.paymentStatus || 'N/A'}\n\n`;
    message += `*Items:*\n`;

    order.items?.forEach((item, idx) => {
      message += `${idx + 1}. ${item.productName}\n`;
      message += `   Qty: ${item.quantity} × ${formatCurrency(item.price)} = ${formatCurrency(item.quantity * item.price)}\n`;
    });

    message += `\n*Total Amount:* ${formatCurrency(order.totalAmount)}\n`;

    // Add QR code if available
    if (upiId) {
      message += `\n*UPI ID:* ${upiId}\n`;
    }

    // Add admin panel link
    message += `\n*View in Admin Panel:* ${adminOrderUrl}\n`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);

    // Send to all admins
    if (adminWhatsAppNumbers.length > 0) {
      adminWhatsAppNumbers.forEach(phone => {
        const cleanPhone = phone.replace(/^0+/, '');
        const url = `https://wa.me/91${cleanPhone}?text=${encodedMessage}`;
        window.open(url, '_blank');
      });
    } else {
      alert('No admin phone numbers found. Please configure admin contacts.');
    }
  };

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

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];

    // Filter by date range
    const dateRangeValues = getDateRange(dateRange);
    if (dateRangeValues.start && dateRangeValues.end) {
      result = result.filter(order => {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate >= dateRangeValues.start && orderDate <= dateRangeValues.end;
      });
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return sortDirection === 'desc'
        ? dateB - dateA  // Latest first
        : dateA - dateB; // Oldest first
    });

    return result;
  }, [orders, dateRange, customDateStart, customDateEnd, sortDirection]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'paid':
        return <span className="badge badge-success">Paid</span>;
      case 'completed':
      case 'delivered':
        return <span className="badge badge-success">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-error">Cancelled</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#5d8a3c] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('orderHistory')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and view all your orders</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Card */}
          <div className="filter-card flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="form-select w-auto"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="thisFinancialYear">This Financial Year</option>
              <option value="prevFinancialYear">Previous Financial Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="form-input w-auto py-2"
                  required
                />
                <span className="text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="form-input w-auto py-2"
                  required
                />
              </div>
            )}

            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="form-input w-auto flex items-center justify-center gap-2"
              title={sortDirection === 'desc' ? 'Sorted: Latest first (click for oldest first)' : 'Sorted: Oldest first (click for latest first)'}
            >
              <svg
                className={`w-4 h-4 ${sortDirection === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {sortDirection === 'desc' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                )}
              </svg>
              <span>{sortDirection === 'desc' ? 'Latest' : 'Oldest'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="empty-state-title">No orders yet</h3>
            <p className="empty-state-description">Start shopping to see your order history here!</p>
            <a href="/checkout" className="btn-primary inline-flex items-center space-x-2 mt-6">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Start Shopping</span>
            </a>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th>Order ID</th>
                    <th>{t('orderDate')}</th>
                    <th>Items</th>
                    <th>{t('orderTotal')}</th>
                    <th>{t('orderStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedOrders.map((order) => (
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
                      <td className="text-gray-600 dark:text-gray-300">{order.items?.length || 0} items</td>
                      <td className="font-semibold text-gray-900 dark:text-gray-100">₹{order.totalAmount?.toFixed(2) || '0.00'}</td>
                      <td>{getStatusBadge(order.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredAndSortedOrders.map((order) => (
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
                      <span className="text-gray-900 dark:text-gray-100">{order.items?.length || 0} items</span>
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
