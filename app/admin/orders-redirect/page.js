'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function OrderRedirectPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [countingDown, setCountingDown] = useState(5);
  const [appOpened, setAppOpened] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const appUrl = `st://admin/orders?orderId=${orderId}`;
    const fallbackUrl = `/admin/orders?orderId=${orderId}`;

    // Use hidden iframe — Android Chrome allows opening custom schemes
    // via iframe more reliably than window.location
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = appUrl;
    document.body.appendChild(iframe);

    // Fallback: if app doesn't open within 3 seconds, redirect to browser
    const timer = setTimeout(() => {
      window.location.href = fallbackUrl;
    }, 3000);

    return () => {
      clearTimeout(timer);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Invalid Link
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No order ID provided.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block px-6 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669]"
          >
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
            <svg
              className="w-8 h-8 text-[#10b981]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Open in App
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This order is being opened in your Singla Traders app.
          </p>

          {countingDown > 0 && !appOpened && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Opening Singla Traders app... If the app doesn&apos;t open automatically, you will be redirected to the web version in{' '}
                <span className="font-semibold text-[#10b981]">{countingDown}</span> seconds.
              </p>
            </div>
          )}

          {appOpened && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-4">
              The app is opening! If it doesn&apos;t appear, check your device.
            </p>
          )}

          {/* Fallback link */}
          <Link
            href={`/admin/orders?orderId=${orderId}`}
            className="inline-flex items-center px-6 py-3 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] font-medium transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open in Browser Instead
          </Link>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Order ID: {orderId.substring(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
}
