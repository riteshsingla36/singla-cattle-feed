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

    await db.collection('customers').doc(uid).collection('fcmTokens').doc(fcmToken).set({
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
