// Real jsPDF/html2canvas regression test with fictional records and private-media fixtures.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { cleanChecklist, parts } from '../js/utils/checklist.js';
import { png } from './helpers/png.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const out=resolve(process.env.QA_OUTPUT_DIR||'work/qa');
const vendor=resolve(process.env.PDF_VENDOR_DIR||'work/qa/vendor');
await mkdir(out,{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/'){res.setHeader('Content-Type','text/html');return res.end('<html><body><script src="/vendor/jspdf.umd.min.js"></script><script src="/vendor/html2canvas.min.js"></script></body></html>');}
 if(path==='/api/checklist-media'){res.setHeader('Content-Type','image/png');return res.end(png(true));}
 if(path==='/js/firebase/firebase-config.js'){res.setHeader('Content-Type','text/javascript');return res.end('export const auth={currentUser:{getIdToken:async()=>"TEST"}};');}
 const file=path.startsWith('/vendor/')?resolve(vendor,path.slice(8)):resolve(root,'.'+path);
 if(!file.startsWith(resolve(root))&&!file.startsWith(vendor))throw Error('Invalid path');
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png'}[extname(file)]||'application/octet-stream'));res.end(await readFile(file));
 }catch(e){res.statusCode=404;res.end(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/jspdf@*/+esm',r=>r.fulfill({contentType:'text/javascript',body:'export class jsPDF { constructor(options){const pdf=new window.jspdf.jsPDF(options);const output=pdf.output.bind(pdf);pdf.output=(kind)=>{window.__pageCount=pdf.getNumberOfPages();return output(kind);};return pdf;} }'}));
 await page.route('https://cdn.jsdelivr.net/npm/html2canvas@*/+esm',r=>r.fulfill({contentType:'text/javascript',body:'export default async(sheet,options)=>{const doc=sheet.ownerDocument;window.__headerCount=doc.querySelectorAll(".checklist-brand").length;window.__signatureCount=doc.querySelectorAll("[data-checklist-signature] img").length;window.__signatureReady=[...doc.querySelectorAll("[data-checklist-signature] img")].every(i=>i.complete&&i.naturalWidth>0);window.__layout=[...doc.querySelectorAll(".checklist-sheet")].map(p=>({height:p.offsetHeight,width:p.offsetWidth,cards:p.querySelectorAll(".inspection-card").length,clipped:[...p.querySelectorAll(".inspection-pair,.observation-block,.pdf-media-row,.confirmation-signature")].some(e=>e.getBoundingClientRect().bottom>p.querySelector("footer").getBoundingClientRect().top)}));const canvas=await window.html2canvas(sheet,options);return canvas;};'}));
 await page.goto('http://127.0.0.1:'+server.address().port);
 const data={customerName:'Cliente de teste',brand:'Marca',model:'Modelo',plate:'ABC1D23',entryDate:'2026-10-22T10:00',mileage:15000,keys:1,fuelLevel:'0.5',responsible:'Equipe',services:'Inspeção preventiva'};
 const base={id:'check123',code:'CHK-TESTE',version:1,status:'Finalizado',confirmation:{status:'Confirmado por assinatura presencial',signatureId:'sig123',name:'Cliente de teste'},data:cleanChecklist(data)};
 const generate=async record=>page.evaluate(async record=>{const {makePdf}=await import('/js/modules/checklist/pdf.js');const pdf=await makePdf(record,{id:record.id});return {signatures:window.__signatureCount,signatureReady:window.__signatureReady,headers:window.__headerCount,pages:window.__pageCount,layout:window.__layout,base64:await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(pdf.blob);})};},record);
 const simple=await generate(base);assert.equal(simple.signatures,2);assert.equal(simple.signatureReady,true);assert.equal(simple.headers,1);assert.equal(simple.pages,simple.layout.length,'No raster overflow page');assert.ok(simple.pages<=3);assert.equal(simple.layout.reduce((n,p)=>n+p.cards,0),35);assert.ok(simple.layout.every(p=>!p.clipped));console.log('Simple checklist:',simple.pages,'pages, no blank page');
 const lorem=('Descrição completa do componente, com os detalhes da vistoria e todas as condições registradas pela equipe. ').repeat(8).slice(0,500);
 const dense={...base,data:cleanChecklist({...data,inspection:parts.map((part,i)=>({part,condition:i%2?'Sem avarias aparentes':'Arranhado',description:lorem})),notes:lorem,reason:lorem,warningLights:lorem,belongings:lorem,accessoriesNotes:lorem,media:[0,1,2,3].map(i=>({id:'image'+i,part:parts[i],caption:'Foto de teste '+i}))})};
 const detailed=await generate(dense);assert.equal(detailed.signatures,2);assert.equal(detailed.signatureReady,true);assert.equal(detailed.headers,1);assert.equal(detailed.pages,detailed.layout.length,'No raster overflow page');assert.ok(detailed.pages<=7);assert.equal(detailed.layout.reduce((n,p)=>n+p.cards,0),35);assert.ok(detailed.layout.every(p=>!p.clipped));assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'checklist-compacto-qa.pdf'),Buffer.from(detailed.base64,'base64'));
 console.log('Detailed checklist:',detailed.pages,'pages, 35 complete descriptions, signature and 4 photos; no blank page');
}finally{await browser.close();server.close();}
