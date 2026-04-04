import admin from 'firebase-admin';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

const keyPath = resolve(process.cwd(), 'service-account-key.json');
if (!existsSync(keyPath)) {
  console.error('service-account-key.json not found at', keyPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();
const collectionName = process.argv[2] || 'orders';
const ordersRef = db.collection(collectionName);

(async () => {
  try {
    const snapshot = await ordersRef.get();
    if (snapshot.empty) {
      console.log('No orders to delete.');
    } else {
      const batchSize = 499;
      const docs = snapshot.docs;
      let deleted = 0;

      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch();
        const slice = docs.slice(i, i + batchSize);
        for (const doc of slice) {
          batch.delete(doc.ref);
        }
        await batch.commit();
        deleted += slice.length;
        console.log(`Deleted ${deleted} / ${docs.length}`);
      }
      console.log(`Done. Deleted ${deleted} documents from "${collectionName}" collection.`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
})();
