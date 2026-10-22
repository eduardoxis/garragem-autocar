import { registerHooks } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.__clientAuth={currentUser:{getIdToken:async()=>'TOKEN-TESTE'}};
const hook=registerHooks({load(url,context,next){
 if(url.endsWith('/js/firebase/firebase-config.js'))return {format:'module',shortCircuit:true,source:'export const auth=globalThis.__clientAuth;export const db={};'};
 if(url.startsWith('https://www.gstatic.com/firebasejs/'))return {format:'module',shortCircuit:true,source:'export const addDoc=()=>{},collection=()=>{},doc=()=>{},getCountFromServer=()=>{},getDoc=()=>{},getDocs=()=>{},limit=()=>{},orderBy=()=>{},query=()=>{},serverTimestamp=()=>{},startAfter=()=>{},updateDoc=()=>{},where=()=>{};'};
 return next(url,context);
}});
const {api}=await import('../js/services/api.js');
const {listRecords,getRecord,countRecords}=await import('../js/firebase/firestore.js');
test('camada comum: autenticação, link público, erro HTTP e arquivo binário',async t=>{
 const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous;globalThis.__clientAuth.currentUser={getIdToken:async()=>'TOKEN-TESTE'};});
 let request;globalThis.fetch=async(path,options)=>{request={path,options};return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});};
 assert.deepEqual(await api('quotes',{action:'preview'}),{ok:true});assert.equal(request.options.headers.Authorization,'Bearer TOKEN-TESTE');
 globalThis.__clientAuth.currentUser=null;await api('checklists',{token:'LINK'});assert.equal(request.options.headers.Authorization,undefined);
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'Configuração pendente'}),{status:503});await assert.rejects(api('checklists',{}),e=>e.status===503&&e.message==='Configuração pendente');
 globalThis.fetch=async()=>new Response('arquivo',{headers:{'Content-Type':'image/png'}});assert.equal(await (await api('checklist-media',{}, {binary:true})).text(),'arquivo');
});
test('Checklist usa listRecords/getRecord comuns e mantém cursor e empresa',async t=>{
 const previous=globalThis.fetch;t.after(()=>globalThis.fetch=previous);let request;
 globalThis.fetch=async(path,options)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({records:[{id:'check1'}],nextCursor:'check1'}));};
 const result=await listRecords('checklists','empresa',{after:'anterior'});assert.equal(result.cursor,'check1');assert.equal(result.hasMore,true);assert.equal(request.after,'anterior');
 globalThis.fetch=async()=>new Response(JSON.stringify({id:'check1',companyId:'empresa',history:[],versions:[]}));assert.equal((await getRecord('checklists','empresa','check1')).id,'check1');
 await assert.rejects(getRecord('checklists','outra','check1'),e=>e.status===403);
});
test('cache de listas isola usuário/empresa, reutiliza total e invalida após alterações',async t=>{
 const {queryCache}=await import('../js/services/query-cache.js');queryCache.invalidate();const previous=globalThis.fetch;let calls=0;
 t.after(()=>{globalThis.fetch=previous;globalThis.__clientAuth.currentUser={getIdToken:async()=>'TOKEN-TESTE'};queryCache.invalidate();});
 globalThis.__clientAuth.currentUser={uid:'userA',getIdToken:async()=>'TOKEN-TESTE'};
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({records:[{id:'m1',name:'Original'}],total:1,hasMore:false}));};
 const first=await listRecords('mechanics','companyA');first.records[0].name='Mutado';assert.equal((await listRecords('mechanics','companyA')).records[0].name,'Original');assert.equal(await countRecords('mechanics','companyA'),1);assert.equal(calls,1);
 await listRecords('mechanics','companyB');assert.equal(calls,2);globalThis.__clientAuth.currentUser.uid='userB';await listRecords('mechanics','companyA');assert.equal(calls,3);
 await api('mechanics',{action:'save',data:{}});await listRecords('mechanics','companyA');assert.equal(calls,5);await listRecords('mechanics','companyA',{force:true});assert.equal(calls,6);
});
test.after(()=>hook.deregister());
