# Fix PhonePe Payment Deep Link Issue

## Problem

The PhonePe payment link (and other UPI app links) is redirecting but opening in the same screen instead of switching to the PhonePe app. The current implementation in `components/OrderDetailsModal.js` uses direct navigation (`window.location.href = deepLink`) which is unreliable - some browsers may not properly switch to the app, leaving users confused.

## Solution

Implement a redirect page pattern (similar to the existing `app/admin/orders-redirect/page.js`) that:

1. Immediately attempts to open the UPI app via the deep link
2. Uses the Page Visibility API to detect if the app actually opened (page becomes hidden)
3. If the app didn't open within 5 seconds, shows a fallback UI with:
   - Payment details (amount, payee name)
   - Copyable UPI ID
   - QR code (if available)
   - Manual instructions
4. Provides a way to go back or retry

This is more robust because it:
- Gives the app-opening attempt time to work
- Detects failure and provides alternatives
- Avoids the "stuck on same page" problem

## Files to Modify

### 1. Create NEW file: `app/payment/upi-redirect/page.js`

A redirect page that:
- Reads `upiLink` and `upiId` from query parameters
- Tries to open the `upiLink` immediately
- Starts a 5-second countdown
- If user returns (visibility change), marks app as opened
- If countdown completes without app opening, displays fallback UI
- Fallback UI shows: UPI ID (copy button), amount, payee name, and QR code (if available from existing context)

### 2. Modify: `components/OrderDetailsModal.js`

**Current code (lines 186-226):**

```javascript
const generateUpiDeepLink = (app) => {
  // ... generates deep link like phonepe://pay?...
};

const openPaymentApp = (app) => {
  const deepLink = generateUpiDeepLink(app);
  if (deepLink) {
    window.location.href = deepLink;
  }
};
```

**Changes needed:**
- Update `openPaymentApp(app)` to construct the redirect URL:
  `const redirectUrl = \`/payment/upi-redirect?upiLink=${encodeURIComponent(deepLink)}&upiId=${upiId}&app=${app}&amount=${freshOrder.totalAmount}\`;`
- Navigate to that redirect page instead: `window.location.href = redirectUrl;`
- Optionally open in new tab: `window.open(redirectUrl, '_blank');` to keep order modal accessible

### 3. Optional: Add API route for retrieving QR code in fallback

If the redirect page needs to fetch the QR code dynamically, we might need:
- `app/payment/upi-redirect/page.js` can receive `qrCodeUrl` as an optional query param
- Or create a small API endpoint to get settings

But simpler: pass all needed data as query parameters from `OrderDetailsModal`.

## Implementation Steps

1. Create `app/payment/upi-redirect/page.js` based on `app/admin/orders-redirect/page.js`:
   - Read query params: `upiLink`, `upiId`, `amount`, `payeeName` (optional), `app` (for display)
   - On mount: `window.location.href = upiLink`
   - Set up 5-second countdown
   - Set up visibility change listener
   - If countdown finishes without app opened, render fallback UI
   - Fallback UI: show amount, UPI ID with copy button, QR code image (if provided), and instructions

2. Update `OrderDetailsModal.js`:
   - Modify `openPaymentApp` to redirect to the new UPI redirect page instead of direct deep link
   - Pass necessary data: `upiLink`, `upiId`, `amount`, `payeeName`, `app`
   - Consider opening in new tab with `window.open()` so the modal doesn't close

3. Test manually:
   - Click each payment app button (Google Pay, PhonePe, Paytm)
   - Verify app opens or fallback appears
   - Test on mobile devices/emulators

## Notes

- The existing redirect page for admin orders uses `st://` custom scheme. UPI uses standard `upi://` and app-specific schemes.
- The same visibility change detection technique works for UPI apps because when they open, the browser tab becomes hidden.
- If no UPI app is installed, the 5-second fallback ensures users can still pay manually.
- We can reuse the Tailwind styling from the existing redirect page for consistency.
- The redirect page should be lightweight and fast-loading.

## Trade-offs

- Adds an extra navigation step (modal → redirect page → app OR redirect page → fallback)
- But provides better UX and clear feedback
- No server-side changes needed (all client-side)
- Works with existing UPI deep link formats

## Verification

**Manual Test Cases:**
1. PhonePe installed:
   - Tap "PhonePe" button → PhonePe app opens → Redirect page becomes hidden → Countdown stops
2. PhonePe NOT installed:
   - Tap "PhonePe" button → After 5 seconds → Fallback UI shows with UPI ID copy and QR
3. Google Pay installed:
   - Same as above
4. Verify copy UPI ID works on fallback page
5. Verify back/retry button works
