import { NextResponse } from 'next/server';
import { db } from '@/firebase/firebaseAdmin';

/**
 * POST /api/fcm-token - Called by the RN app to save the native FCM token.
 * Body: { uid, fcmToken, platform }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { uid, fcmToken, platform = 'android' } = body;

    if (!uid || !fcmToken) {
      return NextResponse.json(
        { error: 'uid and fcmToken are required' },
        { status: 400 }
      );
    }

    const adminRef = db.collection('customers').doc(uid);

    // Delete all existing FCM tokens for this admin (single-device enforcement)
    const tokensSnapshot = await adminRef.collection('fcmTokens').get();
    if (!tokensSnapshot.empty) {
      const batch = db.batch();
      tokensSnapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      console.log(`🗑️ Deleted ${tokensSnapshot.size} old FCM token(s) for admin ${uid}`);
    }

    // Save the new token
    await adminRef.collection('fcmTokens').doc(fcmToken).set({
      token: fcmToken,
      platform,
      device: `${platform}-${Date.now()}`,
      lastUsed: new Date().toISOString(),
    });

    console.log(`✅ FCM token saved for admin ${uid}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
