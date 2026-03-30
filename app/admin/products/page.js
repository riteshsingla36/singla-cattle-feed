'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  setCustomerPrice,
  getAllCustomerPricesForProduct,
} from '@/firebase/firestore';

export default function ProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: '40kg',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const result = await getAllProducts();
      if (result.success) {
        setProducts(result.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to adjust all custom prices by the same delta
  const adjustCustomPrices = async (productId, priceDelta) => {
    if (priceDelta === 0) return; // No adjustment needed

    try {
      // Get all customer prices for this product
      const result = await getAllCustomerPricesForProduct(productId);
      if (!result.success) return;

      const { prices } = result;
      const adjustmentPromises = [];

      // For each customer with a custom price, adjust it
      Object.entries(prices).forEach(([customerId, currentPrice]) => {
        const newPrice = currentPrice + priceDelta;
        // Ensure price doesn't go negative
        const finalPrice = Math.max(0, newPrice);
        adjustmentPromises.push(setCustomerPrice(customerId, productId, finalPrice));
      });

      await Promise.all(adjustmentPromises);
    } catch (error) {
      console.error('Error adjusting custom prices:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return;
    }

    try {
      const newPrice = parseFloat(formData.price);
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: newPrice,
        unit: formData.unit || '40kg',
      };

      let result;

      if (editingProduct) {
        // Calculate price delta for custom price adjustment
        const oldPrice = editingProduct.price || 0;
        const priceDelta = newPrice - oldPrice;

        // Update product
        result = await updateProduct(editingProduct.id, productData);

        // If price changed, adjust all custom prices by the same delta
        if (result.success && priceDelta !== 0) {
          await adjustCustomPrices(editingProduct.id, priceDelta);
          setMessage(`Product updated successfully. Custom prices adjusted by ₹${priceDelta}`);
        } else if (result.success) {
          setMessage('Product updated successfully');
        }
      } else {
        result = await addProduct(productData);
        if (result.success) {
          setMessage('Product added successfully');
        }
      }

      if (result.success) {
        fetchProducts();
        resetForm();
        setTimeout(() => setMessage(''), 5000);
      } else {
        setError(result.error || 'Failed to save product');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      unit: product.unit || '40kg',
    });
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const result = await deleteProduct(productId);
    if (result.success) {
      fetchProducts();
    } else {
      alert('Failed to delete product: ' + result.error);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      unit: '40kg',
    });
    setShowModal(false);
    setError('');
    setMessage('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('allProducts')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('manageProductCatalogue')}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('addProduct')}</span>
        </button>
      </div>

      {message && (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">
            <div className="spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="empty-state-title">{t('noProductsYet')}</h3>
            <p className="empty-state-description">{t('getStartedProducts')}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th>{t('productName')}</th>
                    <th>{t('description')}</th>
                    <th>{t('price')}</th>
                    <th className="text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="table-row">
                      <td className="font-semibold text-gray-900 dark:text-gray-100">
                        {product.name}
                      </td>
                      <td className="text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {product.description || '-'}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-bold text-[#10b981]">{formatCurrency(product.price)}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">/{product.unit || 'bag'}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {products.map((product) => (
                <div key={product.id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        /{product.unit || 'bag'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#10b981] text-xl">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                      {product.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleEdit(product)}
                      className="inline-flex items-center px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="inline-flex items-center px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {editingProduct ? t('editProduct') : t('addProduct')}
              </h2>
              <button onClick={resetForm} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">{t('productName')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">{t('description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                  rows={3}
                />
              </div>

              <div>
                <label className="form-label">{t('price')} (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">{t('unitBagWeight')}</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="form-input"
                >
                  <option value="40kg">40 kg</option>
                  <option value="45kg">45 kg</option>
                  <option value="50kg">50 kg</option>
                  <option value="kg">kg (loose)</option>
                  <option value="ton">ton</option>
                  <option value="piece">piece</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded">
                  {message}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  {t('save')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
