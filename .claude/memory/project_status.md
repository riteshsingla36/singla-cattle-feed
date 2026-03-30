# Cattle Feed Distribution App - Memory File

## Project Overview
- **Type:** Next.js 14 + Firebase customer portal for cattle feed distribution
- **Location:** `C:\Users\rites\Desktop\singla\cattle-feed-app`
- **Tech Stack:** Next.js 14.2.35, React 18.3.1, Firebase 10.12.0, Tailwind CSS
- **Language:** JavaScript (no TypeScript)
- **Features:** Bilingual (English/Hindi), customer-specific pricing, order management, payment via QR

## Firebase Configuration
- **Project ID:** `singla-feed-store`
- **Services:** Auth (Email/Password with phone conversion), Firestore, Storage
- **Config in:** `.env.local` (already configured with credentials)

### Firebase Auth Trick
- Users register/login with phone + password
- Behind the scenes: phone converted to email format `phone@cattlefeed.local`
- Firebase uses email/password auth
- Phone stored separately in Firestore `customers` collection

## Current Project Structure

### Routes (Next.js 14 App Router)
```
/ (root)
├── /login              - Customer login
├── /register           - Customer registration
├── /dashboard          - Customer dashboard
├── /prices             - View personalized product prices
├── /orders             - Order history
├── /checkout           - Place order with payment upload
├── /change-password    - Change password
└── /admin
    ├── /dashboard      - Admin stats
    ├── /customers      - Manage customers (CRUD)
    ├── /products       - Manage products (CRUD)
    ├── /prices         - Set custom prices per customer
    ├── /orders         - View/manage all orders
    └── /settings       - Configure payment QR code & UPI
```

### Key Files
- `app/layout.js` - Root layout (server component)
- `components/LayoutWrapper.js` - Client-side auth & routing logic
- `components/CustomerNav.js` - Customer navigation bar
- `components/AdminNav.js` - Admin navigation bar
- `firebase/firebaseConfig.js` - Firebase initialization
- `firebase/auth.js` - Authentication functions
- `firebase/firestore.js` - All Firestore CRUD operations
- `lib/i18n.js` - Translation setup (EN + HI)

## Known Issues & Fixes Applied

### 1. Fixed: Route Conflicts
- Removed route groups `(admin)`, `(customer)`, `(auth)`
- Proper folder structure: `app/dashboard/page.js`, `app/admin/dashboard/page.js`

### 2. Fixed: Duplicate Imports in Layout
- Separated server layout from client LayoutWrapper component
- Root layout is server component, client logic in separate component

### 3. Fixed: Firebase v10 Imports
- Using correct Firebase v10 modular imports
- Changed phone auth to email/password with phone conversion

### 4. Current Issue: Registration/Login Blocked
**Problem:** "Failed to create customer profile" and Firestore permission errors
**Cause:** Firestore security rules not allowing writes
**Solution:** Set permissive rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**To fix:**
1. Go to Firebase Console → Firestore Database → Rules
2. Paste the rules above
3. Click Publish
4. Clear browser localStorage/use incognito
5. Try registering again

### 5. Browser Extension Blocking
**Error:** `net::ERR_BLOCKED_BY_CLIENT`
**Cause:** Ad blocker or privacy extension blocking Firebase requests
**Solution:** Disable extensions or use incognito mode

## Setup Checklist (For Tomorrow)

### Before Testing:
- [ ] Verify Firebase project is created (singla-feed-store)
- [ ] Enable Authentication (Email/Password provider)
- [ ] Enable Firestore Database (production mode or test mode)
- [ ] Enable Storage (for payment screenshots)
- [ ] Set Firestore rules to permissive version above
- [ ] Publish rules
- [ ] `.env.local` contains correct Firebase config (already done)

### To Run:
```bash
cd C:\Users\rites\Desktop\singla\cattle-feed-app
npm run dev
# Server runs on http://localhost:3000 (or next available port)
```

### To Test Registration:
1. Open http://localhost:3000/register (or appropriate port)
2. Enter:
   - Name: any name
   - Phone: 10-digit Indian number (e.g., 9876543210)
   - Password: 6+ characters
3. Submit
4. Should redirect to `/dashboard`

### To Create Admin User:
1. Register a normal customer account
2. Go to Firebase Console → Firestore → `customers` collection
3. Find the customer document (by phone or user ID)
4. Edit document: set `isAdmin: true` (boolean)
5. Log out and log back in
6. Admin panel accessible at `/admin/dashboard`

### To Configure Payment QR:
1. Login as admin
2. Go to `/admin/settings`
3. Upload QR code to Firebase Storage
4. Copy download URL and UPI ID
5. Save settings
6. Customers will see QR on checkout page

## Database Schema

### collections:
- **customers**: `{ name, phone, userId (Auth UID), isAdmin, createdAt, updatedAt }`
- **products**: `{ name, description, price, unit (bag/kg/ton), createdAt, updatedAt }`
- **customerPrices**: `{ customerId, productId, price, createdAt, updatedAt }`
- **orders**: `{ customerId, customerName, items[{productId, productName, price, quantity}], totalAmount, status (pending/completed/cancelled), paymentStatus (paid/pending), paymentScreenshotUrl, createdAt, updatedAt }`
- **settings** (document: `payment`): `{ qrCodeUrl, upiId, updatedAt }`

## Important Notes

- **All routes protected:** No public pages except login/register
- **Customer-specific pricing:** If customer has entry in `customerPrices`, that price overrides product base price
- **Payment flow:** Customer adds to cart → sees QR → makes UPI payment → uploads screenshot → submits order
- **Admin can:** Mark orders as delivered/completed, view payment screenshots
- **Bilingual:** Toggle in top-right, saved in cookie

## Common Troubleshooting

### "Failed to create customer profile"
**Fix:** Set permissive Firestore rules (see above)

### "Missing or insufficient permissions"
**Fix:** Same - Firestore rules too restrictive

### 404 on /dashboard after register
**Fix:** File structure - ensure `app/dashboard/page.js` exists (not `dashboard.page.js`)

### Registration creates Auth user but no Firestore document
**Fix:** Check that customer is passing userId correctly in addCustomer() call

### Ad blocker error (ERR_BLOCKED_BY_CLIENT)
**Fix:** Disable extensions or use incognito

## Next Steps to Complete

1. **Set Firestore rules** (permissive for dev, secure later)
2. **Test full flow:** Register → Login → Add products → Place order → Admin view
3. **Add products** in admin panel first (required for customers to see anything)
4. **Create test customers** (some with admin flag)
5. **Test custom pricing** - set different prices for different customers
6. **Configure payment QR** in admin settings
7. **Test order workflow** end-to-end
8. **Later:** Implement proper security rules for production
9. **Later:** Add SMS notifications, invoice generation, etc.

---

**Last Updated:** 2025-03-26
**Dev Server Port:** Usually 3000-3006 (auto-increments if port busy)
**Status:** All code written, structure correct, awaiting Firestore rules configuration to work
