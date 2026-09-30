import { createCrudPage } from '../crud-page.js';
import { formatDate } from '../../utils/date.js';
import { createModal } from '../../components/modal.js';
import { createToast } from '../../components/toast.js';
import { getIcon } from '../../components/icons.js';
import { normalizeWhatsapp } from '../../utils/masks.js';
import { saveRecord } from '../../firebase/firestore.js';

const messages = {
  oil_change: 'Olá, {cliente}! Tudo bem? A Garagem Auto Car lembra que está próximo o período recomendado para a troca de óleo do veículo {veiculo}{placa}. Podemos agendar seu atendimento?',
  maintenance: 'Olá, {cliente}! Tudo bem? A Garagem Auto Car está entrando em contato para lembrar da revisão preventiva do veículo {veiculo}{placa}. Quer agendar um horário?',
  post_sale: 'Olá, {cliente}! Tudo bem? Gostaríamos de saber como está o seu veículo após o último atendimento da Garagem Auto Car. Precisa de alguma ajuda?',
  payment: 'Olá, {cliente}! Tudo bem? Identificamos um lembrete financeiro pendente. Se precisar de ajuda ou de uma segunda via, estamos à disposição.',
  quote_follow_up: 'Olá, {cliente}! Tudo bem? Estamos entrando em contato sobre o seu orçamento da Garagem Auto Car. Ficou alguma dúvida ou podemos seguir com o serviço?'
};
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
const scheduleAfterMonths = (baseDate, months) => {
  const date = new Date(`${baseDate}T09:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + Math.max(1, Number(months) || 1));
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const buildMessage = data => (messages[data.type] || messages.maintenance).replaceAll('{cliente}', data.customerName || 'cliente').replaceAll('{veiculo}', data.vehicle || 'seu veículo').replaceAll('{placa}', data.plate ? ` (${data.plate})` : '');
const isDue = record => {
  const date = typeof record.scheduledAt?.toDate === 'function' ? record.scheduledAt.toDate() : new Date(record.scheduledAt);
  return record.status === 'pending' && !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

createCrudPage({
  title:'Central de lembretes', active:'administracao', collection:'reminders', singular:'lembrete', titleKey:'title', newLabel:'Novo lembrete', adminOnly:true, icon:'bell',
  subtitle:'Crie retornos de troca de óleo, revisões, pós-vendas, pagamentos e follow-ups.',
  searchKeys:['title','customerName','plate','vehicle','type','status'],
  columns:[{key:'title',label:'Lembrete'},{key:'customerName',label:'Cliente'},{key:'vehicle',label:'Veículo'},{key:'type',label:'Tipo'},{key:'scheduledAt',label:'Avisar em',render:formatDate},{key:'status',label:'Status'}],
  fields:[
    {key:'title',label:'Título do lembrete',required:true,placeholder:'Ex.: Troca de óleo'}, {key:'customerName',label:'Cliente'}, {key:'vehicle',label:'Veículo'}, {key:'plate',label:'Placa'},
    {key:'type',label:'Tipo',type:'select',options:[{value:'maintenance',label:'Manutenção'},{value:'oil_change',label:'Troca de óleo'},{value:'post_sale',label:'Pós-venda'},{value:'payment',label:'Pagamento'},{value:'quote_follow_up',label:'Follow-up de orçamento'}]},
    {key:'baseDate',label:'Data de referência',type:'date',required:true}, {key:'intervalMonths',label:'Lembrar após (meses)',type:'number',required:true,placeholder:'Ex.: 6'}, {key:'whatsapp',label:'WhatsApp do cliente'},
    {key:'message',label:'Mensagem para o cliente',type:'textarea',full:true}, {key:'status',label:'Status',type:'select',options:['pending','notified','completed','cancelled']}, {key:'notes',label:'Observações',type:'textarea',full:true}
  ],
  afterForm:({ form, record }) => {
    const type = form.elements.type; const message = form.elements.message;
    const applyMessage = () => { if (!record) message.value = buildMessage(Object.fromEntries(new FormData(form))); };
    type.addEventListener('change', applyMessage); applyMessage();
  },
  normalize:data => ({...data, intervalMonths:Math.max(1,Number(data.intervalMonths)||1), scheduledAt:scheduleAfterMonths(data.baseDate,data.intervalMonths), message:data.message?.trim() || buildMessage(data), status:data.status || 'pending'}),
  rowActions:record => isDue(record) ? `<button type="button" class="crud-action crud-action--reminder" data-action="send-reminder" data-id="${record.id}">${getIcon('bell',13)} Lembrete</button>` : '',
  onAction:({ action, record, profile, refresh }) => {
    if (action !== 'send-reminder' || !record) return false;
    const form = document.createElement('form'); form.className = 'form-grid';
    form.innerHTML = `<p class="follow-up-hint">Este lembrete venceu e está pronto para avisar o cliente.</p><div class="field full"><label>Mensagem para ${escapeHtml(record.customerName || 'o cliente')}</label><textarea class="textarea" name="message" rows="6">${escapeHtml(record.message || buildMessage(record))}</textarea></div><div class="field"><label>WhatsApp</label><input class="input" name="whatsapp" value="${escapeHtml(record.whatsapp || '')}"></div><div class="field"><label>Resultado</label><select class="select" name="result"><option>Mensagem enviada</option><option>Cliente pediu agendamento</option><option>Não respondeu</option></select></div><div class="field full actions"><button type="button" class="btn" id="copy-reminder">Copiar mensagem</button><a class="btn btn-success" id="send-reminder-whatsapp" target="_blank" rel="noopener">${getIcon('whatsapp')} Enviar pelo WhatsApp</a></div>`;
    const modal = createModal({ title:`Lembrete — ${record.title}`, content:form, confirmText:'Confirmar', onConfirm:async () => { const data=Object.fromEntries(new FormData(form)); await saveRecord('reminders',profile.companyId,{...record,message:data.message,whatsapp:data.whatsapp,status:'notified',lastNotifiedAt:new Date(),lastResult:data.result},record.id); createToast('Lembrete registrado como enviado.'); await refresh(); }});
    const updateLink = () => { form.querySelector('#send-reminder-whatsapp').href = `https://wa.me/${normalizeWhatsapp(form.elements.whatsapp.value)}?text=${encodeURIComponent(form.elements.message.value)}`; };
    form.querySelector('#copy-reminder').addEventListener('click', async () => { await navigator.clipboard.writeText(form.elements.message.value); createToast('Mensagem copiada.'); });
    form.elements.message.addEventListener('input', updateLink); form.elements.whatsapp.addEventListener('input', updateLink); updateLink();
    return true;
  }
});
