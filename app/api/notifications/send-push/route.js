import { NextRequest, NextResponse } from 'next/server';
import { db, messaging } from '@/firebase/firebaseAdmin';

/**
 * POST /api/notifications/send-push
 * Sends push notification to all admin users (broadcast)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, message, orderId, orderShortId, customerName, amount } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Step 1: Get all admin customers (doc ID = Firebase Auth UID since now using setDoc)
    const customersSnapshot = await db.collection('customers')
      .where('isAdmin', '==', true)
      .get();

    if (customersSnapshot.empty) {
      return NextResponse.json(
        { success: false, reason: 'NO_ADMINS', sent: 0 },
        { status: 200 }
      );
    }

    // Step 2: Collect all FCM tokens from subcollection
    const allTokens = [];
    const adminIds = [];

    for (const adminDoc of customersSnapshot.docs) {
      const adminId = adminDoc.id;
      adminIds.push(adminId);

      const tokensSnapshot = await db.collection('customers')
        .doc(adminId)
        .collection('fcmTokens')
        .get();

      tokensSnapshot.forEach(tokenDoc => {
        const tokenData = tokenDoc.data();
        if (tokenData.token) {
          allTokens.push(tokenData.token);
        }
      });
    }

    if (allTokens.length === 0) {
      return NextResponse.json(
        { success: false, reason: 'NO_TOKENS', sent: 0, totalAdmins: adminIds.length },
        { status: 200 }
      );
    }

    // Step 3: Build FCM message - data-only so Notifee shows the notification and we get tap events
    const fcmMessage = {
      data: {
        type: type || 'general',
        orderId: orderId || '',
        orderShortId: orderShortId || '',
        customerName: customerName || '',
        amount: amount ? String(amount) : '',
        title: 'Singla Traders',
        body: message,
        click_action: 'OPEN_ORDER',
      },
      tokens: allTokens,
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Step 4: Send to each token individually (sendMulticast has issues with /batch endpoint)
    let successCount = 0;
    let failureCount = 0;

    for (const token of allTokens) {
      try {
        const singleMsg = { ...fcmMessage, token, tokens: undefined };
        const response = await messaging.send(singleMsg);
        console.log(`📨 Token ${token.slice(0, 20)}... => success: ${response}`);
        successCount++;
      } catch (err) {
        console.error(`📨 Token ${token.slice(0, 20)}... => failed:`, err.message);
        failureCount++;
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      successCount,
      failureCount,
      totalAdmins: adminIds.length,
      totalTokens: allTokens.length,
    });
  } catch (error) {
    console.error('Error sending push notification via API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
