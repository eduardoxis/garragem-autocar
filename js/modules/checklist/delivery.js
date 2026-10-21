import { normalizeWhatsapp } from '../../utils/masks.js';

// Prepare first so the following tap can share a file with browser user activation.
export function showPdfDelivery(host, result, record, download) {
  host.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = 'PDF pronto para enviar';
  const instructions = document.createElement('p');
  instructions.textContent = 'Compartilhe o arquivo pelo celular ou baixe o PDF e anexe à conversa do cliente no WhatsApp.';
  const actions = document.createElement('div');
  actions.className = 'checklist-tools';
  const save = document.createElement('button');
  save.type = 'button'; save.className = 'btn'; save.textContent = 'Baixar arquivo PDF';
  save.onclick = () => download(result);
  actions.append(save);
  const file = new File([result.blob], result.name, { type: 'application/pdf' });
  let canShare = false;
  try { canShare = Boolean(navigator.share && navigator.canShare?.({ files: [file] })); } catch {}
  if (canShare) {
    const share = document.createElement('button');
    share.type = 'button'; share.className = 'btn btn-primary'; share.textContent = 'Compartilhar arquivo PDF';
    share.onclick = async () => {
      share.disabled = true;
      try {
        await navigator.share({ files: [file], title: record.code });
        instructions.textContent = 'Compartilhamento concluído. Registre o envio ao cliente somente depois de conferir a conversa.';
      } catch (error) {
        instructions.textContent = error.name === 'AbortError'
          ? 'Compartilhamento cancelado. O PDF continua disponível para baixar ou tentar novamente.'
          : 'Não foi possível compartilhar. Baixe o PDF e anexe à conversa do cliente.';
      } finally { share.disabled = false; }
    };
    actions.prepend(share);
  }
  const whatsapp = document.createElement('a');
  whatsapp.className = 'btn'; whatsapp.textContent = 'Abrir WhatsApp do cliente';
  const phone = record.data.phone ? normalizeWhatsapp(record.data.phone) : '';
  whatsapp.href = 'https://wa.me/' + (/^\d{12,15}$/.test(phone) ? phone : '') + '?text=' + encodeURIComponent('Olá! Segue o checklist ' + record.code + ' · versão ' + record.version + ' do veículo ' + record.data.plate + '.');
  whatsapp.target = '_blank'; whatsapp.rel = 'noopener noreferrer';
  const note = document.createElement('p');
  note.textContent = 'No WhatsApp Web, baixe o PDF e use o clipe da conversa para anexar o arquivo. O botão abre a conversa; o PDF não é anexado automaticamente.';
  actions.append(whatsapp);
  host.append(heading, instructions, actions, note);
  host.hidden = false;
  host.scrollIntoView({ block: 'nearest' });
}
