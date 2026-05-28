// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC9KduorN2KPVhTRNBcKuddJe52dFd7SDU",
  authDomain: "telegram-818ec.firebaseapp.com",
  projectId: "telegram-818ec",
  storageBucket: "telegram-818ec.firebasestorage.app",
  messagingSenderId: "403661572454",
  appId: "1:403661572454:web:df2967cb39653f0a8020a7",
  measurementId: "G-MCPD40X4BK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);