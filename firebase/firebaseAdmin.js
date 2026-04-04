import admin from 'firebase-admin';

/**
 * Centralized Firebase Admin initialization.
 * Shared by all server routes — import { db, messaging } to use.
 * Always loads service-account-key.json from project root (ignoring env vars).
 */
if (!admin.apps.length) {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    const fs = require('fs');
    const path = require('path');
    const keyPath = path.join(process.cwd(), 'service-account-key.json');

    if (!fs.existsSync(keyPath)) {
      throw new Error('firebaseAdmin: FIREBASE_SERVICE_ACCOUNT env var not set and service-account-key.json not found at ' + keyPath);
    }

    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }

  console.log('🔥 Firebase Admin init | Project:', serviceAccount.project_id);

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
