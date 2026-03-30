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

    // Verify the current user (should be a customer during impersonation)
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const currentUserId = decodedToken.uid;

    // Get the admin's uid and optional phone from request body
    const { adminUid, adminPhone } = await request.json();

    if (!adminUid) {
      return NextResponse.json(
        { error: 'Bad Request - adminUid is required' },
        { status: 400 }
      );
    }

    // Verify the admin user exists and is actually an admin
    // First try to find by userId
    let adminSnapshot = await admin.firestore()
      .collection('customers')
      .where('userId', '==', adminUid)
      .limit(1)
      .get();

    // If not found and adminPhone provided, try to find by phone
    if (adminSnapshot.empty && adminPhone) {
      adminSnapshot = await admin.firestore()
        .collection('customers')
        .where('phone', '==', adminPhone)
        .limit(1)
        .get();
    }

    if (adminSnapshot.empty) {
      return NextResponse.json(
        { error: 'Forbidden - No customer profile found for admin. Ensure admin user has a customer record.' },
        { status: 403 }
      );
    }

    const adminDoc = adminSnapshot.docs[0];
    const adminData = adminDoc.data();

    if (!adminData.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Specified user is not an admin' },
        { status: 403 }
      );
    }

    // Use the userId from the customer record for token generation
    // If it's missing, fall back to the provided adminUid
    const targetUid = adminData.userId || adminUid;

    // Generate a custom token for the admin
    const customToken = await admin.auth().createCustomToken(targetUid);

    return NextResponse.json({
      success: true,
      customToken: customToken,
      message: 'Switch back token generated',
    });
  } catch (error) {
    console.error('Switch back error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
