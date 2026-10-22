import {requireAuth} from '../../guards.js';
import {mountShell,setupErrorBoundary} from '../../app.js';
import {subscribeQueue} from '../../services/queue-stream.js';
import {getIcon} from '../../components/icons.js';
import {api} from '../../services/api.js';
import {createToast} from '../../components/toast.js';
import {queueStatuses,queueTone} from '../../utils/queue.js';
import {workshopDay,workshopZone,workshopGroups} from '../../utils/workshop.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
setupErrorBoundary();
const life=new AbortController();let stream,timer;
const cleanup=()=>{life.abort();stream?.abort();clearInterval(timer);if(document.fullscreenElement===panel)void document.exitFullscreen();};
let panel;
window.addEventListener('gac:routechange',cleanup,{once:true});window.addEventListener('pagehide',cleanup,{once:true});
const profile=await requireAuth({roles:['admin','mecanico']});
if(profile&&!life.signal.aborted){
 const page=mountShell(profile,{title:'Gerência Oficina',active:'gerencia-oficina'}),admin=profile.role==='admin';
 if(!document.querySelector('link[href="/css/workshop.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/css/workshop.css';document.head.append(css);}
 let day=workshopDay(),today=day,savedDay=day,records=[],mechanics=[],rotation=0,lastRotation=Date.now();
 page.innerHTML=`<div class="workshop-tools"><label>Dia do serviço <input class="input" id="workshop-day" type="date" value="${day}" ${admin?'':'disabled'}></label><button class="btn" id="workshop-today">Hoje</button><a class="btn" href="#fila">Gerenciar Fila</a><button class="btn btn-primary" id="workshop-fullscreen">⛶ Tela cheia</button></div><section class="workshop-panel" aria-label="Gerência Oficina"><header class="workshop-header"><img src="/assets/garagem-auto-car-logo.png" alt="GAC"><div class="workshop-title"><h1>Gerência Oficina</h1><p>Acompanhe os serviços da oficina em tempo real</p></div><div class="workshop-clock"><strong>${getIcon('users',28)} Mecânicos</strong><div><time id="workshop-clock"></time><span id="workshop-date"></span></div></div></header><p class="workshop-connection" role="status">Carregando serviços…</p><div class="workshop-columns"></div><footer class="workshop-footer"><span><i class="ready"></i>Pronto</span><span><i class="working"></i>Em serviço</span><span><i class="waiting"></i>Aguardando</span><p>ⓘ Os horários são estimados e podem sofrer alterações.</p><small id="workshop-pages"></small></footer><button class="workshop-exit btn" aria-label="Sair da tela cheia">⛶ Sair</button></section>`;
 panel=page.querySelector('.workshop-panel');
 const status=page.querySelector('.workshop-connection'),input=page.querySelector('#workshop-day');
 const message=text=>{status.textContent=text;};
 function render(){
  if(life.signal.aborted||!page.isConnected)return;
  const groups=workshopGroups(mechanics,records),groupPages=Math.max(1,Math.ceil(groups.length/5)),groupPage=rotation%groupPages,shown=groups.slice(groupPage*5,groupPage*5+5);
  const columns=panel.querySelector('.workshop-columns');columns.style.setProperty('--mechanics',Math.max(1,shown.length));
  columns.innerHTML=shown.map((m,index)=>{const pages=Math.max(1,Math.ceil(m.records.length/5)),number=Math.floor(rotation/groupPages)%pages,rows=m.records.slice(number*5,number*5+5);return `<article class="workshop-mechanic" data-mechanic="${esc(m.id)}"><header><span class="workshop-initial color-${index%4}">${esc(m.name?.trim().charAt(0)||'?')}</span><h2>${esc(m.name)}${m.inactive?'<small>Cadastro inativo</small>':''}</h2><span class="workshop-count">${m.records.length} serviço${m.records.length===1?'':'s'}</span></header><div class="workshop-table-head"><span>#</span><span>Veículo / Placa</span><span>Serviço</span><span>Status</span><span>Previsão</span></div><div class="workshop-jobs">${rows.map((r,i)=>`<div class="workshop-job" data-entry="${esc(r.id)}"><span>${number*5+i+1}</span><div><strong>${esc(r.vehicle)}</strong><small>${esc(r.plate)}</small>${r.box?`<small>Box ${esc(String(r.box).padStart(2,'0'))}</small>`:''}${r.overdue?'<small class="workshop-overdue">Pendente de '+esc(r.scheduledDate.split('-').reverse().join('/'))+'</small>':''}</div><span>${esc(r.service)}</span><div><span class="workshop-badge ${queueTone(r.status)}">${esc(r.status)}</span>${r.active?`<select class="workshop-state" data-status="${esc(r.id)}" aria-label="Status de ${esc(r.vehicle)}">${queueStatuses.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select>`:'<small>Encerrado</small>'}</div><time>${esc(r.forecastDate?.slice(11,16)||'—')}</time></div>`).join('')||'<p class="workshop-empty">Sem serviços para este dia.</p>'}</div>${pages>1?`<small class="workshop-pagination">${number+1} / ${pages}</small>`:''}</article>`;}).join('')||'<p class="workshop-empty">Nenhum mecânico cadastrado para esta visualização.</p>';
  panel.querySelector('#workshop-pages').textContent=groupPages>1?`Mecânicos ${groupPage+1} / ${groupPages}`:'';
 }
 function connect(){
  stream?.abort();stream=new AbortController();records=[];mechanics=[];rotation=0;render();message('Sincronizando…');const selected=day,subscription=stream;
  subscribeQueue({view:'workshop',day,signal:stream.signal,onMessage:event=>{if(life.signal.aborted||subscription.signal.aborted||day!==selected)return;if(event.type==='workshop'){records=event.records;mechanics=event.mechanics;render();message('');}else if(event.type==='unauthorized'||event.type==='error')message(event.message);},onConnection:connected=>{if(!life.signal.aborted&&!subscription.signal.aborted&&day===selected&&!connected)message('Reconectando · os dados exibidos podem estar desatualizados');}});
 }
 function setDay(value){day=value;input.value=day;connect();}
 input.addEventListener('change',()=>{if(input.reportValidity()&&input.value)setDay(input.value);});page.querySelector('#workshop-today').onclick=()=>setDay(workshopDay());
 panel.addEventListener('change',async event=>{const select=event.target.closest('[data-status]');if(!select)return;const r=records.find(r=>r.id===select.dataset.status);if(!r)return;select.disabled=true;try{await api('queue',{action:'update',id:r.id,revision:r.revision,data:{status:select.value}});}catch(error){select.value=r.status;createToast(error.message,'error');}finally{select.disabled=false;}});
 page.querySelector('#workshop-fullscreen').onclick=async()=>{try{savedDay=day;await panel.requestFullscreen();}catch{createToast('Não foi possível ativar a tela cheia neste navegador.','error');}};
 panel.querySelector('.workshop-exit').onclick=()=>document.exitFullscreen();
 document.addEventListener('fullscreenchange',()=>{if(life.signal.aborted)return;if(document.fullscreenElement===panel)setDay(workshopDay());else if(admin&&day!==savedDay)setDay(savedDay);},{signal:life.signal});
 function tick(){
  if(life.signal.aborted)return;
  const now=new Date(),next=workshopDay(now);panel.querySelector('#workshop-clock').textContent=now.toLocaleTimeString('pt-BR',{timeZone:workshopZone,hour:'2-digit',minute:'2-digit'});panel.querySelector('#workshop-date').textContent=now.toLocaleDateString('pt-BR',{timeZone:workshopZone,weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if(next!==today){const follow=day===today||document.fullscreenElement===panel;today=next;if(follow)setDay(today);}
  if(Date.now()-lastRotation>=15000){lastRotation=Date.now();rotation++;render();}
 }
 connect();tick();timer=setInterval(tick,1000);
}
