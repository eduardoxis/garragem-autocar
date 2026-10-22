import {queryCache,invalidateQueries,copyQueryResult} from '../services/query-cache.js';
import { api } from '../services/api.js';
import {
  addDoc, collection, doc, getCountFromServer, getDoc, getDocs,
  limit, orderBy, query, serverTimestamp, startAfter, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { db, auth } from './firebase-config.js';

const profileReads=new Map();
export async function getProfile(uid){
 if(!profileReads.has(uid))profileReads.set(uid,getDoc(doc(db,'users',uid)).then(snap=>snap.exists()?{id:snap.id,...snap.data()}:null).finally(()=>profileReads.delete(uid)));
 return profileReads.get(uid);
}

async function fetchRecords(collectionName, companyId, options = {}) {
  if(collectionName==='mechanics')return api('mechanics',{action:'list',after:options.after||null,pageSize:options.pageSize,activeOnly:options.activeOnly||false});
  if(collectionName==='checklists'){const result=await api('checklists',{action:'list',after:options.after||null,pageSize:options.pageSize});return {records:result.records,cursor:result.nextCursor||null,hasMore:Boolean(result.nextCursor)};}
  const clauses = [where('companyId', '==', companyId), where('deleted', '==', false)];
  if (options.status) clauses.push(where('status', '==', options.status));
  const pageSize = options.pageSize || 20;
  const field = options.orderBy || 'createdAt';
  const direction = options.direction === 'asc' ? 'asc' : 'desc';
  clauses.push(orderBy(field, direction));
  if (options.after) clauses.push(startAfter(options.after));
  clauses.push(limit(pageSize));
  const snap = await getDocs(query(collection(db, collectionName), ...clauses));
  const records = snap.docs.map(item => ({ id: item.id, ...item.data() }));
  return { records, cursor: snap.docs.at(-1) || null, hasMore: snap.docs.length === pageSize };
}

const scope=()=>{const uid=auth.currentUser?.uid;return uid?uid+':'+(globalThis.window?.currentUser?.role||'')+':'+(globalThis.window?.currentUser?.companyId||''):null;};
export async function listRecords(collectionName,companyId,options={}){
 const actor=scope();if(!actor)return fetchRecords(collectionName,companyId,options);
 const key=JSON.stringify([actor,collectionName,companyId,options.after?.id||options.after||null,options.pageSize||20,options.status||'',options.orderBy||'createdAt',options.direction||'desc',Boolean(options.activeOnly)]);
 const result=await queryCache.read('list:'+key,()=>fetchRecords(collectionName,companyId,options),{ttl:30000,tags:[collectionName],force:options.force===true});
 if(collectionName==='mechanics'&&!options.activeOnly&&Number.isInteger(result.total))void queryCache.read('count:'+actor+':'+companyId+':mechanics',()=>result.total,{ttl:30000,tags:['mechanics'],force:options.force===true});
 return copyQueryResult(result);
}
export async function getCompanySettings(companyId){
 const actor=scope();if(!actor)return fetchCompanySettings(companyId);
 return copyQueryResult(await queryCache.read('settings:'+actor+':'+companyId,()=>fetchCompanySettings(companyId),{ttl:60000,tags:['companies']}));
}
async function fetchCompanySettings(companyId) {
  const snap = await getDoc(doc(db, 'companies', companyId));
  return snap.exists() ? snap.data() : {};
}

export async function saveRecord(collectionName, companyId, data, id = null) {
  if(collectionName==='mechanics')return (await api('mechanics',{action:'save',id,data})).id;
  if(collectionName==='quotes'){const result=await api('quotes',{id,data,action:id&&!data.items?'followup':undefined});return result.id;}
  invalidateQueries([collectionName]);
  const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  if (id) {
    await updateDoc(doc(db, collectionName, id), { ...clean, companyId, updatedAt: serverTimestamp() });
    invalidateQueries([collectionName]);return id;
  }
  const created = await addDoc(collection(db, collectionName), {
    ...clean, companyId, deleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  invalidateQueries([collectionName]);return created.id;
}

export async function softDelete(collectionName,id,userId){
 invalidateQueries([collectionName]);
 const result=collectionName==='mechanics'?await api('mechanics',{action:'delete',id}):await updateDoc(doc(db,collectionName,id),{deleted:true,deletedAt:serverTimestamp(),deletedBy:userId,updatedAt:serverTimestamp()});
 invalidateQueries([collectionName]);return result;
}

export async function createQuoteWithReminder(quote, companyId, followUpDays = 1) {
  return (await api('quotes',{data:quote})).id;
}

async function fetchCount(collectionName, companyId, extra = []) {
  if(collectionName==='mechanics')return (await api('mechanics',{action:'count'})).count;
  const q = query(collection(db, collectionName), where('companyId', '==', companyId), where('deleted', '==', false), ...extra);
  return (await getCountFromServer(q)).data().count;
}

export async function countRecords(collectionName,companyId,extra=[]){
 const actor=scope();if(!actor||extra.length)return fetchCount(collectionName,companyId,extra);
 return queryCache.read('count:'+actor+':'+companyId+':'+collectionName,()=>fetchCount(collectionName,companyId,extra),{ttl:30000,tags:[collectionName]});
}
export async function writeAudit({ companyId, userId, userName, action, module, recordId, recordCode, oldValue = null, newValue = null }) {
  await addDoc(collection(db, 'auditLogs'), {
    companyId, userId, userName, action, module, recordId, recordCode: recordCode || '',
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
    deleted: false, createdAt: serverTimestamp()
  });
}

export async function getRecord(collectionName,companyId,id,options={}){
  if(collectionName==='mechanics')return api('mechanics',{action:'get',id});
  if(collectionName==='checklists'){
    const result=await api('checklists',{action:'get',id,...(options.version?{version:options.version}:{}),...(options.includeHistory===false?{includeHistory:false}:{}),...(options.includeVersions===false?{includeVersions:false}:{})});
    if(options.includeHistory===false)delete result.history;if(options.includeVersions===false)delete result.versions;
    if(result.companyId!==companyId)throw Object.assign(new Error('Acesso negado'),{status:403});
    return result;
  }
  const snap=await getDoc(doc(db,collectionName,id));
  if(!snap.exists())throw new Error('Registro indisponível');
  const record=snap.data();
  if(record.companyId!==companyId||record.deleted)throw new Error('Registro indisponível');
  return {id:snap.id,...record};
}
