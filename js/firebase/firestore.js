import {
  addDoc, collection, doc, getCountFromServer, getDoc, getDocs,
  query, serverTimestamp, updateDoc, where, writeBatch
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listRecords(collectionName, companyId, options = {}) {
  const clauses = [where('companyId', '==', companyId), where('deleted', '==', false)];
  if (options.status) clauses.push(where('status', '==', options.status));
  const snap = await getDocs(query(collection(db, collectionName), ...clauses));
  const field = options.orderBy || 'createdAt';
  const direction = options.direction === 'asc' ? 1 : -1;
  const valueForSort = value => {
    if (value?.toMillis) return value.toMillis();
    if (value instanceof Date) return value.getTime();
    return value ?? '';
  };
  const allRecords = snap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const aValue = valueForSort(a[field]);
      const bValue = valueForSort(b[field]);
      if (aValue === bValue) return a.id.localeCompare(b.id) * direction;
      return (aValue > bValue ? 1 : -1) * direction;
    });
  const pageSize = options.pageSize || 20;
  const offset = Number(options.after?.offset) || 0;
  const records = allRecords.slice(offset, offset + pageSize);
  return { records, cursor: { offset: offset + records.length } };
}

export async function getCompanySettings(companyId) {
  const snap = await getDoc(doc(db, 'companies', companyId));
  return snap.exists() ? snap.data() : {};
}

export async function saveRecord(collectionName, companyId, data, id = null) {
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

export async function createQuoteWithReminder(quote, companyId) {
  const quoteRef = doc(collection(db, 'quotes'));
  const reminderRef = doc(collection(db, 'reminders'));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const batch = writeBatch(db);
  batch.set(quoteRef, { ...quote, companyId, deleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.set(reminderRef, {
    companyId, type: 'quote_follow_up', step: 1, quoteId: quoteRef.id,
    customerId: quote.customerId || null, customerName: quote.customerName,
    whatsapp: quote.whatsapp || '', scheduledAt: tomorrow, status: 'pending',
    deleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  await batch.commit();
  return quoteRef.id;
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
