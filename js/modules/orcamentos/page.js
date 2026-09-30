import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { createModal, createConfirmDialog } from '../../components/modal.js';
import { createToast } from '../../components/toast.js';
import { getIcon } from '../../components/icons.js';
import { createQuoteWithReminder, getCompanySettings, listRecords, saveRecord, softDelete, writeAudit } from '../../firebase/firestore.js';
import { calculateItem, calculateQuote, currency } from '../../utils/currency.js';
import { applyInputMasks, formDataObject, normalizeWhatsapp, parseCurrencyInput } from '../../utils/masks.js';
import { formatDate, greeting } from '../../utils/date.js';
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@3.0.3/+esm';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';

const profile = await requireAuth();
const companySettings = profile ? await getCompanySettings(profile.companyId) : {};
const page = mountShell(profile || {name:'Configuração pendente',role:'admin'}, {title:'Orçamentos',active:'orcamentos'});
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const statusOptions = ['Rascunho','Enviado','Aguardando resposta','Aprovado','Parcialmente aprovado','Recusado','Cancelado'];
let quotes = [];
let filtered = [];
let cursor = null;

const statusClass = status => status === 'Aprovado' ? 'badge-success' : status === 'Recusado' || status === 'Cancelado' ? 'badge-danger' : 'badge-warning';

async function downloadPdf(quote) {
  const frame = document.createElement('iframe');
  frame.title = 'Gerador de PDF do orçamento';
  frame.setAttribute('aria-hidden','true');
  Object.assign(frame.style,{position:'fixed',left:'-10000px',top:'0',width:'794px',height:'1123px',border:'0',pointerEvents:'none'});
  document.body.append(frame);
  const pdfDocument = frame.contentDocument;
  const logo = new URL('assets/garagem-auto-car-logo.png', location.href).href;
  const workshop = new URL('assets/quote-workshop-background.png', location.href).href;
  const headerBanner = new URL('assets/quote-header-banner.png', location.href).href;
  const issuedAt = formatDate(quote.createdAt || new Date());
  const validDays = Math.min(365,Math.max(1,Number(companySettings.defaultQuoteValidity)||30));
  const items = quote.items || [];
  const itemRows = items.map((item,index)=>`<tr><td>${index+1}</td><td>${escapeHtml(item.description||item.type||'—')}</td><td>${Number(item.quantity)||0}</td><td>${currency(item.unitPrice)}</td><td>${currency(calculateItem(item))}</td></tr>`).join('') || '<tr><td>1</td><td>Nenhum item informado</td><td>—</td><td>—</td><td>—</td></tr>';
  const icon = (name,size=28) => getIcon(name,size);
  pdfDocument.open();
  pdfDocument.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(quote.code||'Orçamento')}</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#d9dde2;font-family:Arial,Helvetica,sans-serif;color:#101318;-webkit-print-color-adjust:exact;print-color-adjust:exact}svg{display:block}.sheet{position:relative;width:210mm;min-height:297mm;margin:10mm auto;background:#fff;overflow:hidden;page-break-after:always}.sheet:last-child{page-break-after:auto}.orange{color:#ff5a0a}.top{position:relative;height:58mm;background:#fff url('${headerBanner}') center/cover no-repeat;border-bottom:2px solid #ff5a0a;overflow:hidden}.brand{position:absolute;left:9mm;top:8mm;width:91mm;display:grid;grid-template-columns:27mm 1fr;align-items:center;gap:4mm}.brand img{width:27mm;height:27mm;object-fit:contain}.brand h1{margin:0;font-size:28px;line-height:.84;letter-spacing:-1.2px}.brand h1 span{display:block;color:#ff5a0a}.brand p{margin:4mm 0 0;font-size:9px;letter-spacing:3.5px}.promise{position:absolute;z-index:2;left:81mm;top:16mm;width:36mm;padding:3mm 4mm;color:#15191e;background:rgba(255,255,255,.94);border-left:2px solid #ff5a0a;border-radius:1.5mm;font-size:8px;font-weight:800;line-height:1.65;letter-spacing:2.2px;white-space:nowrap;box-shadow:0 2mm 5mm rgba(16,24,40,.08)}.feature-strip{height:17mm;display:grid;grid-template-columns:repeat(4,1fr);align-items:center;padding:0 11mm;border-bottom:1px solid #d7dce2}.feature{display:flex;align-items:center;justify-content:center;gap:3mm;border-right:1px solid #cfd5dc;font-size:9px;letter-spacing:1.5px}.feature:last-child{border:0}.feature svg{color:#ff5a0a}.content{padding:9mm}.document-title{display:grid;grid-template-columns:1fr 1.15fr;align-items:center;gap:8mm;margin-bottom:7mm}.document-title h2,.section-title{margin:0;font-size:34px;line-height:1;text-transform:uppercase;letter-spacing:-1px}.title-rule{width:46mm;height:4px;margin-top:4mm;background:linear-gradient(90deg,#ff5a0a 52%,#d8dde3 52%)}.quote-meta{display:grid;grid-template-columns:1fr 1fr;gap:5mm;padding:5mm;border:1px solid #d6dbe1;border-radius:3mm;background:#fbfcfd}.meta{display:flex;align-items:center;gap:4mm}.meta+ .meta{border-left:1px solid #31363c;padding-left:5mm}.meta svg{color:#ff5a0a}.meta small{display:block;font-size:9px;font-weight:700}.meta strong{display:block;margin-top:1mm;font-size:17px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-bottom:6mm}.info-card{min-height:50mm;padding:5mm;border:1px solid #d6dbe1;border-radius:3mm;background:linear-gradient(135deg,#fff,#f3f5f7)}.info-card h3{display:flex;align-items:center;gap:4mm;margin:0 0 4mm;font-size:16px;text-transform:uppercase}.info-card h3 svg{color:#ff5a0a}.data-line{display:grid;grid-template-columns:28mm 1fr;margin:1mm 0;padding:2.2mm;background:#fff;border-radius:1mm;font-size:11px}.items{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #cbd1d8;border-radius:3mm}.items th{padding:4mm 3mm;color:#fff;background:#20252a;font-size:10px;text-transform:uppercase;text-align:left}.items th:first-child{color:#ff690d}.items td{padding:4mm 3mm;border-top:1px solid #d8dde3;font-size:11px}.items td:not(:nth-child(2)),.items th:not(:nth-child(2)){text-align:center}.summary{display:grid;grid-template-columns:1fr 1fr;gap:8mm;align-items:end;margin-top:7mm}.summary-photo{height:53mm;background:url('${workshop}') left center/cover;border-radius:2mm}.total-panel{display:flex;align-items:center;gap:5mm;padding:7mm;color:#fff;background:#20252a;border-right:5mm solid #ff6508;border-radius:3mm}.total-panel svg{flex:0 0 auto}.total-panel small{display:block;font-size:12px;text-transform:uppercase}.total-panel strong{display:block;margin-top:2mm;color:#ff6508;font-size:30px}.validity{display:flex;align-items:center;gap:5mm;margin-top:5mm;padding:5mm;border:1px solid #d6dbe1;border-radius:3mm}.validity svg{color:#ff5a0a;flex:0 0 auto}.validity strong{display:block;font-size:12px}.validity p{margin:2mm 0 0;font-size:10px;line-height:1.4}.footer{position:absolute;inset:auto 0 0;height:27mm;display:grid;grid-template-columns:1fr 47mm;align-items:center;padding-left:10mm;color:#fff;background:#20252a}.footer-contact{display:flex;gap:7mm;font-size:10px}.footer-contact span{display:flex;align-items:center;gap:2mm}.footer-contact svg{color:#ff6508}.footer-slogan{align-self:stretch;display:grid;place-items:center;padding:4mm;color:#111;background:#ff6508;font-size:9px;font-weight:700;letter-spacing:2px;text-align:center}.page-two{padding:10mm}.section{margin-bottom:7mm}.section-title{font-size:27px}.section-rule{width:50mm;height:4px;margin:3mm 0 5mm;background:linear-gradient(90deg,#ff5a0a 58%,#d8dde3 58%)}.conditions{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.condition{min-height:39mm;padding:5mm;border:1px solid #d6dbe1;border-radius:3mm;background:linear-gradient(135deg,#fff,#f4f6f8)}.condition h3{display:flex;align-items:center;gap:4mm;margin:0 0 3mm;font-size:14px;text-transform:uppercase}.condition h3 svg{color:#ff5a0a}.condition h3 b{color:#ff5a0a;font-size:18px}.condition p,.notes p,.payment p{margin:0;font-size:11px;line-height:1.45}.notes,.payment{display:grid;grid-template-columns:31mm 1fr;align-items:center;gap:5mm;padding:6mm;border:1px solid #d6dbe1;border-radius:3mm;background:#fafbfc}.notes>svg{margin:auto;color:#ff5a0a}.notes ul{margin:0;padding-left:5mm;font-size:11px;line-height:1.65}.payment{grid-template-columns:1fr 1fr}.payment-options{display:grid;gap:2mm;padding-left:5mm;border-left:1px solid #cbd1d8}.payment-options span{display:flex;align-items:center;gap:3mm;font-size:10px;font-weight:700;text-transform:uppercase}.payment-options svg{color:#ff5a0a}.approval{display:grid;grid-template-columns:1.2fr 1fr;gap:4mm}.signature{height:24mm;display:flex;align-items:center;gap:4mm;padding:5mm;border:1px solid #d6dbe1;border-radius:3mm}.signature svg{color:#ff5a0a}.signature div{flex:1;font-size:10px;font-weight:700}.signature i{display:block;margin-top:9mm;border-bottom:1px solid #222}.thank-you{position:absolute;inset:auto 0 0;height:56mm;display:grid;grid-template-columns:43% 57%;color:#fff;background:#20252a}.thank-photo{background:url('${workshop}') left center/cover}.thank-copy{padding:9mm;background:linear-gradient(110deg,#20252a 0 72%,#ff6508 72%)}.thank-copy h2{margin:0;font-size:24px;line-height:1;text-transform:uppercase}.thank-copy h2 span{display:block;color:#ff6508}.thank-copy p{max-width:76mm;font-size:10px;line-height:1.4}@media print{html,body{background:#fff}.sheet{margin:0}}
  </style></head><body><section class="sheet"><header class="top"><div class="brand"><img src="${logo}" alt=""><div><h1>GARAGEM <span>AUTO CAR</span></h1><p>GESTÃO DE OFICINA</p></div></div><div class="promise">QUALIDADE<br>CONFIANÇA<br>SEMPRE COM VOCÊ</div></header><div class="feature-strip"><div class="feature">${icon('wrench',25)} MANUTENÇÃO</div><div class="feature">${icon('settings',25)} DIAGNÓSTICO</div><div class="feature">${icon('check',25)} CONFIANÇA</div><div class="feature">${icon('users',25)} VOCÊ EM MOVIMENTO</div></div><main class="content"><div class="document-title"><div><h2>Orçamento</h2><div class="title-rule"></div></div><div class="quote-meta"><div class="meta">${icon('file',30)}<div><small>Nº DO ORÇAMENTO</small><strong>${escapeHtml(quote.code||'—')}</strong></div></div><div class="meta">${icon('calendar',30)}<div><small>DATA</small><strong>${issuedAt}</strong></div></div></div></div><div class="info-grid"><article class="info-card"><h3>${icon('user',27)} Dados do cliente</h3><div class="data-line"><span>Nome:</span><strong>${escapeHtml(quote.customerName||'—')}</strong></div><div class="data-line"><span>Telefone:</span><strong>${escapeHtml(quote.whatsapp||quote.phone||'—')}</strong></div><div class="data-line"><span>E-mail:</span><strong>${escapeHtml(quote.email||'—')}</strong></div></article><article class="info-card"><h3>${icon('car',27)} Dados do veículo</h3><div class="data-line"><span>Veículo:</span><strong>${escapeHtml(quote.vehicle||'—')}</strong></div><div class="data-line"><span>Placa:</span><strong>${escapeHtml(quote.plate||'—')}</strong></div><div class="data-line"><span>KM:</span><strong>${escapeHtml(quote.mileage||'—')}</strong></div></article></div><table class="items"><thead><tr><th>Item</th><th>Descrição</th><th>Quantidade</th><th>Valor unitário</th><th>Valor total</th></tr></thead><tbody>${itemRows}</tbody></table><div class="summary"><div class="summary-photo"></div><div><div class="total-panel">${icon('money',36)}<div><small>Total do orçamento</small><strong>${currency(quote.total)}</strong></div></div><div class="validity">${icon('check',38)}<div><strong>Validade deste orçamento</strong><p>Este orçamento é válido por ${validDays} dias a partir da data de emissão.</p></div></div></div></div></main><footer class="footer"><div class="footer-contact"><span>${icon('whatsapp',20)} ${escapeHtml(companySettings.whatsapp||'(61) 99999-9999')}</span><span>${icon('settings',20)} ${escapeHtml(companySettings.address||'Luziânia - GO')}</span></div><div class="footer-slogan">SEU CARRO<br>EM BOAS MÃOS<br>SEMPRE</div></footer></section><section class="sheet page-two"><div class="section"><h2 class="section-title">Condições gerais</h2><div class="section-rule"></div><div class="conditions"><article class="condition"><h3>${icon('wrench',29)} <b>01</b> Serviços</h3><p>Os serviços serão executados conforme os itens descritos neste orçamento, podendo haver necessidade de ajustes após avaliação técnica.</p></article><article class="condition"><h3>${icon('settings',29)} <b>02</b> Peças e materiais</h3><p>Valores referentes a peças e materiais consideram a disponibilidade atual e podem sofrer alterações mediante variação de fornecedores.</p></article><article class="condition"><h3>${icon('clock',29)} <b>03</b> Prazo de execução</h3><p>O prazo para execução será informado após aprovação, podendo variar conforme a complexidade do serviço.</p></article><article class="condition"><h3>${icon('check',29)} <b>04</b> Garantia</h3><p>Nossos serviços possuem garantia conforme as condições informadas e políticas internas da empresa.</p></article></div></div><div class="section"><h2 class="section-title">Observações</h2><div class="section-rule"></div><div class="notes">${icon('file',45)}<div><p>${escapeHtml(quote.terms||'Este orçamento refere-se apenas aos itens descritos. Alterações ou serviços adicionais serão previamente comunicados. Nossa equipe está à disposição para esclarecimentos.')}</p></div></div></div><div class="section"><h2 class="section-title">Forma de pagamento</h2><div class="section-rule"></div><div class="payment"><p>O pagamento poderá ser realizado conforme acordo entre as partes, via dinheiro, transferência bancária, PIX ou cartão, de acordo com a política da empresa.</p><div class="payment-options"><span>${icon('money',21)} Dinheiro</span><span>${icon('settings',21)} Transferência bancária</span><span>${icon('dashboard',21)} PIX</span><span>${icon('file',21)} Cartão de crédito / débito</span></div></div></div><div class="section"><h2 class="section-title">Aprovação do cliente</h2><div class="section-rule"></div><div class="approval"><div class="signature">${icon('edit',28)}<div>Nome / Assinatura<i></i></div></div><div class="signature">${icon('calendar',28)}<div>Data<i></i></div></div></div></div><footer class="thank-you"><div class="thank-photo"></div><div class="thank-copy"><h2>Obrigado pela <span>confiança!</span></h2><p>É um prazer fazer parte da sua jornada. Conte sempre com a GARAGEM AUTO CAR para manter o seu veículo em movimento.</p></div></footer></section></body></html>`);
  pdfDocument.close();
  try {
    createToast('Gerando PDF para download...');
    await Promise.all([...pdfDocument.images].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;})));
    await pdfDocument.fonts?.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const sheets=[...pdfDocument.querySelectorAll('.sheet')];
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    for(let index=0;index<sheets.length;index+=1){
      if(index)pdf.addPage('a4','portrait');
      const canvas=await html2canvas(sheets[index],{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,windowWidth:794,windowHeight:1123});
      pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,210,297,undefined,'FAST');
    }
    const fileName=String(quote.code||'orcamento').replace(/[^a-z0-9_-]+/gi,'-');
    pdf.save(`${fileName}.pdf`);
    createToast('PDF baixado com sucesso.');
  }catch(error){
    console.error(error);
    createToast('Não foi possível gerar o PDF. Tente novamente.','error');
  }finally{
    frame.remove();
  }
}

function followUpMessage(quote) {
  return `${greeting(new Date())}, ${quote.customerName}! Tudo bem?\n\nSou ${profile.name}, responsável pelo setor de orçamentos da Garagem Auto Car.\n\nEstou entrando em contato referente ao orçamento ${quote.code}, no valor de ${currency(quote.total)}, e queria saber se ficou alguma dúvida ou se posso ajudar com alguma informação.\n\nFico à disposição.`;
}

function openFollowUp(quote) {
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `<div class="field full"><label>Mensagem</label><textarea class="textarea" name="message" rows="8">${escapeHtml(followUpMessage(quote))}</textarea></div><div class="field"><label>Tipo de contato</label><select class="select" name="contactType"><option>WhatsApp</option><option>Ligação</option><option>E-mail</option></select></div><div class="field"><label>Resultado</label><select class="select" name="result"><option>Aguardando resposta</option><option>Cliente pediu mais tempo</option><option>Cliente aprovou</option><option>Cliente recusou</option><option>Não respondeu</option></select></div><div class="field"><label>Próximo contato</label><input class="input" name="nextContactAt" type="datetime-local"></div><div class="field"><label>WhatsApp</label><input class="input" name="whatsapp" value="${escapeHtml(quote.whatsapp || '')}"></div><div class="field full"><label>Observação</label><textarea class="textarea" name="notes"></textarea></div><div class="field full actions"><button class="btn" type="button" id="copy-message">Copiar mensagem</button>${quote.whatsapp ? `<a class="btn btn-success" id="open-whatsapp" target="_blank" rel="noopener">${getIcon('whatsapp')} Abrir WhatsApp</a>` : ''}</div>`;
  applyInputMasks(form);
  const modal = createModal({title:`Follow-up ${quote.code}`,content:form,confirmText:'Registrar contato',onConfirm:async()=>{
    const data = formDataObject(form);
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
  applyInputMasks(root);
  const form = root.querySelector('#quote-form');
  const tbody = root.querySelector('tbody');
  const total = root.querySelector('#quote-total');
  const updateTotal = () => { total.textContent = currency(calculateQuote(items)); };
  const drawItems = () => {
    tbody.innerHTML = items.map((item,index)=>`<tr data-index="${index}"><td><strong>${index + 1}</strong><input type="hidden" data-key="type" value="${escapeHtml(item.type || 'Peça')}"></td><td><input class="input" data-key="description" value="${escapeHtml(item.description || '')}" placeholder="Descrição do produto ou serviço"></td><td><input class="input" data-key="brand" value="${escapeHtml(item.brand || '')}" placeholder="Marca"></td><td><input class="input item-unit" data-key="unit" value="${escapeHtml(item.unit || 'UN')}"></td><td><input class="input item-number" data-key="quantity" type="number" min="0" step=".01" value="${Number(item.quantity) || 0}" placeholder="Ex.: 1"></td><td><input class="input item-price" data-key="unitPrice" data-mask="currency" value="${Number(item.unitPrice) || 0}" placeholder="Ex.: 2.500,00"></td><td><strong class="item-total">${currency(calculateItem(item))}</strong></td><td><button class="btn btn-danger btn-icon" type="button" data-remove="${index}" aria-label="Remover item">${getIcon('trash',15)}</button></td></tr>`).join('');
    applyInputMasks(tbody);
    updateTotal();
  };
  tbody.addEventListener('input',event=>{
    const row = event.target.closest('tr'); const key = event.target.dataset.key;
    if (!row || !key) return;
    const item = items[Number(row.dataset.index)]; item[key] = key === 'unitPrice' ? parseCurrencyInput(event.target.value) : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
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
    const data = formDataObject(editor.form);
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
  list.innerHTML = filtered.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nº orçamento</th><th>Cliente</th><th>Veículo</th><th>Valor</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>${filtered.map(quote=>`<tr><td><strong>${escapeHtml(quote.code || '—')}</strong></td><td>${escapeHtml(quote.customerName || '—')}</td><td>${escapeHtml(quote.vehicle || '—')}<br><small>${escapeHtml(quote.plate || '')}</small></td><td><strong>${currency(quote.total)}</strong></td><td>${formatDate(quote.createdAt)}</td><td><span class="badge ${statusClass(quote.status)}">${escapeHtml(quote.status || 'Rascunho')}</span></td><td><div class="crud-actions" aria-label="Ações do orçamento"><button type="button" class="crud-action crud-action--open" data-action="open" data-id="${quote.id}">${getIcon('eye',13)} Abrir</button><button type="button" class="crud-action crud-action--pdf" data-action="pdf" data-id="${quote.id}">${getIcon('pdf',13)} PDF</button><button type="button" class="crud-action crud-action--edit" data-action="edit" data-id="${quote.id}">${getIcon('edit',13)} Editar</button><button type="button" class="crud-action crud-action--delete" data-action="delete" data-id="${quote.id}">${getIcon('trash',13)} Excluir</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><div><strong>Nenhum orçamento encontrado</strong><p>Crie o primeiro orçamento para começar.</p></div></div>';
  page.querySelector('#quote-count').textContent = `${filtered.length} orçamento(s)`;
  const total=quotes.reduce((sum,item)=>sum+Number(item.total||0),0);
  const pending=quotes.filter(item=>!['Aprovado','Recusado','Cancelado'].includes(item.status)).length;
  const approved=quotes.filter(item=>item.status==='Aprovado').length;
  const metrics=page.querySelector('#quote-metrics');
  if(metrics) metrics.innerHTML=[{icon:'file',label:'Total de orçamentos',value:quotes.length,tone:'orange'},{icon:'money',label:'Valor total',value:currency(total),tone:'green'},{icon:'clock',label:'Pendentes',value:pending,tone:'orange'},{icon:'check',label:'Aprovados',value:approved,tone:'green'}].map(item=>`<article class="card stat-card metric-card metric-card--${item.tone}"><span class="stat-icon">${getIcon(item.icon,24)}</span><div><small>${item.label}</small><strong>${item.value}</strong></div></article>`).join('');
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
  page.classList.add('module-page','module-orcamentos');
  page.innerHTML = `<div class="setup-banner">Configure o Firebase para carregar e salvar os orçamentos reais.</div><section class="page-heading"><div><h1>Orçamentos</h1><p>Crie, acompanhe e envie orçamentos para seus clientes.</p></div><button id="new-quote" class="btn btn-primary">${getIcon('plus')} Novo orçamento</button></section><section class="grid stats-grid module-metrics" id="quote-metrics"></section><section class="toolbar module-toolbar"><label class="search">${getIcon('search')}<input id="search" class="input" placeholder="Pesquisar por cliente, veículo, número ou descrição..."></label><select id="status-filter" class="select" style="width:auto"><option value="">Todos os status</option>${statusOptions.map(status=>`<option>${status}</option>`).join('')}</select></section><section class="card module-list-card"><div id="quote-list"><div class="empty"><div class="skeleton" style="width:220px"></div></div></div><div class="pagination"><button class="btn" id="load-more">${getIcon('refresh',17)} Carregar mais</button><span id="quote-count"></span></div></section>`;
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
