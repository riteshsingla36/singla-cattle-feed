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
      case 'delivered':
        return <span className="badge badge-success">Delivered</span>;
      case 'cancelled':
        return <span className="badge badge-error">Cancelled</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const handlePayViaGooglePay = () => {
    const upiLink = buildUpiLink('Google Pay');
    if (upiLink) {
      // Create anchor and click directly (user gesture, should work)
      const anchor = document.createElement('a');
      anchor.href = upiLink;
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };

  const handlePayViaPhonePe = () => {
    const upiLink = buildUpiLink('PhonePe');
    if (upiLink) {
      const anchor = document.createElement('a');
      anchor.href = upiLink;
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };

  const handlePayViaPaytm = () => {
    const upiLink = buildUpiLink('Paytm');
    if (upiLink) {
      const anchor = document.createElement('a');
      anchor.href = upiLink;
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };

  const buildUpiLink = (appName) => {
    if (!upiId) return '';

    const amount = freshOrder?.totalAmount || 0;
    const formattedAmount = amount.toFixed(2);
    const payeeName = 'Singla Traders';
    const transactionRef = freshOrder?.id || '';

    // Generate UPI deep link with proper parameters
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: formattedAmount,
      cu: 'INR',
      tr: transactionRef,
    });

    // Use app-specific schemes as requested
    switch (appName) {
      case 'Google Pay':
        return `tez://upi/pay?${params.toString()}`;
      case 'PhonePe':
        return `phonepe://pay?${params.toString()}`;
      case 'Paytm':
        return `paytmmp://pay?${params.toString()}`;
      default:
        return `upi://pay?${params.toString()}`;
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

          {/* UPI Payment Apps Section - Show if QR available and no payment screenshot */}
          {qrCodeUrl && !freshOrder.paymentScreenshotUrl && freshOrder.status !== 'cancelled' && (
            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center space-x-2">
                <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Pay via UPI</span>
              </h3>

              {/* Pay via UPI Apps */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pay using UPI Apps</p>
                <div className="grid grid-cols-1 gap-2">
                  {/* Google Pay Button */}
                  <button
                    onClick={handlePayViaGooglePay}
                    className="flex items-center justify-center space-x-3 py-3 px-4 rounded-lg font-medium bg-[#4285F4] text-white hover:bg-[#3367D6] shadow-md transition-all"
                    title="Pay with Google Pay"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.18 15.64a2.18 2.18 0 01-2.18 2.18 2.18 2.18 0 01-2.18-2.18 2.18 2.18 0 012.18-2.18c.48 0 .93.12 1.32.33.4.21.78.56 1.05.98.28.42.44.93.44 1.46 0 .6-.23 1.13-.61 1.5-.39.38-.94.58-1.54.58-.6 0-1.12-.2-1.49-.57-.37-.38-.57-.89-.57-1.53 0-.66.25-1.22.66-1.61.42-.39.99-.59 1.6-.59.35 0 .7.05 1.02.16.33.11.62.29.86.53.24.24.43.53.56.86.13.33.2.72.2 1.15 0 .5-.19.95-.5 1.3-.31.35-.75.54-1.25.54-.46 0-.86-.15-1.15-.44-.29-.29-.44-.68-.44-1.16 0-.39.15-.74.4-1.02.26-.28.62-.42 1.05-.42.35 0 .67.09.95.26.28.18.51.41.68.71.18.3.31.65.39 1.04.08.39.12.81.12 1.26 0 .55-.21 1.03-.55 1.38-.35.36-.83.54-1.4.54-.46 0-.88-.14-1.23-.42-.35-.28-.53-.66-.53-1.13 0-.36.11-.69.29-.98.18-.29.44-.52.76-.68.32-.16.69-.24 1.09-.24.49 0 .94.12 1.32.35.38.23.71.55.97.94.26.39.46.85.58 1.36.12.51.18 1.06.18 1.62 0 .63-.24 1.18-.63 1.59-.4.41-.95.62-1.54.62-.39 0-.73-.12-1.02-.36-.29-.23-.54-.55-.75-.93-.21-.38-.37-.8-.49-1.25zM15.99 7.35c.41 0 .77.13 1.05.38.28.26.42.59.42 1.02 0 .51-.19.95-.51 1.27-.33.33-.77.49-1.25.49-.44 0-.82-.14-1.12-.41-.3-.27-.45-.63-.45-1.07 0-.5.19-.93.51-1.25.32-.32.76-.48 1.25-.48.44 0 .81.14 1.1.41.29.27.44.63.44 1.08 0 .43-.16.8-.43 1.09-.27.29-.65.43-1.09.43-.43 0-.8-.13-1.09-.39-.29-.26-.44-.61-.44-1.04 0-.5.19-.93.51-1.25.32-.32.76-.48 1.25-.48.44 0 .81.14 1.1.41.29.27.44.63.44 1.08 0 .46-.17.85-.44 1.15-.27.3-.64.45-1.07.45-.48 0-.87-.15-1.17-.44-.3-.29-.45-.68-.45-1.15 0-.5.19-.93.51-1.25.32-.32.76-.48 1.25-.48.48 0 .87.15 1.16.45.29.29.44.7.44 1.19 0 .55-.21 1.02-.55 1.37-.34.34-.82.52-1.37.52-.41 0-.76-.12-1.04-.36-.28-.24-.43-.56-.43-.96 0-.45.17-.83.45-1.12.28-.28.67-.42 1.12-.42.41 0 .75.12 1.02.36.27.24.41.57.41.98 0 .43-.16.79-.43 1.07-.27.27-.65.41-1.09.41-.39 0-.72-.11-.98-.33-.26-.22-.39-.51-.39-.86 0-.39.15-.72.39-.98.25-.26.6-.39 1.01-.39.36 0 .66.1.9.3.24.2.36.46.36.78 0 .33-.12.61-.32.83-.2.22-.49.33-.85.33-.35 0-.64-.1-.87-.3-.23-.2-.35-.46-.35-.78 0-.34.13-.62.34-.84.22-.22.52-.33.88-.33.33 0 .6.1.81.29.21.2.31.46.31.78 0 .32-.12.59-.32.8-.2.21-.49.32-.83.32-.31 0-.57-.09-.77-.27-.2-.18-.3-.42-.3-.72 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.72.26.19.18.29.41.29.7 0 .31-.12.57-.31.77-.2.2-.47.3-.8.3a3.07 3.07 0 01-.8-.23 2.48 2.48 0 01-.57-.42 2.18 2.18 0 01-.38-.56c-.08-.21-.12-.45-.12-.71 0-.35.13-.65.35-.88.22-.23.53-.34.89-.34.36 0 .65.11.88.33.23.22.34.52.34.88 0 .34-.13.63-.34.86-.21.22-.51.33-.86.33-.34 0-.62-.1-.84-.29-.22-.19-.33-.45-.33-.77 0-.34.13-.62.34-.84.21-.22.5-.33.84-.33.31 0 .56.09.76.26.2.18.3.42.3.72 0 .32-.12.59-.31.8-.2.21-.47.32-.79.32-.29 0-.53-.09-.72-.26-.19-.18-.29-.41-.29-.7 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .52.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32a2.25 2.25 0 01-.72-.22c-.21-.16-.31-.38-.31-.66 0-.32.12-.59.32-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .32-.12.59-.31.8-.2.21-.47.32-.79.32-.29 0-.53-.09-.71-.26-.19-.18-.28-.41-.28-.7 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .32-.12.59-.31.8-.2.21-.47.32-.79.32-.29 0-.53-.09-.71-.26-.19-.18-.28-.41-.28-.7 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.35 0-.64-.12-.87-.36-.23-.24-.34-.56-.34-.95 0-.41.15-.77.4-1.04.25-.27.6-.4 1.02-.4.42 0 .76.12 1.03.36.27.24.4.57.4.98 0 .41-.15.77-.4 1.05-.25.27-.6.41-1.02.41-.47 0-.86-.15-1.15-.45-.29-.3-.44-.71-.44-1.19 0-.55.21-1.02.55-1.37.34-.34.82-.52 1.37-.52.41 0 .76.12 1.04.36.28.24.42.57.42.98 0 .43-.16.8-.43 1.09-.27.29-.64.44-1.09.44-.49 0-.88-.15-1.17-.44-.29-.29-.44-.68-.44-1.15 0-.55.21-1.02.55-1.37.34-.34.82-.52 1.37-.52.48 0 .87.15 1.16.45.29.29.44.7.44 1.19 0 .57-.22 1.06-.57 1.43-.35.37-.83.56-1.4.56-.41 0-.76-.12-1.04-.36-.28-.24-.42-.56-.42-.97 0-.43.16-.8.42-1.09.26-.29.63-.43 1.08-.43.39 0 .71.11.96.33.25.22.37.51.37.86 0 .37-.14.69-.37.94-.23.25-.56.38-.94.38-.33 0-.6-.1-.81-.3-.21-.2-.31-.46-.31-.79 0-.34.13-.62.34-.84.21-.22.5-.33.84-.33.31 0 .56.09.76.26.2.18.3.41.3.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.34 0-.62-.11-.84-.32-.22-.21-.33-.5-.33-.85 0-.38.14-.7.36-.95.23-.25.55-.38.92-.38.34 0 .62.1.84.3.22.2.33.46.33.79 0 .33-.12.61-.32.83-.2.22-.49.33-.82.33s-.6-.09-.81-.27c-.21-.18-.31-.42-.31-.72 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .32-.12.59-.31.8-.2.21-.47.32-.79.32-.29 0-.53-.09-.71-.26-.19-.18-.28-.41-.28-.7 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.3 0-.55-.09-.74-.26-.19-.18-.29-.41-.29-.7 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.55-.09-.74-.26-.19-.18-.29-.41-.29-.7 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.35 0-.63-.12-.86-.36-.23-.24-.34-.57-.34-.96 0-.43.16-.8.43-1.09.27-.29.64-.44 1.09-.44.5 0 .91.16 1.22.47.31.31.47.72.47 1.2 0 .56-.22 1.05-.57 1.42-.35.37-.83.56-1.41.56-.41 0-.75-.12-1.03-.36-.28-.24-.42-.57-.42-.98 0-.43.16-.8.42-1.09.26-.29.63-.43 1.08-.43.39 0 .7.11.95.33.25.22.37.51.37.86 0 .37-.14.69-.37.94-.23.25-.56.38-.94.38-.33 0-.6-.1-.81-.3-.21-.2-.31-.46-.31-.79 0-.34.13-.62.34-.84.21-.22.5-.33.84-.33.31 0 .56.09.76.26.2.18.3.41.3.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.34 0-.62-.11-.84-.32-.22-.21-.33-.5-.33-.85 0-.39.14-.71.36-.96.23-.25.55-.38.92-.38.34 0 .62.1.84.3.22.2.33.46.33.79 0 .33-.12.61-.32.83-.2.22-.49.33-.82.33-.31 0-.55-.09-.74-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.3 0 .54.09.73.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .32-.12.59-.31.8-.2.21-.47.32-.79.32-.29 0-.53-.09-.71-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32a4.8 4.8 0 00-.74-.22 5.27 5.27 0 00-.56-.42 4.69 4.69 0 00-.38-.56c-.08-.21-.12-.45-.12-.71 0-.37.13-.68.35-.91.22-.23.53-.35.89-.35.35 0 .63.1.85.31.22.2.33.47.33.8 0 .35-.13.65-.34.88-.21.22-.5.33-.84.33-.31 0-.56-.09-.76-.26-.2-.18-.3-.42-.3-.72 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32a4.8 4.8 0 00-.74-.22 5.27 5.27 0 00-.56-.42 4.69 4.69 0 00-.38-.56c-.08-.21-.12-.45-.12-.71 0-.37.13-.68.35-.91.22-.23.53-.35.89-.35.35 0 .63.1.85.31.22.2.33.47.33.8 0 .35-.13.65-.34.88-.21.22-.5.33-.84.33-.31 0-.56-.09-.76-.26-.2-.18-.3-.42-.3-.72 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32a4.8 4.8 0 00-.74-.22 5.27 5.27 0 00-.56-.42 4.69 4.69 0 00-.38-.56c-.08-.21-.12-.45-.12-.71 0-.37.13-.68.35-.91.22-.23.53-.35.89-.35.35 0 .63.1.85.31.22.2.33.47.33.8 0 .35-.13.65-.34.88-.21.22-.5.33-.84.33-.31 0-.56-.09-.76-.26-.2-.18-.3-.42-.3-.72 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32a4.8 4.8 0 00-.74-.22 5.27 5.27 0 00-.56-.42 4.69 4.69 0 00-.38-.56c-.08-.21-.12-.45-.12-.71 0-.37.13-.68.35-.91.22-.23.53-.35.89-.35.35 0 .63.1.85.31.22.2.33.47.33.8 0 .35-.13.65-.34.88-.21.22-.5.33-.84.33-.31 0-.56-.09-.76-.26-.2-.18-.3-.42-.3-.72 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32a4.8 4.8 0 00-.74-.22 5.27 5.27 0 00-.56-.42 4.69 4.69 0 00-.38-.56c-.08-.21-.12-.45-.12-.71 0-.37.13-.68.35-.91.22-.23.53-.35.89-.35.35 0 .63.1.85.31.22.2.33.47.33.8 0 .35-.13.65-.34.88-.21.22-.5.33-.84.33-.31 0-.56-.09-.76-.26-.2-.18-.3-.42-.3-.72 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32a4.8 4.8 0 00-.74-.22 5.27 5.27 0 00-.56-.42 4.69 4.69 0 00-.38-.56c-.08-.21-.12-.45-.12-.71 0-.37.13-.68.35-.91.22-.23.53-.35.89-.35.35 0 .63.1.85.31.22.2.33.47.33.8 0 .35-.13.65-.34.88-.21.22-.5.33-.84.33-.31 0-.56-.09-.76-.26-.2-.18-.3-.42-.3-.72 0-.32.12-.59.31-.8.2-.21.47-.32.79-.32.29 0 .53.09.71.26.19.18.28.41.28.7 0 .3-.11.56-.29.77-.18.21-.44.32-.74.32-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .3-.11.56-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31.29 0 .52.09.7.26.18.18.27.41.27.7 0 .31-.11.57-.29.77-.18.21-.44.31-.74.31-.3 0-.54-.09-.73-.26-.19-.18-.28-.41-.28-.7 0-.31.11-.57.29-.77.18-.21.44-.31.74-.31z" fill="currentColor"/>
                    </svg>
                    <span>Google Pay</span>
                  </button>

                  {/* PhonePe Button */}
                  <button
                    onClick={handlePayViaPhonePe}
                    className="flex items-center justify-center space-x-3 py-3 px-4 rounded-lg font-medium bg-[#5F2BEA] text-white hover:bg-[#4a22b8] shadow-md transition-all"
                    title="Pay with PhonePe"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
                    </svg>
                    <span>PhonePe</span>
                  </button>

                  {/* Paytm Button */}
                  <button
                    onClick={handlePayViaPaytm}
                    className="flex items-center justify-center space-x-3 py-3 px-4 rounded-lg font-medium bg-[#00BAF2] text-white hover:bg-[#00a0d6] shadow-md transition-all"
                    title="Pay with Paytm"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
                    </svg>
                    <span>Paytm</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Opens UPI app with pre-filled payment details
                </p>
              </div>
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
