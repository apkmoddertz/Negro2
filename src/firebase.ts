// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_zOdvMRrgqKymsV-lfBSCef-8OL6BlDQ",
  authDomain: "smtp-394022.firebaseapp.com",
  databaseURL: "https://gmail-smtp-394022-default-rtdb.firebaseio.com",
  projectId: "gmail-smtp-394022",
  storageBucket: "gmail-smtp-394022.firebasestorage.app",
  messagingSenderId: "974271327944",
  appId: "1:974271327944:web:0b435d8bd8e6b5f7223ffd",
  measurementId: "G-CH3FMRB9QC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);

