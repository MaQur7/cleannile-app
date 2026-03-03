import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyAuTF4vIw6ZleU65WGdcIhaMqTFc0uoNI0",
  authDomain: "cleannile-864ad.firebaseapp.com",
  projectId: "cleannile-864ad",
  storageBucket: "cleannile-864ad.firebasestorage.app",
  messagingSenderId: "521489165229",
  appId: "1:521489165229:web:85a56c1f6988de3410cf24"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

export const storage = getStorage(app);
