import {EventEmitter} from 'node:events';
import { png } from './helpers/png.js';
// Offline integration tests. No connection to the production Firebase project.
import { registerHooks } from 'node:module';import test from 'node:test';import assert from 'node:assert/strict';
const collectionReads=new Map();const records=new Map();const watchers=new Set();const notify=()=>queueMicrotask(()=>watchers.forEach(fn=>fn()));const watch=(read,callback)=>{let active=true;const emit=async()=>{const value=await read();if(active)callback(value);};watchers.add(emit);void emit();return ()=>{active=false;watchers.delete(emit);};};let serial=0;const clone=v=>structuredClone(v);let staff={uid:'staff1',name:'Funcionário de teste',active:true,role:'admin',companyId:'test-company'};
const ref=path=>({path,id:path.split('/').at(-1),collection:name=>col(path+'/'+name),onSnapshot:callback=>watch(()=>ref(path).get(),callback),async get(){const v=records.get(path);return {exists:v!==undefined,id:path.split('/').at(-1),data:()=>v===undefined?undefined:clone(v)};},async set(v,opt){records.set(path,opt?.merge?{...records.get(path),...clone(v)}:clone(v));notify();}});
function col(path,filters=[],sort=null,max=Infinity,after=null){return {onSnapshot:callback=>watch(()=>col(path,filters,sort,max,after).get(),callback),doc:id=>ref(path+'/'+(id||'mock'+String(++serial).padStart(10,'0'))),where:(k,op,v)=>col(path,[...filters,[k,v]],sort,max,after),orderBy:(k,dir='asc')=>col(path,filters,[k,dir],max,after),limit:n=>col(path,filters,sort,n,after),startAfter:snap=>col(path,filters,sort,max,snap.id),async get(){collectionReads.set(path,(collectionReads.get(path)||0)+1);let rows=[...records.entries()].filter(([k,v])=>k.startsWith(path+'/')&&k.split('/').length===path.split('/').length+1&&filters.every(([key,value])=>v[key]===value));if(sort)rows.sort((a,b)=>String(a[1][sort[0]]).localeCompare(String(b[1][sort[0]]))*(sort[1]==='asc'?1:-1));if(after){const index=rows.findIndex(([key])=>key.split('/').at(-1)===after);rows=rows.slice(index+1);}const docs=rows.slice(0,max).map(([k,v])=>({id:k.split('/').at(-1),data:()=>clone(v)}));return {docs,size:docs.length};}};}
const db={doc:ref,collection:col,batch(){const writes=[];return {set:(r,v)=>writes.push([r,v]),async commit(){for(const [r,v]of writes)records.set(r.path,clone(v));}};},async runTransaction(fn){const writes=[];let hasWrite=false;const tx={async get(r){if(hasWrite)throw new Error('Firestore exige leituras antes de escritas');return r.get();},set(r,v,opt){hasWrite=true;writes.push([r,v,opt]);},update(r,v){hasWrite=true;writes.push([r,v,{merge:true}]);},delete(r){hasWrite=true;writes.push([r,null,{delete:true}]);}};const result=await fn(tx);for(const [r,v,opt]of writes){if(opt?.delete){records.delete(r.path);notify();}else await r.set(v,opt);}return result;}};
globalThis.__testAdmin={adminDb:db,FieldValue:{serverTimestamp:()=>new Date().toISOString()},async requireStaff(req,roles){if(!req.headers.authorization)throw Object.assign(new Error('Não autenticado'),{status:401});if(!staff.active||!roles.includes(staff.role))throw Object.assign(new Error('Acesso negado'),{status:403});return clone(staff);},async requireAdmin(req){if(!req.headers.authorization||staff.role!=='admin')throw Object.assign(new Error('Acesso negado'),{status:403});return clone(staff);}};
delete process.env.FIREBASE_STORAGE_BUCKET;
const hook=registerHooks({resolve(specifier,context,next){if(specifier==='firebase-admin')throw new Error('Este teste não permite Firebase Storage');return next(specifier,context);},load(url,context,next){if(url.endsWith('/api/_firebase-admin.js'))return {format:'module',shortCircuit:true,source:'export const {adminDb,FieldValue,requireStaff,requireAdmin}=globalThis.__testAdmin;'};return next(url,context);}});
const queueApi=(await import('../api/queue.js')).default;const tvApi=(await import('../api/queue-tv.js')).default;const streamApi=(await import('../api/queue-stream.js')).default;
const settings=(await import('../api/settings.js')).default;
const mechanicsApi=(await import('../api/mechanics.js')).default;
const media=(await import('../api/checklist-media.js')).default;
const checklist=(await import('../api/checklists.js')).default;const quotes=(await import('../api/quotes.js')).default;
async function call(handler,body,{auth=true,origin='http://localhost',cookie='',agent='TEST-DEVICE',address}={}){if(auth&&(handler===checklist||handler===media))body={editSession:'offline-browser-session',...body};let status=200,result;const headers={};const req={url:handler===queueApi?'/api/queue':handler===tvApi?'/api/queue-tv':'/api/other',method:'POST',headers:{host:'localhost',origin,cookie,'user-agent':agent,'content-type':'application/json','content-length':String(JSON.stringify(body).length),...(auth?{authorization:'Bearer TEST'}:{})},body,socket:{remoteAddress:address|| (handler===quotes?'offline-quotes':handler===media?'offline-media':'offline-checklist')}};const res={setHeader(k,v){headers[k]=v;},status(n){status=n;return this;},json(v){result=v;return this;},send(v){result=v;return this;}};await handler(req,res);return {status,result,headers};}
records.set('mechanics/mechanic1',{companyId:'test-company',name:'Mecânico de teste',status:'Ativo',deleted:false});
const base={responsibleId:'mechanic1',responsible:'Nome adulterado',customerName:'Cliente de teste',brand:'Marca',model:'Modelo',plate:'ABC1D23',entryDate:'2026-10-21T10:00',keys:1,mileage:100,fuelLevel:'0.5',description:'Descrição persistida\nCom duas linhas',damagedPoints:['top-front','left-roof'],accessories:{Antena:'Sim',GPS:'Não'}};
let r,link,oldToken;
test('API: nega acesso sem autenticação e origem diferente',async()=>{assert.equal((await call(checklist,{action:'list'},{auth:false})).status,401);assert.equal((await call(checklist,{action:'list'},{origin:'https://outro.test'})).status,400);});
test('API: cria e retoma checklist real no armazenamento isolado',async()=>{const a=await call(checklist,{action:'save',data:base});assert.equal(a.status,200,a.result.error);r=a.result;const b=await call(checklist,{action:'get',id:r.id});assert.equal(b.result.data.plate,base.plate);assert.equal(b.result.data.description,base.description);assert.deepEqual(b.result.data.damagedPoints,base.damagedPoints);assert.equal(b.result.data.accessories.Antena,'Sim');assert.equal(b.result.data.accessories.GPS,'Não');assert.equal(b.result.data.fuelLevel,'0.5');assert.equal(b.result.confirmation.status,'Não enviado');});
test('API: isolamento entre empresas e perfil sem permissão',async()=>{staff.companyId='other';assert.equal((await call(checklist,{action:'get',id:r.id})).status,403);staff.companyId='test-company';staff.role='financeiro';assert.equal((await call(checklist,{action:'get',id:r.id})).status,403);staff.role='admin';});
test('API: conflitos de edição não sobrescrevem dados',async()=>{assert.equal((await call(checklist,{action:'save',id:r.id,revision:0,data:base})).status,400);const a=await call(checklist,{action:'save',id:r.id,revision:r.revision,data:{...base,notes:'Observação original'}});assert.equal(a.status,200,a.result.error);r=a.result;});
test('API: finalize não confirma cliente',async()=>{const a=await call(checklist,{action:'finalize',id:r.id,revision:r.revision});assert.equal(a.status,200,a.result.error);r=a.result;assert.equal(r.confirmation.status,'Não enviado');assert.equal(r.status,'Finalizado');});
test('API: conteúdo finalizado não pode ser alterado em silêncio',async()=>{assert.equal((await call(checklist,{action:'save',id:r.id,revision:r.revision,data:base})).status,400);});
test('API: link seguro e leitura não confirmam',async()=>{const a=await call(checklist,{action:'link',id:r.id,revision:r.revision,method:'link'});assert.equal(a.status,200,a.result.error);r=a.result;link=r.token;assert.match(link,/^[a-f0-9]{64}$/);const b=await call(checklist,{action:'get',token:link},{auth:false});assert.equal(b.status,200);assert.equal(b.result.confirmation.confirmedAt,undefined);assert.equal(b.result.companyId,undefined);});
test('API: divergência não aprova orçamento',async()=>{const a=await call(checklist,{action:'review',token:link,data:{description:'Risco não registrado'}},{auth:false});assert.equal(a.status,200,a.result.error);r=a.result;assert.equal(r.confirmation.status,'Revisão solicitada');assert.equal(records.has('serviceOrders/'+r.id),false);const b=await call(checklist,{action:'confirm',token:link,data:{name:'Cliente',accepted:true}},{auth:false});assert.equal(b.status,400);});
test('API: nova versão preserva anterior e invalida link anterior',async()=>{const a=await call(checklist,{action:'new-version',id:r.id,revision:r.revision,data:{resolution:'Incluído risco informado'}});assert.equal(a.status,200,a.result.error);oldToken=link;r=a.result;assert.equal(r.version,2);assert.equal(records.get('checklists/'+r.id+'/versions/1').data.notes,'Observação original');assert.equal((await call(checklist,{action:'get',token:oldToken},{auth:false})).status,400);});
test('API: troca de métodos revoga link antigo',async()=>{r=(await call(checklist,{action:'finalize',id:r.id,revision:r.revision})).result;r=(await call(checklist,{action:'link',id:r.id,revision:r.revision,method:'signature'})).result;const first=r.token;r=(await call(checklist,{action:'link',id:r.id,revision:r.revision,method:'link'})).result;link=r.token;assert.equal((await call(checklist,{action:'get',token:first},{auth:false})).status,400);});
test('API: aceite obrigatório / confirmação exata e duplicidade impedida',async()=>{assert.equal((await call(checklist,{action:'confirm',token:link,data:{name:'Cliente',accepted:false}},{auth:false})).status,400);const a=await call(checklist,{action:'confirm',token:link,data:{name:'Cliente de teste',accepted:true}},{auth:false});assert.equal(a.status,200,a.result.error);r=a.result;assert.equal(r.confirmation.version,2);assert.equal(r.confirmation.status,'Ciência confirmada por link');assert.equal((await call(checklist,{action:'confirm',token:link,data:{name:'Cliente',accepted:true}},{auth:false})).status,400);assert.equal((await call(checklist,{action:'get',token:link},{auth:false})).status,200);});
test('API: WhatsApp exige envio e conferência manual, PDF não confirma',async()=>{r=(await call(checklist,{action:'new-version',id:r.id,revision:r.revision,data:{resolution:'Atualização informada'}})).result;r=(await call(checklist,{action:'finalize',id:r.id,revision:r.revision})).result;r=(await call(checklist,{action:'pdf',id:r.id,revision:r.revision})).result;assert.equal(r.confirmation.status,'Não enviado');assert.equal((await call(checklist,{action:'whatsapp-confirm',id:r.id,revision:r.revision,data:{checked:true}})).status,400);r=(await call(checklist,{action:'whatsapp-sent',id:r.id,revision:r.revision})).result;assert.equal(r.confirmation.confirmedAt,undefined);assert.equal((await call(checklist,{action:'whatsapp-confirm',id:r.id,revision:r.revision,data:{checked:false}})).status,400);r=(await call(checklist,{action:'whatsapp-confirm',id:r.id,revision:r.revision,data:{checked:true}})).result;assert.equal(r.confirmation.status,'Ciência registrada via WhatsApp');});
test('API: assinatura vazia/arquivo inexistente é rejeitada',async()=>{r=(await call(checklist,{action:'new-version',id:r.id,revision:r.revision,data:{resolution:'Nova vistoria'}})).result;r=(await call(checklist,{action:'finalize',id:r.id,revision:r.revision})).result;const a=await call(checklist,{action:'sign',id:r.id,revision:r.revision,data:{accepted:true,name:'Cliente',signatureId:'missing'}});assert.equal(a.status,400);});
test('API: assinatura presencial vinculada a versão e histórico',async()=>{records.set('checklistMedia/sig123',{checklistId:r.id,version:r.version,kind:'signature',linkHash:null});const a=await call(checklist,{action:'sign',id:r.id,revision:r.revision,data:{accepted:true,name:'Cliente',signatureId:'sig123'}});assert.equal(a.status,200,a.result.error);r=a.result;assert.equal(r.confirmation.status,'Confirmado por assinatura presencial');assert.equal(r.confirmation.signatureId,'sig123');const b=await call(checklist,{action:'get',id:r.id});assert.ok(b.result.history.length>8);assert.ok(b.result.versions.length>=3);});
test('API: orçamento recalcula total no servidor e ignora total adulterado',async()=>{records.set('companies/test-company',{paymentDiscounts:{pix:{enabled:true,type:'percent',value:3}}});const a=await call(quotes,{data:{customerName:'Cliente teste',items:[{quantity:1,unitPrice:500,discount:50}],generalDiscount:10,generalDiscountType:'percent',paymentMethod:'pix',total:.01,paymentDiscount:{enabled:true,type:'percent',value:99}}});assert.equal(a.status,200,a.result.error);assert.equal(a.result.total,392.85);globalThis.__quoteId=a.result.id;});
test('API: orçamento salvo mantém regra acordada após configuração mudar',async()=>{records.set('companies/test-company',{paymentDiscounts:{pix:{enabled:true,type:'percent',value:50}}});const id=globalThis.__quoteId,data=records.get('quotes/'+id);const a=await call(quotes,{id,data});assert.equal(a.result.total,392.85);const b=await call(quotes,{id,data:{...data,paymentMethod:'credit'}});assert.equal(b.result.total,405);});
test('API: orçamento rejeita desconto inválido e outra empresa',async()=>{const data={customerName:'Cliente',items:[{quantity:1,unitPrice:20,discount:21}]};assert.equal((await call(quotes,{data})).status,400);staff.companyId='other';assert.equal((await call(quotes,{id:globalThis.__quoteId,data})).status,403);staff.companyId='test-company';});
let mediaChecklist,attachment,remote;
test('API: mídia validada, privada e vinculada ao checklist',async()=>{
 mediaChecklist=(await call(checklist,{action:'save',data:base})).result;
 const a=await call(media,{action:'upload',id:mediaChecklist.id,kind:'attachment',base64:png(true).toString('base64')});assert.equal(a.status,200,a.result.error);attachment=a.result.id;
 assert.equal((await call(media,{action:'read',id:mediaChecklist.id,mediaId:attachment})).status,400);
 mediaChecklist=(await call(checklist,{action:'save',id:mediaChecklist.id,revision:mediaChecklist.revision,data:{...base,media:[{id:attachment,part:'Capô',caption:'Foto teste'}]}})).result;
 const b=await call(media,{action:'read',id:mediaChecklist.id,mediaId:attachment});assert.equal(b.status,200);assert.ok(Buffer.isBuffer(b.result));
 const currentVersion=await call(media,{action:'read',id:mediaChecklist.id,mediaId:attachment,version:mediaChecklist.version});assert.equal(currentVersion.status,200,currentVersion.result.error);assert.deepEqual(currentVersion.result,b.result);assert.equal((await call(media,{action:'read',id:mediaChecklist.id,mediaId:attachment,version:999})).status,400);
 assert.equal((await call(media,{action:'upload',id:mediaChecklist.id,base64:Buffer.from('<html>arquivo inválido</html>'.repeat(10)).toString('base64')})).status,400);
});
test('API: mídia de outro checklist não pode ser anexada ou consultada',async()=>{const a=await call(checklist,{action:'save',id:mediaChecklist.id,revision:mediaChecklist.revision,data:{...base,media:[{id:'sig123',part:'Geral',caption:''}]}});assert.equal(a.status,400);assert.equal((await call(media,{action:'read',id:r.id,mediaId:attachment})).status,400);});
test('API: assinatura remota verifica PNG e versão / assinatura vazia impedida',async()=>{
 mediaChecklist=(await call(checklist,{action:'finalize',id:mediaChecklist.id,revision:mediaChecklist.revision})).result;
 mediaChecklist=(await call(checklist,{action:'link',id:mediaChecklist.id,revision:mediaChecklist.revision,method:'signature'})).result;remote=mediaChecklist.token;
 assert.equal((await call(media,{action:'upload',token:remote,kind:'attachment',base64:png(true).toString('base64')},{auth:false})).status,400);
 assert.equal((await call(media,{action:'upload',token:remote,kind:'signature',base64:png(false).toString('base64')},{auth:false})).status,400);
 const a=await call(media,{action:'upload',token:remote,kind:'signature',base64:png(true).toString('base64')},{auth:false});assert.equal(a.status,200,a.result.error);
 const b=await call(checklist,{action:'sign',token:remote,data:{accepted:true,name:'Cliente remoto',signatureId:a.result.id}},{auth:false});assert.equal(b.status,200,b.result.error);assert.equal(b.result.confirmation.status,'Confirmado por assinatura remota');
});
test('API: foto da versao atual e da versao arquivada permanecem acessiveis',async()=>{const previous=mediaChecklist.version;const updated=await call(checklist,{action:'new-version',id:mediaChecklist.id,revision:records.get('checklists/'+mediaChecklist.id).revision,data:{resolution:'Nova vistoria'}});assert.equal(updated.status,200,updated.result.error);mediaChecklist=updated.result;assert.equal((await call(media,{action:'read',id:mediaChecklist.id,mediaId:attachment,version:previous})).status,200);assert.equal((await call(media,{action:'read',id:mediaChecklist.id,mediaId:attachment,version:mediaChecklist.version})).status,200);});
test('API: configurações de desconto restritas ao administrador',async()=>{const data={paymentDiscounts:{cash:{enabled:true,type:'fixed',value:15},pix:{enabled:true,type:'percent',value:4}}};const a=await call(settings,{data});assert.equal(a.status,200,a.result.error);assert.equal(records.get('companies/test-company').paymentDiscounts.cash.value,15);assert.equal((await call(settings,{data:{paymentDiscounts:{...data.paymentDiscounts,pix:{enabled:true,type:'percent',value:101}}}})).status,400);staff.role='atendente';assert.equal((await call(settings,{data})).status,403);staff.role='admin';});
test('API: link expirado ou revogado nega consulta e mídias',async()=>{const entries=[...records.entries()].filter(([k,v])=>k.startsWith('checklistLinks/')&&v.checklistId===mediaChecklist.id);const [path,link]=entries.at(-1);records.set(path,{...link,expiresAt:0});assert.equal((await call(checklist,{action:'get',token:remote},{auth:false})).status,400);assert.equal((await call(media,{action:'read',token:remote,mediaId:attachment},{auth:false})).status,400);records.set(path,{...link,revoked:true});assert.equal((await call(checklist,{action:'get',token:remote},{auth:false})).status,400);});
test('API: prévia do PDF usa cálculo canônico e não grava orçamento',async()=>{const before=[...records.keys()].filter(k=>k.startsWith('quotes/')).length;const data={customerName:'Cliente',items:[{quantity:2,unitPrice:50,discount:10,discountType:'percent'}],total:0};const a=await call(quotes,{action:'preview',data});assert.equal(a.status,200,a.result.error);assert.equal(a.result.quote.total,90);assert.equal(a.result.quote.code,'PRÉVIA');assert.equal([...records.keys()].filter(k=>k.startsWith('quotes/')).length,before);});

test('API: Base64 em partes, sem bucket, preserva arquivo acima de 1 MB',async()=>{
 const draft=(await call(checklist,{action:'save',data:base})).result;
 const bytes=Buffer.alloc(1100000,123);Buffer.from([255,216,255]).copy(bytes);
 const a=await call(media,{action:'upload',id:draft.id,kind:'attachment',base64:bytes.toString('base64')});assert.equal(a.status,200,a.result.error);
 const metadata=records.get('checklistMedia/'+a.result.id);assert.equal(metadata.encoding,'base64');assert.equal(metadata.path,undefined);assert.equal(metadata.chunkCount,3);
 for(const [path,chunk]of records)if(path.startsWith('checklistMedia/'+a.result.id+'/chunks/'))assert.ok(Buffer.byteLength(chunk.data)<1000000);
 const saved=(await call(checklist,{action:'save',id:draft.id,revision:draft.revision,data:{...base,media:[{id:a.result.id,part:'Geral',caption:'Foto'}]}})).result;
 const b=await call(media,{action:'read',id:saved.id,mediaId:a.result.id});assert.equal(b.status,200,b.result.error);assert.deepEqual(b.result,bytes);
 staff.companyId='other';assert.equal((await call(media,{action:'read',id:saved.id,mediaId:a.result.id})).status,403);staff.companyId='test-company';
 const chunkPath='checklistMedia/'+a.result.id+'/chunks/0000';const original=records.get(chunkPath);records.set(chunkPath,{...original,data:'A'+original.data.slice(1)});
 assert.match((await call(media,{action:'read',id:saved.id,mediaId:a.result.id})).result.error,/integridade/);
 records.delete(chunkPath);assert.match((await call(media,{action:'read',id:saved.id,mediaId:a.result.id})).result.error,/incompleto/);
 assert.equal((await call(media,{action:'upload',id:saved.id,base64:Buffer.alloc(2500001).toString('base64')})).status,400);
});


test('API: CRUD de mecânicos restrito a admin e isolado por empresa',async()=>{
 const created=await call(mechanicsApi,{action:'save',data:{name:'José da oficina',phone:'(61) 99999-0000',specialty:'Motor',status:'Ativo'}});assert.equal(created.status,200,created.result.error);const id=created.result.id;
 const found=await call(mechanicsApi,{action:'list',pageSize:1});assert.equal(found.status,200);assert.equal(found.result.records.length,1);assert.equal(found.result.hasMore,true);const next=await call(mechanicsApi,{action:'list',after:found.result.cursor,pageSize:1});assert.equal(next.result.records.length,1);
 assert.equal((await call(mechanicsApi,{action:'count'})).result.count,2);
 assert.equal((await call(mechanicsApi,{action:'save',id,data:{name:'José atualizado',status:'Inativo'}})).status,200);assert.equal((await call(mechanicsApi,{action:'get',id})).result.name,'José atualizado');
 staff.role='atendente';assert.equal((await call(mechanicsApi,{action:'list',activeOnly:true})).result.records.length,1);assert.equal((await call(mechanicsApi,{action:'save',data:{name:'Sem permissão',status:'Ativo'}})).status,403);staff.role='admin';
 staff.companyId='other';assert.equal((await call(mechanicsApi,{action:'get',id})).status,403);assert.equal((await call(mechanicsApi,{action:'delete',id})).status,403);staff.companyId='test-company';
 assert.equal((await call(mechanicsApi,{action:'delete',id})).status,200);assert.equal((await call(mechanicsApi,{action:'count'})).result.count,1);assert.equal(records.get('mechanics/'+id).deleted,true);
});
test('API: responsável é mecânico ativo, nome canônico e histórico preservado',async()=>{
 const saved=await call(checklist,{action:'save',data:base});assert.equal(saved.status,200,saved.result.error);assert.equal(saved.result.data.responsible,'Mecânico de teste');
 assert.equal((await call(checklist,{action:'save',data:{...base,responsibleId:''}})).status,400);
 for(const [id,companyId,status,deleted]of [['inactive','test-company','Inativo',false],['foreign','other','Ativo',false],['removed','test-company','Ativo',true]]){records.set('mechanics/'+id,{name:'Inválido',companyId,status,deleted});assert.equal((await call(checklist,{action:'save',data:{...base,responsibleId:id}})).status,400);}
 const before=records.get('mechanics/mechanic1');records.set('mechanics/mechanic1',{...before,status:'Inativo'});assert.equal((await call(checklist,{action:'finalize',id:saved.result.id,revision:saved.result.revision})).status,400);records.set('mechanics/mechanic1',before);
 const legacy={...records.get('checklists/'+saved.result.id),status:'Finalizado',data:{...saved.result.data,responsible:'Responsável antigo'}};delete legacy.data.responsibleId;records.set('checklists/legacy',legacy);assert.equal((await call(checklist,{action:'get',id:'legacy'})).result.data.responsible,'Responsável antigo');
});


let queueFirst,queueSecond,tvCookie;
const queueData={vehicleId:'queue-car',serviceOrderId:'queue-os',service:'Troca de óleo',mechanicId:'queue-mechanic',status:'Aguardando',forecastDate:'2026-10-22T15:30',internalNotes:'SEGREDO-INTERNO'};
test('Fila: integra cadastros, impede duplicação e registra projeção sem dados privados',async()=>{
 records.set('mechanics/queue-mechanic',{companyId:'test-company',name:'Carlos Eduardo',status:'Ativo',deleted:false,userId:'queue-user'});records.set('users/queue-user',{companyId:'test-company',name:'Carlos',active:true,role:'mecanico',mechanicId:'queue-mechanic'});records.set('users/staff1',{...staff});
 records.set('vehicles/queue-car',{companyId:'test-company',brand:'Chevrolet',model:'Onix',plate:'ABC1D23',deleted:false});records.set('serviceOrders/queue-os',{companyId:'test-company',vehicleId:'queue-car',code:'OS-TESTE',deleted:false});
 const a=await call(queueApi,{action:'save',data:queueData});assert.equal(a.status,200,a.result.error);queueFirst=a.result;assert.equal(queueFirst.vehicle,'Chevrolet Onix');assert.equal(queueFirst.mechanicName,'Carlos Eduardo');
 assert.equal((await call(queueApi,{action:'save',data:queueData})).status,409);
 const display=records.get('queueDisplayEntries/'+queueFirst.id);assert.equal(display.plate,queueFirst.plate);assert.equal(display.internalNotes,undefined);assert.equal(display.mechanic,'');
 const b=await call(queueApi,{action:'save',data:{...queueData,vehicleId:'',serviceOrderId:'',vehicle:'Fiat Uno',plate:'XYZ9876'}});assert.equal(b.status,200,b.result.error);queueSecond=b.result;
 const moved=await call(queueApi,{action:'move',id:queueSecond.id,revision:queueSecond.revision,direction:'up'});assert.equal(moved.status,200,moved.result.error);
 queueFirst={id:queueFirst.id,...records.get('queueEntries/'+queueFirst.id)};queueSecond=moved.result;
 const history=await call(queueApi,{action:'history',id:queueSecond.id});assert.ok(history.result.history.some(e=>e.action==='Reordenação'&&e.actorId==='staff1'));
});
test('Fila: mecânico só vê e atualiza seus atendimentos; sem acesso ao cadastro ou a outra empresa',async()=>{
 const old={...staff};staff={uid:'queue-user',companyId:'test-company',name:'Carlos',active:true,role:'mecanico',mechanicId:'queue-mechanic'};
 const mine=await call(queueApi,{action:'list'});assert.equal(mine.status,200);assert.ok(mine.result.records.every(r=>r.mechanicId==='queue-mechanic'));
 assert.equal((await call(queueApi,{action:'save',data:queueData})).status,403);assert.equal((await call(queueApi,{action:'update',id:queueFirst.id,revision:queueFirst.revision,data:{vehicle:'Adulterado'}})).status,403);
 records.set('queueEntries/not-mine',{companyId:'test-company',active:true,mechanicId:'someone-else',revision:1});assert.equal((await call(queueApi,{action:'update',id:'not-mine',revision:1,data:{status:'Pronto'}})).status,403);records.delete('queueEntries/not-mine');
 const changed=await call(queueApi,{action:'update',id:queueFirst.id,revision:queueFirst.revision,data:{status:'Pronto',internalNotes:'SEGREDO-ALTERADO'}});assert.equal(changed.status,200,changed.result.error);queueFirst=changed.result;assert.ok(records.has('queueDisplayEntries/'+queueFirst.id),'Pronto permanece no painel');
 staff={...old,companyId:'outra'};assert.equal((await call(queueApi,{action:'history',id:queueFirst.id})).status,403);staff=old;
});
test('Fila: finalização remove do painel e libera a placa sem apagar histórico',async()=>{
 const ended=await call(queueApi,{action:'finish',id:queueFirst.id,revision:queueFirst.revision});assert.equal(ended.status,200,ended.result.error);assert.equal(records.has('queueDisplayEntries/'+queueFirst.id),false);assert.equal(records.get('queueEntries/'+queueFirst.id).active,false);assert.ok((await call(queueApi,{action:'history',id:queueFirst.id})).result.history.length>1);
 const again=await call(queueApi,{action:'save',data:queueData});assert.equal(again.status,200,again.result.error);queueFirst=again.result;
});
test('Boxes: ocupação exclusiva, troca, liberação por status, finalização e permissões',async()=>{
 const invoke=(body)=>call(queueApi,body,{address:'box-test'});
 const data={...queueData,vehicleId:'',serviceOrderId:'',vehicle:'Honda Civic',plate:'BOX0001',status:'Em serviço',box:'1'};
 let one=(await invoke({action:'save',data})).result;assert.equal(one.box,'1');
 const duplicate=await invoke({action:'save',data:{...data,plate:'BOX0002'}});assert.equal(duplicate.status,409);
 assert.equal((await invoke({action:'save',data:{...data,box:'99',plate:'BOX0003'}})).status,400);
 one=(await invoke({action:'update',id:one.id,revision:one.revision,data:{status:'Pronto'}})).result;assert.equal(one.box,'');assert.equal(records.get('queueDisplayEntries/'+one.id).box,'');
 let two=(await invoke({action:'save',data:{...data,plate:'BOX0002'}})).result;assert.equal(two.box,'1');
 assert.equal((await invoke({action:'update',id:one.id,revision:one.revision,data:{status:'Em serviço',box:'1'}})).status,409);
 two=(await invoke({action:'update',id:two.id,revision:two.revision,data:{box:'2'}})).result;assert.equal(two.box,'2');
 one=(await invoke({action:'update',id:one.id,revision:one.revision,data:{status:'Em serviço',box:'1'}})).result;assert.equal(one.box,'1');
 const original={...staff};staff={uid:'queue-user',companyId:'test-company',name:'Carlos',active:true,role:'mecanico',mechanicId:'queue-mechanic'};
 assert.equal((await invoke({action:'update',id:one.id,revision:one.revision,data:{box:'3'}})).status,403);
 one=(await invoke({action:'update',id:one.id,revision:one.revision,data:{status:'Aguardando'}})).result;assert.equal(one.box,'');staff=original;
 two=(await invoke({action:'finish',id:two.id,revision:two.revision})).result;assert.equal(two.box,'');
 one=(await invoke({action:'update',id:one.id,revision:one.revision,data:{status:'Em serviço',box:'2'}})).result;assert.equal(one.box,'2');
 const removed=await invoke({action:'remove',id:one.id,revision:one.revision});assert.equal(removed.status,200);assert.equal(removed.result.box,'');
 assert.ok(![...records.entries()].some(([path,v])=>path.startsWith('queueBoxLocks/')&&[one.id,two.id].includes(v.entryId)));
});

test('Mecânico: vínculo do login é único, validado e removido na exclusão',async()=>{
 records.set('users/link-user',{companyId:'test-company',role:'mecanico',active:true});const created=await call(mechanicsApi,{action:'save',data:{name:'Vinculado',status:'Ativo',userId:'link-user'}});assert.equal(created.status,200,created.result.error);assert.equal(records.get('users/link-user').mechanicId,created.result.id);
 assert.equal((await call(mechanicsApi,{action:'save',data:{name:'Duplicado',status:'Ativo',userId:'link-user'}})).status,400);
 await call(mechanicsApi,{action:'delete',id:created.result.id});assert.equal(records.get('users/link-user').mechanicId,null);
});
const until=async predicate=>{for(let i=0;i<200&&!predicate();i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(predicate(),'Evento em tempo real não recebido');};
test('TV: pareamento, cookie restrito, atualização em tempo real e revogação sem APIs administrativas',async()=>{
 const start=await call(tvApi,{action:'start'},{auth:false});assert.equal(start.status,200,start.result.error);assert.match(start.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);tvCookie=start.headers['Set-Cookie'].split(';')[0];
 assert.equal((await call(tvApi,{action:'authorize',code:start.result.code},{auth:false,cookie:tvCookie})).status,403);
 assert.equal((await call(tvApi,{action:'authorize',code:start.result.code,label:'Recepção'})).status,200);
 const req=new EventEmitter();Object.assign(req,{method:'GET',url:'/api/queue-stream',headers:{host:'localhost',origin:'http://localhost',cookie:tvCookie,'user-agent':'TEST-DEVICE'},socket:{remoteAddress:'tv-stream-test'}});
 const frames=[];const res=new EventEmitter();res.setHeader=()=>{};res.flushHeaders=()=>{};res.write=text=>{if(text.startsWith('data: '))frames.push(JSON.parse(text.slice(6)));};res.end=()=>res.emit('close');res.status=function(n){this.code=n;return this;};res.json=v=>{throw Error(JSON.stringify(v));};
 const running=streamApi(req,res);await until(()=>frames.some(f=>f.type==='queue'));let snapshot=frames.findLast(f=>f.type==='queue');assert.ok(snapshot.records.length>0);assert.ok(!JSON.stringify(snapshot).includes('SEGREDO'));assert.ok(snapshot.records[0].plate);assert.equal(snapshot.records[0].mechanic,'');
 const changed=await call(queueApi,{action:'update',id:queueFirst.id,revision:queueFirst.revision,data:{status:'Em serviço'}});assert.equal(changed.status,200,changed.result.error);queueFirst=changed.result;await until(()=>frames.some(f=>f.type==='queue'&&f.records.some(r=>r.id===queueFirst.id&&r.status==='Em serviço')));
 assert.equal((await call(queueApi,{action:'remove',id:queueFirst.id,revision:queueFirst.revision},{auth:false,cookie:tvCookie})).status,401);
 const sessions=(await call(tvApi,{action:'list'})).result.sessions;assert.equal((await call(tvApi,{action:'revoke',id:sessions[0].id})).status,200);await until(()=>frames.some(f=>f.type==='unauthorized'));await running;
 assert.equal((await call(tvApi,{action:'start'},{auth:false,cookie:tvCookie,agent:'OTHER-DEVICE'})).result.authorized,false);
});

test('Checklist: exclusão administrativa preserva histórico e arquivos e bloqueia acesso e links',async()=>{
 const deletionCall=(handler,body,options={})=>call(handler,body,{address:'offline-deletion',...options});
 const created=await deletionCall(checklist,{action:'save',data:base});assert.equal(created.status,200);let local=created.result;
 const uploaded=await deletionCall(media,{action:'upload',id:local.id,kind:'attachment',base64:png(true).toString('base64')});assert.equal(uploaded.status,200);
 local=(await deletionCall(checklist,{action:'save',id:local.id,revision:local.revision,data:{...base,media:[{id:uploaded.result.id,part:'Geral',caption:'Arquivo preservado'}]}})).result;
 local=(await deletionCall(checklist,{action:'finalize',id:local.id,revision:local.revision})).result;
 const linked=(await deletionCall(checklist,{action:'link',id:local.id,revision:local.revision,method:'link'})).result;local=linked;
 const before=clone(records.get('checklists/'+local.id));
 staff.role='atendente';assert.equal((await deletionCall(checklist,{action:'delete',id:local.id,revision:local.revision})).status,403);
 staff.role='mecanico';assert.equal((await deletionCall(checklist,{action:'delete',id:local.id,revision:local.revision})).status,403);staff.role='admin';
 staff.companyId='other';assert.equal((await deletionCall(checklist,{action:'delete',id:local.id,revision:local.revision})).status,403);staff.companyId='test-company';
 assert.equal((await deletionCall(checklist,{action:'delete',id:local.id,revision:0})).status,400);
 assert.equal((await deletionCall(checklist,{action:'delete',token:linked.token},{auth:false})).status,403);
 const deleted=await deletionCall(checklist,{action:'delete',id:local.id,revision:local.revision});assert.equal(deleted.status,200,deleted.result.error);
 const stored=records.get('checklists/'+local.id);assert.equal(stored.deleted,true);assert.equal(stored.deletedBy,'staff1');assert.deepEqual(stored.data,before.data);assert.deepEqual(stored.confirmation,before.confirmation);
 assert.ok(records.has('checklistMedia/'+uploaded.result.id));assert.ok([...records.entries()].some(([path,v])=>path.startsWith('checklists/'+local.id+'/events/')&&v.action==='delete'&&v.actor==='staff1'));
 assert.ok((await deletionCall(checklist,{action:'list'})).result.records.every(r=>!r.deleted));
 assert.equal((await deletionCall(checklist,{action:'get',id:local.id})).status,403);assert.equal((await deletionCall(media,{action:'read',id:local.id,mediaId:uploaded.result.id})).status,403);
 assert.equal((await deletionCall(checklist,{action:'get',token:linked.token},{auth:false})).status,400);
 assert.equal((await deletionCall(checklist,{action:'get',id:r.id})).status,200,'Outros checklists continuam disponíveis');
});

test('Checklist: paginação atravessa uma página inteira de registros excluídos sem perder os seguintes',async()=>{
 for(let i=0;i<26;i++)records.set('checklists/pagination'+String(i).padStart(2,'0'),{companyId:'test-company',createdAt:'2099-01-01T00:00:'+String(59-i).padStart(2,'0')+'Z',deleted:i<25,data:base});
 const first=await call(checklist,{action:'list'},{address:'pagination-case'});assert.equal(first.status,200);assert.equal(first.result.records.length,0);assert.equal(first.result.nextCursor,'pagination24');
 const second=await call(checklist,{action:'list',after:first.result.nextCursor},{address:'pagination-case'});assert.equal(second.status,200);assert.ok(second.result.records.some(r=>r.id==='pagination25'));assert.ok(second.result.records.every(r=>!r.deleted));
 for(let i=0;i<26;i++)records.delete('checklists/pagination'+String(i).padStart(2,'0'));
});

test.after(()=>hook.deregister());

test('Oficina: expediente tem validação, isolamento e não modifica atendimentos ou boxes',async()=>{
 const {defaultWorkshopSchedule}=await import('../js/utils/workshop-hours.js');const snapshot=structuredClone([...records.entries()].filter(([k])=>k.startsWith('queueEntries/')||k.startsWith('queueBoxLocks/')));
 const data={workshopSchedule:{...defaultWorkshopSchedule(),holidays:[{date:'2026-10-26',name:'Feriado'}]}};
 assert.equal((await call(settings,{action:'workshop-hours',data},{auth:false,address:'hours'})).status,403);
 assert.equal((await call(settings,{action:'workshop-hours',data:{workshopSchedule:{}}},{address:'hours'})).status,400);
 const r=await call(settings,{action:'workshop-hours',data},{address:'hours'});assert.equal(r.status,200,r.result.error);assert.equal(records.get('companies/test-company').workshopSchedule.holidays[0].name,'Feriado');assert.deepEqual([...records.entries()].filter(([k])=>k.startsWith('queueEntries/')||k.startsWith('queueBoxLocks/')),snapshot);
});
test('Oficina: TVs têm cookies, autorizações e revogação separados da recepção',async()=>{
 const r=await call(tvApi,{action:'start',panel:'workshop'},{auth:false,address:'workshop-tv'});assert.equal(r.status,200);assert.match(r.headers['Set-Cookie'],/^gac_workshop_tv=/);const cookie=r.headers['Set-Cookie'].split(';')[0];
 assert.equal((await call(tvApi,{action:'authorize',code:r.result.code},{address:'workshop-tv'})).status,400);
 assert.equal((await call(tvApi,{action:'authorize',panel:'workshop',code:r.result.code},{address:'workshop-tv'})).status,200);
 assert.equal((await call(tvApi,{action:'start',panel:'workshop'},{auth:false,cookie,address:'workshop-tv'})).result.authorized,true);
 assert.equal((await call(tvApi,{action:'start'},{auth:false,cookie,address:'workshop-tv'})).result.authorized,false);
 const list=await call(tvApi,{action:'list',panel:'workshop'},{address:'workshop-tv'});assert.equal(list.result.sessions.length,1);const id=list.result.sessions[0].id;
 assert.equal((await call(tvApi,{action:'revoke',id},{address:'workshop-tv'})).status,403);assert.equal((await call(tvApi,{action:'revoke',panel:'workshop',id},{address:'workshop-tv'})).status,200);
});

test('Checklist: edição/PDF dispensam histórico e versões; página maior reduz rodadas com limite de 100',async()=>{
 const oldCompany=staff.companyId;staff.companyId='query-budget';
 try{
  const id='budget-checklist';records.set('checklists/'+id,{companyId:staff.companyId,status:'Finalizado',revision:1,data:base});
  const events='checklists/'+id+'/events',versions='checklists/'+id+'/versions',beforeEvents=collectionReads.get(events)||0,beforeVersions=collectionReads.get(versions)||0;
  assert.equal((await call(checklist,{action:'get',id,includeHistory:false,includeVersions:false},{address:'read-budget'})).status,200);assert.equal(collectionReads.get(events)||0,beforeEvents);assert.equal(collectionReads.get(versions)||0,beforeVersions);
  await call(checklist,{action:'get',id},{address:'read-budget'});assert.equal(collectionReads.get(events),beforeEvents+1);assert.equal(collectionReads.get(versions),beforeVersions+1);
  for(let i=0;i<105;i++)records.set('checklists/budget'+String(i).padStart(5,'0'),{companyId:staff.companyId,createdAt:new Date(2026,0,1,0,i).toISOString(),deleted:false});
  const result=await call(checklist,{action:'list',pageSize:1000},{address:'read-budget'});assert.equal(result.status,200);assert.equal(result.result.records.length,100);assert.ok(result.result.nextCursor);
 }finally{staff.companyId=oldCompany;}
});

test('Checklist: bloqueio exclusivo por conta/aba, validação no servidor, renovação, liberação e expiração',async()=>{
 const original={...staff};const a='edit-session-browser-a',b='edit-session-browser-b';let record;
 try{
  record=(await call(checklist,{action:'save',editSession:a,data:base},{address:'edit-locks'})).result;assert.ok(record.id);
  assert.equal((await call(checklist,{action:'acquire-edit',id:record.id,editSession:b},{address:'edit-locks'})).status,409,'A segunda aba da mesma conta também não edita');
  staff={...original,uid:'other-editor',role:'atendente'};
  assert.equal((await call(checklist,{action:'acquire-edit',id:record.id,editSession:b},{address:'edit-locks'})).status,409);
  assert.equal((await call(checklist,{action:'get',id:record.id,includeHistory:false,includeVersions:false},{address:'edit-locks'})).status,200,'Visualização continua permitida');
  assert.equal((await call(checklist,{action:'save',id:record.id,revision:record.revision,editSession:b,data:{...base,notes:'Não deve salvar'}},{address:'edit-locks'})).status,409);
  assert.equal((await call(checklist,{action:'release-edit',id:record.id,editSession:b},{address:'edit-locks'})).status,200);assert.equal(records.get('checklists/'+record.id+'/editing/session').session,a,'Outra conta não pode liberar o bloqueio');
  staff=original;const before=clone(records.get('checklists/'+record.id));assert.equal((await call(checklist,{action:'renew-edit',id:record.id,editSession:a},{address:'edit-locks'})).status,200);assert.deepEqual(records.get('checklists/'+record.id),before,'Renovar não salva formulário nem emite revisão');
  assert.equal((await call(checklist,{action:'release-edit',id:record.id,editSession:a},{address:'edit-locks'})).status,200);
  staff={...original,uid:'other-editor',role:'atendente'};assert.equal((await call(checklist,{action:'acquire-edit',id:record.id,editSession:b},{address:'edit-locks'})).status,200);
  records.get('checklists/'+record.id+'/editing/session').expiresAt=Date.now()-1;
  assert.equal((await call(checklist,{action:'save',id:record.id,revision:record.revision,editSession:b,data:base},{address:'edit-locks'})).status,409,'Bloqueio vencido não permite salvar');
  staff=original;assert.equal((await call(checklist,{action:'acquire-edit',id:record.id,editSession:a},{address:'edit-locks'})).status,200);
  staff.companyId='outra-empresa';assert.equal((await call(checklist,{action:'acquire-edit',id:record.id,editSession:a},{address:'edit-locks'})).status,403);
 }finally{staff=original;}
});
test('Checklist SSE: mudanças salvas, assinatura, exclusão, isolamento e revogação em tempo real',async()=>{
 const handler=(await import('../api/checklist-stream.js')).default;const original={...staff};const id='realtime-checklist';let running,res;
 try{
  staff={...original,uid:'live-user',companyId:'live-company'};records.set('users/live-user',{...staff});records.set('checklists/'+id,{companyId:staff.companyId,revision:1,version:1,status:'Finalizado',data:base,confirmation:{status:'Não enviado'}});records.set('checklists/foreign-live',{companyId:'outra-empresa',revision:1,data:{customerName:'SEGREDO OUTRA EMPRESA'}});
  assert.equal((await call(handler,{}, {auth:false,address:'checklist-stream-denied'})).status,401);
  const req=new EventEmitter();Object.assign(req,{method:'POST',body:{},headers:{host:'localhost',origin:'http://localhost',authorization:'Bearer TEST','content-type':'application/json','content-length':'2'},socket:{remoteAddress:'checklist-stream-live'}});
  const frames=[];res=new EventEmitter();res.setHeader=()=>{};res.flushHeaders=()=>{};res.write=text=>{if(text.startsWith('data: '))frames.push(JSON.parse(text.slice(6)));};res.end=()=>res.emit('close');res.status=()=>res;res.json=v=>{throw Error(JSON.stringify(v));};
  running=handler(req,res);await until(()=>frames.some(f=>f.type==='checklists'));assert.equal(frames[0].initial,true);assert.equal(frames[0].records.length,1);assert.ok(!JSON.stringify(frames).includes('SEGREDO'));
  await db.doc('checklists/'+id).set({revision:2,confirmation:{status:'Confirmado por assinatura remota',signatureId:'signature-live'}},{merge:true});await until(()=>frames.some(f=>f.records?.some(r=>r.confirmation?.signatureId==='signature-live')));
  const count=frames.length;await db.doc('checklists/'+id+'/editing/session').set({uid:'live-user',expiresAt:Date.now()+90000});await new Promise(r=>setTimeout(r,15));assert.equal(frames.length,count,'Bloqueio não publica alterações no checklist');
  await db.doc('checklists/'+id).set({deleted:true,revision:3},{merge:true});await until(()=>frames.some(f=>f.removed?.includes(id)));
  await db.doc('users/live-user').set({active:false},{merge:true});await until(()=>frames.some(f=>f.type==='unauthorized'));await running;
 }finally{res?.emit('close');if(running)await running;staff=original;}
});

test('Veículos: vínculo com cliente é validado por empresa e não altera o checklist até Salvar',async()=>{
 const original={...staff};try{
  records.set('vehicles/link-car',{companyId:staff.companyId,brand:'Fiat',model:'Uno',plate:'LNK1234',customerId:'',ownerName:'Manual'});records.set('customers/link-owner',{companyId:staff.companyId,name:'Cliente vinculado'});records.set('customers/foreign-owner',{companyId:'foreign',name:'Cliente privado'});
  const result=await call(checklist,{action:'link-vehicle',data:{vehicleId:'link-car',customerId:'link-owner',expectedCustomerId:''}},{address:'vehicle-link'});assert.equal(result.status,200,result.result.error);assert.equal(result.result.customerId,'link-owner');assert.equal(records.get('vehicles/link-car').ownerName,'Cliente vinculado');
  assert.equal((await call(checklist,{action:'link-vehicle',data:{vehicleId:'link-car',customerId:'foreign-owner',expectedCustomerId:'link-owner'}},{address:'vehicle-link'})).status,403);
  assert.equal((await call(checklist,{action:'link-vehicle',data:{vehicleId:'link-car',customerId:'link-owner',expectedCustomerId:''}},{address:'vehicle-link'})).status,409);
 }finally{staff=original;}
});
