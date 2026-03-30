import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin, admin } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    initializeFirebaseAdmin();

    // Get the current user's session/token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify the current user's token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json(
        { error: 'Invalid token: email missing' },
        { status: 401 }
      );
    }

    // Extract phone from email (email format: phone@cattlefeed.local)
    const phone = email.split('@')[0];

    // Get the target customer's userId from request body
    const { customerUserId } = await request.json();

    if (!customerUserId) {
      return NextResponse.json(
        { error: 'Bad Request - customerUserId is required' },
        { status: 400 }
      );
    }

    // Prevent self-impersonation
    if (decodedToken.uid === customerUserId) {
      return NextResponse.json(
        { error: 'Cannot impersonate yourself' },
        { status: 400 }
      );
    }

    // Check if current user is actually an admin by looking up their customer profile via phone
    const customersSnapshot = await admin.firestore()
      .collection('customers')
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (customersSnapshot.empty) {
      return NextResponse.json(
        { error: 'Forbidden - No customer profile found for this user. Ensure your phone is registered.' },
        { status: 403 }
      );
    }

    const adminCustomer = customersSnapshot.docs[0].data();

    // Check if this user is an admin (both via isAdmin flag and checking if they have an admin flag)
    if (!adminCustomer.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin privileges required. Your account does not have admin access.' },
        { status: 403 }
      );
    }

    // Verify the target user exists
    const targetUserRecord = await admin.auth().getUser(customerUserId);
    if (!targetUserRecord) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if the target customer is enabled
    const targetCustomerSnapshot = await admin.firestore()
      .collection('customers')
      .where('userId', '==', customerUserId)
      .limit(1)
      .get();

    if (targetCustomerSnapshot.empty) {
      return NextResponse.json(
        { error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    const targetCustomer = targetCustomerSnapshot.docs[0].data();
    if (targetCustomer.isEnabled === false) {
      return NextResponse.json(
        { error: 'Cannot impersonate a disabled customer account' },
        { status: 403 }
      );
    }

    // Generate a custom token for the customer
    const customToken = await admin.auth().createCustomToken(customerUserId);

    // Return the custom token
    return NextResponse.json({
      success: true,
      customToken: customToken,
      message: 'Impersonation token generated',
    });
  } catch (error) {
    console.error('Impersonation error:', error);

    if (error.code === 'auth/uid-already-exists' || error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
