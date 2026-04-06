'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function routeFromNotification(data, router) {
  const { type, orderId } = data;

  if ((type === 'order-placed' || type === 'order') && orderId) {
    router.push(`/admin/orders?orderId=${orderId}`);
  } else if (type === 'payment' || type === 'payment-confirmation') {
    router.push('/admin/dashboard');
  } else {
    router.push('/admin/dashboard');
  }
}

function processNotificationData(data, router) {
  if (data && typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return; }
  }
  if (data && data.type) {
    routeFromNotification(data, router);
  }
}

export function NotificationHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const readyRef = useRef(false);
  const processedRef = useRef(null);

  // Poll for window.__notificationClickedData and __notificationTargetPath set by RN
  useEffect(() => {
    const poll = setInterval(() => {
      if (window.__notificationTargetPath) {
        const targetPath = window.__notificationTargetPath;
        window.__notificationTargetPath = null;
        console.log('📲 Detected __notificationTargetPath via poll:', targetPath);
        router.push(targetPath);
        return;
      }
      if (window.__notificationClickedData) {
        console.log('📲 Detected __notificationClickedData via poll');
        const data = window.__notificationClickedData;
        window.__notificationClickedData = null;
        if (data && (!processedRef.current || processedRef.current.orderId !== data.orderId)) {
          processedRef.current = data;
          processNotificationData(data, router);
        }
      }
    }, 300);

    return () => clearInterval(poll);
  }, [router, pathname]);

  // Also handle click events from foreground notifications
  useEffect(() => {
    readyRef.current = true;
    const handleClick = (event) => {
      const data = event.detail;
      console.log('📲 NotificationClicked event received:', data);

      if (data && (!processedRef.current || processedRef.current.orderId !== data.orderId)) {
        processedRef.current = data;
        processNotificationData(data, router);
      }
    };

    window.addEventListener('NotificationClicked', handleClick);
    return () => { readyRef.current = false; window.removeEventListener('NotificationClicked', handleClick); };
  }, [router, pathname]);

  // Check initial window.__notificationClickedData on mount
  useEffect(() => {
    if (window.__notificationClickedData) {
      console.log('📲 Processing stored notification on mount:', window.__notificationClickedData);
      processedRef.current = window.__notificationClickedData;
      processNotificationData(window.__notificationClickedData, router);
      window.__notificationClickedData = null;
    }
  }, [router]);
}
