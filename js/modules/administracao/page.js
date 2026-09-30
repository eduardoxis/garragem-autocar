import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { createModal } from '../../components/modal.js';
import { createToast } from '../../components/toast.js';
import { getIcon } from '../../components/icons.js';
import { listRecords } from '../../firebase/firestore.js';
import { createAuthorizedUser, userCreationMessage } from './modal.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[character]));
const profile = await requireAuth({ role:'admin' });
const page = mountShell(profile || { name:'Configuração pendente', role:'admin' }, { title:'Administração', active:'administracao' });

page.classList.add('module-page','admin-page');
page.innerHTML = `<div class="setup-banner">Configure o Firebase para administrar os usuários e dados da oficina.</div><section class="page-heading page-hero"><span class="page-hero-icon">${getIcon('settings',30)}</span><div><h1>Administração</h1><p>Gerencie usuários, dados e preferências da oficina.</p></div></section><section class="admin-summary admin-page-shortcuts"><a class="admin-card" href="#importacao"><span>${getIcon('file',24)}</span><strong>Importar dados</strong><small>Clientes, veículos, produtos e fornecedores.</small></a><a class="admin-card" href="#auditoria"><span>${getIcon('eye',24)}</span><strong>Auditoria</strong><small>Consulte ações feitas dentro do sistema.</small></a><a class="admin-card" href="#lembretes"><span>${getIcon('bell',24)}</span><strong>Lembretes</strong><small>Follow-ups e retornos programados.</small></a><a class="admin-card" href="#configuracoes"><span>${getIcon('settings',24)}</span><strong>Configurações</strong><small>Dados e preferências da Garagem Auto Car.</small></a></section><section class="card admin-users"><header class="card-header"><div><h2>Usuários autorizados</h2><p>Somente estas contas podem acessar o sistema interno.</p></div><button class="btn btn-primary" id="new-admin-user" type="button">${getIcon('plus')} Novo usuário</button></header><div id="admin-users-list"><div class="empty"><div class="skeleton" style="width:220px"></div></div></div></section>`;

if (profile) {
  const list = page.querySelector('#admin-users-list');
  const loadUsers = async () => {
    const { records } = await listRecords('users', profile.companyId, { pageSize:100 });
    list.innerHTML = records.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th></tr></thead><tbody>${records.map(user => `<tr><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.email)}</td><td><span class="badge">${escapeHtml(user.role)}</span></td><td><span class="badge ${user.active ? 'badge-success' : 'badge-danger'}">${user.active ? 'Ativo' : 'Inativo'}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nenhum usuário encontrado.</div>';
  };
  page.querySelector('#new-admin-user').addEventListener('click', () => {
    const form = document.createElement('form');
    form.className = 'form-grid';
    form.innerHTML = '<div class="field"><label>Nome</label><input class="input" name="name" maxlength="120" required></div><div class="field"><label>E-mail</label><input class="input" name="email" type="email" maxlength="254" required></div><div class="field"><label>Senha temporária</label><input class="input" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></div><div class="field"><label>Perfil</label><select class="select" name="role"><option value="user">Usuário</option><option value="admin">Administrador</option></select></div><p class="form-error full" role="alert" hidden></p>';
    createModal({ title:'Novo usuário autorizado', content:form, confirmText:'Criar usuário', onConfirm:async () => {
      if (!form.reportValidity()) return false;
      const errorElement = form.querySelector('.form-error');
      errorElement.hidden = true;
      const values = Object.fromEntries(new FormData(form));
      values.name = String(values.name).trim();
      values.email = String(values.email).trim().toLowerCase();
      try { await createAuthorizedUser({ ...values, companyId:profile.companyId }); createToast('Usuário criado com sucesso.'); await loadUsers(); }
      catch (error) { console.error(error); errorElement.textContent = userCreationMessage(error); errorElement.hidden = false; return false; }
    }});
  });
  await loadUsers();
}
