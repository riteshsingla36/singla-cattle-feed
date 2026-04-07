'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getCurrentUser, changePassword } from '@/firebase/auth';
import { getCustomerByPhone, updateCustomer } from '@/firebase/firestore';
import dynamic from 'next/dynamic';

// Load map with explicit error handling so next/dynamic chunk failures are visible
const MapLoaded = dynamic(
  () => import('@/components/MapSection').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading map (stuck? check console)...</p>
        </div>
      </div>
    ),
  },
);

// Reverse geocode using Nominatim (free, no API key)
let lastGeocodeTime = 0;
async function reverseGeocode(lat, lng, setAddress) {
  const now = Date.now();
  if (now - lastGeocodeTime < 1000) return; // throttle: max 1 call/sec (Nominatim limit)
  lastGeocodeTime = now;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'SinglaTraders/1.0' } }
    );
    const data = await res.json();
    if (data && data.display_name) {
      setAddress(data.display_name);
    }
  } catch (err) {
    console.error('Reverse geocode error:', err);
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map state
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [mapKey, setMapKey] = useState(0); // used to force map re-center
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState('');
  const [addressError, setAddressError] = useState('');
  const [locating, setLocating] = useState(false);

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

  // Listen for map click events from the MapSection component
  useEffect(() => {
    const handler = (e) => {
      setPosition(e.detail);
      reverseGeocode(e.detail.lat, e.detail.lng, setAddress);
    };
    window.addEventListener('map-click', handler);
    return () => window.removeEventListener('map-click', handler);
  }, []);

  // Listen for marker drag events
  useEffect(() => {
    const handler = (e) => {
      setPosition(e.detail);
      reverseGeocode(e.detail.lat, e.detail.lng, setAddress);
    };
    window.addEventListener('marker-drag', handler);
    return () => window.removeEventListener('marker-drag', handler);
  }, []);

  const loadProfile = async (currentUser) => {
    try {
      const phone = currentUser.email?.split('@')[0];
      if (!phone) return;

      const result = await getCustomerByPhone(phone);
      if (result.success && result.customer) {
        setCustomerId(result.id);
        const customer = result.customer;

        if (customer.deliveryLat && customer.deliveryLng) {
          setPosition({ lat: customer.deliveryLat, lng: customer.deliveryLng });
          if (customer.deliveryAddress) {
            setAddress(customer.deliveryAddress);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSelect = (result) => {
    setMapKey((k) => k + 1); // force map to re-render centered on new location
    setPosition({ lat: result.lat, lng: result.lng });
    setAddress(result.address);
  };

  const handleUseMyLocation = () => {
    // Detect if running inside Android WebView (react-native-webview)
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const isReactNativeWebView = typeof window !== 'undefined' && window.ReactNativeWebView !== undefined;

    if (isAndroid && isReactNativeWebView) {
      // Request location from the native Android app via custom URL scheme
      setLocating(true);

      // Set up handlers that the native app will call via injectJavaScript
      window.__handleNativeLocation = (lat, lng) => {
        setMapKey((k) => k + 1);
        setPosition({ lat, lng });
        reverseGeocode(lat, lng, setAddress);
        setLocating(false);
      };

      window.__handleNativeLocationError = (message) => {
        setAddressError(message || 'Unable to get your location');
        setLocating(false);
      };

      // Trigger native location request
      window.location.href = 'singlafeed://native-location-request';
      return;
    }

    // Browser / iOS WebView: use standard geolocation API
    if (!navigator.geolocation) {
      setAddressError('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapKey((k) => k + 1); // force map to re-render centered
        setPosition(newPos);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude, setAddress);
        setLocating(false);
      },
      (err) => {
        setAddressError('Unable to get your location. Please enable location services.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSaveAddress = async () => {
    if (!position) {
      setAddressError('Please select a location on the map');
      return;
    }
    if (!customerId) return;

    setSavingAddress(true);
    setAddressError('');
    setAddressMessage('');

    try {
      const result = await updateCustomer(customerId, {
        deliveryLat: position.lat,
        deliveryLng: position.lng,
        deliveryAddress: address,
      });

      if (result.success) {
        setAddressMessage('Delivery address saved successfully!');
        setTimeout(() => setAddressMessage(''), 4000);
      } else {
        setAddressError(result.message || 'Failed to save address');
      }
    } catch (error) {
      setAddressError('Failed to save address: ' + error.message);
    } finally {
      setSavingAddress(false);
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
    <div className="space-y-8">
      {/* Delivery Address Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Delivery Address</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Drop a pin on the map to set your delivery location
          </p>
        </div>

        <div className="card-body">
          {/* Map */}
          <div
            className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-4"
            style={{ height: 320 }}
          >
            <MapLoaded key={mapKey} position={position} onSelect={handleSearchSelect} />
          </div>

          {/* Use My Location Button */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="mb-4 flex items-center space-x-2 px-4 py-2 bg-[#10b981]/10 text-[#10b981] rounded-lg hover:bg-[#10b981]/20 transition-colors disabled:opacity-50"
          >
            {locating ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{locating ? 'Locating...' : 'Use My Location'}</span>
          </button>

          {/* Address Display */}
          {address && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Detected Address:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{address}</p>
            </div>
          )}

          {/* Messages */}
          {addressMessage && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 text-sm">
              {addressMessage}
            </div>
          )}
          {addressError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm">
              {addressError}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveAddress}
            disabled={savingAddress || !position}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            {savingAddress ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                <span>Save Delivery Address</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 mt-2">
            Tap the map to drop a pin, or drag the pin to adjust your location.
          </p>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Change Password</h2>
          </div>
        </div>

        <div className="card-body">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your new password must be at least 6 characters long.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div>
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

            <div>
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

            {passwordMessage && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 text-sm">
                {passwordMessage}
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm">
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingPassword}
              className="btn-primary flex items-center justify-center space-x-2"
            >
              {loadingPassword ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Updating...</span>
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
