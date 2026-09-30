import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { requireAuth } from '../../guards.js';
import { mountShell } from '../../app.js';
import { db } from '../../firebase/firebase-config.js';
import { createToast } from '../../components/toast.js';
import { applyInputMasks, formDataObject } from '../../utils/masks.js';

const profile = await requireAuth({ role:'admin' });
const page = mountShell(profile || { name:'Configuração pendente', role:'admin' }, { title:'Configurações', active:'configuracoes' });
page.innerHTML = `<div class="setup-banner">Configure o Firebase para salvar as preferências.</div><section class="page-heading"><div><h1>Configurações da empresa</h1><p>Dados usados em documentos, mensagens e automações.</p></div></section><section class="card"><div class="card-body"><form id="settings" class="form-grid"><div class="field"><label>Nome</label><input class="input" name="name" required></div><div class="field"><label>Razão social</label><input class="input" name="legalName"></div><div class="field"><label>CNPJ</label><input class="input" name="document"></div><div class="field"><label>WhatsApp</label><input class="input" name="whatsapp"></div><div class="field"><label>E-mail</label><input class="input" name="email" type="email"></div><div class="field"><label>Telefone</label><input class="input" name="phone"></div><div class="field full"><label>Endereço</label><input class="input" name="address"></div><div class="field"><label>Fuso horário</label><input class="input" name="timezone" value="America/Sao_Paulo"></div><div class="field"><label>Validade padrão (dias)</label><input class="input" name="defaultQuoteValidity" type="number" min="1" max="365" value="30" required></div><div class="field"><label>1º lembrete de orçamento (dias)</label><input class="input" name="followUpDays" type="number" min="1" max="30" value="1" required></div><div class="field"><label>Intervalo entre follow-ups (dias)</label><input class="input" name="followUpIntervalDays" type="number" min="1" max="30" value="3" required></div><div class="field"><label>Troca de óleo padrão (meses)</label><input class="input" name="defaultOilChangeMonths" type="number" min="1" max="36" value="6" required></div><div class="field full"><label>Mensagem padrão de follow-up</label><textarea class="textarea" name="followUpMessage" placeholder="Olá, {cliente}! Tudo bem? Estamos entrando em contato sobre o orçamento {orcamento}."></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">Salvar configurações</button></div></form></div></section>`;

if (profile) {
  const ref = doc(db, 'companies', profile.companyId);
  const snap = await getDoc(ref);
  if (snap.exists()) Object.entries(snap.data()).forEach(([key, value]) => {
    const input = page.querySelector(`[name="${key}"]`);
    if (input) input.value = value ?? '';
  });
  const form = page.querySelector('#settings');
  applyInputMasks(form);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = formDataObject(form);
    data.defaultQuoteValidity = Math.min(365, Math.max(1, Number(data.defaultQuoteValidity) || 30));
    data.followUpDays = Math.min(30, Math.max(1, Number(data.followUpDays) || 1));
    data.followUpIntervalDays = Math.min(30, Math.max(1, Number(data.followUpIntervalDays) || 3));
    data.defaultOilChangeMonths = Math.min(36, Math.max(1, Number(data.defaultOilChangeMonths) || 6));
    await setDoc(ref, { ...data, updatedAt:serverTimestamp() }, { merge:true });
    createToast('Configurações salvas.');
  });
}
