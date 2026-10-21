import admin from 'firebase-admin';

function privateKey() { return process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g,'\n'); }
const configured=Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID&&process.env.FIREBASE_ADMIN_CLIENT_EMAIL&&privateKey());
if (!admin.apps.length && configured) admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_ADMIN_PROJECT_ID,clientEmail:process.env.FIREBASE_ADMIN_CLIENT_EMAIL,privateKey:privateKey() }) });
export const adminAuth=admin.apps.length?admin.auth():null;
export const adminDb=admin.apps.length?admin.firestore():null;
export const FieldValue=admin.firestore.FieldValue;

export async function requireAdmin(req) {
  if(!adminAuth)throw Object.assign(new Error('Configure as credenciais Firebase Admin no servidor.'),{status:503});
  const token=req.headers.authorization?.replace(/^Bearer\s+/,'');
  if(!token)throw Object.assign(new Error('Não autenticado'),{status:401});
  const decoded=await adminAuth.verifyIdToken(token,true);const snap=await adminDb.doc(`users/${decoded.uid}`).get();const profile=snap.data();
  if(!profile?.active||profile.deleted===true||profile.role!=='admin')throw Object.assign(new Error('Acesso negado'),{status:403});
  return {...profile,uid:decoded.uid};
}

export async function requireStaff(req, roles = ['admin','atendente','mecanico','user']) {
 if(!adminAuth)throw Object.assign(new Error('Configure as credenciais Firebase Admin no servidor.'),{status:503});
 const token=req.headers.authorization?.replace(/^Bearer\s+/,'');
 if(!token) throw Object.assign(new Error('Não autenticado'),{status:401});
 const decoded=await adminAuth.verifyIdToken(token);
 const snap=await adminDb.doc('users/'+decoded.uid).get();const p=snap.data();
 if(!p?.active || p.deleted===true || !roles.includes(p.role) || !p.companyId) throw Object.assign(new Error('Acesso negado'),{status:403});
 return {...p,uid:decoded.uid};
}
