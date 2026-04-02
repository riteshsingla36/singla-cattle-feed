'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminId, subscribeToNotifications, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, formatRelativeTime } from '@/lib/notifications';

// Simple beep sound (base64 encoded short audio)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU';

export default function NotificationBell({ onNotificationClick }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const dropdownRef = useRef(null);
  const soundRef = useRef(null);

  // Get admin ID
  const [adminId, setAdminId] = useState(null);

  useEffect(() => {
    const initId = async () => {
      const id = await getAdminId();
      setAdminId(id);
      await fetchNotifications(id);
    };
    initId();
  }, []);

  // Load initial notifications
  const fetchNotifications = async (id) => {
    try {
      const result = await getNotifications(id);
      if (result.success) {
        // Only show unread notifications
        const unreadOnly = result.notifications.filter((n) => !n.isRead);
        setNotifications(unreadOnly);
        setUnreadCount(unreadOnly.length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!adminId) return;

    const unsubscribe = subscribeToNotifications(adminId, (newNotification) => {
      // Add to top of notifications list
      setNotifications((prev) => [newNotification, ...prev.slice(0, 19)]); // Keep max 20
      setUnreadCount((prev) => prev + 1);

      // Play notification sound
      playNotificationSound(newNotification.type);

      // Show desktop push notification if page is not focused and permission granted
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted' && document.hidden) {
          const desktopNotif = new Notification('New Payment Upload', {
            body: newNotification.message,
            icon: '/favicon.ico', // You can customize this
            requireInteraction: true,
            silent: false, // Let the browser play its own sound too
          });

          desktopNotif.onclick = () => {
            window.focus();
            desktopNotif.close();
          };
        } else if (Notification.permission === 'default') {
          // Request permission on first notification if not asked yet
          Notification.requestPermission();
        }
      }
    });

    return () => unsubscribe();
  }, [adminId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sound configuration: different tones for different notification types
  const soundConfig = {
    payment_screenshot_uploaded: { frequency: 880, duration: 200 }, // High pleasant beep
    default: { frequency: 660, duration: 150 },
  };

  const playNotificationSound = (type = 'default') => {
    try {
      // Use Web Audio API to generate tone (no external file needed)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const config = soundConfig[type] || soundConfig.default;
      oscillator.frequency.value = config.frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (config.duration / 1000));

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + (config.duration / 1000));
    } catch (error) {
      // Audio not supported or blocked, ignore
      console.log('Could not play notification sound:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id, adminId);
      // Remove the notification from the list
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      setUnreadCount((prev) => prev - 1);
    }

    // If parent callback provided (for backward compatibility), use it
    if (onNotificationClick && notification.orderId) {
      onNotificationClick(notification.orderId);
    } else if (notification.orderId) {
      // Navigate to orders page with the orderId - the orders page will open the modal automatically
      router.push(`/admin/orders?orderId=${notification.orderId}`);
    }

    // Close dropdown
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const result = await markAllNotificationsAsRead(adminId);
      if (result.success) {
        // Clear all notifications from the list
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    // Refresh notifications when opening
    if (!isOpen && adminId) {
      fetchNotifications(adminId);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-[#10b981] dark:hover:text-green-400 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="text-sm text-[#10b981] hover:text-[#059669] dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
              >
                {markingAllRead ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 max-h-96">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981] mx-auto mb-2"></div>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p>No notifications yet</p>
                <p className="text-sm mt-1">Payment uploads will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 mt-1 ${notification.isRead ? 'opacity-50' : ''}`}>
                        {notification.type === 'payment_screenshot_uploaded' ? (
                          <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        ) : notification.type === 'new_order' ? (
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {notification.message || 'New notification'}
                          </p>
                          <span className={`text-xs flex-shrink-0 ${notification.isRead ? 'text-gray-400' : 'text-[#10b981] font-semibold'}`}>
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <span>Order #{notification.orderShortId}</span>
                          {notification.amount && (
                            <>
                              <span className="mx-2">•</span>
                              <span>₹{notification.amount.toLocaleString('en-IN')}</span>
                            </>
                          )}
                          {notification.customerName && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{notification.customerName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Unread indicator dot */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center bg-gray-50 dark:bg-gray-900/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Notifications for payment uploads appear here instantly
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
