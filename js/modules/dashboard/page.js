import { where, Timestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/auto/+esm';
import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { countRecords } from '../../firebase/firestore.js';
import { getIcon } from '../../components/icons.js';
import { currency } from '../../utils/currency.js';

const profile = await requireAuth({ role:'admin' });
const page = mountShell(profile || { name:'Configuração pendente',role:'admin' }, { title:'Dashboard',active:'dashboard' });
const rawFirstName = profile?.name?.trim().split(/\s+/)[0] || 'administrador';
const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLocaleLowerCase('pt-BR');

page.classList.add('dashboard-page');
page.innerHTML = `
  <div class="setup-banner">Configure o Firebase para carregar os indicadores reais.</div>

  <section class="dashboard-intro">
    <div class="dashboard-welcome">
      <span class="dashboard-eyebrow">Bem-vindo de volta</span>
      <h1>Olá, ${firstName}! <span aria-hidden="true">👋</span></h1>
      <p>Aqui está um resumo da sua oficina hoje.</p>
    </div>
    <aside class="workshop-banner" aria-label="Gestão completa para sua oficina">
      <span class="workshop-banner__line" aria-hidden="true"></span>
      <div class="workshop-banner__copy">
        <strong>Gestão completa<br>para sua oficina</strong>
        <span>Organize, acompanhe e faça sua oficina crescer ainda mais.</span>
      </div>
      <img src="assets/garagem-auto-car-logo.png" alt="" aria-hidden="true">
    </aside>
  </section>

  <section class="stats-grid dashboard-stats" id="stats" aria-label="Indicadores principais">
    ${Array(4).fill('<article class="card stat-card"><div class="skeleton" style="width:100%"></div></article>').join('')}
  </section>

  <section class="dashboard-content-grid">
    <article class="card chart-card">
      <header class="dashboard-card-header">
        <div class="dashboard-card-title">
          <span class="dashboard-card-icon">${getIcon('chart',25)}</span>
          <div>
            <h2>Movimento da oficina</h2>
            <p>Acompanhe atendimentos, orçamentos e faturamento.</p>
          </div>
        </div>
        <label class="period-filter">
          ${getIcon('calendar',18)}
          <span class="sr-only">Período do gráfico</span>
          <select id="chart-period" class="select">
            <option value="30">Últimos 30 dias</option>
            <option value="7">Últimos 7 dias</option>
            <option value="365">Este ano</option>
          </select>
        </label>
      </header>
      <div class="chart-card__body"><canvas id="revenue-chart"></canvas></div>
    </article>

    <article class="card attention-card">
      <header class="dashboard-card-header">
        <div class="dashboard-card-title">
          <span class="dashboard-card-icon">${getIcon('bell',23)}</span>
          <div><h2>Atenção hoje</h2></div>
        </div>
        <a class="card-header-link" href="#orcamentos?filter=followup">Ver todos →</a>
      </header>
      <div class="attention-card__body" id="alerts"><p>Carregando lembretes...</p></div>
    </article>
  </section>

  <section class="card quick-actions-card">
    <header class="quick-actions-header">
      <span>${getIcon('dashboard',21)}</span>
      <h2>Ações rápidas</h2>
    </header>
    <div class="quick-actions-grid">
      <a class="quick-action quick-action--orange" href="#orcamentos?action=new"><span>${getIcon('file')}</span><strong>Novo orçamento</strong><b>›</b></a>
      <a class="quick-action quick-action--blue" href="#ordens-servico"><span>${getIcon('wrench')}</span><strong>Nova OS</strong><b>›</b></a>
      <a class="quick-action quick-action--green" href="#veiculos"><span>${getIcon('car')}</span><strong>Cadastrar veículo</strong><b>›</b></a>
      <a class="quick-action quick-action--purple" href="#clientes"><span>${getIcon('users')}</span><strong>Cadastrar cliente</strong><b>›</b></a>
      <a class="quick-action quick-action--pink" href="#agenda"><span>${getIcon('calendar')}</span><strong>Agendar serviço</strong><b>›</b></a>
    </div>
  </section>`;

if (profile) {
  const safeCount = async (...args) => {
    try { return await countRecords(...args); }
    catch (error) { console.error(error); return 0; }
  };
  const [vehicles, quotes, orders, reminders] = await Promise.all([
    safeCount('vehicles',profile.companyId), safeCount('quotes',profile.companyId), safeCount('serviceOrders',profile.companyId),
    safeCount('reminders',profile.companyId,[where('status','==','pending'),where('scheduledAt','<=',Timestamp.now())])
  ]);
  const stats = [
    { icon:'car', label:'Veículos cadastrados', value:vehicles, note:'Total na base', tone:'orange', href:'#veiculos' },
    { icon:'file', label:'Orçamentos abertos', value:quotes, note:'Aguardando aprovação', tone:'blue', href:'#orcamentos' },
    { icon:'wrench', label:'OS em andamento', value:orders, note:'Em execução', tone:'green', href:'#ordens-servico' },
    { icon:'money', label:'Faturamento do mês', value:currency(0), note:'Receita total', tone:'purple', href:'#financeiro' }
  ];
  page.querySelector('#stats').innerHTML = stats.map(stat=>`
    <a class="card stat-card stat-card--${stat.tone}" href="${stat.href}">
      <span class="stat-icon">${getIcon(stat.icon,23)}</span>
      <div class="stat-card__content"><small>${stat.label}</small><strong>${stat.value}</strong><span>${stat.note}</span></div>
      <b class="stat-card__arrow" aria-hidden="true">›</b>
    </a>`).join('');
  page.querySelector('#alerts').innerHTML = reminders
    ? `<div class="attention-state attention-state--pending"><span>${getIcon('bell',42)}</span><strong>${reminders} follow-up(s) pendente(s)</strong><p>Existem contatos que precisam da sua atenção.</p><a class="btn btn-primary" href="#orcamentos?filter=followup">Ver pendências</a></div>`
    : `<div class="attention-state"><span>${getIcon('calendar',44)}</span><strong>Nenhuma pendência hoje</strong><p>Não existem follow-ups pendentes no momento.</p><a class="btn btn-primary" href="#orcamentos?filter=followup">Ver pendências</a></div>`;
  new Chart(page.querySelector('#revenue-chart'), {
    type:'line',
    data:{
      labels:['Sem. 1','Sem. 2','Sem. 3','Sem. 4'],
      datasets:[
        {label:'Ordens de Serviço',data:[0,0,0,0],borderColor:'#f47700',backgroundColor:'rgba(244,119,0,.08)',pointBackgroundColor:'#fff',pointBorderColor:'#f47700',pointBorderWidth:2,fill:true,tension:.35},
        {label:'Orçamentos',data:[0,0,0,0],borderColor:'#1769e0',pointBackgroundColor:'#1769e0',tension:.35},
        {label:'Faturamento',data:[0,0,0,0],borderColor:'#16a05d',pointBackgroundColor:'#16a05d',tension:.35}
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8,padding:22,color:'#667085',font:{weight:600}}}},
      scales:{
        x:{grid:{color:'rgba(148,163,184,.16)'},ticks:{color:'#737b88'}},
        y:{beginAtZero:true,grid:{color:'rgba(148,163,184,.18)'},ticks:{color:'#737b88',precision:0}}
      }
    }
  });
} else {
  const stats = [['car','Veículos na oficina','—'],['file','Orçamentos abertos','—'],['wrench','OS em andamento','—'],['money','Faturamento do mês','—']];
  page.querySelector('#stats').innerHTML = stats.map(([icon,label,value])=>`<article class="card stat-card"><span class="stat-icon">${getIcon(icon)}</span><div><small>${label}</small><strong>${value}</strong></div></article>`).join('');
  page.querySelector('#alerts').innerHTML = '<p>Os lembretes aparecerão após a configuração do Firebase.</p>';
  page.querySelector('#revenue-chart').replaceWith(Object.assign(document.createElement('div'), { className:'empty', textContent:'Os gráficos usarão os dados reais da oficina.' }));
}
