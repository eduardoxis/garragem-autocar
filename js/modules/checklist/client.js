import { imageFileToDataUrl } from '../../utils/image.js';
import { api } from '../../services/api.js';
export const mediaRequest=(data,binary=false)=>api('checklist-media',data,{binary});
export async function upload(file,context,kind='attachment',progress=()=>{}){if(!['image/png','image/jpeg','image/webp','video/mp4','video/webm'].includes(file.type))throw new Error('Use JPG, PNG, WebP, MP4 ou WebM.');const photo=kind==='attachment'&&file.type.startsWith('image/');if(file.size>(photo?5*1024*1024:2500000))throw new Error(photo?'A foto deve ter até 5 MB.':'Cada vídeo ou assinatura deve ter até 2,5 MB.');progress(photo?'Otimizando foto em Base64…':'Lendo arquivo…');const base64=photo?(await imageFileToDataUrl(file)).split(',')[1]:await new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('Não foi possível ler arquivo'));r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(file);});progress('Salvando em Base64…');const result=await mediaRequest({...context,action:'upload',kind,base64});progress('Arquivo salvo');return result;}

export const checklistRequest=data=>api('checklists',data);
