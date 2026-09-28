import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { auth, isFirebaseConfigured } from './firebase/firebase-config.js';
import { getProfile } from './firebase/firestore.js';

const userAllowedPages = new Set(['clientes', 'orcamentos', 'perfil']);

export function requireAuth({ role = null, module = document.body.dataset.module } = {}) {
  return new Promise(resolve => {
    if (!isFirebaseConfigured) {
      document.documentElement.dataset.setupRequired = 'true';
      resolve(null);
      return;
    }
    onAuthStateChanged(auth, async user => {
      if (!user) {
        location.replace(`/login.html?return=${encodeURIComponent(`${location.pathname}${location.hash}`)}`);
        return;
      }
      const profile = await getProfile(user.uid);
      if (!profile || profile.active !== true) {
        await auth.signOut();
        location.replace('/login.html?inactive=1');
        return;
      }
      const denied = (role && profile.role !== role) || (profile.role === 'user' && module && !userAllowedPages.has(module));
      if (denied) {
        location.replace('/login.html?denied=1');
        return;
      }
      window.currentUser = { ...profile, uid: user.uid };
      document.dispatchEvent(new CustomEvent('auth:ready', { detail: window.currentUser }));
      resolve(window.currentUser);
    });
  });
}
