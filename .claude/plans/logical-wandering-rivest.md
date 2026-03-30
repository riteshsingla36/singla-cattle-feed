# Plan: Add Payment App Selection to OrderDetailsModal

## Context
The customer-facing order detail modal displays a QR code with UPI ID for payment. Users want to be able to directly open their preferred payment app (Google Pay, PhonePe, Paytm) with the payment details pre-filled, instead of just scanning the QR code. Additionally, a "Copy UPI ID" option is needed for users who prefer manual entry.

The change must be made in the website code (this Next.js app), not the Flutter WebView container.

## Existing Code
- **File:** `components/OrderDetailsModal.js` (lines 341-359 show QR code section)
- The modal receives `qrCodeUrl` and `upiId` as props
- Already displays QR code and UPI ID with message "Scan QR code with any UPI app"
- Uses Tailwind CSS and inline SVG icons
- Uses React state hooks

## Implementation

### 1. Modified Files
- `components/OrderDetailsModal.js` - Only file that needs modification

### 2. Payment App Buttons Section
Replace the simple text message (line 357) with a grid of payment app buttons:

```
{Below QR code:}
- Google Pay button (brand color #4285F4)
- PhonePe button (brand color #5F2BEA)
- Paytm button (brand color #00BAF2)
- Copy UPI ID button (neutral style, uses clipboard API)
```

**Deep Link Format:**
```javascript
upi://pay?pa={upiId}&pn={payeeName}&am={amount}&cu=INR&tr={orderId}
```

- `pa`: UPI ID (from prop)
- `pn`: Payee name (use business name "Singla Traders" or from settings)
- `am`: Order total amount (from `freshOrder.totalAmount`)
- `cu`: Currency (INR)
- `tr`: Transaction reference (order ID, optional but recommended)

### 3. Copy UPI ID Functionality
Use the modern Clipboard API:
```javascript
const handleCopyUpiId = async () => {
  try {
    await navigator.clipboard.writeText(upiId);
    alert('UPI ID copied to clipboard!');
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = upiId;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('UPI ID copied to clipboard!');
  }
};
```

### 4. Button Styling (Tailwind)
- Container: `grid grid-cols-2 gap-3` (2 columns on mobile, maybe 4 on desktop: `sm:grid-cols-4`)
- Buttons: `flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all`
- Add hover states, touch-friendly sizes (min 44px height)
- Include app icons as inline SVGs (simple versions)

### 5. Payment App Icons
Use simple SVG icons for Google Pay, PhonePe, Paytm. Will need to create/find these. If exact brand icons are not available, use text labels with app names.

### 6. Deep Link Trigger
When a payment app button is clicked:
```javascript
const openPaymentApp = (app) => {
  const deepLink = generateUpiDeepLink(app);
  window.location.href = deepLink;
  // Alternatively: window.open(deepLink, '_blank');
};
```

**Note for Flutter WebView:** The Flutter app may need to allow navigation to custom URL schemes (upi://). This is typically handled in the WebView's `NavigationDelegate` or by using `url_launcher` package. Document this requirement in comments.

### 7. Responsive Design
- Mobile: 2-column grid (stack if needed)
- Desktop: 4-column grid if enough space
- Buttons should be tappable with adequate spacing

## Verification Steps
1. Open OrderDetailsModal for an order with QR code and UPI ID
2. Verify buttons appear below QR code with proper styling
3. Click each payment app button - should open the respective app (on mobile) or prompt to open (on desktop)
4. Click "Copy UPI ID" - should copy to clipboard and show confirmation
5. Test that deep link includes correct amount and UPI ID
6. Test on actual mobile device to ensure payment apps open correctly
7. Ensure Flutter WebView allows external URL schemes (upi://)

## Notes
- Keep implementation simple - no external dependencies
- Use existing patterns from the codebase (similar to AdminNav dropdown or button styles)
- Maintain dark mode support with dark: variants
- Ensure accessibility: proper ARIA labels, focus states
- If exact brand icons are not available, use text or simple generic payment icon
