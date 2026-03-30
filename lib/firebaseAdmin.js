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
      firebaseAdminInitialized = true;
      return admin;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    throw error;
  }

  return admin;
}

export { admin };
