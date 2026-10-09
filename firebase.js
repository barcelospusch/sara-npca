import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([key]) => key !== "databaseURL")
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(
    `Configuração Firebase ausente: ${missingConfig.join(", ")}. Confira o arquivo .env.local.`,
  );
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = firebaseConfig.databaseURL
  ? getDatabase(app, firebaseConfig.databaseURL)
  : getDatabase(app);
const firestore = getFirestore(app);

export { app, auth, database, firestore };
