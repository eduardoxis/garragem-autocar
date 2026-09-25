import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { auth } from './firebase-config.js';

export async function login(email, password, remember) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export const logout = () => signOut(auth);
export const recoverPassword = email => sendPasswordResetEmail(auth, email.trim());
