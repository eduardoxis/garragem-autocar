import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { listRecords, saveRecord } from '../../firebase/firestore.js';
import { createToast } from '../../components/toast.js';

const statuses = ['Entrada realizada','Aguardando diagnóstico','Aguardando aprovação','Aguardando peças','Em execução','Aguardando teste','Finalizado','Aguardando retirada','Entregue'];
const profile = await requireAuth({ role:'admin' });
const page = mountShell(profile || {name:'Configuração pendente',role:'admin'}, {title:'Oficina',active:'oficina'});
page.innerHTML = `<div class="setup-banner">Configure o Firebase para carregar as ordens reais.</div><section class="page-heading"><div><h1>Oficina</h1><p>Arraste as ordens entre as etapas para atualizar o andamento.</p></div><a class="btn btn-primary" href="#ordens-servico">Nova ordem de serviço</a></section><div class="kanban" id="kanban"></div>`;

if (profile) {
  const { records } = await listRecords('serviceOrders',profile.companyId,{pageSize:100});
  const kanban = page.querySelector('#kanban');
  kanban.innerHTML = statuses.map(status=>`<section class="kanban-column" data-status="${status}"><h3>${status}</h3>${records.filter(item=>item.status===status).map(item=>`<article class="kanban-card" draggable="true" data-id="${item.id}"><strong>${item.plate || item.code}</strong><p>${item.vehicle || 'Veículo não informado'}</p><small>${item.customerName || ''}</small></article>`).join('')}</section>`).join('');
  let dragged = null;
  kanban.addEventListener('dragstart',event=>{ dragged=event.target.closest('.kanban-card'); });
  kanban.addEventListener('dragover',event=>event.preventDefault());
  kanban.addEventListener('drop',async event=>{ event.preventDefault(); const column=event.target.closest('.kanban-column'); if(!column||!dragged)return; column.append(dragged); await saveRecord('serviceOrders',profile.companyId,{status:column.dataset.status},dragged.dataset.id); createToast('Ordem de serviço atualizada.'); });
}
