import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Versioning Logic
import { doc, getDoc, setDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
