'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '@/firebase/auth';
import { getAllProducts, getCustomerAllPrices } from '@/firebase/firestore';

export default function PricesPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [customerPrices, setCustomerPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const user = getCurrentUser();
      if (!user) return;

      const [productsResult, pricesResult] = await Promise.all([
        getAllProducts(),
        getCustomerAllPrices(user.uid),
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (productId) => {
    if (customerPrices[productId]) {
      return customerPrices[productId];
    }
    const product = products.find((p) => p.id === productId);
    return product?.price || 0;
  };

  const hasCustomPrice = (productId) => {
    return !!customerPrices[productId];
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading prices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Prices</h1>
        <p className="text-gray-600 mt-1">Your personalized pricing for all products</p>
      </div>

      {products.length === 0 ? (
        <div className="card text-center py-16">
          <div className="mx-auto h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">No products available</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Products will appear here once the admin adds them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const price = getPrice(product.id);
            const custom = hasCustomPrice(product.id);

            return (
              <div key={product.id} className="product-card">
                {/* Product Image Placeholder */}
                <div className="product-card-img bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>

                <div className="product-card-body">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="product-card-title">{product.name}</h3>
                    {custom && (
                      <span className="badge badge-success flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Special</span>
                      </span>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{product.description}</p>
                  )}

                  <div className="bg-green-50 dark:bg-gray-700 rounded-lg p-3 border border-green-100 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Your Price</span>
                      <span className="product-card-price">{formatCurrency(price)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      / {product.unit || 'unit'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
