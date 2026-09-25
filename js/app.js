import { logout } from './firebase/authentication.js';
import { createNavbar } from './components/navbar.js';
import { createMobileNav, createSidebar } from './components/sidebar.js';
import { createToast } from './components/toast.js';

export function mountShell(profile, { title, active, notifications = 0 }) {
  const root = document.querySelector('#app');
  root.innerHTML = `${createSidebar(profile, active)}<main class="main">${createNavbar(title, notifications)}<div id="page-content" class="page"></div></main>${createMobileNav(profile, active)}`;
  root.onclick = async event => {
    const target = event.target.closest('[data-action="logout"]');
    if (!target) return;
    event.preventDefault();
    await logout();
    location.replace('/login.html');
  };
  return root.querySelector('#page-content');
}

export function setupErrorBoundary() {
  if (window.__errorBoundaryReady) return;
  window.__errorBoundaryReady = true;
  window.addEventListener('unhandledrejection', event => {
    console.error(event.reason);
    createToast('Não foi possível concluir a operação. Tente novamente.', 'error');
  });
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/service-worker.js').catch(console.error);
