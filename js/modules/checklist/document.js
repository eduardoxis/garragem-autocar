import {formatNumber} from '../../utils/numbers.js';
import { formatDateTime } from '../../utils/date.js';
import { accessories, disclaimer, inspectionPoints, damageLegend, fuelLevels, checklistDescription, markedPoints } from '../../utils/checklist.js';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function diagram(interactive=false,marked=[]){
 const selected=new Set(marked);
 return '<div class="vehicle-reference"><img src="assets/checklist-reference.png" alt="Diagrama de inspeção do veículo: vistas superior, dianteira, traseira e laterais">'+inspectionPoints.map(({id,x,y,part})=>{
 const tag=interactive?'button':'span';
 return '<'+tag+(interactive?' type="button" data-point="'+id+'" aria-pressed="'+selected.has(id)+'"':'')+' class="inspection-point '+(selected.has(id)?'is-marked':'')+'" style="left:'+x+'%;top:'+y+'%" aria-label="'+esc(part)+(selected.has(id)?': avaria marcada':': sem avaria marcada')+'"><span></span></'+tag+'>';
 }).join('')+'</div><p class="damage-legend">'+damageLegend+'</p>';
}
// Bound both characters and line breaks so even long multiline text can paginate.
const chunks=(text,size)=>{
 const result=[];let rest=String(text||'');
 while(rest){
 let end=Math.min(size,rest.length),lines=0;
 for(let i=0;i<end;i++)if(rest[i]==='\n'&&++lines>=18){end=i+1;break;}
 if(end<rest.length&&!/\s/.test(rest[end-1])){const boundary=rest.slice(0,end).search(/\s+\S*$/);if(boundary>end/2)end=boundary+1;}
 result.push(rest.slice(0,end));rest=rest.slice(end);
 }
 return result.length?result:[''];
};
const paragraphs=text=>chunks(text||'—',900).map(t=>'<p>'+esc(t)+'</p>').join('');
export function fillDocumentSignature(root,url){
 for(const slot of root.querySelectorAll('[data-checklist-signature]')){const image=document.createElement('img');image.src=url;image.alt='Assinatura do cliente';slot.replaceChildren(image);}
}
export function documentHtml(r,signatureUrl=''){
 const d=r.data,c=r.confirmation||{},fullServices=(d.services||d.reason||'').length>300||(d.services||d.reason||'').split('\n').length>3,line=(label,value)=>'<span><b>'+label+':</b> '+esc(value||'—')+'</span>';
 const signatureImage=signatureUrl?'<img src="'+esc(signatureUrl)+'" alt="Assinatura do cliente">':c.signatureId?'<span>Carregando assinatura registrada…</span>':'<div class="signature-line"></div>';
 const header='<header class="checklist-brand"><img src="assets/garagem-auto-car-logo.png" alt="GAC"><div><h1>Garagem AutoCar</h1><i>O carro é seu, o compromisso é nosso!</i><strong>☏ 99901-7667</strong></div><aside><b>☑ CHECKLIST</b><p>@garagemautocarlza</p><p>garagemautocarlza@gmail.com</p><small>'+esc(r.code)+' · Versão '+r.version+'</small></aside></header>';
 const foot='<footer class="checklist-footer">Rua 29 - Quadra 80 - Lote 01 - Parque JK (Mandu) - Luziânia-GO</footer>';
 let html='<section class="checklist-sheet">'+header+'<div class="checklist-identification">'+line('Nome do cliente',d.customerName)+line('CPF',d.document)+line('Telefone',d.phone)+line('Endereço',d.address)+line('Marca do veículo',d.brand)+line('Modelo',d.model)+line('Ano',d.modelYear||d.manufactureYear)+line('KM',formatNumber(d.mileage,{decimals:0}))+line('Placa',d.plate)+line('Data',formatDateTime(d.entryDate))+'</div><section class="paper-box"><h2>INSPEÇÃO VISUAL DO VEÍCULO</h2>'+diagram(false,markedPoints(d))+'</section><div class="checklist-middle"><section class="paper-box"><h2>Acessórios</h2><table><thead><tr><th>Item</th><th>Sim</th><th>Não</th></tr></thead><tbody>'+Array.from({length:Math.ceil(accessories.length/2)},(_,i)=>'<tr>'+accessories.slice(i*2,i*2+2).map(k=>'<td>'+esc(k)+'</td><td class="accessory-answer">'+(d.accessories?.[k]==='Sim'?'●':'○')+' Sim &nbsp; '+(d.accessories?.[k]==='Não'?'●':'○')+' Não</td>').join('')+'</tr>').join('')+'</tbody></table></section><section class="paper-box fuel-box"><h2>Nível de combustível</h2><div class="fuel-gauge"><div style="width:'+Number(d.fuelLevel)*100+'%"></div></div><div class="fuel-labels"><span>0</span><span>1/4</span><span>1/2</span><span>3/4</span><span>1</span></div><p>Chaves: '+esc(d.keys)+'<br>Responsável: '+esc(d.responsible)+'</p><small>'+esc(fuelLevels.find(([v])=>v===String(d.fuelLevel))?.[1]||'')+'</small></section></div><section class="paper-box"><h2>Serviços solicitados <small>(inspeção / manutenção / reparação)</small></h2><p class="services-lines">'+esc(fullServices?'Consulte os serviços completos nas observações.':d.services||d.reason)+'</p></section><div class="paper-signature">'+('<div class="signature-image" data-checklist-signature>'+signatureImage+'</div>')+'Assinatura do cliente · '+esc(c.status||'Não enviado')+'</div></section>';
 const description=checklistDescription(d);
 html+='<section class="checklist-sheet appendix compact-report">'+(description?'<h2>Descrição</h2>'+paragraphs(description):'');
 const fields=[['services','Serviços solicitados (texto completo)'],['reason','Motivo da entrada'],['notes','Observações gerais'],['belongings','Objetos pessoais'],['accessoriesNotes','Acessórios entregues'],['warningLights','Luzes de advertência']].filter(([k])=>d[k]&&(k!=='services'||fullServices)&&(k!=='reason'||d[k]!==d.services));
 html+='<h2>Observações e ciência do cliente</h2>'+fields.map(([k,label])=>chunks(d[k],1200).map((text,i)=>'<div class="observation-block"><h3>'+label+(i?' (continuação)':'')+'</h3><p>'+esc(text)+'</p></div>').join('')).join('')+'<p>'+esc(disclaimer)+'</p><p>Por favor, confira as condições registradas neste checklist. Se estiverem de acordo com o que você observou na entrada do veículo, responda no WhatsApp: <strong>OK, ESTOU CIENTE DO CHECKLIST '+esc(r.code)+'</strong>. Caso identifique divergência, informe à nossa equipe antes do início dos serviços.</p><div class="confirmation-signature"><h3>Ciência e assinatura do cliente</h3><p>Confirmação: '+esc(c.status)+' · '+esc(c.name||'')+' · '+esc(c.confirmedAt?formatDateTime(c.confirmedAt):'')+' · Versão '+esc(c.version||r.version)+'</p>'+(c.declaration?'<p>'+esc(c.declaration)+'</p>':'')+(c.signatureId?'<div class="signature-image" data-checklist-signature>'+signatureImage+'</div><p class="signature-caption">Assinatura do cliente · '+esc(c.name||d.customerName)+'</p>':'')+'</div>'+foot+'</section>';
 return html;
}
