import { getIcon } from './icons.js';
export const createNavbar = (title, notifications = 0) => {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).format(new Date());
  const date = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  return `<header class="header"><div class="header-leading"><button class="header-menu" type="button" aria-label="Menu"><span></span><span></span><span></span></button><label class="header-search">${getIcon('search',22)}<input aria-label="Pesquisar no sistema" placeholder="Pesquisar..."></label></div><div class="header-actions"><button class="btn btn-icon notification-button" aria-label="Notificações">${getIcon('bell')}${notifications ? `<span class="notification-count">${notifications}</span>` : ''}</button><div class="header-date">${getIcon('calendar',20)}<span>${date}</span></div></div></header>`;
};
