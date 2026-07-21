import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAEWfziTrgVk1cTIy8p30Ss9SoSC7MQ9Go",
  authDomain: "sara-npca.firebaseapp.com",
  projectId: "sara-npca",
  storageBucket: "sara-npca.firebasestorage.app",
  messagingSenderId: "473302584738",
  appId: "1:473302584738:web:32c00f65f7cc2a646036fb",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };
