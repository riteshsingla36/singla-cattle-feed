import admin from 'firebase-admin';

/**
 * Centralized Firebase Admin initialization.
 * In development: reads service-account-key.json directly from project root.
 * In production (Vercel): reads FIREBASE_SERVICE_ACCOUNT env var as JSON string.
 */
if (!admin.apps.length) {
  let serviceAccount;

  // Prefer file-based approach for local dev (avoids multiline .env issues)
  const fs = require('fs');
  const path = require('path');
  const keyPath = path.join(process.cwd(), 'service-account-key.json');

  if (fs.existsSync(keyPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    console.log('🔑 Loaded from service-account-key.json');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('🔑 Loaded from FIREBASE_SERVICE_ACCOUNT env var');
    } catch (e) {
      throw new Error(
        `firebaseAdmin: FIREBASE_SERVICE_ACCOUNT is not valid JSON.\n` +
        `Parse error: ${e.message}`
      );
    }
  } else {
    throw new Error('firebaseAdmin: No credentials found. Add service-account-key.json or set FIREBASE_SERVICE_ACCOUNT.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

export const db = admin.firestore();
export const messaging = admin.messaging();

// Log which project we're connected to on first use of db
let _dbLogged = false;
const _originalCollection = db.collection;
db.collection = function (...args) {
  if (!_dbLogged) {
    _dbLogged = true;
    console.log('📂 Firestore query | Project:', admin.app().options.projectId);
  }
  return _originalCollection.apply(this, args);
};
