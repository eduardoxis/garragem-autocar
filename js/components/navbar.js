import { getIcon } from './icons.js';
export const createNavbar = (title, notifications = 0) => {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).format(new Date());
  const date = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  return `<header class="header"><h2>${title}</h2><div class="header-actions"><button class="btn btn-icon notification-button" aria-label="Notificações">${getIcon('bell')}${notifications ? `<span class="notification-count">${notifications}</span>` : ''}</button><div class="header-date">${getIcon('calendar',18)}<span>${date}</span></div></div></header>`;
};
