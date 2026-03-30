## Context

The requirement is to replace the delete functionality on the admin customer screen with enable/disable capability, and ensure disabled customers cannot log in. Currently, customers can be deleted, but the business need is to preserve customer data while controlling access.

## Current State

**Customer Data Structure** (Firestore):
- Fields: `name`, `phone`, `userId`, `isAdmin`, `createdAt`, `updatedAt`
- No `isEnabled` field exists

**Key Files:**
- `app/admin/customers/page.js` - Admin UI with delete button and "Login as" button
- `firebase/firestore.js` - Database operations (no toggle function)
- `firebase/auth.js` - Authentication functions (login, register)
- `app/login/page.js` - Customer login page
- `hooks/useAuthState.js` - Auth state hook that loads customer data
- `app/api/admin/impersonate/route.js` - Admin impersonation endpoint

## Proposed Approach

### 1. Add `isEnabled` Field to Customer Schema
- Add `isEnabled` boolean field to customer documents
- Default value: `true` for all new customers
- Existing customers will default to `true` when read (backward compatible)

### 2. Update Firestore Functions (`firebase/firestore.js`)
- Add `toggleCustomerStatus(customerId, isEnabled)` function to update the enabled status
- Update only the `isEnabled` field

### 3. Update Admin Customer Page (`app/admin/customers/page.js`)
- **Remove**: `handleDelete` function and delete button
- **Add**: `handleToggleStatus` function that toggles customer enabled/disabled state
- **Replace Delete button** with Enable/Disable button:
  - If customer is enabled → show "Disable" button (with appropriate styling)
  - If customer is disabled → show "Enable" button (green)
- **Update "Login as" button**:
  - Hide or disable "Login as" button when `!customer.isEnabled`
  - Show tooltip explaining why disabled if applicable

### 4. Prevent Disabled Customers from Logging In

**Two places to enforce this:**

**A. Login Page** (`app/login/page.js`):
- After `loginCustomer()` succeeds, fetch customer data via `getCustomerByPhone()`
- Check if `isEnabled` field exists and is `false`
- If disabled:
  - Call `logoutCustomer()` immediately
  - Show error message: "Your account has been disabled. Please contact the administrator."
  - Keep user on login page

**B. useAuthState Hook** (`hooks/useAuthState.js`):
- After fetching customer data, also check `isEnabled`
- If user is disabled:
  - Call `logoutCustomer()`
  - Set user to null
  - This handles cases where admin disables a user who is currently logged in

### 5. Update Impersonation API (`app/api/admin/impersonate/route.js`)
- Before generating custom token, fetch the target customer's document
- Check if customer is enabled (`isEnabled !== false`)
- If disabled, return 403 error: "Cannot impersonate a disabled customer"
- This prevents admin from logging in as disabled customers

### 6. Backward Compatibility for Existing Customers
- Since existing customers don't have `isEnabled` field, treat missing field as `true` (enabled)
- This means existing customers will all be enabled by default
- Optionally add a one-time migration to explicitly set `isEnabled: true` for all existing customers (nice-to-have but not required if we default to true)

## Files to Modify

1. `firebase/firestore.js` - Add toggleCustomerStatus function
2. `app/admin/customers/page.js` - Replace delete with enable/disable toggle
3. `app/login/page.js` - Check isEnabled after login
4. `hooks/useAuthState.js` - Check isEnabled on auth state change
5. `app/api/admin/impersonate/route.js` - Check isEnabled before impersonating

## Testing Strategy

1. Create a new customer → should be enabled by default
2. Disable a customer → Try to log in with that customer → should see error and be prevented
3. Disable a customer → "Login as" button should be hidden/disabled in admin UI
4. Enable a disabled customer → should be able to log in again
5. Admin impersonating a customer → if customer gets disabled during impersonation, next auth check should log them out
6. Existing customers (without isEnabled field) → should all be able to log in (default to enabled)
7. Toggle button should show correct text/icon based on current state
