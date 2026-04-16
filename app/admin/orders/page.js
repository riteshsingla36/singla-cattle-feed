'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/Toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAllOrders, updateOrderStatus, getCustomerByUserId, getAllCustomers, getAllProducts, confirmPayment, recordCashPayment, getOrder, saveBillUrl } from '@/firebase/firestore';
import { generateOrderBill } from '@/lib/billGenerator';

export default function OrdersPage() {
  const { t } = useTranslation();
  const showToast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', 'last7', 'last30', 'thisMonth', 'thisYear', 'lastYear', 'custom'
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc', default 'desc' (latest first)
  const [updating, setUpdating] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDeliveryAddress, setCustomerDeliveryAddress] = useState('');
  const [customerDeliveryCoords, setCustomerDeliveryCoords] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef(null);
  const [productPrices, setProductPrices] = useState({});
  const [loadingProductPrices, setLoadingProductPrices] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [cashInput, setCashInput] = useState('');
  const [onlineInput, setOnlineInput] = useState('');
  const [recordingCash, setRecordingCash] = useState(false);
  const [billGenerating, setBillGenerating] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchAllCustomers();
  }, []);

  useEffect(() => {
    if (!selectedOrder) {
      setCustomerPhone('');
      setCustomerDeliveryAddress('');
      setCustomerDeliveryCoords(null);
    }
  }, [selectedOrder]);

  // Handle orderId from URL (covers initial load and when URL changes while on the page)
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId && orders.length > 0) {
      const order = orders.find(o => o.id === orderId);
      if (order && (!selectedOrder || selectedOrder.id !== order.id)) {
        setSelectedOrder(order);
        if (order.customerId) {
          fetchCustomerDetails(order.customerId);
        }
      }
    }
  }, [searchParams, orders, selectedOrder]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCustomerDropdown]);

  // Fetch product prices when an order is selected
  useEffect(() => {
    if (selectedOrder && selectedOrder.items) {
      fetchProductPrices(selectedOrder.items);
    } else {
      setProductPrices({});
    }
    setCashInput('');
    setOnlineInput('');
  }, [selectedOrder]);

  const fetchOrders = async () => {
    try {
      const result = await getAllOrders();
      if (result.success) {
        setOrders(result.orders);
        // Check if there's an orderId in the URL to open directly
        const orderId = searchParams.get('orderId');
        if (orderId) {
          const order = result.orders.find(o => o.id === orderId);
          if (order) {
            setSelectedOrder(order);
            if (order.customerId) {
              fetchCustomerDetails(order.customerId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customerId) => {
    if (!customerId) return;
    setLoadingCustomer(true);
    try {
      const result = await getCustomerByUserId(customerId);
      if (result.success && result.customer) {
        setCustomerPhone(result.customer.phone || '');
        setCustomerDeliveryAddress(result.customer.deliveryAddress || '');
        if (result.customer.deliveryLat && result.customer.deliveryLng) {
          setCustomerDeliveryCoords({ lat: result.customer.deliveryLat, lng: result.customer.deliveryLng });
        } else {
          setCustomerDeliveryCoords(null);
        }
      } else {
        setCustomerPhone('');
        setCustomerDeliveryAddress('');
        setCustomerDeliveryCoords(null);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
      setCustomerPhone('');
      setCustomerDeliveryAddress('');
      setCustomerDeliveryCoords(null);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const result = await getAllCustomers();
      if (result.success) {
        setAllCustomers(result.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProductPrices = async (items) => {
    if (!items || items.length === 0) return;

    setLoadingProductPrices(true);
    try {
      // Get unique product names (or productIds if available)
      const productNames = [...new Set(items.map(item => item.productName))];
      const pricesMap = {};

      // Fetch all products to get standard prices
      const result = await getAllProducts();
      if (result.success) {
        result.products.forEach(product => {
          pricesMap[product.name] = product.price;
        });
      }

      setProductPrices(pricesMap);
    } catch (error) {
      console.error('Error fetching product prices:', error);
    } finally {
      setLoadingProductPrices(false);
    }
  };

  // Close modal and clear orderId from URL
  const closeModal = () => {
    // Clear orderId from URL first
    if (searchParams.get('orderId')) {
      router.replace('/admin/orders', { scroll: false });
    }
    // Then close modal
    setSelectedOrder(null);
  };

  // Handle notification click: open order modal and fetch fresh order data
  const handleNotificationClick = async (orderId) => {
    try {
      const result = await getOrder(orderId);
      if (result.success && result.order) {
        setSelectedOrder(result.order);
        // Refresh orders list in background to get latest status
        await fetchOrders();
        // Also fetch customer phone if needed
        if (result.order.customerId) {
          fetchCustomerDetails(result.order.customerId);
        }
      }
    } catch (error) {
      console.error('Error fetching order from notification:', error);
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
        // Current financial year: April 1 to March 31
        // If we're in Jan-Mar, we're in the FY that started last year
        if (now.getMonth() < 3) { // Jan, Feb, Mar
          return {
            start: new Date(currentYear - 1, 3, 1), // April 1 last year
            end: new Date(currentYear, 2, 31, 23, 59, 59, 999) // March 31 this year
          };
        }
        // If we're in Apr-Dec, we're in the FY that started this year
        return {
          start: new Date(currentYear, 3, 1), // April 1 this year
          end: new Date(currentYear + 1, 2, 31, 23, 59, 59, 999) // March 31 next year
        };
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

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];

    // Filter by order status
    if (orderStatusFilter !== 'all') {
      result = result.filter(order => order.status === orderStatusFilter);
    }

    // Filter by payment status
    if (paymentStatusFilter !== 'all') {
      result = result.filter(order => order.paymentStatus === paymentStatusFilter);
    }

    // Filter by selected customer ID (exact match)
    if (selectedCustomerId) {
      result = result.filter(order => order.customerId === selectedCustomerId);
    }

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
  }, [orders, orderStatusFilter, paymentStatusFilter, selectedCustomerId, dateRange, customDateStart, customDateEnd, sortDirection]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedOrders.length / pageSize);
  }, [filteredAndSortedOrders.length, pageSize]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedOrders.slice(start, start + pageSize);
  }, [filteredAndSortedOrders, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [orderStatusFilter, paymentStatusFilter, selectedCustomerId, dateRange, customDateStart, customDateEnd, sortDirection, pageSize]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);

    const result = await updateOrderStatus(orderId, newStatus);

    setUpdating(null);

    if (result.success) {
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } else {
      showToast('Failed to update order status', 'error');
    }
  };

  const handleConfirmPayment = async (orderId) => {
    const amount = parseFloat(onlineInput);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter the online payment amount', 'error');
      return;
    }

    setConfirming(orderId);

    const result = await confirmPayment(orderId, amount);

    setConfirming(null);

    if (result.success) {
      showToast(`Online payment of ₹${amount} confirmed successfully`, 'success');
      setOnlineInput('');
      fetchOrders();
      // Refresh the modal order data from server
      const freshResult = await getOrder(orderId);
      if (freshResult.success && freshResult.order) {
        setSelectedOrder(freshResult.order);
      }
    } else {
      showToast('Failed to confirm payment', 'error');
    }
  };

  const handleDownloadPaymentScreenshot = async (url, orderId) => {
    try {
      setDownloading(orderId);

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'DOWNLOAD_FILE', 
          url: url, 
          filename: `payment_proof_${orderId}.jpg` 
        }));
      } else {
        // Desktop Browser: Download the image as a blob to force a true file download instead of opening a tab
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Fetch failed');
          const blob = await response.blob();
          const objectUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = objectUrl;
          a.download = `PaymentProof_${orderId || 'Screenshot'}.jpg`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
        } catch (err) {
           window.open(url, '_blank');
        }
      }
    } catch (error) {
      console.error('Error opening image:', error);
      showToast('Failed to open image. Please try again.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadBill = async (order) => {
    if (!order?.id) return;

    // 1. If React Native wrapper
    if (window.ReactNativeWebView) {
      setBillGenerating(true);
      try {
        const doc = await generateOrderBill(order);
        const base64Data = doc.output('datauristring');
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DOWNLOAD_BASE64',
          base64: base64Data,
          filename: `Invoice_${order.id.substring(0, 10).toUpperCase()}.pdf`
        }));
      } catch (error) {
        console.error('Error generating base64 bill:', error);
        showToast('Failed to generate bill for app sharing.', 'error');
      } finally {
        setBillGenerating(false);
      }
      return;
    }

    // 2. Desktop Browser: Always generate and download cleanly via jsPDF to circumvent Cloudinary restrictions
    setBillGenerating(true);
    try {
      const doc = await generateOrderBill(order);
      
      // If it has never been uploaded to Cloudinary, do it in the background to persist it
      if (!order.billPdfUrl) {
        const pdfBlob = doc.output('blob');
        const formData = new FormData();
        formData.append('file', pdfBlob, `bill_${order.id}.pdf`);
        formData.append('orderId', order.id);

        fetch('/api/upload-bill', { method: 'POST', body: formData })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              saveBillUrl(order.id, data.url);
              setSelectedOrder(prev => prev && prev.id === order.id ? { ...prev, billPdfUrl: data.url } : prev);
              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, billPdfUrl: data.url } : o));
            }
          })
          .catch(err => console.error('Background upload failed:', err));
      }
      
      // Instantly trigger true hard-download in the user's browser
      doc.save(`Invoice_${order.id.substring(0, 10).toUpperCase()}.pdf`);
      showToast('Bill downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating bill:', error);
      showToast('Failed to generate bill: ' + error.message, 'error');
    } finally {
      setBillGenerating(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400';
      case 'delivered':
      case 'completed': // backward compatibility
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getPaymentStatusColor = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return 'badge-success';
      case 'partial':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400';
      case 'confirmation_pending':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-400';
      default:
        return 'badge-warning';
    }
  };

  const getPaymentStatusText = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return t('paymentStatusPaid');
      case 'partial':
        return 'Partially Paid';
      case 'confirmation_pending':
        return t('paymentStatusConfirmationPending');
      default:
        return t('paymentStatusPending');
    }
  };

  const handleRecordCash = async (orderId) => {
    const amount = parseFloat(cashInput);
    if (isNaN(amount) || amount < 0) {
      showToast('Please enter a valid cash amount', 'error');
      return;
    }

    setRecordingCash(true);
    const result = await recordCashPayment(orderId, amount);
    setRecordingCash(false);

    if (result.success) {
      showToast(`Cash payment of ₹${amount} recorded successfully`, 'success');
      setCashInput('');
      fetchOrders();
      // Refresh the modal order data
      const freshResult = await getOrder(orderId);
      if (freshResult.success && freshResult.order) {
        setSelectedOrder(freshResult.order);
      }
    } else {
      showToast('Failed to record cash payment: ' + (result.error || ''), 'error');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('Orders')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('manageTrackOrders')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Card */}
          <div className="filter-card flex flex-wrap items-center gap-3">
            {/* Order Status Filter */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="form-select w-auto"
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="pending">{t('statusPending')}</option>
                <option value="delivered">{t('delivered')}</option>
                <option value="cancelled">{t('statusCancelled')}</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a1 1 0 10-2 0v5a3 3 0 003 3z" />
              </svg>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="form-select w-auto"
              >
                <option value="all">{t('allPayments')}</option>
                <option value="paid">{t('paymentStatusPaid')}</option>
                <option value="partial">Partially Paid</option>
                <option value="confirmation_pending">{t('paymentStatusConfirmationPending')}</option>
                <option value="pending">{t('noPayment')}</option>
              </select>
            </div>

            {/* Customer Filter */}
            <div className="relative" ref={customerDropdownRef}>
              <input
                type="text"
                placeholder={t('filterByCustomer')}
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="form-input w-48"
              />
              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {(() => {
                    const customersWithUserId = allCustomers.filter(c => c.userId);
                    const filteredCustomers = customersWithUserId.filter(c =>
                      c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase())
                    );
                    const displayList = filteredCustomers.slice(0, 20);

                    if (displayList.length === 0) {
                      return <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No customers found</div>;
                    }

                    return displayList.map(customer => (
                      <div
                        key={customer.id}
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm flex justify-between items-center transition-colors ${
                          customer.userId === selectedCustomerId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                        onClick={() => {
                          setSelectedCustomerId(customer.userId);
                          setCustomerSearchQuery(customer.name);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{customer.phone || ''}</span>
                      </div>
                    ));
                  })()}
                  {selectedCustomerId && (
                    <div
                      className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-sm border-t border-gray-200 dark:border-gray-700 transition-colors"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerSearchQuery('');
                        setShowCustomerDropdown(false);
                      }}
                    >
                      Clear customer filter
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Button */}
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="filter-card flex items-center gap-2"
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
              <span className="text-sm font-medium">{sortDirection === 'desc' ? 'Latest' : 'Oldest'}</span>
            </button>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
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
                <option value="thisFinancialYear">This FY</option>
                <option value="custom">Custom</option>
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
            </div>
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
            <p className="empty-state-description">No orders have been placed yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>{t('Order Date')}</th>
                    <th>Items</th>
                    <th>{t('Order Total')}</th>
                    <th>{t('Order Status')}</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="table-row">
                    <td className="font-medium">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          if (order.customerId) {
                            fetchCustomerDetails(order.customerId);
                          }
                        }}
                        className="text-[#10b981] hover:text-[#059669] font-semibold"
                      >
                        #{order.id.substring(0, 8)}
                      </button>
                    </td>
                    <td className="text-gray-900 dark:text-gray-100">
                      {order.customerName || 'N/A'}
                    </td>
                    <td className="text-gray-600 dark:text-gray-300">{formatDate(order.createdAt)}</td>
                    <td className="text-gray-600 dark:text-gray-300">{order.items?.length || 0} items</td>
                    <td className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(order.totalAmount)}</td>
                    <td>
                      <span
                        className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {getPaymentStatusText(order.paymentStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {paginatedOrders.map((order) => (
                  <div key={order.id} className="card p-4">
                        <div className="flex items-start justify-between mb-3">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              if (order.customerId) {
                                fetchCustomerDetails(order.customerId);
                              }
                            }}
                            className="text-[#10b981] hover:text-[#059669] font-semibold text-lg"
                          >
                            #{order.id.substring(0, 8)}
                          </button>
                          <div className="flex flex-col gap-1">
                            <span
                              className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full text-left ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${getPaymentStatusColor(order.paymentStatus)}`}>
                              {getPaymentStatusText(order.paymentStatus)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm mb-3">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Customer:</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{order.customerName || 'N/A'}</span>
                          </div>
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
                            <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                  </div>
                ))}
            </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  {/* Page Size Selector */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-select w-20 text-sm py-1"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      Next
                    </button>
                  </div>

                  {/* Showing X-Y of Z */}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {`Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredAndSortedOrders.length)} of ${filteredAndSortedOrders.length} orders`}
                  </div>
                </div>)}
            </>
        )}
      </div>

      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Order Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  #{selectedOrder.id.substring(0, 12)}...
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Header Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="p-4">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">{t('orderDate')}</p>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Customer</p>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100">{selectedOrder.customerName || 'N/A'}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('orderStatus')}</p>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                        selectedOrder.status
                      )}`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>
                <div className="card">
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('paymentStatus')}</p>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(
                        selectedOrder.paymentStatus
                      )}`}
                    >
                      {getPaymentStatusText(selectedOrder.paymentStatus)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              {customerPhone && (
                <div className="card">
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('contact')}</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`tel:${customerPhone}`}
                        className="inline-flex items-center px-4 py-2 bg-[#10b981] text-white text-sm font-medium rounded-xl hover:bg-[#059669] transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {t('call')}
                      </a>
                      <a
                        href={`https://wa.me/91${customerPhone.replace(/^0+/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-xl hover:bg-[#128C7E] transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        {t('whatsapp')}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Address Section */}
              {customerDeliveryAddress && (
                <div className="card">
                  <div className="p-4">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Delivery Address</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{customerDeliveryAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.paymentScreenshotUrl && (
                <div className="card border-2 border-orange-200 dark:border-orange-900/50">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Verification Pending Proof</h3>
                      </div>
                      <button
                        onClick={() => handleDownloadPaymentScreenshot(selectedOrder.paymentScreenshotUrl, selectedOrder.id)}
                        disabled={downloading === selectedOrder.id}
                        className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm bg-[#10b981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>{downloading === selectedOrder.id ? 'Downloading...' : 'Download'}</span>
                      </button>
                    </div>
                    <div className="overflow-hidden flex justify-center bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <img
                        src={selectedOrder.paymentScreenshotUrl}
                        alt={t('paymentScreenshot')}
                        className="max-w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md max-h-[50vh] object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="card">
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('orderItems')}</h3>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="table w-full">
                      <thead className="table-head">
                        <tr>
                          <th className="px-4 sm:px-6">{t('product')}</th>
                          <th className="text-right px-4 sm:px-6">{t('qty')}</th>
                          <th className="text-right px-4 sm:px-6">{t('stdPrice')}</th>
                          <th className="text-right px-4 sm:px-6">{t('cost')}</th>
                          <th className="text-right px-4 sm:px-6">{t('price')}</th>
                          <th className="text-right px-4 sm:px-6">{t('revenue')}</th>
                          <th className="text-right px-4 sm:px-6">{t('profit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items?.map((item, idx) => {
                          const standardPrice = productPrices[item.productName] || 0;
                          const standardSubtotal = item.quantity * standardPrice;
                          const customerSubtotal = item.quantity * item.price;
                          const profit = customerSubtotal - standardSubtotal;
                          const profitMargin = standardSubtotal > 0 ? (profit / standardSubtotal) * 100 : 0;
                          const hasStandardPrice = standardPrice > 0;

                          return (
                            <tr key={idx} className="table-row">
                              <td className="px-4 sm:px-6 font-medium text-gray-900 dark:text-gray-100">{item.productName}</td>
                              <td className="text-right px-4 sm:px-6 text-gray-600 dark:text-gray-300">{item.quantity}</td>
                              <td className="text-right px-4 sm:px-6 text-gray-600 dark:text-gray-300">
                                {hasStandardPrice ? formatCurrency(standardPrice) : '-'}
                              </td>
                              <td className="text-right px-4 sm:px-6 text-gray-600 dark:text-gray-300">
                                {hasStandardPrice ? formatCurrency(standardSubtotal) : '-'}
                              </td>
                              <td className="text-right px-4 sm:px-6 text-gray-600 dark:text-gray-300">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="text-right px-4 sm:px-6 font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(customerSubtotal)}
                              </td>
                              <td className={`text-right px-4 sm:px-6 font-semibold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {hasStandardPrice ? formatCurrency(profit) : '-'}
                                {hasStandardPrice && (
                                  <div className="text-xs text-gray-500">
                                    {profitMargin.toFixed(1)}%
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700">
                        {(() => {
                          const totalQty = selectedOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                          let totalStandard = 0;
                          let totalCustomer = 0;
                          let totalProfit = 0;

                          selectedOrder.items?.forEach(item => {
                            const standardPrice = productPrices[item.productName] || 0;
                            const stdSub = item.quantity * standardPrice;
                            const custSub = item.quantity * item.price;
                            totalStandard += stdSub;
                            totalCustomer += custSub;
                            totalProfit += (custSub - stdSub);
                          });

                          const totalMargin = totalStandard > 0 ? (totalProfit / totalStandard) * 100 : 0;
                          const hasProfitData = totalStandard > 0 && Object.keys(productPrices).length > 0;
                          const profitColor = totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

                          return (
                            <tr>
                              <td className="px-4 sm:px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                TOTAL
                              </td>
                              <td className="px-4 sm:px-6 py-3 text-lg font-bold text-gray-900 dark:text-gray-100 text-right">
                                {totalQty}
                              </td>
                              <td className="px-4 sm:px-6 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
                                —
                              </td>
                              <td className="px-4 sm:px-6 py-3 text-lg font-bold text-[#10b981] dark:text-green-400 text-right">
                                {formatCurrency(totalStandard)}
                              </td>
                              <td className="px-4 sm:px-6 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
                                —
                              </td>
                              <td className="px-4 sm:px-6 py-3 text-lg font-bold text-blue-600 dark:text-blue-400 text-right">
                                {formatCurrency(totalCustomer)}
                              </td>
                              <td className={`px-4 sm:px-6 py-3 text-lg font-bold text-right ${profitColor}`}>
                                {hasProfitData ? formatCurrency(totalProfit) : '-'}
                                {hasProfitData && (
                                  <div className="text-xs text-gray-500">
                                    ({totalMargin.toFixed(1)}%)
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })()}
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown & Cash Recording */}
              {selectedOrder.status !== 'cancelled' && (
                <div className="card">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
                        <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Payment Details</span>
                      </h3>
                      
                      {/* Download Bill Button - Only if Delivered and Paid */}
                      {selectedOrder.status === 'delivered' && selectedOrder.paymentStatus === 'paid' && (
                        <button
                          onClick={() => handleDownloadBill(selectedOrder)}
                          disabled={billGenerating}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-all disabled:opacity-50 font-medium"
                        >
                          {billGenerating ? (
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          <span>{billGenerating ? 'Generating...' : 'Download Bill'}</span>
                        </button>
                      )}
                    </div>

                    {/* Payment Breakdown */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Order Total</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedOrder.totalAmount || 0)}</span>
                      </div>
                      {(selectedOrder.cashAmount > 0 || selectedOrder.onlineAmount > 0) && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">💵 Cash Received</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(selectedOrder.cashAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">🏦 Online Received</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(selectedOrder.onlineAmount || 0)}</span>
                          </div>
                          <div className="border-t dark:border-gray-700 pt-2 flex justify-between text-sm">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Total Paid</span>
                            <span className={`font-bold ${
                              ((selectedOrder.cashAmount || 0) + (selectedOrder.onlineAmount || 0)) >= (selectedOrder.totalAmount || 0)
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {formatCurrency((selectedOrder.cashAmount || 0) + (selectedOrder.onlineAmount || 0))}
                            </span>
                          </div>
                          {((selectedOrder.cashAmount || 0) + (selectedOrder.onlineAmount || 0)) < (selectedOrder.totalAmount || 0) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Remaining</span>
                              <span className="font-medium text-red-600 dark:text-red-400">
                                {formatCurrency((selectedOrder.totalAmount || 0) - (selectedOrder.cashAmount || 0) - (selectedOrder.onlineAmount || 0))}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Cash Payment History */}
                    {selectedOrder.cashPayments && selectedOrder.cashPayments.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cash Payment History</p>
                        <div className="space-y-1.5">
                          {selectedOrder.cashPayments.map((entry, idx) => {
                            const entryDate = entry.recordedAt
                              ? new Date(entry.recordedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })
                              : '-';
                            return (
                              <div key={idx} className="flex items-center justify-between text-sm bg-green-50 dark:bg-green-900/20 p-2.5 rounded-lg border border-green-100 dark:border-green-800">
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-600 dark:text-green-400 font-medium">#{idx + 1}</span>
                                  <span className="text-gray-600 dark:text-gray-400">{entryDate}</span>
                                </div>
                                <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(entry.amount)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Online Payment History */}
                    {selectedOrder.onlinePayments && selectedOrder.onlinePayments.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Online Payment History (Confirmed)</p>
                        <div className="space-y-1.5">
                          {selectedOrder.onlinePayments.map((entry, idx) => {
                            const entryDate = entry.confirmedAt
                              ? new Date(entry.confirmedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })
                              : '-';
                            return (
                              <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">#{idx + 1}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{entryDate}</span>
                                  </div>
                                  <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(entry.amount)}</span>
                                </div>
                                {entry.screenshotUrl && (
                                  <button
                                    onClick={() => handleDownloadPaymentScreenshot(entry.screenshotUrl, `online_proof_${idx+1}`)}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download Screenshot Proof
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add Cash Payment */}
                    {selectedOrder.paymentStatus !== 'paid' && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Cash Payment</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={cashInput}
                              onChange={(e) => setCashInput(e.target.value)}
                              className="form-input pl-7"
                              placeholder="Enter amount"
                              disabled={recordingCash}
                            />
                          </div>
                          <button
                            onClick={() => handleRecordCash(selectedOrder.id)}
                            disabled={recordingCash || !cashInput}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm whitespace-nowrap flex items-center space-x-1"
                          >
                            {recordingCash ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Adding...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add Cash</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          This amount will be added to existing cash payments.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {(selectedOrder.status === 'pending' || selectedOrder.paymentStatus === 'confirmation_pending') && (
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t-2 border-gray-100 dark:border-gray-700">
                  {selectedOrder.paymentStatus === 'confirmation_pending' && (
                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-40">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={onlineInput}
                            onChange={(e) => setOnlineInput(e.target.value)}
                            className="form-input pl-7 py-2"
                            placeholder="Online amount"
                            disabled={confirming === selectedOrder.id}
                          />
                        </div>
                        <button
                          onClick={() => handleConfirmPayment(selectedOrder.id)}
                          disabled={confirming === selectedOrder.id || !onlineInput}
                          className="bg-blue-600 text-white flex items-center justify-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium whitespace-nowrap"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{confirming === selectedOrder.id ? t('confirming') : 'Confirm Online'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Enter the exact amount received online from the payment screenshot.</p>
                    </div>
                  )}
                  {selectedOrder.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleStatusUpdate(selectedOrder.id, 'delivered');
                          closeModal();
                        }}
                        disabled={updating === selectedOrder.id}
                        className="btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{updating === selectedOrder.id ? 'Updating...' : 'Mark as Delivered'}</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'cancelled')}
                        className="btn-danger flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel Order</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
