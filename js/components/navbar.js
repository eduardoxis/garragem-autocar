import { getIcon } from './icons.js';
export const createNavbar = (title, notifications = 0) => {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).format(new Date());
  const date = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  return `<header class="header"><div class="header-leading"><form class="header-search" id="global-search-form">${getIcon('search',22)}<input id="global-search" aria-label="Pesquisar no sistema" placeholder="Pesquisar por cliente, placa, CPF, telefone ou número..."></form></div><div class="header-actions"><button class="btn btn-icon notification-button" id="notification-button" type="button" aria-label="Notificações" aria-expanded="false">${getIcon('bell')}<span class="notification-count${notifications ? '' : ' is-hidden'}" id="notification-count">${notifications || 0}</span></button><div class="header-date">${getIcon('calendar',20)}<span>${date}</span></div></div></header>`;
};
