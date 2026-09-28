import { onAuthStateChanged } from 'https://cdn.jsdelivr.net/npm/firebase@12.3.0/firebase-auth.js';
import { auth, isFirebaseConfigured } from './firebase/firebase-config.js';
import { login, recoverPassword } from './firebase/authentication.js';
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

if (isFirebaseConfigured) onAuthStateChanged(auth, user => { if (user) location.replace('/index.html#dashboard'); });
else document.documentElement.dataset.setupRequired = 'true';

form.addEventListener('submit', async event => {
  event.preventDefault();
  error.textContent = '';
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await login(form.email.value, password.value, form.remember.checked);
    const returnTo = loginParams.get('return');
    location.replace(returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/index.html#dashboard');
  } catch { error.textContent = 'E-mail ou senha inválidos.'; }
  finally { button.disabled = false; }
});

document.querySelector('#forgot-password').addEventListener('click', async () => {
  if (!form.email.value) { error.textContent = 'Informe seu e-mail para recuperar a senha.'; return; }
  try { await recoverPassword(form.email.value); createToast('Link de recuperação enviado para seu e-mail.'); }
  catch { createToast('Não foi possível enviar a recuperação.', 'error'); }
});
