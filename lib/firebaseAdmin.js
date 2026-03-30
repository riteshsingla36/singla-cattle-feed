import admin from 'firebase-admin';

let firebaseAdminInitialized = false;

/**
 * Initialize Firebase Admin SDK with proper credentials
 * Tries multiple methods to get credentials:
 * 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (service account key file path)
 * 2. FIREBASE_SERVICE_ACCOUNT_KEY environment variable (JSON string)
 * 3. Application Default Credentials
 */
export function initializeFirebaseAdmin() {
  if (firebaseAdminInitialized) {
    return admin;
  }

  try {
    // Try to get service account key from environment variable (JSON string)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Firebase Admin initialized with service account from env var');
        firebaseAdminInitialized = true;
        return admin;
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError.message);
      }
    }

    // Try application default credentials (requires GOOGLE_APPLICATION_CREDENTIALS)
    if (!admin.apps.length) {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        ...(projectId && { projectId }),
      });
      console.log('✅ Firebase Admin initialized with Application Default Credentials');
      firebaseAdminInitialized = true;
      return admin;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.log('\n📋 Setup Instructions:');
    console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.log('2. Generate a new private key (JSON)');
    console.log('3. Either:');
    console.log('   a) Set GOOGLE_APPLICATION_CREDENTIALS to the path of the JSON file');
    console.log('   b) Or copy the JSON and set FIREBASE_SERVICE_ACCOUNT_KEY env var');
    console.log('      (On Windows: set FIREBASE_SERVICE_ACCOUNT_KEY={paste-json})');
    throw error;
  }

  return admin;
}

export { admin };
