import { validateSignature } from './_signature.js';
import admin from 'firebase-admin';
import { randomBytes } from 'node:crypto';
import { adminDb } from './_firebase-admin.js';
import { context, hashToken, validId } from './_checklist.js';
import { allowSameOrigin, validJsonRequest, rateLimit, secureResponse } from './_security.js';
export const config={api:{bodyParser:{sizeLimit:'4mb'}}};
const max=2500000;
function fileType(b){if(b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return 'image/webp';if(b.toString('ascii',4,8)==='ftyp')return 'video/mp4';if(b.subarray(0,4).equals(Buffer.from([26,69,223,163])))return 'video/webm';throw new Error('Formato de arquivo não permitido.');}
export default async function handler(req,res){secureResponse(res);if(req.method!=='POST'||!allowSameOrigin(req)||!validJsonRequest(req,4000000)||!rateLimit(req,{limit:100}))return res.status(400).json({error:'Solicitação inválida'});
try{const {action,id,token,mediaId,base64,kind,version}=req.body||{};const c=await context(req,id,token);const bucketName=process.env.FIREBASE_STORAGE_BUCKET;if(!bucketName)throw new Error('Configure FIREBASE_STORAGE_BUCKET para armazenar arquivos privados.');const bucket=admin.storage().bucket(bucketName);const [bucketMetadata]=await bucket.getMetadata();if(bucketMetadata.iamConfiguration?.publicAccessPrevention!=='enforced')throw new Error('Ative Public Access Prevention (enforced) no bucket privado do Checklist antes de enviar arquivos.');
if(action==='read'){
if(!validId(mediaId))throw new Error('Arquivo inválido');const m=(await adminDb.doc('checklistMedia/'+mediaId).get()).data();if(!m||m.checklistId!==c.ref.id)throw new Error('Arquivo indisponível');
let r=c.record;if(version&&!c.public){if(!/^\d+$/.test(String(version)))throw new Error('Versão inválida');r=(await c.ref.collection('versions').doc(String(version)).get()).data();if(!r)throw new Error('Versão indisponível');}
if(!r.data.media.some(f=>f.id===mediaId)&&r.confirmation?.signatureId!==mediaId)throw new Error('Arquivo não pertence a esta versão');
const [buffer]=await bucket.file(m.path).download();res.setHeader('Content-Type',m.contentType);res.setHeader('Content-Length',buffer.length);return res.status(200).send(buffer);
}
if(action!=='upload')throw new Error('Ação inválida');if(c.public&&kind!=='signature')throw new Error('Acesso negado');if(c.record.status!=='Em preenchimento'&&kind!=='signature')throw new Error('Crie uma nova versão para anexar arquivos');
if(kind==='signature'&&(c.record.status!=='Finalizado'||c.record.confirmation?.confirmedAt||(c.public&&c.link.method!=='signature')))throw new Error('Assinatura indisponível');
if(typeof base64!=='string'||base64.length>3400000||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new Error('Arquivo inválido');const buffer=Buffer.from(base64,'base64');if(buffer.length<32||buffer.length>max)throw new Error('Limite por arquivo: 2,5 MB');const contentType=fileType(buffer);if(kind==='signature'){if(contentType!=='image/png')throw new Error('Assinatura deve ser PNG');validateSignature(buffer);}
const media=adminDb.collection('checklistMedia').doc();const path='checklists/'+c.record.companyId+'/'+c.ref.id+'/'+randomBytes(24).toString('hex');
await bucket.file(path).save(buffer,{resumable:false,contentType,metadata:{cacheControl:'private,no-store'}});
try{await adminDb.runTransaction(async tx=>{const latest=(await tx.get(c.ref)).data();if(latest.version!==c.record.version||latest.revision!==c.record.revision)throw new Error('Checklist alterado durante o envio');tx.set(media,{path,checklistId:c.ref.id,companyId:c.record.companyId,version:latest.version,kind:kind==='signature'?'signature':'attachment',contentType,size:buffer.length,linkHash:c.public?hashToken(token):null,createdAt:new Date().toISOString()});tx.set(c.ref.collection('events').doc(),{action:'Upload de mídia',at:new Date().toISOString(),actor:c.public?'Cliente por link':c.profile.uid,mediaId:media.id,version:latest.version});});}catch(e){await bucket.file(path).delete().catch(()=>{});throw e;}
return res.status(200).json({id:media.id,contentType,size:buffer.length});
}catch(e){return res.status(e.status||400).json({error:e.message||'Falha no arquivo'});}}
