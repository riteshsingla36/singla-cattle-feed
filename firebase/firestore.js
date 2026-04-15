import { db } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { createNotification } from '@/lib/notifications';

// ============== CUSTOMERS ==============
export const addCustomer = async (customerData, docId) => {
  try {
    if (docId) {
      // Use provided docId (e.g., Firebase Auth UID) so subcollections stay in sync
      await setDoc(doc(db, 'customers', docId), {
        ...customerData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { success: true, id: docId };
    } else {
      // Fallback: auto-generate ID (backwards compat)
      const docRef = await addDoc(collection(db, 'customers'), {
        ...customerData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCustomerByPhone = async (phone) => {
  const q = query(collection(db, 'customers'), where('phone', '==', phone));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { success: true, customer: querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id };
  }
  return { success: false, message: 'Customer not found' };
};

export const getCustomerById = async (customerId) => {
  const docRef = doc(db, 'customers', customerId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { success: true, customer: docSnap.data() };
  }
  return { success: false, message: 'Customer not found' };
};

export const getCustomerByUserId = async (userId) => {
  try {
    const q = query(collection(db, 'customers'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { success: true, customer: querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id };
    }
    return { success: false, message: 'Customer not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateCustomer = async (customerId, data) => {
  try {
    const customerRef = doc(db, 'customers', customerId);
    await updateDoc(customerRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const toggleCustomerStatus = async (customerId, isEnabled) => {
  try {
    const customerRef = doc(db, 'customers', customerId);
    await updateDoc(customerRef, {
      isEnabled,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteCustomer = async (customerId) => {
  try {
    await deleteDoc(doc(db, 'customers', customerId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllCustomers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'customers'));
    const customers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, customers };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============== PRODUCTS ==============
export const addProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getProduct = async (productId) => {
  const docRef = doc(db, 'products', productId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { success: true, product: docSnap.data() };
  }
  return { success: false, message: 'Product not found' };
};

export const getAllProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, products };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (productId, data) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============== CUSTOMER PRICES ==============
export const setCustomerPrice = async (customerId, productId, price) => {
  try {
    const priceRef = doc(db, 'customerPrices', `${customerId}_${productId}`);
    await updateDoc(priceRef, {
      customerId,
      productId,
      price,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    // If doc doesn't exist, create it
    try {
      const docRef = await addDoc(collection(db, 'customerPrices'), {
        customerId,
        productId,
        price,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

export const getCustomerPrice = async (customerId, productId) => {
  const q = query(
    collection(db, 'customerPrices'),
    where('customerId', '==', customerId),
    where('productId', '==', productId)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { success: true, price: querySnapshot.docs[0].data().price };
  }
  return { success: false, message: 'Price not set' };
};

export const getCustomerAllPrices = async (customerId) => {
  try {
    const q = query(
      collection(db, 'customerPrices'),
      where('customerId', '==', customerId)
    );
    const querySnapshot = await getDocs(q);
    const prices = {};
    querySnapshot.docs.forEach((doc) => {
      prices[doc.data().productId] = doc.data().price;
    });
    return { success: true, prices };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get all custom prices for a specific product across all customers
export const getAllCustomerPricesForProduct = async (productId) => {
  try {
    const q = query(
      collection(db, 'customerPrices'),
      where('productId', '==', productId)
    );
    const querySnapshot = await getDocs(q);
    const prices = {};
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      prices[data.customerId] = data.price;
    });
    return { success: true, prices };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get price for customer and product (returns custom price if exists, otherwise get product base price)
export const getPriceForCustomer = async (customerId, productId) => {
  // First check for custom price
  const customPriceResult = await getCustomerPrice(customerId, productId);
  if (customPriceResult.success) {
    return { success: true, price: customPriceResult.price };
  }

  // Otherwise get product base price
  const productResult = await getProduct(productId);
  if (productResult.success) {
    return { success: true, price: productResult.product.price };
  }

  return { success: false, message: 'Price not found' };
};

// ============== ORDERS ==============
export const placeOrder = async (orderData) => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Try to create notification for admins (don't fail order if notification fails)
    try {
      const orderShortId = docRef.id.substring(0, 12);
      await createNotification({
        type: 'order-placed',
        message: `New order from ${orderData.customerName || 'Customer'}`,
        orderId: docRef.id,
        orderShortId: orderShortId,
        amount: orderData.totalAmount,
        customerName: orderData.customerName || 'Customer',
        customerId: orderData.customerId,
      });
    } catch (notificationError) {
      console.error('Failed to create order notification:', notificationError);
      // Continue - order was placed successfully
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getOrder = async (orderId) => {
  const docRef = doc(db, 'orders', orderId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { success: true, order: { id: docSnap.id, ...docSnap.data() } };
  }
  return { success: false, message: 'Order not found' };
};

export const getCustomerOrders = async (customerId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, orders };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const orders = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, orders };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getNotifications = async (adminId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, 'notifications'),
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

export const subscribeToNotifications = (adminId, onNotification) => {
  const q = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const data = change.doc.data();
        const notificationId = change.doc.id;
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

export const markNotificationAsRead = async (notificationId, adminId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      readBy: [...new Set([adminId])],
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

export const markAllNotificationsAsRead = async (adminId) => {
  try {
    const result = await getNotifications(adminId, 100);
    if (!result.success) return { success: false };

    const batchUpdates = result.notifications
      .filter((n) => !n.isRead)
      .map((n) =>
        updateDoc(doc(db, 'notifications', n.id), {
          readBy: [...new Set([...n.readBy, adminId])],
        })
      );

    await Promise.all(batchUpdates);
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

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

export const updatePaymentProof = async (orderId, paymentScreenshotUrl) => {
  try {
    // First, get the order to retrieve details for notification
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return { success: false, error: 'Order not found' };
    }

    const orderData = orderSnap.data();

    // Update the order
    await updateDoc(orderRef, {
      paymentScreenshotUrl,
      paymentStatus: 'confirmation_pending',
      uploadedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create notification for all admins (broadcast)
    // All admins will see this notification; their read status tracked individually via readBy array
    const orderShortId = orderId.substring(0, 12);
    const notificationData = {
      type: 'payment_screenshot_uploaded',
      orderId,
      orderShortId,
      customerName: orderData.customerName || 'Unknown',
      amount: orderData.totalAmount || 0,
      message: `Payment screenshot uploaded for order #${orderShortId} by ${orderData.customerName || 'Unknown'}`,
      screenshotUrl: paymentScreenshotUrl,
      metadata: {
        paymentStatus: 'confirmation_pending',
        totalItems: orderData.items?.length || 0,
      },
    };

    await createNotification(notificationData);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const confirmPayment = async (orderId, amount) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return { success: false, error: 'Order not found' };
    }

    const orderData = orderSnap.data();
    const totalAmount = orderData.totalAmount || 0;
    const cashAmount = orderData.cashAmount || 0;
    const existingOnlineAmount = orderData.onlineAmount || 0;
    const existingOnlinePayments = orderData.onlinePayments || [];
    const currentScreenshot = orderData.paymentScreenshotUrl || null;

    // Create new payment entry
    const newEntry = {
      amount,
      screenshotUrl: currentScreenshot,
      confirmedAt: new Date().toISOString(),
    };
    const updatedOnlinePayments = [...existingOnlinePayments, newEntry];

    const newOnlineTotal = existingOnlineAmount + amount;
    const totalPaid = cashAmount + newOnlineTotal;

    const paymentStatus = totalPaid >= totalAmount ? 'paid' : 'partial';

    await updateDoc(orderRef, {
      paymentStatus,
      onlineAmount: newOnlineTotal,
      onlinePayments: updatedOnlinePayments,
      paymentScreenshotUrl: null, // Clear the processed screenshot
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const recordCashPayment = async (orderId, amount) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return { success: false, error: 'Order not found' };
    }

    const orderData = orderSnap.data();
    const totalAmount = orderData.totalAmount || 0;
    const onlineAmount = orderData.onlineAmount || 0;
    const existingCashPayments = orderData.cashPayments || [];

    // Append new cash entry
    const newEntry = {
      amount,
      recordedAt: new Date().toISOString(),
    };
    const updatedCashPayments = [...existingCashPayments, newEntry];

    // Compute total cash from all entries
    const totalCash = updatedCashPayments.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalPaid = totalCash + onlineAmount;
    const paymentStatus = totalPaid >= totalAmount ? 'paid' : 'partial';

    await updateDoc(orderRef, {
      cashPayments: updatedCashPayments,
      cashAmount: totalCash,
      paymentStatus,
      cashRecordedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, paymentStatus };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============== QR CODE SETTINGS ==============
export const getQRCodeSettings = async () => {
  try {
    const docRef = doc(db, 'settings', 'payment');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, settings: docSnap.data() };
    }
    return { success: false, message: 'Settings not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const setQRCodeSettings = async (qrCodeUrl, upiId) => {
  try {
    // Use setDoc with merge option to create or update the 'payment' document
    await setDoc(doc(db, 'settings', 'payment'), {
      qrCodeUrl,
      upiId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============== PURCHASE ORDERS ==============
export const createPurchaseOrder = async (adminId, selectedOrderIds, items, totalAmount, totalCustomerAmount = null, totalProfit = null) => {
  try {
    const docRef = await addDoc(collection(db, 'purchaseOrders'), {
      adminId,
      selectedOrderIds,
      items, // array of { productId, productName, quantity, standardPrice, standardSubtotal, customerSubtotal, profit }
      totalAmount,
      totalCustomerAmount,
      totalProfit,
      status: 'pending',
      billUrl: null,
      deliveredAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllPurchaseOrders = async () => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc'))
    );
    const purchaseOrders = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, purchaseOrders };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getPurchaseOrder = async (purchaseOrderId) => {
  try {
    const docRef = doc(db, 'purchaseOrders', purchaseOrderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, purchaseOrder: docSnap.data() };
    }
    return { success: false, message: 'Purchase order not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePurchaseOrderStatus = async (purchaseOrderId, status, billUrl = null) => {
  try {
    const poRef = doc(db, 'purchaseOrders', purchaseOrderId);
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (billUrl) {
      updateData.billUrl = billUrl;
    }
    if (status === 'delivered') {
      updateData.deliveredAt = serverTimestamp();
    }
    await updateDoc(poRef, updateData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getOrdersByIds = async (orderIds) => {
  try {
    const orderPromises = orderIds.map((orderId) => getDoc(doc(db, 'orders', orderId)));
    const orderSnapshots = await Promise.all(orderPromises);
    const orders = orderSnapshots
      .filter((snap) => snap.exists())
      .map((snap) => ({ id: snap.id, ...snap.data() }));
    return { success: true, orders };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const bulkUpdateOrderStatus = async (orderIds, status) => {
  try {
    const updatePromises = orderIds.map((orderId) =>
      updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
      })
    );
    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============== SESSION MANAGEMENT (Single-Device Enforcement) ==============
export const subscribeToSession = (userId, callback) => {
  const userDocRef = doc(db, 'customers', userId);
  const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback(data.currentSessionId);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Session subscription error:', error);
  });

  return unsubscribe;
};
