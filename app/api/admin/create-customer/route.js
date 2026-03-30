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

    // Get customer data from request body
    const { name, customerPhone, password, isAdmin } = await request.json();

    if (!name || !customerPhone || !password) {
      return NextResponse.json(
        { error: 'Bad Request - name, phone, and password are required' },
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

    // Check if this user is an admin
    if (!adminCustomer.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin privileges required. Your account does not have admin access.' },
        { status: 403 }
      );
    }

    // Check if customer with this phone already exists
    const existingCustomerSnapshot = await admin.firestore()
      .collection('customers')
      .where('phone', '==', customerPhone)
      .limit(1)
      .get();

    if (!existingCustomerSnapshot.empty) {
      return NextResponse.json(
        { error: 'A customer with this phone number already exists' },
        { status: 400 }
      );
    }

    // Create the auth user using Admin SDK
    const customerEmail = `${customerPhone}@cattlefeed.local`;
    const userRecord = await admin.auth().createUser({
      email: customerEmail,
      password: password,
      displayName: name,
    });

    // Create the customer document in Firestore
    await admin.firestore().collection('customers').add({
      name: name,
      phone: customerPhone,
      userId: userRecord.uid,
      isAdmin: isAdmin || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      customerId: userRecord.uid,
    });
  } catch (error) {
    console.error('Create customer error:', error);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'The password is too weak' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
