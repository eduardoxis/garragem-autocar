import { createModal } from '../../components/modal.js';
import { createToast } from '../../components/toast.js';
import { getIcon } from '../../components/icons.js';
import { listRecords } from '../../firebase/firestore.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

export async function openAdminPanel() {
  const existing = document.querySelector('[data-admin-panel]');
  if (existing) return;
  const profile = window.currentUser;
  if (profile && profile.role !== 'admin') { createToast('Você não possui permissão para acessar a administração.','error'); return; }

  const content = document.createElement('div');
  content.className = 'admin-panel-content';
  content.innerHTML = `<section class="admin-summary"><button type="button" class="admin-card" data-admin-route="importacao"><span>${getIcon('file',24)}</span><strong>Importar dados</strong><small>Clientes, veículos, produtos e fornecedores</small></button><button type="button" class="admin-card" data-admin-route="auditoria"><span>${getIcon('eye',24)}</span><strong>Auditoria</strong><small>Consulte as ações registradas no sistema</small></button><button type="button" class="admin-card" data-admin-route="configuracoes"><span>${getIcon('settings',24)}</span><strong>Configurações</strong><small>Dados e preferências da Garagem Auto Car</small></button></section><section class="card admin-users"><header class="card-header"><div><h2>Usuários autorizados</h2><p>Somente estas contas podem acessar o sistema interno.</p></div><button class="btn btn-primary" id="new-admin-user">${getIcon('plus')} Novo usuário</button></header><div id="admin-users-list"><div class="empty"><div class="skeleton" style="width:220px"></div></div></div></section>`;
  const modal = createModal({title:'Painel administrativo',content,confirmText:'Fechar painel',cancelText:'Voltar',onConfirm:()=>true});
  modal.element.dataset.adminPanel = 'true';
  modal.element.querySelector('.modal').classList.add('admin-panel-modal');

  content.addEventListener('click', event => {
    const routeButton = event.target.closest('[data-admin-route]');
    if (!routeButton) return;
    modal.close(); location.hash = `#${routeButton.dataset.adminRoute}`;
  });

  const list = content.querySelector('#admin-users-list');
  const newUser = content.querySelector('#new-admin-user');
  if (!profile) {
    list.innerHTML = '<div class="empty"><div><strong>Firebase ainda não configurado</strong><p>As contas autorizadas aparecerão aqui após a configuração segura.</p></div></div>';
    newUser.disabled = true;
    return;
  }

  const loadUsers = async () => {
    const {records} = await listRecords('users',profile.companyId,{pageSize:100});
    list.innerHTML = records.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th></tr></thead><tbody>${records.map(user=>`<tr><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.email)}</td><td><span class="badge">${escapeHtml(user.role)}</span></td><td><span class="badge ${user.active?'badge-success':'badge-danger'}">${user.active?'Ativo':'Inativo'}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nenhum usuário encontrado.</div>';
  };
  newUser.addEventListener('click',()=>{
    const form=document.createElement('form'); form.className='form-grid';
    form.innerHTML='<div class="field"><label>Nome</label><input class="input" name="name" maxlength="120" required></div><div class="field"><label>E-mail</label><input class="input" name="email" type="email" maxlength="254" required></div><div class="field"><label>Senha temporária</label><input class="input" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></div><div class="field"><label>Perfil</label><select class="select" name="role"><option value="user">Usuário</option><option value="admin">Administrador</option></select></div>';
    createModal({title:'Novo usuário autorizado',content:form,confirmText:'Criar usuário',onConfirm:async()=>{
      if(!form.reportValidity())return false;
      const {auth}=await import('../../firebase/firebase-config.js');
      const response=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${await auth.currentUser.getIdToken()}`},body:JSON.stringify({...Object.fromEntries(new FormData(form)),companyId:profile.companyId})});
      if(!response.ok)throw new Error('Falha ao criar usuário');
      createToast('Usuário criado com sucesso.'); await loadUsers();
    }});
  });
  await loadUsers();
}
