'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Auth
      login: 'Login',
      logout: 'Logout',
      phone: 'Phone Number',
      password: 'Password',
      name: 'Name',
      loginBtn: 'Login',
      registerBtn: 'Register',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      loginSuccess: 'Login successful!',
      loginError: 'Invalid phone number or password',
      registerSuccess: 'Registration successful!',
      registerError: 'Registration failed',

      // Navigation
      dashboard: 'Dashboard',
      prices: 'Prices',
      orders: 'Orders',
      checkout: 'Checkout',
      admin: 'Admin',

      // Dashboard
      welcome: 'Welcome',
      totalOrders: 'Total Orders',
      pendingOrders: 'Pending Orders',
      completedOrders: 'Completed Orders',
      recentOrders: 'Recent Orders',

      // Prices
      productName: 'Product Name',
      yourPrice: 'Your Price',
      standardPrice: 'Standard Price',
      unit: 'per bag',
      noProducts: 'No products available',

      // Orders
      placeOrder: 'Place Order',
      orderHistory: 'Order History',
      orderDate: 'Date',
      orderTotal: 'Total',
      orderStatus: 'Status',
      statusPending: 'Pending',
      statusCompleted: 'Completed',
      statusCancelled: 'Cancelled',
      noOrders: 'No orders yet',
      viewDetails: 'View Details',
      quantity: 'Quantity',
      price: 'Price',
      subtotal: 'Subtotal',
      total: 'Total Amount',
      confirmOrder: 'Confirm Order',
      orderPlaced: 'Order placed successfully!',
      orderFailed: 'Failed to place order',

      // Checkout
      paymentInstruction: 'Payment Instructions',
      scanQR: 'Scan the QR code to pay',
      uploadScreenshot: 'Upload Payment Screenshot',
      chooseFile: 'Choose File',
      payNow: 'Pay Now',
      submitOrder: 'Submit Order',
      paymentQR: 'Payment QR Code',
      upiId: 'UPI ID',

      // Admin
      addCustomer: 'Add Customer',
      editCustomer: 'Edit Customer',
      deleteCustomer: 'Delete Customer',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      deleteProduct: 'Delete Product',
      setPrices: 'Set Customer Prices',
      manageOrders: 'Manage Orders',
      markDelivered: 'Mark as Delivered',
      allOrders: 'All Orders',
      allCustomers: 'All Customers',
      allProducts: 'All Products',
      customerManagement: 'Customer Management',
      productManagement: 'Product Management',
      priceManagement: 'Price Management',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      search: 'Search',
      reset: 'Reset',
      enable: 'Enable',
      disable: 'Disable',

      // Messages
      confirmDelete: 'Are you sure you want to delete this?',
      yes: 'Yes',
      no: 'No',
      loading: 'Loading...',
      errorOccurred: 'An error occurred',
      success: 'Success',
      noData: 'No data available',

      // Language
      language: 'Language',
      english: 'English',
      hindi: 'Hindi',

      // Profile
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      updatePassword: 'Update Password',
    },
  },
  hi: {
    translation: {
      // Auth
      login: 'लॉग इन',
      logout: 'लॉग आउट',
      phone: 'फोन नंबर',
      password: 'पासवर्ड',
      name: 'नाम',
      loginBtn: 'लॉग इन करें',
      registerBtn: 'रजिस्टर करें',
      forgotPassword: 'पासवर्ड भूल गए?',
      noAccount: 'खाता नहीं है?',
      haveAccount: 'पहले से खाता है?',
      loginSuccess: 'लॉगिन सफल!',
      loginError: 'गलत फोन नंबर या पासवर्ड',
      registerSuccess: 'रजिस्ट्रेशन सफल!',
      registerError: 'रजिस्ट्रेशन असफल',

      // Navigation
      dashboard: 'डैशबोर्ड',
      prices: 'कीमतें',
      orders: 'ऑर्डर',
      checkout: 'चेकआउट',
      admin: 'एडमिन',

      // Dashboard
      welcome: 'स्वागत',
      totalOrders: 'कुल ऑर्डर',
      pendingOrders: 'पेंडिंग ऑर्डर',
      completedOrders: 'पूर्ण ऑर्डर',
      recentOrders: 'हाल के ऑर्डर',

      // Prices
      productName: 'उत्पाद नाम',
      yourPrice: 'आपकी कीमत',
      standardPrice: 'मानक कीमत',
      unit: 'प्रति बैग',
      noProducts: 'कोई उत्पाद उपलब्ध नहीं',

      // Orders
      placeOrder: 'ऑर्डर दें',
      orderHistory: 'ऑर्डर इतिहास',
      orderDate: 'तारीख',
      orderTotal: 'कुल',
      orderStatus: 'स्थिति',
      statusPending: 'पेंडिंग',
      statusCompleted: 'पूर्ण',
      statusCancelled: 'रद्द',
      noOrders: 'अभी तक कोई ऑर्डर नहीं',
      viewDetails: 'विवरण देखें',
      quantity: 'मात्रा',
      price: 'कीमत',
      subtotal: 'उप-कुल',
      total: 'कुल राशि',
      confirmOrder: 'ऑर्डर पुष्टि करें',
      orderPlaced: 'ऑर्डर सफलता पूर्वक प्लेस किया गया!',
      orderFailed: 'ऑर्डर पेस करने में विफल',

      // Checkout
      paymentInstruction: 'भुगतान निर्देश',
      scanQR: 'भुगतान करने के लिए QR कोड स्कैन करें',
      uploadScreenshot: 'भुगतान स्क्रीनशॉट अपलोड करें',
      chooseFile: 'फ़ाइल चुनें',
      payNow: 'अभी भुगतान करें',
      submitOrder: 'ऑर्डर जमा करें',
      paymentQR: 'भुगतान QR कोड',
      upiId: 'UPI ID',

      // Admin
      addCustomer: 'ग्राहक जोड़ें',
      editCustomer: 'ग्राहक संपादित करें',
      deleteCustomer: 'ग्राहक हटाएं',
      addProduct: 'उत्पाद जोड़ें',
      editProduct: 'उत्पाद संपादित करें',
      deleteProduct: 'उत्पाद हटाएं',
      setPrices: 'ग्राहक कीमतें सेट करें',
      manageOrders: 'ऑर्डर प्रबंधित करें',
      markDelivered: 'वितरित के रूप में चिह्नित करें',
      allOrders: 'सभी ऑर्डर',
      allCustomers: 'सभी ग्राहक',
      allProducts: 'सभी उत्पाद',
      customerManagement: 'ग्राहक प्रबंधन',
      productManagement: 'उत्पाद प्रबंधन',
      priceManagement: 'कीमत प्रबंधन',
      save: 'सेव करें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      back: 'वापस',
      search: 'खोजें',
      reset: 'रीसेट',
      enable: 'सक्षम करें',
      disable: 'अक्षम करें',

      // Messages
      confirmDelete: 'क्या आप इसे हटाना चाहते हैं?',
      yes: 'हाँ',
      no: 'नहीं',
      loading: 'लोड हो रहा है...',
      errorOccurred: 'एक त्रुटि हुई',
      success: 'सफलता',
      noData: 'कोई डेटा उपलब्ध नहीं',

      // Language
      language: 'भाषा',
      english: 'अंग्रेजी',
      hindi: 'हिंदी',

      // Profile
      changePassword: 'पासवर्ड बदलें',
      currentPassword: 'वर्तमान पासवर्ड',
      newPassword: 'नया पासवर्ड',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
      updatePassword: 'पासवर्ड अपडेट करें',
    },
  },
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: 'en',
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
