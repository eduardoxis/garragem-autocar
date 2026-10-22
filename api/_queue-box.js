import { adminDb } from './_firebase-admin.js';
import { hash, fail } from './_queue.js';

export function cleanBox(value) {
  const box = String(value ?? '').trim();
  if (box && !/^[1-6]$/.test(box)) throw fail('Selecione um box válido, de 01 a 06.');
  return box;
}

// Read every lock before the caller writes anything in its Firestore transaction.
export async function prepareBox(tx, companyId, id, next, previous) {
  const requested = cleanBox(next.box);
  next.box = next.active !== false && !next.removed && next.status === 'Em serviço' ? requested : '';
  const oldBox = previous?.box ? cleanBox(previous.box) : '';
  const ref = value => adminDb.doc('queueBoxLocks/' + hash(companyId + ':' + value));
  let release = null;
  if (oldBox && oldBox !== next.box) {
    const oldRef = ref(oldBox), holder = (await tx.get(oldRef)).data();
    if (holder?.entryId === id) release = oldRef;
  }
  let acquire = null;
  if (next.box) {
    acquire = ref(next.box);
    const holder = (await tx.get(acquire)).data();
    if (holder && holder.entryId !== id) throw fail('Este box já está ocupado por outro veículo.', 409);
  }
  return () => {
    if (release) tx.delete(release);
    if (acquire) tx.set(acquire, { companyId, entryId: id, box: next.box });
  };
}
