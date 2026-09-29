import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@3.0.3/+esm';
import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { createModal, createConfirmDialog } from '../../components/modal.js';
import { createToast } from '../../components/toast.js';
import { getIcon } from '../../components/icons.js';
import { createQuoteWithReminder, getCompanySettings, listRecords, saveRecord, softDelete, writeAudit } from '../../firebase/firestore.js';
import { calculateItem, calculateQuote, currency } from '../../utils/currency.js';
import { normalizeWhatsapp } from '../../utils/masks.js';
import { formatDate, greeting } from '../../utils/date.js';

const profile = await requireAuth();
const companySettings = profile ? await getCompanySettings(profile.companyId) : {};
const page = mountShell(profile || {name:'Configuração pendente',role:'admin'}, {title:'Orçamentos',active:'orcamentos'});
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const statusOptions = ['Rascunho','Enviado','Aguardando resposta','Aprovado','Parcialmente aprovado','Recusado','Cancelado'];
let quotes = [];
let filtered = [];
let cursor = null;

const statusClass = status => status === 'Aprovado' ? 'badge-success' : status === 'Recusado' || status === 'Cancelado' ? 'badge-danger' : 'badge-warning';

function downloadPdf(quote) {
  const pdf = new jsPDF();
  pdf.setFontSize(18); pdf.text('GARAGEM AUTO CAR — ORÇAMENTO',20,20);
  pdf.setFontSize(11); pdf.text(`${quote.code || ''}  |  ${quote.customerName || ''}`,20,30);
  pdf.text(`${quote.vehicle || ''} ${quote.plate || ''}`,20,37);
  let y = 50;
  (quote.items || []).forEach((item,index) => {
    pdf.text(`${index + 1}. ${item.description || item.type} — ${item.quantity} x ${currency(item.unitPrice)} = ${currency(calculateItem(item))}`,20,y);
    y += 8;
  });
  pdf.setFontSize(14); pdf.text(`TOTAL: ${currency(quote.total)}`,20,y + 8);
  pdf.setFontSize(9); pdf.text(quote.terms || '',20,y + 20,{maxWidth:170});
  pdf.save(`${quote.code || 'orcamento'}.pdf`);
  createToast('PDF gerado com sucesso.');
}

function followUpMessage(quote) {
  return `${greeting(new Date())}, ${quote.customerName}! Tudo bem?\n\nSou ${profile.name}, responsável pelo setor de orçamentos da Garagem Auto Car.\n\nEstou entrando em contato referente ao orçamento ${quote.code}, no valor de ${currency(quote.total)}, e queria saber se ficou alguma dúvida ou se posso ajudar com alguma informação.\n\nFico à disposição.`;
}

function openFollowUp(quote) {
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `<div class="field full"><label>Mensagem</label><textarea class="textarea" name="message" rows="8">${escapeHtml(followUpMessage(quote))}</textarea></div><div class="field"><label>Tipo de contato</label><select class="select" name="contactType"><option>WhatsApp</option><option>Ligação</option><option>E-mail</option></select></div><div class="field"><label>Resultado</label><select class="select" name="result"><option>Aguardando resposta</option><option>Cliente pediu mais tempo</option><option>Cliente aprovou</option><option>Cliente recusou</option><option>Não respondeu</option></select></div><div class="field"><label>Próximo contato</label><input class="input" name="nextContactAt" type="datetime-local"></div><div class="field"><label>WhatsApp</label><input class="input" name="whatsapp" value="${escapeHtml(quote.whatsapp || '')}"></div><div class="field full"><label>Observação</label><textarea class="textarea" name="notes"></textarea></div><div class="field full actions"><button class="btn" type="button" id="copy-message">Copiar mensagem</button>${quote.whatsapp ? `<a class="btn btn-success" id="open-whatsapp" target="_blank" rel="noopener">${getIcon('whatsapp')} Abrir WhatsApp</a>` : ''}</div>`;
  const modal = createModal({title:`Follow-up ${quote.code}`,content:form,confirmText:'Registrar contato',onConfirm:async()=>{
    const data = Object.fromEntries(new FormData(form));
    await saveRecord('quoteFollowUps',profile.companyId,{...data,quoteId:quote.id,quoteCode:quote.code,customerName:quote.customerName,userId:profile.uid,userName:profile.name,step:1});
    const status = data.result === 'Cliente aprovou' ? 'Aprovado' : data.result === 'Cliente recusou' ? 'Recusado' : 'Aguardando resposta';
    await saveRecord('quotes',profile.companyId,{status,whatsapp:data.whatsapp},quote.id);
    await writeAudit({companyId:profile.companyId,userId:profile.uid,userName:profile.name,action:'quote_follow_up',module:'quotes',recordId:quote.id,recordCode:quote.code,newValue:data});
    createToast('Follow-up registrado.'); await load(false); showList();
  }});
  const message = form.elements.message;
  form.querySelector('#copy-message').addEventListener('click',async()=>{await navigator.clipboard.writeText(message.value);createToast('Mensagem copiada.');});
  const whatsapp = form.querySelector('#open-whatsapp');
  const updateLink = () => { if (whatsapp) whatsapp.href = `https://wa.me/${normalizeWhatsapp(form.elements.whatsapp.value)}?text=${encodeURIComponent(message.value)}`; };
  message.addEventListener('input',updateLink); form.elements.whatsapp.addEventListener('input',updateLink); updateLink();
  return modal;
}

function openDetails(quote) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<div class="form-grid"><div class="field"><label>Cliente</label><strong>${escapeHtml(quote.customerName)}</strong></div><div class="field"><label>Veículo</label><span>${escapeHtml(quote.vehicle || '—')} ${escapeHtml(quote.plate || '')}</span></div><div class="field"><label>Status</label><span class="badge ${statusClass(quote.status)}">${escapeHtml(quote.status || 'Rascunho')}</span></div><div class="field"><label>Total</label><strong>${currency(quote.total)}</strong></div><div class="field full"><label>Itens</label>${(quote.items || []).map(item=>`<p>${Number(item.quantity) || 0} × ${escapeHtml(item.description)} — ${currency(calculateItem(item))}</p>`).join('') || '<p>Nenhum item.</p>'}</div><div class="field full"><label>Condições</label><p>${escapeHtml(quote.terms || '—')}</p></div><div class="field full actions"><button class="btn" id="follow-up">${getIcon('clock')} Registrar follow-up</button></div></div>`;
  const modal = createModal({title:quote.code || 'Orçamento',content:wrapper,confirmText:'Fechar',cancelText:'Editar',onConfirm:()=>true,onCancel:()=>showEditor(quote)});
  wrapper.querySelector('#follow-up').addEventListener('click',()=>{modal.close();openFollowUp(quote);});
}

function defaultQuoteValidity() {
  const date = new Date();
  const days = Math.min(365, Math.max(1, Number(companySettings.defaultQuoteValidity) || 30));
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function quoteEditor(record = {}) {
  const root = document.createElement('div');
  const items = (record.items?.length ? record.items : [
    {type:'Peça',description:'',brand:'',unit:'UN',quantity:1,unitPrice:0,discount:0,addition:0},
    {type:'Peça',description:'',brand:'',unit:'UN',quantity:1,unitPrice:0,discount:0,addition:0},
    {type:'Serviço',description:'',brand:'',unit:'UN',quantity:1,unitPrice:0,discount:0,addition:0}
  ]).map(item => ({...item}));
  const selectedType = record.customerType || 'Pessoa Física';
  const validUntil = record.validUntil || defaultQuoteValidity();
  root.className = 'quote-editor';
  root.innerHTML = `<div class="quote-editor-heading"><div><button class="btn btn-icon" type="button" id="cancel-editor" aria-label="Voltar">${getIcon('arrowLeft')}</button><span><h1>${record.id ? 'Editar orçamento' : 'Novo orçamento'}</h1><p>Preencha os dados e adicione os produtos ou serviços.</p></span></div><div class="quote-editor-actions"><button class="btn" type="button" id="cancel-editor-top">Cancelar</button><button class="btn" type="button" id="save-quote">${getIcon('save')} Salvar</button><button class="btn btn-primary" type="button" id="pdf-quote">${getIcon('pdf')} Gerar PDF</button></div></div>
  <form id="quote-form">
    <section class="card quote-section"><header class="card-header"><h2>Dados do cliente</h2></header><div class="card-body form-grid">
      <div class="field"><label>Cliente *</label><input class="input" name="customerName" value="${escapeHtml(record.customerName || '')}" placeholder="Nome do cliente ou empresa" required></div>
      <div class="field"><label>Tipo de cliente</label><input type="hidden" name="customerType" value="${escapeHtml(selectedType)}"><div class="segmented" role="group" aria-label="Tipo de cliente"><button type="button" data-customer-type="Pessoa Física" class="${selectedType === 'Pessoa Física' ? 'active' : ''}">Pessoa Física</button><button type="button" data-customer-type="Pessoa Jurídica" class="${selectedType === 'Pessoa Jurídica' ? 'active' : ''}">Pessoa Jurídica</button></div></div>
      <div class="field"><label>CPF/CNPJ</label><input class="input" name="document" value="${escapeHtml(record.document || '')}" placeholder="000.000.000-00"></div>
      <div class="field"><label>Telefone / WhatsApp</label><input class="input" name="whatsapp" value="${escapeHtml(record.whatsapp || '')}" placeholder="(61) 99999-9999"></div>
      <div class="field"><label>Validade do orçamento *</label><input class="input" name="validUntil" type="date" value="${escapeHtml(validUntil)}" required></div>
      <div class="field"><label>Status</label><select class="select" name="status">${statusOptions.map(status=>`<option ${record.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
      <div class="field"><label>Veículo</label><input class="input" name="vehicle" value="${escapeHtml(record.vehicle || '')}" placeholder="Marca e modelo"></div>
      <div class="field"><label>Placa</label><input class="input" name="plate" value="${escapeHtml(record.plate || '')}" placeholder="ABC1D23"></div>
      <div class="field full"><label>Observações, condições e garantia</label><textarea class="textarea" name="terms" placeholder="Ex.: Materiais à pronta entrega. Preços sujeitos a alteração.">${escapeHtml(record.terms || '')}</textarea></div>
    </div></section>
    <section class="card quote-section quote-products"><header class="card-header"><h2>Produtos / itens</h2><button class="btn btn-primary" type="button" id="add-item">${getIcon('plus')} Adicionar item</button></header><div class="card-body"><div class="table-wrap"><table class="table quote-items"><thead><tr><th>#</th><th>Descrição / produto</th><th>Marca</th><th>Unid.</th><th>Qtd.</th><th>Valor unit.</th><th>Valor total</th><th></th></tr></thead><tbody></tbody><tfoot><tr><td colspan="6">Valor total do orçamento</td><td id="quote-total">${currency(0)}</td><td></td></tr></tfoot></table></div></div></section>
  </form>`;
  const form = root.querySelector('#quote-form');
  const tbody = root.querySelector('tbody');
  const total = root.querySelector('#quote-total');
  const updateTotal = () => { total.textContent = currency(calculateQuote(items)); };
  const drawItems = () => {
    tbody.innerHTML = items.map((item,index)=>`<tr data-index="${index}"><td><strong>${index + 1}</strong><input type="hidden" data-key="type" value="${escapeHtml(item.type || 'Peça')}"></td><td><input class="input" data-key="description" value="${escapeHtml(item.description || '')}" placeholder="Descrição do produto ou serviço"></td><td><input class="input" data-key="brand" value="${escapeHtml(item.brand || '')}" placeholder="Marca"></td><td><input class="input item-unit" data-key="unit" value="${escapeHtml(item.unit || 'UN')}"></td><td><input class="input item-number" data-key="quantity" type="number" min="0" step=".01" value="${Number(item.quantity) || 0}"></td><td><input class="input item-price" data-key="unitPrice" type="number" min="0" step=".01" value="${Number(item.unitPrice) || 0}"></td><td><strong class="item-total">${currency(calculateItem(item))}</strong></td><td><button class="btn btn-danger btn-icon" type="button" data-remove="${index}" aria-label="Remover item">${getIcon('trash',15)}</button></td></tr>`).join('');
    updateTotal();
  };
  tbody.addEventListener('input',event=>{
    const row = event.target.closest('tr'); const key = event.target.dataset.key;
    if (!row || !key) return;
    const item = items[Number(row.dataset.index)]; item[key] = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
    row.querySelector('.item-total').textContent = currency(calculateItem(item)); updateTotal();
  });
  tbody.addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(!button)return;items.splice(Number(button.dataset.remove),1);drawItems();});
  root.querySelector('#add-item').addEventListener('click',()=>{items.push({type:'Peça',description:'',brand:'',unit:'UN',quantity:1,unitPrice:0,discount:0,addition:0});drawItems();});
  root.querySelector('.segmented').addEventListener('click',event=>{const button=event.target.closest('[data-customer-type]');if(!button)return;form.elements.customerType.value=button.dataset.customerType;root.querySelectorAll('[data-customer-type]').forEach(item=>item.classList.toggle('active',item===button));});
  drawItems();
  return {root,form,items};
}

function showEditor(record = null) {
  const editor = quoteEditor(record || {});
  page.replaceChildren(editor.root);
  const cancel = () => { location.hash = '#orcamentos'; showList(); };
  editor.root.querySelector('#cancel-editor').addEventListener('click',cancel);
  editor.root.querySelector('#cancel-editor-top').addEventListener('click',cancel);
  const values = () => {
    const data = Object.fromEntries(new FormData(editor.form));
    data.items = editor.items; data.total = calculateQuote(editor.items);
    data.whatsapp = data.whatsapp ? normalizeWhatsapp(data.whatsapp).replace(/^55/,'') : '';
    data.code = record?.code || `ORC-${Date.now().toString().slice(-6)}`;
    data.userId = profile.uid; data.userName = profile.name; data.customerName = data.customerName.trim();
    return data;
  };
  editor.root.querySelector('#save-quote').addEventListener('click',async()=>{
    if(!editor.form.reportValidity())return;
    const data = values();
    if(record) await saveRecord('quotes',profile.companyId,data,record.id); else await createQuoteWithReminder(data,profile.companyId);
    createToast('Orçamento salvo com sucesso.'); await load(false); location.hash='#orcamentos'; showList();
  });
  editor.root.querySelector('#pdf-quote').addEventListener('click',()=>{if(editor.form.reportValidity())downloadPdf(values());});
}

function renderList() {
  const list = page.querySelector('#quote-list');
  if (!list) return;
  list.innerHTML = filtered.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Veículo</th><th>Data</th><th>Valor total</th><th>Status</th><th>Ações</th></tr></thead><tbody>${filtered.map(quote=>`<tr><td><strong>${escapeHtml(quote.customerName || '—')}</strong><br><small>${escapeHtml(quote.code || '')}</small></td><td>${escapeHtml(quote.vehicle || '—')}<br><small>${escapeHtml(quote.plate || '')}</small></td><td>${formatDate(quote.createdAt)}</td><td><strong>${currency(quote.total)}</strong></td><td><span class="badge ${statusClass(quote.status)}">${escapeHtml(quote.status || 'Rascunho')}</span></td><td><div class="actions"><button class="btn action-btn" data-action="open" data-id="${quote.id}">${getIcon('eye',15)} Abrir</button><button class="btn btn-success action-btn" data-action="pdf" data-id="${quote.id}">${getIcon('pdf',15)} PDF</button><button class="btn btn-primary action-btn" data-action="edit" data-id="${quote.id}">${getIcon('edit',15)} Editar</button><button class="btn btn-danger action-btn" data-action="delete" data-id="${quote.id}">${getIcon('trash',15)} Excluir</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><div><strong>Nenhum orçamento encontrado</strong><p>Crie o primeiro orçamento para começar.</p></div></div>';
  page.querySelector('#quote-count').textContent = `${filtered.length} orçamento(s)`;
}

function filter() {
  const term = page.querySelector('#search')?.value.toLocaleLowerCase('pt-BR').trim() || '';
  const status = page.querySelector('#status-filter')?.value || '';
  filtered = quotes.filter(quote=>(!status||quote.status===status)&&(!term||[quote.customerName,quote.plate,quote.code,quote.vehicle].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(term))));
  renderList();
}

async function load(append) {
  if (!profile) return;
  const result = await listRecords('quotes',profile.companyId,{after:append?cursor:null,pageSize:20});
  cursor=result.cursor; quotes=append?[...quotes,...result.records]:result.records; filter();
}

function showList() {
  page.innerHTML = `<div class="setup-banner">Configure o Firebase para carregar e salvar os orçamentos reais.</div><section class="page-heading"><div><h1>Orçamentos</h1><p>Crie propostas, gere PDF e acompanhe os contatos.</p></div><button id="new-quote" class="btn btn-primary">${getIcon('plus')} Novo orçamento</button></section><section class="toolbar"><label class="search">${getIcon('search')}<input id="search" class="input" placeholder="Buscar por cliente, placa ou orçamento..."></label><select id="status-filter" class="select" style="width:auto"><option value="">Todos os status</option>${statusOptions.map(status=>`<option>${status}</option>`).join('')}</select></section><section class="card"><div id="quote-list"><div class="empty"><div class="skeleton" style="width:220px"></div></div></div><div class="pagination"><button class="btn" id="load-more">Carregar mais</button><span id="quote-count"></span></div></section>`;
  const heading = page.querySelector('.page-heading');
  heading.classList.add('page-hero');
  const headingIcon = document.createElement('span');
  headingIcon.className = 'page-hero-icon';
  headingIcon.innerHTML = getIcon('file', 30);
  heading.prepend(headingIcon);
  page.querySelector('#new-quote').addEventListener('click',()=>showEditor());
  page.querySelector('#search').addEventListener('input',filter);
  page.querySelector('#status-filter').addEventListener('change',filter);
  page.querySelector('#load-more').addEventListener('click',()=>load(true));
  page.querySelector('#quote-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-action]'); if(!button)return;
    const quote=quotes.find(item=>item.id===button.dataset.id); if(!quote)return;
    if(button.dataset.action==='open')openDetails(quote);
    if(button.dataset.action==='pdf')downloadPdf(quote);
    if(button.dataset.action==='edit')showEditor(quote);
    if(button.dataset.action==='delete')createConfirmDialog(`Enviar ${quote.code} para a lixeira?`,async()=>{await softDelete('quotes',quote.id,profile.uid);createToast('Orçamento enviado para a lixeira.');await load(false);});
  });
  if (!profile) { page.querySelector('#quote-list').innerHTML='<div class="empty"><div><strong>Firebase ainda não configurado</strong><p>Depois de informar as credenciais, os orçamentos reais aparecerão aqui.</p></div></div>'; page.querySelector('#load-more').disabled=true; }
  else filter();
}

showList();
if (profile) {
  await load(false);
  if (new URLSearchParams(location.hash.split('?')[1] || location.search).get('action') === 'new') showEditor();
}
