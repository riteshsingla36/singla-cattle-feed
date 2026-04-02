'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/firebase/auth';
import { getAllProducts, getCustomerAllPrices, getQRCodeSettings, placeOrder } from '@/firebase/firestore';

export default function CheckoutPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [customerPrices, setCustomerPrices] = useState({});
  const [cart, setCart] = useState([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setUserId(user.uid);
      // Load cart from localStorage
      const savedCart = localStorage.getItem(`cart_${user.uid}`);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);
        } catch (e) {
          console.error('Failed to parse saved cart:', e);
        }
      }
    } else {
      router.push('/login');
    }
    fetchData();
  }, []);

  // Filter cart items when products are loaded to remove invalid products
  useEffect(() => {
    if (cart.length > 0 && products.length > 0) {
      const validProductIds = new Set(products.map(p => p.id));
      const filteredCart = cart.filter(item => validProductIds.has(item.productId));
      if (filteredCart.length !== cart.length) {
        setCart(filteredCart);
      }
    }
  }, [products]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
    }
  }, [cart, userId]);

  const fetchData = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const [productsResult, pricesResult, qrResult] = await Promise.all([
        getAllProducts(),
        getCustomerAllPrices(user.uid),
        getQRCodeSettings(),
      ]);

      if (pricesResult.success) {
        setCustomerPrices(pricesResult.prices);
      }

      if (productsResult.success) {
        // Only show products that have a custom price set
        const allowedProducts = productsResult.products.filter(
          (product) => pricesResult.prices[product.id] !== undefined
        );
        setProducts(allowedProducts);
      }

      if (qrResult.success && qrResult.settings) {
        setQrCodeUrl(qrResult.settings.qrCodeUrl || '');
        setUpiId(qrResult.settings.upiId || '');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (productId) => {
    return customerPrices[productId] || products.find((p) => p.id === productId)?.price || 0;
  };

  const addToCart = (product) => {
    const price = getPrice(product.id);
    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        unit: product.unit || 'bag',
        price,
        quantity: 1
      }]);
    }
    // No longer setting showCart - cart is always visible below products
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.productId !== productId));
    } else {
      setCart(
        cart.map((item) =>
          item.productId === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    if (userId) {
      localStorage.removeItem(`cart_${userId}`);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        alert('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setPaymentScreenshot(file);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    setSubmitting(true);

    try {
      const user = getCurrentUser();
      let screenshotUrl = null;
      let paymentStatus = 'pending';

      // If payment screenshot is provided, upload it and mark as paid
      if (paymentScreenshot) {
        screenshotUrl = await uploadFile(paymentScreenshot, user.uid);
        paymentStatus = 'paid';
      }

      const orderData = {
        customerId: user.uid,
        customerName: user.displayName || 'Customer',
        items: cart,
        totalAmount: calculateTotal(),
        paymentScreenshotUrl: screenshotUrl,
        paymentStatus: paymentStatus,
      };

      const result = await placeOrder(orderData);

      if (result.success) {
        if (paymentStatus === 'confirmation_pending') {
          alert('Order placed! Payment screenshot uploaded. Awaiting admin confirmation.');
        } else {
          alert('Order placed successfully! Please upload payment proof from your orders page.');
        }
        clearCart();
        setPaymentScreenshot(null);
        router.push('/orders');
      } else {
        alert('Failed to place order: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while placing order');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const buildUpiRedirectUrl = (appName) => {
    if (!upiId) return '';

    const amount = cartTotal || 0;
    const formattedAmount = amount.toFixed(2);
    const payeeName = 'Singla Traders';
    const transactionRef = `ORD-${Date.now()}`;

    // Generate UPI deep link with proper parameters
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: formattedAmount,
      cu: 'INR',
      tr: transactionRef,
    });

    // Use app-specific schemes as requested
    let upiLink;
    switch (appName) {
      case 'Google Pay':
        upiLink = `tez://upi/pay?${params.toString()}`;
        break;
      case 'PhonePe':
        upiLink = `phonepe://pay?${params.toString()}`;
        break;
      case 'Paytm':
        upiLink = `paytmmp://pay?${params.toString()}`;
        break;
      default:
        upiLink = `upi://pay?${params.toString()}`;
    }

    // Build redirect URL
    const redirectUrl = new URL(`${window.location.origin}/payment/upi-redirect`);
    redirectUrl.searchParams.append('upiLink', upiLink);
    redirectUrl.searchParams.append('upiId', upiId);
    redirectUrl.searchParams.append('amount', amount);
    redirectUrl.searchParams.append('payeeName', payeeName);
    redirectUrl.searchParams.append('app', appName);

    return redirectUrl.toString();
  };

  const handlePayViaUpi = () => {
    const redirectUrl = buildUpiRedirectUrl('UPI');
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      alert('UPI ID is not configured. Please contact support.');
    }
  };

  const cartTotal = calculateTotal();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Place Order</h1>
              <p className="text-sm text-gray-500 mt-1">Browse products and add to cart</p>
            </div>
            <button
              onClick={() => {
                const cartSection = document.getElementById('cart-section');
                if (cartSection) {
                  cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="lg:hidden btn-primary flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Cart ({cartCount})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products Grid */}
          <div className="lg:col-span-2">
            {products.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="empty-state-title">No products available</h3>
                  <p className="empty-state-description">Products will appear here once the admin adds them and sets custom pricing for you.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map((product) => {
                  const price = getPrice(product.id);
                  const inCart = cart.find((item) => item.productId === product.id);

                  return (
                    <div key={product.id} className="product-card">
                      {/* Product Image Placeholder */}
                      <div className="product-card-img bg-gradient-to-br from-[#10b981]/10 to-[#059669]/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>

                      <div className="product-card-body">
                        <h3 className="product-card-title">{product.name}</h3>
                        {product.description && (
                          <p className="product-card-description">{product.description}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Pack Size: {product.unit || '40kg'}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                            <p className="product-card-price">{formatCurrency(price)}</p>
                          </div>
                          {inCart ? (
                            <div className="quantity-control">
                              <button
                                onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                                className="quantity-btn font-bold"
                              >
                                −
                              </button>
                              <input
                                type="text"
                                value={inCart.quantity}
                                readOnly
                                className="quantity-input"
                              />
                              <button
                                onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                                className="quantity-btn font-bold"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="btn-primary flex items-center space-x-2 px-4 py-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Add to Cart</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1" id="cart-section">
            <div className="card sticky top-6 shadow-elevated">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h2 className="card-title m-0">Your Cart</h2>
                </div>
                <span className="badge badge-primary">{cartCount} items</span>
              </div>

              <div className="card-body">
                {cart.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-4">Your cart is empty</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add products to get started</p>
                  </div>
                ) : (
                  <>
                    {/* Cart Items */}
                    <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                      {cart.map((item) => (
                        <div key={item.productId} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.productName} <span className="text-gray-500 normal-case">({item.unit || '40kg'})</span></h4>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="quantity-control">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="quantity-btn text-lg font-bold"
                              >
                                −
                              </button>
                              <input
                                type="text"
                                value={item.quantity}
                                readOnly
                                className="quantity-input"
                              />
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="quantity-btn text-lg font-bold"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="divider"></div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(cartTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xl font-bold text-gray-900 dark:text-gray-100">
                        <span>Total</span>
                        <span className="text-[#10b981]">{formatCurrency(cartTotal)}</span>
                      </div>
                    </div>

                    {/* QR Code */}
                    {qrCodeUrl && (
                      <div className="mb-6">
                        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-[#10b981]/20">
                          <div className="card-body">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center space-x-2">
                              <span className="w-8 h-8 bg-[#10b981] rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                              </span>
                              <span>Pay via UPI</span>
                            </h3>
                            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-green-200 dark:border-green-800">
                              <img src={qrCodeUrl} alt="Payment QR" className="max-w-[200px] mx-auto mb-4 rounded-lg shadow-md" />
                              {upiId && (
                                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 break-all p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                  {upiId}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">Scan QR code with any UPI app</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pay via UPI Button - Opens OS chooser */}
                    {upiId && cartTotal > 0 && (
                      <div className="mb-6">
                        <button
                          onClick={handlePayViaUpi}
                          className="w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold bg-gradient-to-r from-[#10b981] to-[#059669] text-white hover:from-[#059669] hover:to-[#047857] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                          title="Pay with any UPI app"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span>Pay via UPI (Open with any app)</span>
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          Click to open your default UPI app with pre-filled payment details
                        </p>
                      </div>
                    )}

                    {/* Payment Upload */}
                    <form onSubmit={handleSubmitOrder} className="space-y-6">
                      <div>
                        <label className="form-label">
                          Upload Payment Screenshot <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="w-full file:mr-4 file:py-3 file:px-4 file:border-2 file:border-[#10b981]/20 file:text-sm file:font-semibold file:bg-[#10b981]/5 file:text-[#10b981] hover:file:bg-[#10b981]/10 file:rounded-xl"
                          />
                        </div>
                        {paymentScreenshot && (
                          <div className="mt-3 flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-green-800 dark:text-green-400 truncate">
                                {paymentScreenshot.name}
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-500">
                                {(paymentScreenshot.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Max 5MB (JPG, PNG)</p>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || cart.length === 0}
                        className="w-full btn-primary flex items-center justify-center space-x-2 py-3 text-lg shadow-lg hover:shadow-xl"
                      >
                        {submitting ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing Order...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Place Order</span>
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
