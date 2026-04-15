'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAllCustomers,
  getAllProducts,
  getCustomerPrice,
  setCustomerPrice,
  getCustomerAllPrices,
} from '@/firebase/firestore';

export default function PricesPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerUserId, setSelectedCustomerUserId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [customerPrices, setCustomerPrices] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersResult, productsResult] = await Promise.all([
        getAllCustomers(),
        getAllProducts(),
      ]);

      if (customersResult.success) {
        // Filter out admins from the price management list
        const filteredCustomers = (customersResult.customers || []).filter(c => !c.isAdmin);
        setCustomers(filteredCustomers);
      }

      if (productsResult.success) {
        setProducts(productsResult.products);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerPrices = async (customerId) => {
    if (!customerId) return;

    const result = await getCustomerAllPrices(customerId);
    if (result.success) {
      setCustomerPrices(result.prices);
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customerId);
      setSelectedCustomerUserId(customer.userId || customerId);
      setSelectedProduct('');
      setPrice('');
      fetchCustomerPrices(customer.userId || customerId);
    }
  };

  const handleProductChange = async (productId) => {
    if (!productId || !selectedCustomerUserId) return;

    setSelectedProduct(productId);
    setError('');
    setMessage('');

    const result = await getCustomerPrice(selectedCustomerUserId, productId);
    if (result.success) {
      setPrice(result.price.toString());
    } else {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setPrice(product.price.toString());
      } else {
        setPrice('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!selectedCustomer || !selectedCustomerUserId) {
      setError('Please select a customer');
      return;
    }

    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setSaving(true);

    const result = await setCustomerPrice(selectedCustomerUserId, selectedProduct, parseFloat(price));

    setSaving(false);

    if (result.success) {
      setMessage('Price saved successfully!');
      fetchCustomerPrices(selectedCustomerUserId);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setError('Failed to save price');
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
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('priceManagement')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('setCustomPricesDescription')}
        </p>
      </div>

      {message && (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left sidebar - Customer list */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <div className="card-header">
              <h2 className="card-title dark:text-gray-100">{t('selectCustomer')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('chooseCustomerSetPrices')}
              </p>
            </div>
            <div className="card-body p-0">
              {customers.length === 0 ? (
                <div className="empty-state py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('noCustomersAvailable')}
                  </p>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-2 max-h-[500px] overflow-y-auto">
                  {customers.map((customer) => {
                    const isSelected = selectedCustomer === customer.id;

                    return (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerChange(customer.id)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-[#10b981] bg-[#10b981]/5 dark:bg-green-900/30 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {customer.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {customer.phone}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="bg-[#10b981] text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {t('selected')}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="mt-3 text-sm font-medium text-[#10b981] dark:text-green-400 flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            {Object.keys(customerPrices).length} {t('customPricesSet')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Price setting form */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title dark:text-gray-100">
                  {t('setCustomPriceFor')}{' '}
                  <span className="text-[#10b981]">
                    {customers.find((c) => c.id === selectedCustomer)?.name}
                  </span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('configurePricingCustomer')}
                </p>
              </div>
              <div className="card-body space-y-6">
                <form onSubmit={handleSubmit}>
                  {/* Product selection */}
                  <div>
                    <label className="form-label">{t('productName')}</label>
                    <select
                      value={selectedProduct}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="form-input"
                    >
                      <option value="">{t('selectProduct')}</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({t('standardPrice')}:{' '}
                          {formatCurrency(product.price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom price input */}
                  {selectedProduct && (
                    <div>
                      <label className="form-label">{t('yourPrice')}</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="form-input"
                        placeholder={t('enterCustomPrice')}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('priceInsteadStandard')}
                      </p>
                    </div>
                  )}

                  {/* Price summary card */}
                  {selectedProduct && price && (
                    <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800">
                      <div className="p-6">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          {t('priceSummary')}
                        </h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-3 border-b border-blue-200 dark:border-blue-800">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('customer')}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {customers.find((c) => c.id === selectedCustomer)?.name}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-blue-200 dark:border-blue-800">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('product')}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {products.find((p) => p.id === selectedProduct)?.name}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-blue-200 dark:border-blue-800">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('standardPrice')}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                products.find((p) => p.id === selectedProduct)
                                  ?.price
                              )}/{products.find((p) => p.id === selectedProduct)?.unit || 'bag'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              {t('yourCustomPrice')}
                            </span>
                            <span className="text-2xl font-bold text-[#10b981]">
                              {formatCurrency(parseFloat(price) || 0)}
                            </span>
                          </div>
                          {parseFloat(price) < parseFloat(products.find((p) => p.id === selectedProduct)?.price) && (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="font-medium">{t('discountApplied')}</span>
                            </div>
                          )}
                          {parseFloat(price) > parseFloat(products.find((p) => p.id === selectedProduct)?.price) && (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="font-medium">
                                {t('higherThanStandard')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={saving || !selectedProduct}
                    className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Save Price</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-4">&lt;-</div>
                  <p className="dark:text-gray-300">
                    Select a customer from the left to set custom prices
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Existing custom prices table */}
          {selectedCustomer && Object.keys(customerPrices).length > 0 && (
            <div className="card mt-8">
              <div className="card-header">
                <div>
                  <h2 className="card-title dark:text-gray-100">
                    Current Custom Prices
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    for <span className="font-semibold text-[#10b981]">
                      {customers.find((c) => c.id === selectedCustomer)?.name}
                    </span>
                  </p>
                </div>
                <div className="badge badge-primary">
                  {Object.keys(customerPrices).length} products
                </div>
              </div>
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-head">
                      <tr>
                        <th>Product</th>
                        <th className="text-right">Standard Price</th>
                        <th className="text-right">Your Custom Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(customerPrices).map(([productId, customPrice]) => {
                        const product = products.find((p) => p.id === productId);
                        if (!product) return null;
                        const isDiscount = customPrice < product.price;

                        return (
                          <tr key={productId} className="table-row">
                            <td className="font-medium text-gray-900 dark:text-gray-100">
                              {product.name}
                            </td>
                            <td className="text-right text-gray-500 dark:text-gray-400">
                              {formatCurrency(product.price)}/{product.unit || 'bag'}
                            </td>
                            <td className="text-right">
                              <span
                                className={`font-bold text-lg ${
                                  isDiscount
                                    ? 'text-[#10b981]'
                                    : 'text-blue-600 dark:text-blue-400'
                                }`}
                              >
                                {formatCurrency(customPrice)}
                              </span>
                              {isDiscount && (
                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400 rounded-full">
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Discount
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
