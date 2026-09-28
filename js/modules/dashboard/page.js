import { where, Timestamp } from 'https://cdn.jsdelivr.net/npm/firebase@12.3.0/firebase-firestore.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/auto/+esm';
import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { countRecords } from '../../firebase/firestore.js';
import { getIcon } from '../../components/icons.js';
import { currency } from '../../utils/currency.js';
import { greeting } from '../../utils/date.js';

const profile = await requireAuth({ role:'admin' });
const page = mountShell(profile || { name:'Configuração pendente',role:'admin' }, { title:'Dashboard',active:'dashboard' });
page.innerHTML = `<div class="setup-banner">Configure o Firebase para carregar os indicadores reais.</div><section class="page-heading"><div><h1>Visão geral</h1><p>${greeting(new Date())}, ${profile?.name?.split(' ')[0] || 'administrador'}!</p></div></section><section class="grid stats-grid" id="stats">${Array(4).fill('<article class="card stat-card"><div class="skeleton" style="width:100%"></div></article>').join('')}</section><section class="grid content-grid"><article class="card"><header class="card-header"><h2>Movimento da oficina</h2><select id="chart-period" class="select" style="width:auto"><option value="30">30 dias</option><option value="7">7 dias</option><option value="365">Ano</option></select></header><div class="card-body"><canvas id="revenue-chart" height="110"></canvas></div></article><article class="card"><header class="card-header"><h2>Atenção hoje</h2></header><div class="card-body" id="alerts"><p>Carregando lembretes...</p></div></article></section>`;

if (profile) {
  const [vehicles, quotes, orders, reminders] = await Promise.all([
    countRecords('vehicles',profile.companyId), countRecords('quotes',profile.companyId), countRecords('serviceOrders',profile.companyId),
    countRecords('reminders',profile.companyId,[where('status','==','pending'),where('scheduledAt','<=',Timestamp.now())])
  ]);
  const stats = [
    ['car','Veículos cadastrados',vehicles],['file','Orçamentos abertos',quotes],['wrench','OS em andamento',orders],['money','Faturamento do mês',currency(0)]
  ];
  page.querySelector('#stats').innerHTML = stats.map(([icon,label,value])=>`<article class="card stat-card"><span class="stat-icon">${getIcon(icon)}</span><div><small>${label}</small><strong>${value}</strong></div></article>`).join('');
  page.querySelector('#alerts').innerHTML = `<p><strong>${reminders}</strong> follow-up(s) pendente(s).</p><a class="btn btn-primary" href="#orcamentos?filter=followup">Ver pendências</a>`;
  new Chart(page.querySelector('#revenue-chart'), { type:'line', data:{ labels:['Sem. 1','Sem. 2','Sem. 3','Sem. 4'],datasets:[{label:'Receitas',data:[0,0,0,0],borderColor:'#f47700',backgroundColor:'rgba(244,119,0,.12)',fill:true,tension:.35}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}} });
} else {
  const stats = [['car','Veículos na oficina','—'],['file','Orçamentos abertos','—'],['wrench','OS em andamento','—'],['money','Faturamento do mês','—']];
  page.querySelector('#stats').innerHTML = stats.map(([icon,label,value])=>`<article class="card stat-card"><span class="stat-icon">${getIcon(icon)}</span><div><small>${label}</small><strong>${value}</strong></div></article>`).join('');
  page.querySelector('#alerts').innerHTML = '<p>Os lembretes aparecerão após a configuração do Firebase.</p>';
  page.querySelector('#revenue-chart').replaceWith(Object.assign(document.createElement('div'), { className:'empty', textContent:'Os gráficos usarão os dados reais da oficina.' }));
}
