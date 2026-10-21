import { validateSignature } from './_signature.js';
import { createHash } from 'node:crypto';
import { adminDb } from './_firebase-admin.js';
import { context, hashToken, validId } from './_checklist.js';
import { allowSameOrigin, validJsonRequest, rateLimit, secureResponse } from './_security.js';
export const config={api:{bodyParser:{sizeLimit:'4mb'}}};
const max=2500000;
function fileType(b){if(b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return 'image/webp';if(b.toString('ascii',4,8)==='ftyp')return 'video/mp4';if(b.subarray(0,4).equals(Buffer.from([26,69,223,163])))return 'video/webm';throw new Error('Formato de arquivo não permitido.');}
export default async function handler(req,res){secureResponse(res);if(req.method!=='POST'||!allowSameOrigin(req)||!validJsonRequest(req,4000000)||!rateLimit(req,{limit:100}))return res.status(400).json({error:'Solicitação inválida'});
try{const {action,id,token,mediaId,base64,kind,version}=req.body||{};const c=await context(req,id,token);
if(action==='read'){
if(!validId(mediaId))throw new Error('Arquivo inválido');const m=(await adminDb.doc('checklistMedia/'+mediaId).get()).data();if(!m||m.checklistId!==c.ref.id)throw new Error('Arquivo indisponível');
let r=c.record;if(version&&!c.public){if(!/^\d+$/.test(String(version)))throw new Error('Versão inválida');if(Number(version)!==Number(c.record.version)){r=(await c.ref.collection('versions').doc(String(version)).get()).data();if(!r)throw new Error('Versão indisponível');}}
if(!r.data.media.some(f=>f.id===mediaId)&&r.confirmation?.signatureId!==mediaId)throw new Error('Arquivo não pertence a esta versão');
if(m.encoding!=='base64')throw new Error('Arquivo antigo indisponível neste formato. Reanexe o arquivo em Base64.');const chunks=await adminDb.doc('checklistMedia/'+mediaId).collection('chunks').orderBy('index').get();if(chunks.size!==m.chunkCount)throw new Error('Arquivo incompleto.');const buffer=Buffer.from(chunks.docs.map(d=>d.data().data).join(''),'base64');if(buffer.length!==m.size||createHash('sha256').update(buffer).digest('hex')!==m.sha256)throw new Error('Arquivo com falha de integridade.');res.setHeader('Content-Type',m.contentType);res.setHeader('Content-Length',buffer.length);return res.status(200).send(buffer);
}
if(action!=='upload')throw new Error('Ação inválida');if(c.public&&kind!=='signature')throw new Error('Acesso negado');if(c.record.status!=='Em preenchimento'&&kind!=='signature')throw new Error('Crie uma nova versão para anexar arquivos');
if(kind==='signature'&&(c.record.status!=='Finalizado'||c.record.confirmation?.confirmedAt||(c.public&&c.link.method!=='signature')))throw new Error('Assinatura indisponível');
if(typeof base64!=='string'||base64.length>3400000||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new Error('Arquivo inválido');const buffer=Buffer.from(base64,'base64');if(buffer.length<32||buffer.length>max)throw new Error('Limite por arquivo: 2,5 MB');const contentType=fileType(buffer);if(kind==='signature'){if(contentType!=='image/png')throw new Error('Assinatura deve ser PNG');validateSignature(buffer);}
const media=adminDb.collection('checklistMedia').doc();const encoded=buffer.toString('base64');const chunks=encoded.match(/[\s\S]{1,500000}/g)||[];
await adminDb.runTransaction(async tx=>{const latest=(await tx.get(c.ref)).data();if(latest.version!==c.record.version||latest.revision!==c.record.revision)throw new Error('Checklist alterado durante o envio');tx.set(media,{encoding:'base64',chunkCount:chunks.length,sha256:createHash('sha256').update(buffer).digest('hex'),checklistId:c.ref.id,companyId:c.record.companyId,version:latest.version,kind:kind==='signature'?'signature':'attachment',contentType,size:buffer.length,linkHash:c.public?hashToken(token):null,createdAt:new Date().toISOString()});chunks.forEach((data,index)=>tx.set(media.collection('chunks').doc(String(index).padStart(4,'0')),{index,data}));tx.set(c.ref.collection('events').doc(),{action:'Inclusão de arquivo em Base64',at:new Date().toISOString(),actor:c.public?'Cliente por link':c.profile.uid,mediaId:media.id,version:latest.version});});
return res.status(200).json({id:media.id,contentType,size:buffer.length});
}catch(e){return res.status(e.status||400).json({error:e.message||'Falha no arquivo'});}}
