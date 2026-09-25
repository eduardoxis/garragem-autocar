import admin from 'firebase-admin';

function privateKey() { return process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g,'\n'); }
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert({ projectId:process.env.FIREBASE_ADMIN_PROJECT_ID,clientEmail:process.env.FIREBASE_ADMIN_CLIENT_EMAIL,privateKey:privateKey() }) });
export const adminAuth=admin.auth();
export const adminDb=admin.firestore();
export const FieldValue=admin.firestore.FieldValue;

export async function requireAdmin(req) {
  const token=req.headers.authorization?.replace(/^Bearer\s+/,'');
  if(!token)throw Object.assign(new Error('Não autenticado'),{status:401});
  const decoded=await adminAuth.verifyIdToken(token);const snap=await adminDb.doc(`users/${decoded.uid}`).get();const profile=snap.data();
  if(!profile?.active||profile.role!=='admin')throw Object.assign(new Error('Acesso negado'),{status:403});
  return {...profile,uid:decoded.uid};
}
