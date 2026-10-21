import { discountAmount, cents } from '../../utils/discounts.js';
import { currency } from '../../utils/currency.js';
import { api } from '../../services/api.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { db } from '../../firebase/firebase-config.js';
import { createToast } from '../../components/toast.js';
import { applyInputMasks, formDataObject } from '../../utils/masks.js';
import { adminBackButton } from '../../components/admin-back.js';

const profile = await requireAuth({ role:'admin' });
const page = mountShell(profile || { name:'Configuração pendente', role:'admin' }, { title:'Configurações', active:'configuracoes' });
page.innerHTML = `<div class="setup-banner">Configure o Firebase para salvar as preferências.</div><section class="page-heading"><div><h1>Configurações da empresa</h1><p>Dados usados em documentos, mensagens e automações.</p></div></section><section class="card"><div class="card-body"><form id="settings" class="form-grid"><div class="field"><label>Nome</label><input class="input" name="name" required></div><div class="field"><label>Razão social</label><input class="input" name="legalName"></div><div class="field"><label>CNPJ</label><input class="input" name="document"></div><div class="field"><label>WhatsApp</label><input class="input" name="whatsapp"></div><div class="field"><label>E-mail</label><input class="input" name="email" type="email"></div><div class="field"><label>Telefone</label><input class="input" name="phone"></div><div class="field full"><label>Endereço</label><input class="input" name="address"></div><div class="field"><label>Fuso horário</label><input class="input" name="timezone" value="America/Sao_Paulo"></div><div class="field"><label>Validade padrão (dias)</label><input class="input" name="defaultQuoteValidity" type="number" min="1" max="365" value="30" required></div><div class="field"><label>1º lembrete de orçamento (dias)</label><input class="input" name="followUpDays" type="number" min="1" max="30" value="1" required></div><div class="field"><label>Intervalo entre follow-ups (dias)</label><input class="input" name="followUpIntervalDays" type="number" min="1" max="30" value="3" required></div><div class="field"><label>Troca de óleo padrão (meses)</label><input class="input" name="defaultOilChangeMonths" type="number" min="1" max="36" value="6" required></div><div class="field full"><label>Mensagem padrão de follow-up</label><textarea class="textarea" name="followUpMessage" placeholder="Olá, {cliente}! Tudo bem? Estamos entrando em contato sobre o orçamento {orcamento}."></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">Salvar configurações</button></div></form></div></section>`;

page.querySelector('#settings').insertAdjacentHTML('afterbegin', '<div class="field full"><h2>Descontos por pagamento</h2><p>O orçamento calcula sobre o saldo após os demais descontos.</p><label>Base da prévia (R$)<input class="input" data-no-mask="true" id="discount-preview-base" type="number" min="0" step=".01" value="100"></label></div>'+['cash','pix'].map(method=>`<div class="field"><label>${method==='cash'?'Dinheiro em espécie':'PIX'}</label><select class="select" name="${method}Enabled"><option value="false">Desativado</option><option value="true">Ativado</option></select><select class="select" name="${method}Type"><option value="fixed">R$</option><option value="percent">%</option></select><input aria-label="Valor do desconto" class="input" name="${method}Value" type="number" min="0" step=".01" required value="0"><output id="preview-${method}"></output></div>`).join(''));
const preview=()=>{for(const m of ['cash','pix']){const f=page.querySelector('#settings').elements;try{const base=cents(page.querySelector('#discount-preview-base').value),amount=f[m+'Enabled'].value==='true'?discountAmount(base,f[m+'Value'].value,f[m+'Type'].value):0;page.querySelector('#preview-'+m).textContent='Desconto: '+currency(amount/100)+' · Total: '+currency((base-amount)/100);}catch(e){page.querySelector('#preview-'+m).textContent=e.message;}}};
page.querySelector('#settings').addEventListener('input',preview);page.querySelector('#settings').addEventListener('change',preview);
page.querySelector('.page-heading').insertAdjacentHTML('beforeend', adminBackButton());
if (profile) {
  const ref = doc(db, 'companies', profile.companyId);
  const snap = await getDoc(ref);
  if (snap.exists()) for(const m of ['cash','pix']){const r=snap.data().paymentDiscounts?.[m];if(r){const f=page.querySelector('#settings').elements;f[m+'Enabled'].value=String(r.enabled);f[m+'Type'].value=r.type;f[m+'Value'].value=r.value;}}
  if (snap.exists()) Object.entries(snap.data()).forEach(([key, value]) => {
    const input = page.querySelector(`[name="${key}"]`);
    if (input) input.value = value ?? '';
  });
  preview();
  const form = page.querySelector('#settings');
  applyInputMasks(form);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = formDataObject(form);
    data.defaultQuoteValidity = Math.min(365, Math.max(1, Number(data.defaultQuoteValidity) || 30));
    data.followUpDays = Math.min(30, Math.max(1, Number(data.followUpDays) || 1));
    data.followUpIntervalDays = Math.min(30, Math.max(1, Number(data.followUpIntervalDays) || 3));
    data.defaultOilChangeMonths = Math.min(36, Math.max(1, Number(data.defaultOilChangeMonths) || 6));
    data.paymentDiscounts=Object.fromEntries(['cash','pix'].map(m=>[m,{enabled:data[m+'Enabled']==='true',type:data[m+'Type'],value:Number(data[m+'Value'])}]));
    try{await api('settings',{data});}catch(e){createToast(e.message,'error');return;}
    createToast('Configurações salvas.');
  });
}
