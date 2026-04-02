'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function UpiRedirectPage() {
  const searchParams = useSearchParams();
  const upiLink = searchParams.get('upiLink') || '';
  const upiId = searchParams.get('upiId') || '';
  const amount = searchParams.get('amount') || '';
  const payeeName = searchParams.get('payeeName') || 'Singla Traders';
  const appName = searchParams.get('app') || 'Payment App';

  const [countingDown, setCountingDown] = useState(5);
  const [appOpened, setAppOpened] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!upiLink) {
      return;
    }

    // Use a more reliable method to trigger UPI intent
    // Create a temporary anchor element and click it
    const triggerUpiLink = () => {
      const anchor = document.createElement('a');
      anchor.href = upiLink;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      // Append to body, click, and then remove
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    };

    // Try to trigger immediately
    setTimeout(() => {
      triggerUpiLink();
    }, 100);

    // Listen for visibility changes to detect if app opened
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User came back - app was probably opened
        setAppOpened(true);
        setShowFallback(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Countdown to show fallback UI if app doesn't open
    const timer = setInterval(() => {
      setCountingDown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // If page is still visible, app didn't open
          if (!document.hidden) {
            setShowFallback(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [upiLink]);

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      alert('UPI ID copied!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = upiId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('UPI ID copied!');
    }
  };

  if (!upiLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Request</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">No payment link provided.</p>
          <Link href="/" className="px-6 py-3 bg-[#10b981] text-white rounded-lg hover:bg-[#059669]">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Opening {appName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please wait...
          </p>

          {!showFallback && countingDown > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                If {appName} doesn&apos;t open automatically, manual options will appear in {countingDown} seconds
              </p>
            </div>
          )}

          {appOpened && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-600 dark:text-green-400">
                {appName} opened! Complete your payment and return here.
              </p>
            </div>
          )}

          {showFallback && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {appName} didn&apos;t open automatically. Use the options below to pay manually.
              </p>
            </div>
          )}
        </div>

        {showFallback && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Payment Details</h3>

              {amount && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-[#10b981]">
                    ₹{parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {upiId && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">UPI ID</p>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{upiId}</p>
                    <button
                      onClick={handleCopyUpiId}
                      className="ml-2 p-2 text-gray-500 hover:text-[#10b981] dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                      title="Copy UPI ID"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">Payee: {payeeName}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.href = upiLink}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium bg-[#5F2BEA] text-white hover:bg-[#4a22b8]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Retry Opening {appName}</span>
              </button>

              <Link
                href={appName === 'Google Pay' ? 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user' :
                       appName === 'PhonePe' ? 'https://play.google.com/store/apps/details?id=com.phonepe.app' :
                       appName === 'Paytm' ? 'https://play.google.com/store/apps/details?id=net.one97.paytm' : '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Download {appName}</span>
              </Link>

              <Link
                href="/"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Go Back</span>
              </Link>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Or use any UPI app to pay by entering the UPI ID above.
              </p>
            </div>
          </div>
        )}

        {showFallback && (
          <div className="mt-4 text-xs text-gray-400">
            Order ID: {searchParams.get('tr')?.substring(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}
