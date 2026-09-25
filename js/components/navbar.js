import { getIcon } from './icons.js';
export const createNavbar = (title, notifications = 0) => `<header class="header"><h2>${title}</h2><div class="header-actions"><button class="btn btn-icon notification-button" aria-label="Notificações">${getIcon('bell')}${notifications ? `<span class="notification-count">${notifications}</span>` : ''}</button></div></header>`;
