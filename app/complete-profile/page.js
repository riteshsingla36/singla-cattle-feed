'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getCurrentUser } from '@/firebase/auth';
import { getCustomerByPhone, updateCustomer } from '@/firebase/firestore';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  // New Address Fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [village, setVillage] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  
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
          const c = result.customer;
          
          // Check if all new required fields are present
          const isComplete = !!(
            c.addressLine1 && 
            c.village && 
            c.city && 
            c.pincode && 
            c.pincode.length === 6
          );

          if (isComplete) {
            router.push('/dashboard');
            return;
          }
          
          // Pre-fill existing fields
          if (c.addressLine1) setAddressLine1(c.addressLine1);
          if (c.addressLine2) setAddressLine2(c.addressLine2);
          if (c.village) setVillage(c.village);
          if (c.city) setCity(c.city);
          if (c.pincode) setPincode(c.pincode);
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

    if (!addressLine1.trim()) {
      setError('Please enter Address Line 1');
      return;
    }
    if (!village.trim()) {
      setError('Please enter Village/Area');
      return;
    }
    if (!city.trim()) {
      setError('Please enter City');
      return;
    }
    if (!pincode.trim() || pincode.length !== 6 || !pincode.startsWith('12')) {
      setError('Please enter a valid 6-digit Haryana Pincode (starts with 12)');
      return;
    }

    if (!customerId) return;

    setLoading(true);
    try {
      const result = await updateCustomer(customerId, {
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        village: village.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        state: 'Haryana',
        country: 'India',
        profileCompleted: true
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
            <img src="/logo.png" alt="Singla Traders" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Singla Traders</h1>
          <p className="text-sm text-gray-600 mt-1">Professional Billing & Distribution</p>
        </div>

        <div className="card p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[#10b981]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Complete Your Address</h2>
          <p className="text-sm text-gray-600 mb-8 text-center border-b pb-4">
            We've upgraded our billing system. Please provide your full address for accurate invoices.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="form-label">Address Line 1 (House/Shop No) *</label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="form-input"
                placeholder="e.g. Shop No. 12, Main Market"
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label">Address Line 2 (Landmark - Optional)</label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="form-input"
                placeholder="e.g. Near Bus Stand"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Village/Area *</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="form-input"
                  placeholder="Village name"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="form-label">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-input"
                  placeholder="City name"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Pincode *</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="form-input"
                  placeholder="e.g. 127021"
                  maxLength={6}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="form-label">State</label>
                <input type="text" value="Haryana" readOnly className="form-input bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
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
                  <span>Updating Profile...</span>
                </>
              ) : (
                <span>Save & Continue</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
