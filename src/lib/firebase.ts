import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity Test (as per guidelines)
async function testConnection() {
  try {
    console.log("Testing Firestore connection to database:", firebaseConfig.firestoreDatabaseId);
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test completed.");
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    console.error("Firestore connectivity check failed:", err.code, err.message);
    if (err.code === 'unavailable') {
      console.warn("Firestore backend is currently unavailable. This might be a temporary network issue or the database might still be provisioning.");
    }
  }
}
testConnection();

// Versioning Logic
import { getDoc, setDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function incrementPlatformVersion(description: string = 'تحديث النظام') {
  const versionDocRef = doc(db, 'settings', 'system');
  const logsRef = collection(db, 'settings', 'system', 'changelog');
  
  try {
    const docSnap = await getDoc(versionDocRef);
    let currentVersion = 1.00;
    
    if (!docSnap.exists()) {
      await setDoc(versionDocRef, { version: 1.01, lastUpdate: serverTimestamp() });
      currentVersion = 1.01;
    } else {
      await setDoc(versionDocRef, { 
        version: increment(0.01),
        lastUpdate: serverTimestamp()
      }, { merge: true });
      // Get the new version for the log
      const updatedSnap = await getDoc(versionDocRef);
      currentVersion = updatedSnap.data()?.version || currentVersion;
    }

    // Add to changelog
    await addDoc(logsRef, {
      version: currentVersion.toFixed(2),
      description,
      timestamp: serverTimestamp(),
      userId: auth.currentUser?.uid
    });
  } catch (error) {
    console.error("Error incrementing platform version:", error);
  }
}
