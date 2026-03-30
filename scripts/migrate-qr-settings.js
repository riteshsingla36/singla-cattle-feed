/**
 * Migration script to fix QR code settings
 *
 * This script finds the old settings document (with random ID) that contains
 * the qrCodeUrl and upiId, and creates a new document with ID 'payment'
 * in the settings collection.
 *
 * Usage:
 * 1. Make sure you have Firebase Admin credentials set up (FIREBASE_CREDENTIALS env var)
 * 2. Run: node scripts/migrate-qr-settings.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// Make sure GOOGLE_APPLICATION_CREDENTIALS env var points to your service account key file
// Or set FIREBASE_CREDENTIALS to the path of your service account JSON file
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} catch (error) {
  // App might already be initialized
  if (!error.message.includes('already exists')) {
    console.error('Failed to initialize Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function migrateSettings() {
  try {
    // Get all documents from settings collection
    const settingsSnapshot = await db.collection('settings').get();

    if (settingsSnapshot.empty) {
      return;
    }

    let oldSettingsDoc = null;
    let oldData = null;

    // Look for a document that has qrCodeUrl or upiId fields
    settingsSnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.qrCodeUrl || data.upiId) {
        oldSettingsDoc = doc.id;
        oldData = data;
      }
    });

    if (!oldSettingsDoc || !oldData) {
      return;
    }

    // Check if 'payment' document already exists
    const paymentDoc = await db.collection('settings').doc('payment').get();

    if (paymentDoc.exists) {
      const response = prompt('Do you want to:\n1) Skip migration\n2) Overwrite with old settings\n> ');
      if (response !== '2') {
        return;
      }
    }

    // Create the 'payment' document with the old settings
    await db.collection('settings').doc('payment').set({
      qrCodeUrl: oldData.qrCodeUrl || '',
      upiId: oldData.upiId || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Ask if old document should be deleted (only if it's not the payment document)
    if (oldSettingsDoc !== 'payment') {
      const response = prompt(`\nDo you want to delete the old document "${oldSettingsDoc}"? (y/n): `);
      if (response.toLowerCase() === 'y') {
        await db.collection('settings').doc(oldSettingsDoc).delete();
      }
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Simple prompt function for Node.js
function prompt(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer);
  }));
}

migrateSettings();
