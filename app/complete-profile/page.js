'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '@/firebase/auth';
import { getCustomerByPhone, updateCustomer } from '@/firebase/firestore';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [village, setVillage] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [customerId, setCustomerId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const phone = user.email?.split('@')[0];
        if (!phone) {
          router.push('/dashboard');
          return;
        }

        const result = await getCustomerByPhone(phone);
        if (result.success && result.customer) {
          setCustomerId(result.id);
          // If village & city already exist, skip to dashboard
          if (result.customer.village && result.customer.city) {
            router.push('/dashboard');
            return;
          }
          // Pre-fill if partially set
          if (result.customer.village) setVillage(result.customer.village);
          if (result.customer.city) setCity(result.customer.city);
        } else {
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        router.push('/dashboard');
        return;
      }

      setPageLoading(false);
    };
    init();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!village.trim()) {
      setError('Please enter your village name');
      return;
    }

    if (!city.trim()) {
      setError('Please enter your city name');
      return;
    }

    if (!customerId) return;

    setLoading(true);
    try {
      const result = await updateCustomer(customerId, {
        village: village.trim(),
        city: city.trim(),
      });

      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to save. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
            <img src="/logo.png" alt="Singla Traders" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Singla Traders</h1>
          <p className="text-sm text-gray-600 mt-1">Premium Cattle Feed Distribution</p>
        </div>

        {/* Complete Profile Card */}
        <div className="card p-8">
          {/* Success checkmark */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[#10b981]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Account Created!</h2>
          <p className="text-sm text-gray-600 mb-8 text-center">
            Just one more step — tell us your village and city so we can serve you better.
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="village" className="form-label">
                Village
              </label>
              <input
                id="village"
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="form-input"
                placeholder="Enter your village name"
                disabled={loading}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="city" className="form-label">
                City
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="form-input"
                placeholder="Enter your city name"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3 text-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save & Continue</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
              disabled={loading}
            >
              Skip for now
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          You can always update this from your Profile page.
        </p>
      </div>
    </div>
  );
}
