import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'SUBSTITUA_FIREBASE_API_KEY',
  authDomain: 'SUBSTITUA_FIREBASE_AUTH_DOMAIN',
  projectId: 'SUBSTITUA_FIREBASE_PROJECT_ID',
  appId: 'SUBSTITUA_FIREBASE_APP_ID',
  messagingSenderId: 'SUBSTITUA_FIREBASE_MESSAGING_SENDER_ID'
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some(value => value.startsWith('SUBSTITUA_'));
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
