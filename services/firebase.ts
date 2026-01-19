import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCVik6YckrDr-9ui1jZ_HD5ncZ2gVI5uuE",
  authDomain: "deep-shop-new.firebaseapp.com",
  projectId: "deep-shop-new",
  storageBucket: "deep-shop-new.firebasestorage.app",
  messagingSenderId: "172735690953",
  appId: "1:172735690953:web:8af2b389f97853191a3518"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
