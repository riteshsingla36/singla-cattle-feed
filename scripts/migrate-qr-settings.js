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
    console.log('Starting QR settings migration...\n');

    // Get all documents from settings collection
    const settingsSnapshot = await db.collection('settings').get();

    if (settingsSnapshot.empty) {
      console.log('No settings documents found. Nothing to migrate.');
      return;
    }

    console.log(`Found ${settingsSnapshot.docs.length} document(s) in settings collection:\n`);

    let oldSettingsDoc = null;
    let oldData = null;

    // Look for a document that has qrCodeUrl or upiId fields
    settingsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Document ID: ${doc.id}`);
      console.log(`  Has qrCodeUrl: ${data.qrCodeUrl ? '✅' : '❌'}`);
      console.log(`  Has upiId: ${data.upiId ? '✅' : '❌'}`);
      console.log(`  Has updatedAt: ${data.updatedAt ? '✅' : '❌'}\n`);

      if (data.qrCodeUrl || data.upiId) {
        oldSettingsDoc = doc.id;
        oldData = data;
      }
    });

    if (!oldSettingsDoc || !oldData) {
      console.log('❌ No settings document with qrCodeUrl/upiId found.');
      console.log('Make sure you have saved QR settings at least once.');
      return;
    }

    console.log(`\nFound settings in document: "${oldSettingsDoc}"`);
    console.log('Settings to migrate:');
    console.log(`  qrCodeUrl: ${oldData.qrCodeUrl || 'not set'}`);
    console.log(`  upiId: ${oldData.upiId || 'not set'}\n`);

    // Check if 'payment' document already exists
    const paymentDoc = await db.collection('settings').doc('payment').get();

    if (paymentDoc.exists) {
      console.log('⚠️  Document "payment" already exists.');
      const response = prompt('Do you want to:\n1) Skip migration\n2) Overwrite with old settings\n> ');
      if (response !== '2') {
        console.log('Migration cancelled.');
        return;
      }
    }

    // Create the 'payment' document with the old settings
    await db.collection('settings').doc('payment').set({
      qrCodeUrl: oldData.qrCodeUrl || '',
      upiId: oldData.upiId || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('✅ Created/updated "payment" document with old settings.');

    // Ask if old document should be deleted (only if it's not the payment document)
    if (oldSettingsDoc !== 'payment') {
      const response = prompt(`\nDo you want to delete the old document "${oldSettingsDoc}"? (y/n): `);
      if (response.toLowerCase() === 'y') {
        await db.collection('settings').doc(oldSettingsDoc).delete();
        console.log(`✅ Deleted old document "${oldSettingsDoc}".`);
      } else {
        console.log(`ℹ️  Old document "${oldSettingsDoc}" kept.`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Go to Admin Settings page');
    console.log('2. The QR code URL and UPI ID should now be visible');
    console.log('3. You can edit and save them if needed');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\nTroubleshooting:');
    console.log('- Make sure GOOGLE_APPLICATION_CREDENTIALS env var points to your service account key file');
    console.log('- Or ensure you have Application Default Credentials set up');
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
