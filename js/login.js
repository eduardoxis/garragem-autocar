import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { auth, isFirebaseConfigured } from './firebase/firebase-config.js';
import { login, recoverPassword } from './firebase/authentication.js';
import { getProfile } from './firebase/firestore.js';
import { getIcon } from './components/icons.js';
import { createToast } from './components/toast.js';

const form = document.querySelector('#login-form');
const error = document.querySelector('#login-error');
const password = document.querySelector('#password');
const toggle = document.querySelector('#toggle-password');
const loginParams = new URLSearchParams(location.search);
if (loginParams.get('denied') === '1') error.textContent = 'Sua conta não possui permissão para acessar essa área.';
if (loginParams.get('inactive') === '1') error.textContent = 'Esta conta está inativa. Procure o administrador.';
toggle.innerHTML = getIcon('eye');
toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.innerHTML = getIcon(show ? 'eyeOff' : 'eye');
  toggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
});

let redirecting = false;
const userRoutes = new Set(['clientes', 'orcamentos', 'perfil']);

function destinationFor(profile) {
  const returnTo = loginParams.get('return');
  const validReturn = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//');
  if (profile.role !== 'user') return validReturn ? returnTo : '/index.html#dashboard';
  const route = validReturn ? returnTo.split('#')[1]?.split('?')[0] : '';
  return userRoutes.has(route) ? returnTo : '/index.html#clientes';
}

async function redirectAuthorizedUser(user) {
  if (redirecting) return;
  try {
    const profile = await getProfile(user.uid);
    if (!profile || profile.active !== true) {
      await auth.signOut();
      error.textContent = 'Esta conta está inativa. Procure o administrador.';
      return;
    }
    redirecting = true;
    location.replace(destinationFor(profile));
  } catch (reason) {
    console.error('Não foi possível validar o acesso', reason);
    error.textContent = 'Não foi possível validar sua conta. Tente novamente.';
  }
}

if (isFirebaseConfigured) onAuthStateChanged(auth, user => { if (user) redirectAuthorizedUser(user); });
else document.documentElement.dataset.setupRequired = 'true';

form.addEventListener('submit', async event => {
  event.preventDefault();
  error.textContent = '';
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await login(form.email.value, password.value, form.remember.checked);
  } catch { error.textContent = 'E-mail ou senha inválidos.'; }
  finally { button.disabled = false; }
});

document.querySelector('#forgot-password').addEventListener('click', async () => {
  if (!form.email.value) { error.textContent = 'Informe seu e-mail para recuperar a senha.'; return; }
  try { await recoverPassword(form.email.value); createToast('Link de recuperação enviado para seu e-mail.'); }
  catch { createToast('Não foi possível enviar a recuperação.', 'error'); }
});
