'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getCurrentUser, changePassword } from '@/firebase/auth';
import { getCustomerByPhone, updateCustomer } from '@/firebase/firestore';

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Address fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [village, setVillage] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    loadProfile(currentUser);
  }, []);

  const loadProfile = async (currentUser) => {
    try {
      const phone = currentUser.email?.split('@')[0];
      if (!phone) return;

      const result = await getCustomerByPhone(phone);
      if (result.success && result.customer) {
        setCustomerId(result.id);
        const customer = result.customer;

        setAddressLine1(customer.addressLine1 || '');
        setAddressLine2(customer.addressLine2 || '');
        setVillage(customer.village || '');
        setCity(customer.city || '');
        setPincode(customer.pincode || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!addressLine1.trim()) {
      setProfileError('Address Line 1 is required');
      return;
    }
    if (!village.trim()) {
      setProfileError('Village/Area is required');
      return;
    }
    if (!city.trim()) {
      setProfileError('City is required');
      return;
    }
    if (!pincode.trim() || pincode.length !== 6 || !pincode.startsWith('12')) {
      setProfileError('Valid 6-digit Haryana Pincode (starts with 12) is required');
      return;
    }

    if (!customerId) return;

    setSavingProfile(true);
    setProfileError('');
    setProfileMessage('');

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
        setProfileMessage('Profile updated successfully!');
        setTimeout(() => setProfileMessage(''), 4000);
      } else {
        setProfileError(result.message || 'Failed to save profile');
      }
    } catch (error) {
      setProfileError('Failed to save profile: ' + error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setLoadingPassword(true);

    const result = await changePassword(newPassword);
    setLoadingPassword(false);

    if (result.success) {
      setPasswordMessage('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
    } else {
      setPasswordError(result.message || 'Failed to change password');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Account Info Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#10b981] to-[#059669] flex items-center justify-center text-white text-3xl font-bold">
            {user?.displayName?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user?.displayName}</h1>
            <p className="text-gray-500 font-medium">Phone: {user?.email?.split('@')[0]}</p>
          </div>
        </div>
      </div>

      {/* Structured Address Section */}
      <div className="card">
        <div className="card-header border-b border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Delivery Address Details</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ensure your address is accurate for professional billing and timely delivery.
          </p>
        </div>

        <div className="card-body p-6 space-y-5">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="form-label">Address Line 1 (House/Shop No) *</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Shop No. 12, Main Market"
                />
              </div>
              <div className="space-y-2">
                <label className="form-label">Address Line 2 (Optional Landmark)</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Near New High School"
                />
              </div>
              <div className="space-y-2">
                <label className="form-label">Village / Locality *</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="form-input"
                  placeholder="Enter village"
                />
              </div>
              <div className="space-y-2">
                <label className="form-label">City / Town *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-input"
                  placeholder="Enter city"
                />
              </div>
              <div className="space-y-2">
                <label className="form-label">Pincode *</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="form-input"
                  placeholder="6-digit Pincode (starts with 12)"
                />
              </div>
              <div className="space-y-2">
                <label className="form-label">State / Country</label>
                <div className="grid grid-cols-2 gap-2">
                   <input type="text" value="Haryana" readOnly className="form-input bg-gray-50 text-gray-500 cursor-not-allowed" />
                   <input type="text" value="India" readOnly className="form-input bg-gray-50 text-gray-500 cursor-not-allowed" />
                </div>
              </div>
           </div>

           {profileMessage && (
             <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-800 text-sm flex items-center space-x-2">
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
               </svg>
               <span>{profileMessage}</span>
             </div>
           )}
           {profileError && (
             <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800 text-sm flex items-center space-x-2">
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
               </svg>
               <span>{profileError}</span>
             </div>
           )}

           <button
             onClick={handleSaveProfile}
             disabled={savingProfile}
             className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 px-8 py-3"
           >
             {savingProfile ? (
               <>
                 <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <span>Saving Profile...</span>
               </>
             ) : (
               <>
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                 </svg>
                 <span>Save Address Updates</span>
               </>
             )}
           </button>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="card">
        <div className="card-header border-b border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Security & Password</h2>
          </div>
        </div>

        <div className="card-body p-6">
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            {passwordMessage && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-800 text-sm">
                {passwordMessage}
              </div>
            )}
            {passwordError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800 text-sm">
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingPassword}
              className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 px-8 py-3"
            >
              {loadingPassword ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
