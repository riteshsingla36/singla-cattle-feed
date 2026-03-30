# Cattle Feed Distribution Portal

A full-featured customer and admin portal for cattle feed distribution business. Built with Next.js 14 and Firebase.

## Features

### Customer Portal
- Secure login with phone number and password
- View personalized product prices (each customer can have different prices)
- Browse products with unit pricing (bags/kg/ton)
- Place orders online
- Upload payment screenshot after UPI payment
- Track order history and status
- Change password
- Bilingual support (English/Hindi)

### Admin Dashboard
- Customer management (add, edit, delete)
- Product catalog management
- Set custom prices per customer per product
- View and manage all customer orders
- Mark orders as delivered/completed
- Configure payment QR code and UPI ID

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend/Database**: Firebase (Auth, Firestore, Storage)
- **Internationalization**: i18next (English & Hindi)
- **State Management**: React hooks
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js 18+ installed
- Firebase project with:
  - Authentication enabled (Phone & Email/Password)
  - Firestore Database
  - Storage enabled

## Quick Start

### 1. Clone and Install

```bash
cd cattle-feed-app
npm install
```

### 2. Firebase Setup

Follow the detailed instructions in `SETUP_GUIDE.md` to:

1. Create Firebase project
2. Enable Authentication, Firestore, and Storage
3. Get your Firebase config
4. Create `.env.local` with your credentials

### 3. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Admin User

1. Go to `http://localhost:3000/register` and create an account
2. In Firebase Console → Firestore → `customers` collection, find your user
3. Edit the document and set `isAdmin` field to `true`
4. Log out and log back in to access admin panel at `/admin/dashboard`

## Project Structure

```
cattle-feed-app/
├── app/
│   ├── (auth)/           # Authentication pages (login, register)
│   ├── (customer)/       # Customer pages
│   │   ├── dashboard/    # Customer dashboard
│   │   ├── prices/       # View prices
│   │   ├── orders/       # Order history
│   │   ├── checkout/     # Place order
│   │   └── change-password/  # Change password
│   ├── (admin)/          # Admin pages
│   │   ├── dashboard/    # Admin dashboard
│   │   ├── customers/    # Manage customers
│   │   ├── products/     # Manage products
│   │   ├── prices/       # Set customer prices
│   │   ├── orders/       # View/manage orders
│   │   └── settings/     # Payment settings
│   ├── layout.js         # Root layout
│   └── page.js           # Home redirect
├── components/
│   ├── ClientLayout.js   # (deprecated - using separate navs)
│   ├── CustomerNav.js    # Customer navigation
│   ├── AdminNav.js       # Admin navigation
│   ├── LanguageSwitcher.js
│   └── ProtectedRoute.js
├── context/
│   └── LanguageContext.js
├── firebase/
│   ├── firebaseConfig.js # Firebase initialization
│   ├── auth.js           # Authentication functions
│   └── firestore.js      # Database functions
├── lib/
│   ├── i18n.js           # Translation setup
│   └── validations.js    # Form validations
├── public/               # Static assets
├── .env.local            # Environment variables (create)
├── SETUP_GUIDE.md        # Detailed setup instructions
└── README.md             # This file
```

## Database Schema

### customers
- `id` (auto)
- `name` (string)
- `phone` (string, unique)
- `userId` (string, Firebase Auth UID)
- `isAdmin` (boolean)
- `createdAt`, `updatedAt` (timestamps)

### products
- `id` (auto)
- `name` (string)
- `description` (string, optional)
- `price` (number)
- `unit` (string: bag, kg, ton, piece)
- `createdAt`, `updatedAt`

### customerPrices
- Auto ID
- `customerId` (string)
- `productId` (string)
- `price` (number)
- `createdAt`, `updatedAt`

### orders
- `id` (auto)
- `customerId` (string)
- `customerName` (string)
- `items` (array of {productId, productName, price, quantity})
- `totalAmount` (number)
- `status` (pending/completed/cancelled)
- `paymentStatus` (paid/pending)
- `paymentScreenshotUrl` (string, optional)
- `createdAt`, `updatedAt`

### settings (document: payment)
- `qrCodeUrl` (string)
- `upiId` (string)
- `updatedAt`

## Usage

### Customer Flow
1. Register account (phone + password)
2. Login
3. View prices (personalized per customer)
4. Add products to cart on Checkout page
5. See total and payment QR code
6. Make UPI payment and upload screenshot
7. Submit order
8. Track order status in Orders page

### Admin Flow
1. Login with admin account (isAdmin = true)
2. Add products to catalog
3. Add customers
4. Set custom prices for specific customers (optional)
5. Configure payment QR code in Settings
6. Monitor incoming orders
7. Mark orders as delivered when shipped

## Security Notes

### For Production:

1. **Firestore Rules** - Set up proper security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customers/{customerId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /customerPrices/{priceId} {
      allow read: if request.auth != null && resource.data.customerId == request.auth.uid;
      allow write: if request.auth.token.admin == true;
    }
    match /orders/{orderId} {
      allow read: if request.auth != null && resource.data.customerId == request.auth.uid;
      allow create: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

2. **Storage Rules**:

```
service firebase.storage {
  match /b/{bucket}/o {
    match /payments/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.name.split('/')[1].split('-')[1];
    }
  }
}
```

3. **Enable App Check** - Prevent unauthorized access
4. **Use environment variables** - Never commit Firebase config
5. **Implement rate limiting** - For production
6. **Add logging/monitoring** - Track errors and usage

## Customization

### Add more languages:
1. Add translation to `lib/i18n.js`
2. Update `LanguageSwitcher.js`

### Modify email/password to phone OTP:
Use Firebase Phone Auth instead of password auth.

### Add SMS notifications:
Integrate Twilio or similar service in webhooks.

### Add invoice generation:
Use libraries like `pdf-lib` to generate PDFs.

## Troubleshooting

**"Invalid phone number or password"**
- Check if customer document exists in Firestore
- Verify phone numbers match exactly in both Auth and Firestore

**No products visible**
- Add products in Admin → Products page

**Admin panel inaccessible**
- Ensure `isAdmin` = true in Firestore customer document
- Log out and back in

**Payment upload fails**
- Check Firebase Storage permissions
- Enable Storage in Firebase project

**QR code not showing**
- Configure in Admin → Settings (must be a publicly accessible image URL)

## Build for Production

```bash
npm run build
npm start
```

## License

Private - All rights reserved

---

Built with ❤️ for cattle feed distribution businesses in India
