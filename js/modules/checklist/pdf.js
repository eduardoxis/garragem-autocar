import { paginateQuoteDocument } from '../../utils/pdf-pages.js';
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@3.0.3/+esm';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';
import { documentHtml, esc } from './document.js';
import { mediaRequest } from './client.js';
export async function makePdf(r,context){
 const frame=document.createElement('iframe');frame.title='Gerador de PDF do checklist';frame.setAttribute('aria-hidden','true');Object.assign(frame.style,{position:'fixed',left:'-12000px',top:'0',width:'794px',height:'1123px',border:'0'});document.body.append(frame);const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="'+new URL('css/checklist.css',location.href).href+'"></head><body style="margin:0"></body></html>');doc.close();const host=doc.body;const urls=[];
 try{
 let signature='';if(r.confirmation?.signatureId){signature=URL.createObjectURL(await mediaRequest({...context,action:'read',mediaId:r.confirmation.signatureId,version:r.version},true));urls.push(signature);}
 host.innerHTML=documentHtml(r,signature);
 await Promise.all([...doc.querySelectorAll('link')].map(l=>l.sheet?Promise.resolve():new Promise((resolve,reject)=>{l.onload=resolve;l.onerror=()=>reject(new Error('Não foi possível carregar o layout do PDF'));}))); 
 for(const m of r.data.media||[]){const blob=await mediaRequest({...context,action:'read',mediaId:m.id,version:r.version},true);const url=URL.createObjectURL(blob);urls.push(url);const section=doc.createElement('section');section.className='checklist-sheet appendix';section.innerHTML='<h1>'+esc(r.code)+' · Versão '+r.version+'</h1><h2>'+esc(m.part)+'</h2><p>'+esc(m.caption)+'</p>';
 if(blob.type.startsWith('image/'))section.innerHTML+='<img class="pdf-media" src="'+url+'" alt="Registro da vistoria">';else section.innerHTML+='<p>Vídeo registrado. Consulte a equipe para acesso seguro ao vídeo deste checklist.</p>';host.append(section);}
 paginateQuoteDocument(host,{selector:'.checklist-sheet.appendix',headerSelector:'.checklist-brand'});
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});let page=0;
 for(const sheet of host.querySelectorAll('.checklist-sheet')){
 await Promise.all([...sheet.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
 const canvas=await html2canvas(sheet,{scale:1.5,backgroundColor:'#fff',windowWidth:1000,logging:false});
 // Preserve every pixel for unusually long customer notes instead of shrinking or clipping.
 const pageHeight=Math.ceil(canvas.width*297/210);for(let y=0;y<canvas.height;y+=pageHeight){if(page++)pdf.addPage();const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=Math.min(pageHeight,canvas.height-y);slice.getContext('2d').drawImage(canvas,0,y,canvas.width,slice.height,0,0,canvas.width,slice.height);pdf.addImage(slice.toDataURL('image/jpeg',.94),'JPEG',0,0,210,Math.min(297,slice.height*210/slice.width));}
 }
 return {blob:pdf.output('blob'),name:r.code+'-v'+r.version+'.pdf'};
 }finally{frame.remove();urls.forEach(URL.revokeObjectURL);}
}
export function downloadPdf(result){const url=URL.createObjectURL(result.blob);const a=document.createElement('a');a.href=url;a.download=result.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
