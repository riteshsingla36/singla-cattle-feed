'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { registerCustomer, getCurrentUser, logoutCustomer } from '@/firebase/auth';
import { addCustomer, getCustomerByPhone } from '@/firebase/firestore';
import { validatePhone, validatePassword } from '@/lib/validations';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const user = getCurrentUser();
      if (user) {
        // User already logged in, redirect to appropriate dashboard
        try {
          const email = user.email;
          if (email) {
            const phone = email.split('@')[0];
            if (phone) {
              const customerResult = await getCustomerByPhone(phone);
              if (customerResult.success) {
                const isAdmin = !!customerResult.customer.isAdmin;
                const isEnabled = customerResult.customer.isEnabled !== false;
                if (!isEnabled) {
                  await logoutCustomer();
                  return;
                }
                if (isAdmin) {
                  router.push('/admin/dashboard');
                } else {
                  router.push('/dashboard');
                }
              } else {
                await logoutCustomer();
              }
            } else {
              await logoutCustomer();
            }
          }
        } catch (err) {
          console.error('Auth check error:', err);
          await logoutCustomer();
        }
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Please enter a valid 10-digit Indian phone number');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await registerCustomer(phone, password, name);

      if (result.success) {
        // Use auth UID as Firestore doc ID so FCM token subcollection stays in sync
        const customerResult = await addCustomer(
          { name, phone, isAdmin: false, currentSessionId: crypto.randomUUID() },
          result.user.uid
        );

        if (customerResult.success) {
          setLoading(false);
          router.push('/dashboard');
        } else {
          setError('Failed to create customer profile: ' + (customerResult.error || 'Unknown error'));
          console.error('Firestore error:', customerResult.error);
          setLoading(false);
        }
      } else {
        setError(result.message);
        setLoading(false);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
      setLoading(false);
    }
  };

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

        {/* Register Card */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-sm text-gray-600 mb-8">Join us as a customer and start ordering</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="phone" className="form-label">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="form-input"
                placeholder="10-digit mobile number"
                maxLength={10}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="At least 6 characters"
                minLength={6}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Confirm your password"
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
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-[#10b981] hover:text-[#059669] font-semibold"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2024 Singla Traders. All rights reserved.
        </p>
      </div>
    </div>
  );
}
