import test from 'node:test';
import assert from 'node:assert/strict';
import {createQueryCache,copyQueryResult} from '../js/services/query-cache.js';
import {createLiveQueries} from '../api/_live-query.js';
test('consultas idênticas compartilham requisição; TTL, falhas e invalidação não devolvem respostas antigas',async()=>{
 let clock=0,reads=0,release;const cache=createQueryCache({now:()=>clock});
 const loader=async()=>{reads++;return {value:reads};};const [a,b]=await Promise.all([cache.read('a',loader,{ttl:30,tags:['customers']}),cache.read('a',loader,{ttl:30,tags:['customers']})]);assert.equal(reads,1);assert.equal(a.value,b.value);
 assert.equal((await cache.read('a',loader)).value,1);clock=31;await cache.read('a',loader,{tags:['customers']});assert.equal(reads,2);cache.invalidate(['vehicles']);await cache.read('a',loader);assert.equal(reads,2);cache.invalidate(['customers']);await cache.read('a',loader);assert.equal(reads,3);
 await assert.rejects(cache.read('bad',()=>Promise.reject(Error('Falha'))));await cache.read('bad',loader);assert.equal(reads,4);
 const pending=cache.read('race',()=>new Promise(r=>release=r),{tags:['customers']});await Promise.resolve();cache.invalidate(['customers']);release('antes');await pending;assert.equal(await cache.read('race',()=>Promise.resolve('depois')),'depois');
});
test('cópias dos resultados preservam Timestamp/cursor e evitam mutações nos dados reutilizados',()=>{
 class Timestamp{toDate(){return new Date(0);}}const timestamp=new Timestamp(),value={records:[{name:'Original',at:timestamp}],cursor:timestamp};const result=copyQueryResult(value);result.records[0].name='Alterado';assert.equal(value.records[0].name,'Original');assert.equal(result.cursor,timestamp);assert.equal(result.records[0].at.toDate().getTime(),0);
});
test('SSE compartilha uma assinatura entre telas e reconexões e encerra consultas ociosas',async()=>{
 let starts=0,stops=0,emit,error;const source={onSnapshot(next,fail){starts++;emit=next;error=fail;return ()=>stops++;}},pool=createLiveQueries({idleMs:5});const received=[[],[],[]];
 const a=pool.subscribe('company',source,v=>received[0].push(v),()=>{}),b=pool.subscribe('company',source,v=>received[1].push(v),()=>{});assert.equal(starts,1);emit(1);await Promise.resolve();assert.deepEqual(received[0],[1]);assert.deepEqual(received[1],[1]);a();b();const c=pool.subscribe('company',source,v=>received[2].push(v),()=>{});await Promise.resolve();assert.equal(starts,1);assert.deepEqual(received[2],[1]);emit(2);await Promise.resolve();assert.deepEqual(received[2],[1,2]);c();await new Promise(r=>setTimeout(r,20));assert.equal(stops,1);
 const fail=pool.subscribe('company',source,()=>{},()=>{});error(Error('Offline'));await Promise.resolve();assert.equal(stops,2);fail();const retry=pool.subscribe('company',source,()=>{},()=>{});assert.equal(starts,3);retry();pool.close();
});
