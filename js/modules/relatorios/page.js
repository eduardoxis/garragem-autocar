import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { listRecords } from '../../firebase/firestore.js';
import { currency } from '../../utils/currency.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@3.0.3/+esm';

const profile = await requireAuth({role:'admin'});
const page = mountShell(profile || {name:'Configuração pendente',role:'admin'}, {title:'Relatórios',active:'relatorios'});
page.innerHTML = `<div class="setup-banner">Configure o Firebase para gerar relatórios reais.</div><section class="page-heading"><div><h1>Relatórios</h1><p>Analise faturamento, serviços e produtividade.</p></div></section><section class="toolbar"><select class="select" id="report-type" style="max-width:260px"><option value="quotes">Orçamentos</option><option value="serviceOrders">Ordens de serviço</option><option value="payments">Financeiro</option><option value="customers">Clientes</option><option value="vehicles">Veículos</option><option value="products">Estoque</option></select><input class="input" id="start-date" type="date" style="max-width:180px"><input class="input" id="end-date" type="date" style="max-width:180px"><button class="btn btn-primary" id="generate">Gerar relatório</button><button class="btn" id="excel">Exportar Excel</button><button class="btn" id="pdf">Exportar PDF</button></section><section class="card"><div class="card-body" id="report"><div class="empty"><div><strong>Selecione os filtros</strong><p>O resultado será exibido aqui.</p></div></div></div></section>`;

let data = [];
const dateValue = item => {
  const value = item.paidAt || item.date || item.dueDate || item.contactDate || item.createdAt;
  if (value?.toDate) return value.toDate().toISOString().slice(0,10);
  return typeof value === 'string' ? value.slice(0,10) : '';
};

const generate = async () => {
  const type = page.querySelector('#report-type').value;
  const start = page.querySelector('#start-date').value;
  const end = page.querySelector('#end-date').value;
  const result = await listRecords(type, profile.companyId, {pageSize:1000});
  data = result.records.filter(item => {
    const date = dateValue(item);
    return (!start || !date || date >= start) && (!end || !date || date <= end);
  });
  const total = data.reduce((sum,item) => sum + Number(item.total || item.amount || item.salePrice || 0), 0);
  const received = data.filter(item => item.type === 'Receita' || item.status === 'Pago').reduce((sum,item) => sum + Number(item.amount || item.total || 0), 0);
  page.querySelector('#report').innerHTML = `<div class="grid stats-grid"><article class="card stat-card"><div><small>Registros</small><strong>${data.length}</strong></div></article><article class="card stat-card"><div><small>Valor acumulado</small><strong>${currency(total)}</strong></div></article><article class="card stat-card"><div><small>Receitas recebidas</small><strong>${currency(received)}</strong></div></article></div><div class="table-wrap"><table class="table"><thead><tr><th>Código/Nome</th><th>Data</th><th>Status</th><th>Valor</th></tr></thead><tbody>${data.map(item=>`<tr><td>${item.code || item.name || item.customerName || item.description || '—'}</td><td>${dateValue(item) || '—'}</td><td>${item.status || '—'}</td><td>${currency(item.total || item.amount || item.salePrice || 0)}</td></tr>`).join('')}</tbody></table></div>`;
};

page.querySelector('#generate').addEventListener('click', () => generate().catch(error => console.error(error)));
page.querySelector('#excel').addEventListener('click', () => {
  if (!data.length) return;
  const rows = data.map(item => ({ Código_ou_nome:item.code || item.name || item.customerName || item.description || '', Data:dateValue(item), Status:item.status || '', Valor:Number(item.total || item.amount || item.salePrice || 0) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Relatório');
  XLSX.writeFile(workbook, 'relatorio-garagem-auto-car.xlsx');
});
page.querySelector('#pdf').addEventListener('click', () => {
  if (!data.length) return;
  const pdf = new jsPDF();
  pdf.setFontSize(18); pdf.text('Relatório — Garagem Auto Car', 14, 18);
  pdf.setFontSize(10); pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 26);
  let y = 38;
  data.slice(0,45).forEach((item,index) => { if (y > 280) { pdf.addPage(); y = 18; } pdf.text(`${index + 1}. ${String(item.code || item.name || item.customerName || item.description || 'Registro')} — ${currency(item.total || item.amount || item.salePrice || 0)}`, 14, y); y += 6; });
  pdf.save('relatorio-garagem-auto-car.pdf');
});
