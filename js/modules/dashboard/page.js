import { where, Timestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/auto/+esm';
import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { listRecords } from '../../firebase/firestore.js';
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
      <h1>Olá, ${firstName}!</h1>
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
  const recordsFor = async collection => {
    try { return (await listRecords(collection, profile.companyId, { pageSize:1000 })).records; }
    catch (error) { console.error(error); return []; }
  };
  const [vehicles, quoteRecords, orderRecords, paymentRecords, productRecords, reminderRecords] = await Promise.all([
    recordsFor('vehicles'), recordsFor('quotes'), recordsFor('serviceOrders'), recordsFor('payments'), recordsFor('products'), recordsFor('reminders')
  ]);
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateOf = value => value?.toDate ? value.toDate() : value ? new Date(value) : null;
  const isCurrentMonth = value => { const date = dateOf(value); return date && date >= monthStart && date <= now; };
  const openQuotes = quoteRecords.filter(item => !['Aprovado','Recusado','Cancelado'].includes(item.status));
  const activeOrders = orderRecords.filter(item => !['Finalizado','Entregue','Cancelado'].includes(item.status));
  const revenueMonth = paymentRecords
    .filter(item => item.type === 'Receita' && !['Cancelado'].includes(item.status) && isCurrentMonth(item.paidAt || item.createdAt || item.dueDate))
    .reduce((total, item) => total + Number(item.amount || 0), 0);
  const dueReminders = reminderRecords.filter(item => item.status === 'pending' && dateOf(item.scheduledAt) <= now);
  const expiringQuotes = quoteRecords.filter(item => {
    if (!item.validUntil || ['Aprovado','Recusado','Cancelado'].includes(item.status)) return false;
    const date = dateOf(`${item.validUntil}T23:59:59`);
    return date && date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && date <= new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
  });
  const lowStock = productRecords.filter(item => Number(item.minimumStock) > 0 && Number(item.quantity) <= Number(item.minimumStock));
  const overduePayments = paymentRecords.filter(item => item.dueDate && item.dueDate < today && !['Pago','Cancelado'].includes(item.status));
  const overdueOrders = orderRecords.filter(item => item.forecastDate && item.forecastDate.slice(0,10) < today && !['Finalizado','Entregue','Cancelado'].includes(item.status));
  const stats = [
    { icon:'car', label:'Veículos cadastrados', value:vehicles.length, note:'Total na base', tone:'orange', href:'#veiculos' },
    { icon:'file', label:'Orçamentos abertos', value:openQuotes.length, note:'Aguardando aprovação', tone:'blue', href:'#orcamentos' },
    { icon:'wrench', label:'OS em andamento', value:activeOrders.length, note:'Em execução', tone:'green', href:'#ordens-servico' },
    { icon:'money', label:'Faturamento do mês', value:currency(revenueMonth), note:'Receita total', tone:'purple', href:'#financeiro' }
  ];
  page.querySelector('#stats').innerHTML = stats.map(stat=>`
    <a class="card stat-card stat-card--${stat.tone}" href="${stat.href}">
      <span class="stat-icon">${getIcon(stat.icon,23)}</span>
      <div class="stat-card__content"><small>${stat.label}</small><strong>${stat.value}</strong><span>${stat.note}</span></div>
      <b class="stat-card__arrow" aria-hidden="true">›</b>
    </a>`).join('');
  const alerts = [
    ...dueReminders.map(item => ({ label:`${item.customerName || 'Cliente'}: follow-up pendente`, href:'#orcamentos?filter=followup' })),
    ...expiringQuotes.map(item => ({ label:`${item.code || 'Orçamento'} vence em breve`, href:'#orcamentos' })),
    ...lowStock.map(item => ({ label:`${item.name || 'Produto'} está no estoque mínimo`, href:'#estoque' })),
    ...overduePayments.map(item => ({ label:`${item.description || 'Conta'} está vencida`, href:'#financeiro' })),
    ...overdueOrders.map(item => ({ label:`${item.code || 'OS'} está atrasada`, href:'#ordens-servico' }))
  ];
  page.querySelector('#alerts').innerHTML = alerts.length
    ? `<div class="attention-state attention-state--pending"><span>${getIcon('bell',42)}</span><strong>${alerts.length} pendência(s) para hoje</strong><p>${alerts.slice(0,3).map(item => `<a class="attention-link" href="${item.href}">${item.label}</a>`).join('')}</p><a class="btn btn-primary" href="${alerts[0].href}">Ver pendências</a></div>`
    : `<div class="attention-state"><span>${getIcon('calendar',44)}</span><strong>Nenhuma pendência hoje</strong><p>Não existem follow-ups pendentes no momento.</p><a class="btn btn-primary" href="#orcamentos?filter=followup">Ver pendências</a></div>`;
  const buildChartData = days => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
    const labels = [];
    const series = { orders:[], quotes:[], revenue:[] };
    for (let index = 0; index < days; index += 1) {
      const day = new Date(start); day.setDate(start.getDate() + index);
      const nextDay = new Date(day); nextDay.setDate(day.getDate() + 1);
      labels.push(day.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}));
      const createdToday = records => records.filter(item => { const date = dateOf(item.createdAt); return date && date >= day && date < nextDay; });
      series.orders.push(createdToday(orderRecords).length);
      series.quotes.push(createdToday(quoteRecords).length);
      series.revenue.push(paymentRecords.filter(item => item.type === 'Receita' && isCurrentMonth(item.paidAt || item.createdAt) && (() => { const date=dateOf(item.paidAt || item.createdAt); return date && date >= day && date < nextDay; })()).reduce((total,item)=>total+Number(item.amount||0),0));
    }
    return { labels, series };
  };
  const chart = new Chart(page.querySelector('#revenue-chart'), {
    type:'line',
    data:{ labels:[], datasets:[] },
    options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8,padding:22,color:'#667085',font:{weight:600}}}}, scales:{x:{grid:{color:'rgba(148,163,184,.16)'},ticks:{color:'#737b88'}},y:{beginAtZero:true,grid:{color:'rgba(148,163,184,.18)'},ticks:{color:'#737b88',precision:0}}} }
  });
  const refreshChart = () => {
    const days = Number(page.querySelector('#chart-period').value);
    const { labels, series } = buildChartData(days);
    chart.data.labels = labels;
    chart.data.datasets = [
      {label:'Ordens de Serviço',data:series.orders,borderColor:'#f47700',backgroundColor:'rgba(244,119,0,.08)',pointBackgroundColor:'#fff',pointBorderColor:'#f47700',pointBorderWidth:2,fill:true,tension:.35},
      {label:'Orçamentos',data:series.quotes,borderColor:'#1769e0',pointBackgroundColor:'#1769e0',tension:.35},
      {label:'Faturamento',data:series.revenue,borderColor:'#16a05d',pointBackgroundColor:'#16a05d',tension:.35}
    ];
    chart.update();
  };
  refreshChart();
  page.querySelector('#chart-period').addEventListener('change', refreshChart);
} else {
  const stats = [['car','Veículos na oficina','—'],['file','Orçamentos abertos','—'],['wrench','OS em andamento','—'],['money','Faturamento do mês','—']];
  page.querySelector('#stats').innerHTML = stats.map(([icon,label,value])=>`<article class="card stat-card"><span class="stat-icon">${getIcon(icon)}</span><div><small>${label}</small><strong>${value}</strong></div></article>`).join('');
  page.querySelector('#alerts').innerHTML = '<p>Os lembretes aparecerão após a configuração do Firebase.</p>';
  page.querySelector('#revenue-chart').replaceWith(Object.assign(document.createElement('div'), { className:'empty', textContent:'Os gráficos usarão os dados reais da oficina.' }));
}
