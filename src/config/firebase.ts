import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// ... (config come prima) ...

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// FORZA IL TIMEOUT IMMEDIATO (3 secondi max)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("Multitab persistence failed");
    } else if (err.code == 'unimplemented') {
      console.warn("Browser non supporta persistence");
    }
  });
} catch (e) {
  console.error("Errore persistenza:", e);
}