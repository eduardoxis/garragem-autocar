import { api } from '../services/api.js';
import {
  addDoc, collection, doc, getCountFromServer, getDoc, getDocs,
  limit, orderBy, query, serverTimestamp, startAfter, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listRecords(collectionName, companyId, options = {}) {
  if(collectionName==='checklists'){const result=await api('checklists',{action:'list',after:options.after||null});return {records:result.records,cursor:result.nextCursor||null,hasMore:Boolean(result.nextCursor)};}
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

export async function getCompanySettings(companyId) {
  const snap = await getDoc(doc(db, 'companies', companyId));
  return snap.exists() ? snap.data() : {};
}

export async function saveRecord(collectionName, companyId, data, id = null) {
  if(collectionName==='quotes'){const result=await api('quotes',{id,data,action:id&&!data.items?'followup':undefined});return result.id;}
  const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  if (id) {
    await updateDoc(doc(db, collectionName, id), { ...clean, companyId, updatedAt: serverTimestamp() });
    return id;
  }
  const created = await addDoc(collection(db, collectionName), {
    ...clean, companyId, deleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  return created.id;
}

export const softDelete = (collectionName, id, userId) => updateDoc(doc(db, collectionName, id), {
  deleted: true, deletedAt: serverTimestamp(), deletedBy: userId, updatedAt: serverTimestamp()
});

export async function createQuoteWithReminder(quote, companyId, followUpDays = 1) {
  return (await api('quotes',{data:quote})).id;
}

export async function countRecords(collectionName, companyId, extra = []) {
  const q = query(collection(db, collectionName), where('companyId', '==', companyId), where('deleted', '==', false), ...extra);
  return (await getCountFromServer(q)).data().count;
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
  if(collectionName==='checklists'){
    const result=await api('checklists',{action:'get',id,...(options.version?{version:options.version}:{})});
    if(result.companyId!==companyId)throw Object.assign(new Error('Acesso negado'),{status:403});
    return result;
  }
  const snap=await getDoc(doc(db,collectionName,id));
  if(!snap.exists())throw new Error('Registro indisponível');
  const record=snap.data();
  if(record.companyId!==companyId||record.deleted)throw new Error('Registro indisponível');
  return {id:snap.id,...record};
}
