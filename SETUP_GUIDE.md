# Cattle Feed Distribution App - Setup Guide

## Step 1: Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable **Authentication** with **Email/Password** provider (only)
   - Note: The app uses phone numbers formatted as emails (phone@cattlefeed.local)
4. Create **Firestore Database** in production mode (or test mode for development)
5. Enable **Storage** for file uploads (payment screenshots)

### Firestore Collections Structure

The app will automatically create collections when used, but here's the structure:

- `customers` - Customer data
  - name (string)
  - phone (string, unique)
  - userId (string, Firebase Auth UID)
  - isAdmin (boolean)
  - createdAt, updatedAt

- `products` - Product catalog
  - name (string)
  - description (string, optional)
  - price (number)
  - unit (string: bag, kg, ton, piece)
  - createdAt, updatedAt

- `customerPrices` - Custom prices per customer per product
  - customerId (string)
  - productId (string)
  - price (number)
  - createdAt, updatedAt

- `orders` - Customer orders
  - customerId (string)
  - customerName (string)
  - items (array of { productId, productName, price, quantity })
  - totalAmount (number)
  - status (string: pending, completed, cancelled)
  - paymentStatus (string: paid, pending)
  - paymentScreenshotUrl (string, optional)
  - createdAt, updatedAt

- `settings` - App settings (payment QR code, etc.)
  - payment (document)
    - qrCodeUrl (string)
    - upiId (string)

## Step 2: Firebase Configuration

1. In Firebase Console, go to Project Settings
2. Scroll to "Your apps" and register a web app
3. Copy the Firebase configuration object

4. Create `.env.local` file in the project root:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Step 3: Install Dependencies & Run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## Step 4: Create Admin User

1. Go to the app at `http://localhost:3000/register`
2. Create a customer account with phone number and password
3. Go to Firebase Console → Firestore → `customers` collection
4. Find the newly created customer document
5. Edit the document and set `isAdmin` field to `true`
6. Now you can log in with this account and access `/admin/dashboard`

## Step 5: Set Up Products

1. Log in as admin
2. Go to Admin → Products
3. Add products with name, price, and unit (bags/kg/ton)
4. These are the "standard" prices that will apply to all customers by default

## Step 6: Create Customers

1. In Admin → Customers, add customers
2. Each customer needs: name, phone number, and password
3. Optionally set as admin (can access admin panel)

## Step 7: Set Custom Prices (Optional)

1. Go to Admin → Set Prices
2. Select a customer
3. For each product, you can set a custom price
4. If no custom price is set, the customer sees the standard product price

## Step 8: Configure Payment QR Code

1. Generate your UPI QR code image
2. Upload it to Firebase Storage or any hosting
3. Go to Admin → Set Prices (or you can create a separate admin page)
4. Set the QR code URL and UPI ID in Firestore `settings/payment` document:
   - qrCodeUrl: "url_to_qr_code_image"
   - upiId: "your-merchant@upi"

*Note: The app currently expects these settings to exist. You may need to create the document manually or add a UI for it.*

## Features

### Customer Features
- Login with phone number + password
- View all products with their personalized prices
- Place orders by adding products to cart
- Upload payment screenshot after paying via QR code
- View order history and status

### Admin Features
- Full customer management (CRUD)
- Product catalog management
- Set individual prices for each customer
- View and manage all orders
- Mark orders as delivered/completed

### Bilingual Support
- English and Hindi (toggle in top right)
- Language preference saved in cookie/localStorage

## Important Notes

- Phone numbers are stored as-is (e.g., "9876543210")
- Passwords are handled by Firebase Auth (hashed automatically)
- All routes are protected - no public pages
- Payment screenshots are uploaded to Firebase Storage
- Custom prices take precedence over standard prices

## Security Considerations

1. **In Production:**
   - Enable Firestore security rules
   - Set proper Firebase Storage rules
   - Use environment variables for Firebase config
   - Consider implementing rate limiting
   - Add admin authentication separate from customers if needed

2. **Firestore Rules Example:**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Customers can only read their own data
    match /customers/{customerId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Customer prices - customers can only read their own
    match /customerPrices/{priceId} {
      allow read: if request.auth != null && resource.data.customerId == request.auth.uid;
      allow write: if request.auth != null && request.auth.uid == 'admin_uid'; // Admin only
    }

    // Orders - customers can only read their own
    match /orders/{orderId} {
      allow read: if request.auth != null && resource.data.customerId == request.auth.uid;
      allow write: if request.auth != null; // Any authenticated user can create
    }

    // Products - readable by all authenticated users
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only (implement custom claims)
    }

    // Settings - admin only
    match /settings/{settingId} {
      allow read, write: if request.auth != null && request.auth.uid == 'admin_uid';
    }
  }
}
```

## Troubleshooting

1. **Login fails with "no user record" or wrong password**:
   - Check that the customer document exists in Firestore `customers` collection
   - The phone number in both Auth and Firestore should match

2. **Can't see products**:
   - Make sure products are added in Admin → Products
   - Refresh the page

3. **Admin panel not accessible**:
   - Verify `isAdmin` field is set to `true` in the customer's Firestore document
   - Log out and log in again after setting admin flag

4. **Payment upload fails**:
   - Check Firebase Storage rules
   - Ensure storage bucket is configured in Firebase config

5. **Custom prices not showing**:
   - Verify customerPrices collection has documents with matching customerId and productId
   - Check productId matches exactly

## Next Steps

- Add more features like invoice generation
- Implement SMS notifications via Twilio
- Add Google Maps for delivery tracking
- Create mobile app using React Native with same Firebase backend
- Add reporting and analytics dashboard
- Implement coupon/discount system

---

Built with Next.js 14 + Firebase
