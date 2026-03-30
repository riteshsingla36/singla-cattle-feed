'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { updatePaymentProof, getOrder } from '@/firebase/firestore';

export default function OrderDetailsModal({ order, isOpen, onClose, onPaymentUploaded, showShareButton = false, adminWhatsAppNumbers = [], qrCodeUrl = '', upiId = '' }) {
  const { t } = useTranslation();
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [freshOrder, setFreshOrder] = useState(order);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setFreshOrder(null);
      setPaymentScreenshot(null);
      setUploading(false);
      setLoading(false);
      return;
    }

    // Fetch fresh order data when modal opens
    const fetchFreshOrder = async () => {
      if (!order?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getOrder(order.id);
        if (result.success && result.order) {
          setFreshOrder(result.order);
        } else {
          // If fetch fails, keep the order from props as fallback
          setFreshOrder(order);
        }
      } catch (error) {
        console.error('Error fetching fresh order data:', error);
        // On error, use the order from props
        setFreshOrder(order);
      } finally {
        setLoading(false);
      }
    };

    fetchFreshOrder();
  }, [isOpen, order?.id]);

  const handleSubmitPayment = async (orderId) => {
    if (!paymentScreenshot) {
      alert('Please select a payment screenshot');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', paymentScreenshot);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      const screenshotUrl = data.url;

      // Update order with payment proof
      const result = await updatePaymentProof(orderId, screenshotUrl);

      if (result.success) {
        alert('Payment proof uploaded! Awaiting admin confirmation.');
        setPaymentScreenshot(null);
        if (onPaymentUploaded) {
          onPaymentUploaded();
        }
        onClose();
      } else {
        alert('Failed to update payment: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while uploading payment: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const shareOnWhatsApp = (orderToShare = freshOrder) => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Construct redirect URL that will attempt to open the app first
    // The redirect page will try to open st:// scheme, then fallback to browser
    // Format: {ORIGIN}/admin/orders-redirect?orderId={id}
    const adminOrderUrl = `${window.location.origin}/admin/orders-redirect?orderId=${orderToShare.id}`;

    let message = `*${t('orderDetails')}*\n\n`;
    message += `*${t('orderId')}:* #${orderToShare.id.substring(0, 8)}\n`;
    message += `*${t('orderDate')}:* ${formatDate(orderToShare.createdAt)}\n`;
    message += `*${t('customer')}:* ${orderToShare.customerName || 'N/A'}\n`;
    message += `*${t('orderStatus')}:* ${orderToShare.status}\n`;
    message += `*${t('paymentStatus')}:* ${orderToShare.paymentStatus || 'N/A'}\n\n`;
    message += `*${t('items')}:*\n`;

    orderToShare.items?.forEach((item, idx) => {
      message += `${idx + 1}. ${item.productName}\n`;
      message += `   Qty: ${item.quantity} × ${formatCurrency(item.price)} = ${formatCurrency(item.quantity * item.price)}\n`;
    });

    message += `\n*${t('total')}:* ${formatCurrency(orderToShare.totalAmount)}\n`;

    // Add QR code if available
    if (upiId) {
      message += `\n*${t('upiId')}:* ${upiId}\n`;
    }

    // Add admin panel link
    message += `\n*${t('viewInAdminPanel')}:* ${adminOrderUrl}\n`;

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

  if (!freshOrder || !isOpen) return null;

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
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

  const generateUpiDeepLink = (app) => {
    if (!upiId) return '';

    const amount = freshOrder?.totalAmount || 0;
    const formattedAmount = amount.toFixed(2);
    const payeeName = 'Singla Traders'; // Could be dynamic from settings
    const transactionRef = freshOrder?.id || '';

    let baseUrl = '';
    switch (app) {
      case 'gpay':
        baseUrl = 'upi://pay';
        break;
      case 'phonepe':
        baseUrl = 'phonepe://pay';
        break;
      case 'paytm':
        baseUrl = 'paytm://pay';
        break;
      default:
        return '';
    }

    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: formattedAmount,
      cu: 'INR',
      tr: transactionRef,
    });

    return `${baseUrl}?${params.toString()}`;
  };

  const openPaymentApp = (app) => {
    const deepLink = generateUpiDeepLink(app);
    if (deepLink) {
      window.location.href = deepLink;
    }
  };

  const handleCopyUpiId = async () => {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      alert('UPI ID copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = upiId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('UPI ID copied to clipboard!');
    }
  };

  // Don't render anything if modal is closed
  if (!isOpen) {
    return null;
  }

  // Show loading while fetching fresh data or if no order data available yet
  if (loading || !freshOrder) {
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981]"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#10b981] dark:bg-green-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10 text-white">
          <h2 className="text-xl font-bold text-white">{t('orderDetails')}</h2>
          <div className="flex items-center space-x-2">
            {showShareButton && (
              <button
                onClick={() => shareOnWhatsApp()}
                className="inline-flex items-center px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#128C7E] shadow-lg"
                title={t('shareOrderDetailsWithAdmin')}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {t('shareOnWhatsApp')}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('orderId')}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">#{freshOrder.id.substring(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('orderDate')}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{formatDate(freshOrder.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('customer')}</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{freshOrder.customerName || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('orderStatus')}</p>
              {getStatusBadge(freshOrder.status)}
            </div>
            {freshOrder.paymentStatus && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment')}</p>
                <span
                  className={`badge ${
                    freshOrder.paymentStatus === 'paid'
                      ? 'badge-success'
                      : freshOrder.paymentStatus === 'confirmation_pending'
                      ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-400'
                      : 'badge-warning'
                  }`}
                >
                  {freshOrder.paymentStatus === 'paid'
                    ? t('paymentStatusPaid')
                    : freshOrder.paymentStatus === 'confirmation_pending'
                    ? t('paymentStatusConfirmationPending')
                    : t('paymentStatusPending')}
                </span>
              </div>
            )}
          </div>

          <div className="border-t pt-6 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center space-x-2">
              <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Order Items</span>
            </h3>

            <div className="border rounded-xl overflow-x-auto dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Product</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {freshOrder.items?.map((item, idx) => (
                    <tr key={idx} className="dark:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-green-400 text-right">{formatCurrency(item.quantity * item.price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-right text-gray-700 dark:text-gray-300">
                      Total Amount
                    </td>
                    <td className="px-4 py-3 text-lg font-bold text-[#10b981] dark:text-green-400 text-right">
                      {formatCurrency(freshOrder.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {freshOrder.paymentScreenshotUrl && (
            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center space-x-2">
                <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Payment Screenshot</span>
              </h3>
              <img
                src={freshOrder.paymentScreenshotUrl}
                alt="Payment screenshot"
                className="max-w-md rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md"
              />
            </div>
          )}

          {/* QR Code for Payment - Show if QR available and no payment screenshot */}
          {qrCodeUrl && !freshOrder.paymentScreenshotUrl && freshOrder.status !== 'cancelled' && (
            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center space-x-2">
                <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Pay via UPI</span>
              </h3>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-100 dark:border-green-800 mb-4">
                <img src={qrCodeUrl} alt="Payment QR" className="max-w-[180px] mx-auto mb-3 rounded-lg" />
                {upiId && (
                  <div className="flex items-center justify-center space-x-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 break-all">
                      {upiId}
                    </p>
                    <button
                      onClick={handleCopyUpiId}
                      className="p-1.5 text-gray-500 hover:text-[#10b981] dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                      title="Copy UPI ID"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Payment App Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* Google Pay */}
                <button
                  onClick={() => openPaymentApp('gpay')}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all"
                  style={{ backgroundColor: '#4285F4', color: 'white' }}
                  title="Pay with Google Pay"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.18 15.64a2.18 2.18 0 01-2.18 2.18 2.18 2.18 0 01-2.18-2.18 2.18 2.18 0 012.18-2.18 2.18 2.18 0 012.18 2.18zM4 4.55a2.24 2.24 0 012.24-2.24h1.3a2.24 2.24 0 012.24 2.24v1.3a2.24 2.24 0 01-2.24 2.24H6.24A2.24 2.24 0 014 6.85V4.55zm8.83 9.38a2.24 2.24 0 012.24 2.24h1.3a2.24 2.24 0 012.24-2.24V6.85a2.24 2.24 0 01-2.24-2.24h-1.3a2.24 2.24 0 01-2.24 2.24v9.09zM12.8 5.45l-1.37 1.36a1.12 1.12 0 001.58 0l1.37-1.36 1.37 1.36a1.12 1.12 0 001.58 0l1.37-1.36 1.37 1.36a1.12 1.12 0 001.58 0l1.37-1.36L18.45 7a1.12 1.12 0 00-1.58-1.58l-1.37 1.36-1.37-1.36a1.12 1.12 0 00-1.58 0l-1.37 1.36L8.2 5.45a1.12 1.12 0 00-1.58 0l-1.37 1.36z"/>
                  </svg>
                  <span>Google Pay</span>
                </button>

                {/* PhonePe */}
                <button
                  onClick={() => openPaymentApp('phonepe')}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all"
                  style={{ backgroundColor: '#5F2BEA', color: 'white' }}
                  title="Pay with PhonePe"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                  </svg>
                  <span>PhonePe</span>
                </button>

                {/* Paytm */}
                <button
                  onClick={() => openPaymentApp('paytm')}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all"
                  style={{ backgroundColor: '#00BAF2', color: 'white' }}
                  title="Pay with Paytm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 7h10v2H7V7zm0 4h7v2H7v-2zm12 2H5c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2z"/>
                  </svg>
                  <span>Paytm</span>
                </button>

                {/* Copy UPI ID */}
                <button
                  onClick={handleCopyUpiId}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  title="Copy UPI ID"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy UPI ID</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                Tap your preferred payment app to open it with pre-filled details
              </p>
            </div>
          )}

          {/* Payment Upload Section - Only show if payment is pending and no screenshot */}
          {!freshOrder.paymentScreenshotUrl && freshOrder.status !== 'cancelled' && (
            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center space-x-2">
                <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Upload Payment Proof</span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Please upload your payment screenshot to complete this order.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Payment Screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentScreenshot(e.target.files[0])}
                    className="w-full file:mr-4 file:py-2 file:px-4 file:border-2 file:border-[#10b981]/20 file:text-sm file:font-semibold file:bg-[#10b981]/5 file:text-[#10b981] hover:file:bg-[#10b981]/10 file:rounded-lg dark:file:bg-gray-700 dark:file:border-green-800 dark:file:text-green-400"
                  />
                  {paymentScreenshot && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      Selected: {paymentScreenshot.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleSubmitPayment(freshOrder.id)}
                  disabled={!paymentScreenshot || uploading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {uploading ? 'Uploading...' : 'Upload & Mark as Paid'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
