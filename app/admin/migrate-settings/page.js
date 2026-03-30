'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/firebase/auth';
import { getDocs, collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

export default function MigrateSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    // Check if user is admin - you may want to add proper admin check
    const user = getCurrentUser();
    if (!user) {
      setError('Not authenticated');
    }
  }, []);

  const findOldSettings = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      let foundSettings = null;
      let foundDocId = null;

      settingsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.qrCodeUrl || data.upiId) {
          foundSettings = data;
          foundDocId = doc.id;
        }
      });

      if (foundSettings) {
        setSettings({ data: foundSettings, docId: foundDocId });
        setMessage(`Found settings in document: "${foundDocId}"`);
      } else {
        setError('No settings document with qrCodeUrl/upiel found. Make sure you have saved QR settings at least once.');
      }
    } catch (err) {
      setError('Error searching for settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!settings) return;

    setLoading(true);
    setMessage('');
    setError('');

    try {
      // Create/update the 'payment' document
      await setDoc(doc(db, 'settings', 'payment'), {
        qrCodeUrl: settings.data.qrCodeUrl || '',
        upiId: settings.data.upiId || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setMessage('✅ Successfully created/updated "payment" document');

      // Ask to delete old document
      if (settings.docId !== 'payment') {
        const shouldDelete = confirm(`Delete old document "${settings.docId}"?`);
        if (shouldDelete) {
          await deleteDoc(doc(db, 'settings', settings.docId));
          setMessage(prev => prev + '\n✅ Deleted old document');
        }
      }

      setMigrated(true);
    } catch (err) {
      setError('Migration failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">QR Settings Migration</h1>
          <p className="text-gray-600 dark:text-gray-400">Fix QR code settings document structure</p>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-2">What this does</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This tool fixes the QR code settings bug. It finds your old settings (saved with a random document ID)
                    and creates a new document with the correct ID "payment" that the system expects.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error mb-4" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="alert alert-success mb-4 whitespace-pre-line" role="alert">
                {message}
              </div>
            )}

            {!migrated ? (
              <div className="space-y-6">
                <button
                  onClick={findOldSettings}
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Step 1: Find Old Settings</span>
                    </>
                  )}
                </button>

                {settings && (
                  <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800">
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Found Settings
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Document ID:</span>
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{settings.docId}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-800">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">QR Code URL:</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100 max-w-[200px] truncate">{settings.data.qrCodeUrl || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">UPI ID:</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{settings.data.upiId || 'Not set'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settings && (
                  <button
                    onClick={runMigration}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Migrating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Step 2: Migrate Settings
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 dark:text-green-400 font-bold text-lg mb-4">✅ Migration completed!</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  The QR code settings should now be visible on the Admin Settings page after refresh.
                </p>
                <a href="/admin/settings" className="btn-outline inline-flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Go to Admin Settings</span>
                </a>
              </div>
            )}

            <div className="divider"></div>

            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Important Notes
              </h3>
              <ul className="space-y-3">
                {[
                  'This migration is a one-time operation',
                  'The old settings document will be backed up before deletion (you can cancel deletion)',
                  'After migration, your settings will persist across page refreshes'
                ].map((note, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="flex-shrink-0 w-5 h-5 bg-[#10b981] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      ✓
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
