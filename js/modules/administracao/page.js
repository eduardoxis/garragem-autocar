import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { createModal } from '../../components/modal.js';
import { createToast } from '../../components/toast.js';
import { getIcon } from '../../components/icons.js';
import { listRecords, saveRecord } from '../../firebase/firestore.js';
import { createAuthorizedUser, userCreationMessage } from './modal.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const profile = await requireAuth({ role:'admin' });
const page = mountShell(profile || { name:'Configuração pendente', role:'admin' }, { title:'Administração', active:'administracao' });
page.classList.add('module-page','admin-page');
const cards = [
  ['importacao','file','Importar dados','Clientes, veículos, produtos e fornecedores.'],['auditoria','eye','Auditoria','Histórico das ações dos usuários.'],['lembretes','bell','Lembretes','Prazos, manutenção e mensagens ao cliente.'],['configuracoes','settings','Configurações','Oficina, PDF, WhatsApp e notificações.'],['servicos','wrench','Serviços','Catálogo, categorias, preços e garantia.'],['backup','save','Backup','Baixar e restaurar dados da empresa.']
];
page.innerHTML = `<div class="setup-banner">Configure o Firebase para administrar os usuários e dados da oficina.</div><section class="page-heading page-hero"><span class="page-hero-icon">${getIcon('settings',30)}</span><div><h1>Administração</h1><p>Usuários, preferências, cadastros e segurança da oficina.</p></div></section><section class="admin-summary admin-page-shortcuts">${cards.map(([route,icon,title,description])=>`<a class="admin-card" href="#${route}"><span>${getIcon(icon,24)}</span><strong>${title}</strong><small>${description}</small></a>`).join('')}</section><section class="card admin-users"><header class="card-header"><div><h2>Usuários e permissões</h2><p>Controle quem pode acessar o sistema e os dados da empresa.</p></div><button class="btn btn-primary" id="new-admin-user" type="button">${getIcon('plus')} Novo usuário</button></header><div id="admin-users-list"><div class="empty"><div class="skeleton" style="width:220px"></div></div></div></section>`;

if (profile) {
  const list = page.querySelector('#admin-users-list');
  const loadUsers = async () => {
    const { records } = await listRecords('users', profile.companyId, { pageSize:100 });
    list.innerHTML = records.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>${records.map(user => `<tr><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.email)}</td><td><select class="select user-role" data-user-id="${user.id}" ${user.id===profile.id?'disabled':''}><option value="user" ${user.role==='user'?'selected':''}>Usuário</option><option value="admin" ${user.role==='admin'?'selected':''}>Administrador</option></select></td><td><span class="badge ${user.active ? 'badge-success' : 'badge-danger'}">${user.active ? 'Ativo' : 'Inativo'}</span></td><td>${user.id===profile.id?'—':`<button class="btn" data-toggle-user="${user.id}" data-active="${user.active}">${user.active?'Desativar':'Ativar'}</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nenhum usuário encontrado.</div>';
  };
  list.addEventListener('change', async event => { const select=event.target.closest('.user-role');if(!select)return;await saveRecord('users',profile.companyId,{role:select.value},select.dataset.userId);createToast('Permissão atualizada.'); });
  list.addEventListener('click', async event => { const button=event.target.closest('[data-toggle-user]');if(!button)return;await saveRecord('users',profile.companyId,{active:button.dataset.active!=='true'},button.dataset.toggleUser);createToast('Acesso atualizado.');await loadUsers(); });
  page.querySelector('#new-admin-user').addEventListener('click', () => {
    const form = document.createElement('form'); form.className = 'form-grid';
    form.innerHTML = '<div class="field"><label>Nome</label><input class="input" name="name" maxlength="120" required></div><div class="field"><label>E-mail</label><input class="input" name="email" type="email" maxlength="254" required></div><div class="field"><label>Senha temporária</label><input class="input" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></div><div class="field"><label>Perfil</label><select class="select" name="role"><option value="user">Usuário</option><option value="admin">Administrador</option></select></div><p class="form-error full" role="alert" hidden></p>';
    createModal({ title:'Novo usuário autorizado', content:form, confirmText:'Criar usuário', onConfirm:async () => { if (!form.reportValidity()) return false; const error=form.querySelector('.form-error');error.hidden=true;const values=Object.fromEntries(new FormData(form));values.name=String(values.name).trim();values.email=String(values.email).trim().toLowerCase();try{await createAuthorizedUser({...values,companyId:profile.companyId});createToast('Usuário criado com sucesso.');await loadUsers();}catch(cause){console.error(cause);error.textContent=userCreationMessage(cause);error.hidden=false;return false;} } });
  });
  await loadUsers();
}
