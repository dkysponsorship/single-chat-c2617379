// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBdFOcXbDjuoTcFZEXYAuto5n66Kjzrl18",
  authDomain: "learnwithdiagram.firebaseapp.com",
  databaseURL: "https://learnwithdiagram-default-rtdb.firebaseio.com",
  projectId: "learnwithdiagram",
  storageBucket: "learnwithdiagram.firebasestorage.app",
  messagingSenderId: "440308160971",
  appId: "1:440308160971:web:db498e2fb7b1b3ee473e4e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;