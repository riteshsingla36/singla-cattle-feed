'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { loginCustomer, logoutCustomer } from '@/firebase/auth';
import { getCustomerByPhone } from '@/firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid 10-digit Indian phone number');
      setIsLoading(false);
      return;
    }

    const result = await loginCustomer(phone, password);

    if (result.success) {
      const customerResult = await getCustomerByPhone(phone);

      if (!customerResult.success) {
        setError('Customer account not found');
        setIsLoading(false);
        return;
      }

      // Check if customer account is enabled
      if (customerResult.customer.isEnabled === false) {
        setError('Your account has been disabled. Please contact the administrator.');
        setIsLoading(false);
        // Logout the user who just logged in
        await logoutCustomer();
        return;
      }

      let adminStatus = false;
      if (customerResult.success) {
        adminStatus = !!customerResult.customer.isAdmin;
        localStorage.setItem('isAdmin', adminStatus ? 'true' : 'false');
      }

      if (adminStatus) {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">ST</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Singla Traders</h1>
          <p className="text-sm text-gray-600 mt-1">Premium Cattle Feed Distribution</p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-sm text-gray-600 mb-8">Sign in to your account to continue</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                disabled={isLoading}
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
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3 text-lg"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-[#10b981] hover:text-[#059669] font-semibold"
              >
                Create account
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
