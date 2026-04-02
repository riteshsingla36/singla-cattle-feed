import { db } from '../firebase/firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Creates a new notification document
 * @param {Object} notificationData - Notification data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const createNotification = async (notificationData) => {
  try {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notificationData,
      createdAt: serverTimestamp(),
      readBy: [], // Empty array initially - no one has read
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get or create a unique admin/device identifier
 * Uses Firebase UID if authenticated, otherwise localStorage
 */
export const getAdminId = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return user.uid; // Use Firebase UID for authenticated admin
    }
  } catch (error) {
    // Fall through to localStorage method
    console.log('Firebase auth not available, using localStorage ID');
  }

  // Fallback: generate and store device-specific ID
  let adminId = localStorage.getItem('adminNotificationId');
  if (!adminId) {
    adminId = 'admin_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('adminNotificationId', adminId);
  }
  return adminId;
};

/**
 * Subscribe to real-time notifications for a specific admin
 * @param {string} adminId - Admin/device ID to listen for
 * @param {Function} onNotification - Callback when new notification arrives
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotifications = (adminId, onNotification) => {
  // Query notifications where adminId is NOT in readBy array
  // Since Firestore doesn't support 'not-in' array directly, we'll fetch and filter client-side
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100) // Limit to recent notifications
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const data = change.doc.data();
        const notificationId = change.doc.id;

        // Check if this notification is meant for this admin
        // If readBy array doesn't contain adminId, it's unread
        const isRead = data.readBy && data.readBy.includes(adminId);

        if (!isRead) {
          onNotification({
            id: notificationId,
            ...data,
            isRead,
          });
        }
      }
    });
  });

  return unsubscribe;
};

/**
 * Get recent notifications for an admin
 * @param {string} adminId - Admin/device ID
 * @param {number} limit - Max number of notifications
 * @returns {Promise<Array>}
 */
export const getNotifications = async (adminId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const notifications = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const isRead = data.readBy && data.readBy.includes(adminId);
      notifications.push({
        id: doc.id,
        ...data,
        isRead,
      });
    });

    return { success: true, notifications };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unread count for an admin
 * @param {string} adminId - Admin/device ID
 * @returns {Promise<number>}
 */
export const getUnreadNotificationsCount = async (adminId) => {
  try {
    const result = await getNotifications(adminId, 100);
    if (!result.success) return 0;

    const unread = result.notifications.filter((n) => !n.isRead);
    return unread.length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Mark a single notification as read
 * @param {string} notificationId - Notification document ID
 * @param {string} adminId - Admin/device ID
 * @returns {Promise<{success: boolean}>}
 */
export const markNotificationAsRead = async (notificationId, adminId) => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      readBy: [...new Set([adminId])], // Ensure uniqueness
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark all notifications as read for an admin
 * @param {string} adminId - Admin/device ID
 * @returns {Promise<{success: boolean}>}
 */
export const markAllNotificationsAsRead = async (adminId) => {
  try {
    const result = await getNotifications(adminId, 100);
    if (!result.success) return { success: false };

    const batchUpdates = result.notifications
      .filter((n) => !n.isRead)
      .map((n) => updateDoc(doc(db, NOTIFICATIONS_COLLECTION, n.id), {
        readBy: [...new Set([...n.readBy, adminId])],
      }));

    await Promise.all(batchUpdates);
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper to format relative time (e.g., "2 min ago")
 * @param {Date|Timestamp} timestamp
 * @returns {string}
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};
