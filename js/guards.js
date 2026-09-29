import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { auth, isFirebaseConfigured } from './firebase/firebase-config.js';
import { getProfile } from './firebase/firestore.js';

const allowedPagesByRole = {
  user: new Set(['clientes', 'orcamentos', 'perfil']),
  atendente: new Set(['clientes', 'veiculos', 'orcamentos', 'agenda', 'perfil']),
  mecanico: new Set(['oficina', 'ordens-servico', 'perfil']),
  financeiro: new Set(['financeiro', 'perfil'])
};

export function requireAuth({ role = null, roles = null, module = document.body.dataset.module } = {}) {
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
      const allowedPages = allowedPagesByRole[profile.role];
      const denied = (role && profile.role !== role) || (roles && !roles.includes(profile.role)) || (allowedPages && module && !allowedPages.has(module));
      if (denied) {
        if (allowedPages) {
          const firstPage = [...allowedPages][0] || 'perfil';
          location.replace(`/index.html#${firstPage}`);
          return;
        }
        location.replace('/login.html?denied=1');
        return;
      }
      window.currentUser = { ...profile, uid: user.uid };
      document.dispatchEvent(new CustomEvent('auth:ready', { detail: window.currentUser }));
      resolve(window.currentUser);
    });
  });
}
