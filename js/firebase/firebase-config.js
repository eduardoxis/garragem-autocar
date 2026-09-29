import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyDqYz5K62d-oFHou8a7PP7ml3UAqa8UGOo',
  authDomain: 'garragem-autocar.firebaseapp.com',
  projectId: 'garragem-autocar',
  messagingSenderId: '181808845708',
  appId: '1:181808845708:web:ebd452d12c56919e0bfca9'
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some(value => value.startsWith('SUBSTITUA_'));
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
