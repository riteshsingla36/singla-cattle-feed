'use client';

import { useState, useEffect } from 'react';
import { getQRCodeSettings, setQRCodeSettings } from '@/firebase/firestore';

export default function AdminSettingsPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const result = await getQRCodeSettings();
      if (result.success) {
        setQrCodeUrl(result.settings.qrCodeUrl || '');
        setUpiId(result.settings.upiId || '');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const result = await setQRCodeSettings(qrCodeUrl, upiId);

    setSaving(false);

    if (result.success) {
      setMessage('Payment settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payment Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure your payment integration</p>
      </div>

      <div className="card card-gradient">
        <div className="card-header">
          <h2 className="card-title dark:text-gray-100">QR Code & UPI Configuration</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Settings displayed on the checkout page</p>
        </div>
        <div className="card-body">
          {message && (
            <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-error'}`} role="alert">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label">QR Code Image URL</label>
              <input
                type="url"
                required
                value={qrCodeUrl}
                onChange={(e) => setQrCodeUrl(e.target.value)}
                className="form-input"
                placeholder="https://example.com/qr-code.png"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Upload your QR code to Firebase Storage or any image hosting service and paste the URL here
              </p>
              {qrCodeUrl && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Preview:</p>
                  <div className="flex justify-center p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code Preview"
                      className="max-w-[200px] max-h-[200px] rounded-lg shadow-sm"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden items-center justify-center h-48 w-48 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">UPI ID</label>
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="form-input"
                placeholder="merchant@upi"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your UPI ID (e.g., yourname@okaxis, yourname@paytm, etc.)
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center justify-center space-x-2 w-full"
            >
              {saving ? (
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
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Help Section */}
      <div className="card">
        <div className="card-body">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to upload QR code
          </h3>
          <ol className="space-y-3">
            {[
              'Generate your UPI QR code using any UPI app',
              'Take a screenshot or save the QR code image',
              'Go to Firebase Console → Storage',
              'Create folder payments/ (if it does not exist)',
              'Upload your QR code image',
              'Copy the download URL from the uploaded file',
              'Paste the URL in the field above'
            ].map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 bg-[#10b981] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
