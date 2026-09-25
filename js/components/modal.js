import { getIcon } from './icons.js';

export function createModal({ title, content, confirmText = 'Salvar', cancelText = 'Cancelar', danger = false, onConfirm, onCancel }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header class="modal-header"><h2 id="modal-title">${title}</h2><button class="btn btn-icon modal-close" aria-label="Fechar">${getIcon('x')}</button></header>
    <div class="modal-body"></div>
    <footer class="modal-footer"><button class="btn modal-cancel">${cancelText}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'} modal-confirm">${confirmText}</button></footer>
  </section>`;
  backdrop.querySelector('.modal-body').append(typeof content === 'string' ? document.createRange().createContextualFragment(content) : content);
  const close = () => backdrop.remove();
  backdrop.querySelector('.modal-close').addEventListener('click', close);
  backdrop.querySelector('.modal-cancel').addEventListener('click', () => { close(); onCancel?.(); });
  backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
  backdrop.querySelector('.modal-confirm').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try { if (await onConfirm?.(backdrop) !== false) close(); } finally { button.disabled = false; }
  });
  document.body.append(backdrop);
  backdrop.querySelector('input,select,textarea,button')?.focus();
  return { element: backdrop, close };
}

export function createConfirmDialog(message, onConfirm) {
  return createModal({ title: 'Confirmar ação', content: `<p>${message}</p>`, confirmText: 'Confirmar', danger: true, onConfirm });
}
