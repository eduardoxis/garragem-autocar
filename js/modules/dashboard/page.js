import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/auto/+esm';
import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { listRecords } from '../../firebase/firestore.js';
import { getIcon } from '../../components/icons.js';
import { currency } from '../../utils/currency.js';

const profile = await requireAuth({ role:'admin' });
const page = mountShell(profile || { name:'Configuração pendente',role:'admin' }, { title:'Dashboard',active:'dashboard' });
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const asDate = value => value?.toDate ? value.toDate() : value ? new Date(value) : null;
const closedStatuses = ['Finalizado','Entregue','Cancelado','Concluído'];

page.classList.add('reference-dashboard');
page.innerHTML = `
  <div class="setup-banner">Configure o Firebase para carregar os indicadores reais.</div>
  <section class="page-heading page-hero dashboard-reference-hero"><span class="page-hero-icon">${getIcon('dashboard',30)}</span><div><h1>Dashboard</h1><p>Visão geral da operação da oficina.</p></div></section>
  <section class="stats-grid dashboard-reference-stats" id="stats">${Array(4).fill('<article class="card stat-card"><div class="skeleton" style="width:100%"></div></article>').join('')}</section>
  <section class="dashboard-reference-grid">
    <article class="card dashboard-reference-card dashboard-revenue-card"><header class="reference-card-header"><span class="module-list-icon">${getIcon('chart',22)}</span><div><h2>Faturamento mensal</h2><p>Total de receitas da oficina nos últimos 12 meses.</p></div><select class="select reference-year" id="chart-year"><option>${new Date().getFullYear()}</option></select></header><div class="reference-chart-body"><canvas id="revenue-chart"></canvas></div></article>
    <article class="card dashboard-reference-card dashboard-status-card"><header class="reference-card-header"><span class="module-list-icon">${getIcon('chart',22)}</span><div><h2>Status das Ordens de Serviço</h2><p>Distribuição das OS no momento.</p></div></header><div class="status-chart-layout"><div class="status-chart-wrap"><canvas id="status-chart"></canvas></div><div class="status-legend" id="status-legend"></div></div></article>
  </section>
  <section class="card recent-services-card"><header class="reference-card-header"><span class="module-list-icon">${getIcon('clock',22)}</span><div><h2>Atendimentos recentes</h2><p>Últimas ordens de serviço registradas na oficina.</p></div><a class="btn reference-see-all" href="#ordens-servico">Ver todas</a></header><div id="recent-orders"><div class="empty"><div class="skeleton" style="width:220px"></div></div></div></section>`;

if (profile) {
  const recordsFor = async collection => { try { return (await listRecords(collection, profile.companyId, { pageSize:1000 })).records; } catch (error) { console.error(error); return []; } };
  const [vehicles, orders, payments, products] = await Promise.all([recordsFor('vehicles'),recordsFor('serviceOrders'),recordsFor('payments'),recordsFor('products')]);
  const now = new Date();
  const activeOrders = orders.filter(item => !closedStatuses.includes(item.status));
  const revenueMonth = payments.filter(item => { const date=asDate(item.paidAt||item.createdAt||item.dueDate); return item.type==='Receita' && item.status!=='Cancelado' && date && date.getMonth()===now.getMonth() && date.getFullYear()===now.getFullYear(); }).reduce((sum,item)=>sum+Number(item.amount||0),0);
  const lowStock = products.filter(item=>Number(item.minimumStock)>0&&Number(item.quantity)<=Number(item.minimumStock));
  const stats = [{icon:'file',label:'OS em andamento',value:activeOrders.length,tone:'orange'},{icon:'car',label:'Veículos na oficina',value:activeOrders.filter(item=>item.vehicle||item.plate).length,tone:'orange'},{icon:'money',label:'Faturamento do mês',value:currency(revenueMonth),tone:'green'},{icon:'box',label:'Estoque baixo',value:lowStock.length,tone:'orange'}];
  page.querySelector('#stats').innerHTML = stats.map(item=>`<article class="card stat-card metric-card metric-card--${item.tone}"><span class="stat-icon">${getIcon(item.icon,24)}</span><div><small>${item.label}</small><strong>${item.value}</strong><span>Dados atualizados da oficina</span></div></article>`).join('');

  const months = Array.from({length:12},(_,index)=>new Date(now.getFullYear(),index,1));
  const monthlyRevenue = months.map(month=>payments.filter(item=>{ const date=asDate(item.paidAt||item.createdAt||item.dueDate); return item.type==='Receita'&&item.status!=='Cancelado'&&date&&date.getMonth()===month.getMonth()&&date.getFullYear()===month.getFullYear(); }).reduce((sum,item)=>sum+Number(item.amount||0),0));
  new Chart(page.querySelector('#revenue-chart'),{type:'line',data:{labels:months.map(month=>month.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')),datasets:[{label:'Faturamento',data:monthlyRevenue,borderColor:'#ff4d0b',backgroundColor:'rgba(255,77,11,.1)',fill:true,tension:.32,pointRadius:4,pointBackgroundColor:'#fff',pointBorderColor:'#ff4d0b',pointBorderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'#edf1f6'},ticks:{color:'#667085',font:{size:10}}},y:{beginAtZero:true,grid:{color:'#e9eef5'},ticks:{color:'#667085',font:{size:10},callback:value=>currency(value)}}}}});

  const groups = [{label:'Em andamento',statuses:['Em execução','Entrada realizada','Diagnóstico realizado'],color:'#ff4d0b'},{label:'Aguardando peças',statuses:['Aguardando peças'],color:'#fdb022'},{label:'Aguardando aprovação',statuses:['Aguardando aprovação','Orçamento enviado'],color:'#2e90fa'},{label:'Concluídas',statuses:['Finalizado','Entregue','Concluído'],color:'#12b76a'},{label:'Canceladas',statuses:['Cancelado'],color:'#f04438'}].map(group=>({...group,count:orders.filter(item=>group.statuses.includes(item.status)).length}));
  const totalOrders = groups.reduce((sum,item)=>sum+item.count,0);
  new Chart(page.querySelector('#status-chart'),{type:'doughnut',data:{labels:groups.map(item=>item.label),datasets:[{data:groups.map(item=>item.count),backgroundColor:groups.map(item=>item.color),borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'67%',plugins:{legend:{display:false}}}});
  page.querySelector('#status-legend').innerHTML=groups.map(item=>`<div><span style="--legend-color:${item.color}"></span><small>${item.label}</small><strong>${item.count}</strong><em>${totalOrders?Math.round(item.count/totalOrders*100):0}%</em></div>`).join('');

  const recent = [...orders].sort((a,b)=>(asDate(b.createdAt)?.getTime()||0)-(asDate(a.createdAt)?.getTime()||0)).slice(0,5);
  page.querySelector('#recent-orders').innerHTML = recent.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nº OS</th><th>Cliente</th><th>Veículo</th><th>Serviço</th><th>Status</th><th>Entrada</th><th>Previsão</th><th>Valor</th></tr></thead><tbody>${recent.map(item=>`<tr><td><strong>${escapeHtml(item.code||'—')}</strong></td><td>${escapeHtml(item.customerName||'—')}</td><td>${escapeHtml(item.vehicle||item.plate||'—')}</td><td>${escapeHtml(item.service||item.diagnosis||'—')}</td><td><span class="badge">${escapeHtml(item.status||'—')}</span></td><td>${escapeHtml(String(item.entryDate||'—').slice(0,10))}</td><td>${escapeHtml(String(item.forecastDate||'—').slice(0,10))}</td><td><strong>${currency(item.total||0)}</strong></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty compact-empty"><strong>Nenhum atendimento registrado</strong><p>As ordens de serviço aparecerão aqui.</p></div>';
} else {
  page.querySelector('#stats').innerHTML='';
  page.querySelector('#recent-orders').innerHTML='<div class="empty compact-empty">Configure o Firebase para visualizar os dados.</div>';
}
