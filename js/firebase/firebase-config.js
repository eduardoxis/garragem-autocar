import { initializeApp } from 'https://cdn.jsdelivr.net/npm/firebase@12.3.0/app/+esm';
import { getAuth } from 'https://cdn.jsdelivr.net/npm/firebase@12.3.0/auth/+esm';
import { getFirestore } from 'https://cdn.jsdelivr.net/npm/firebase@12.3.0/firestore/+esm';

const firebaseConfig = {
  apiKey: 'AIzaSyDqYz5K62d-oFHou8a7PP7ml3UAqa8UGOo',
  authDomain: 'garragem-autocar.firebaseapp.com',
  projectId: 'garragem-autocar',
  storageBucket: 'garragem-autocar.firebasestorage.app',
  messagingSenderId: '181808845708',
  appId: '1:181808845708:web:ebd452d12c56919e0bfca9'
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some(value => value.startsWith('SUBSTITUA_'));
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
