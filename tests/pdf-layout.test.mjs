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
 await page.route('https://cdn.jsdelivr.net/npm/html2canvas@*/+esm',r=>r.fulfill({contentType:'text/javascript',body:'export default async(sheet,options)=>{const doc=sheet.ownerDocument;window.__headerCount=doc.querySelectorAll(".checklist-brand").length;window.__signatureCount=doc.querySelectorAll("[data-checklist-signature] img").length;window.__signatureReady=[...doc.querySelectorAll("[data-checklist-signature] img")].every(i=>i.complete&&i.naturalWidth>0);window.__layout=[...doc.querySelectorAll(".checklist-sheet")].map(p=>({height:p.offsetHeight,width:p.offsetWidth,cards:p.querySelectorAll(".inspection-card").length,footers:p.querySelectorAll("footer").length,blocks:p.querySelector(".pdf-flow")?.children.length||0,description:[...p.querySelectorAll(".pdf-flow>p")].map(e=>e.textContent).join(""),clipped:[...p.querySelectorAll(".pdf-flow>*")].some(e=>e.getBoundingClientRect().bottom>(p.querySelector("footer")?.getBoundingClientRect().top??p.getBoundingClientRect().bottom-12)-1)}));const canvas=await window.html2canvas(sheet,options);return canvas;};'}));
 await page.goto('http://127.0.0.1:'+server.address().port);
 // The same final-footer mode also covers a future single-page document and a tight final-page boundary.
 const footerCases=await page.evaluate(async()=>{
 const {paginateQuoteDocument}=await import('/js/utils/pdf-pages.js');const results=[];
 for(const count of [1,5,6,12]){
 const host=document.createElement('div');document.body.append(host);host.innerHTML='<section class="footer-fixture" style="width:794px;box-sizing:border-box"><footer style="height:30px;background:#222">Endereço</footer></section>';const source=host.firstElementChild;
 for(let i=0;i<count;i++){const block=document.createElement('div');block.style.height='214px';block.textContent='Conteúdo '+i;source.insertBefore(block,source.lastElementChild);}
 const pages=paginateQuoteDocument(host,{selector:'.footer-fixture',footerMode:'last'});
 results.push({pages:pages.length,footers:pages.map(p=>p.querySelectorAll('footer').length),empty:pages.some(p=>!p.querySelector('.pdf-flow').children.length),blocks:pages.reduce((n,p)=>n+p.querySelector('.pdf-flow').children.length,0),count});host.remove();
 }
 return results;
 });
 for(const c of footerCases){assert.deepEqual(c.footers,c.footers.map((_,i)=>i===c.pages-1?1:0));assert.equal(c.empty,false);assert.equal(c.blocks,c.count);}assert.equal(footerCases[0].pages,1);console.log('Footer boundaries:',footerCases.map(c=>c.pages).join(', '),'pages, one final footer and no empty page');
 const data={customerName:'Cliente de teste',brand:'Marca',model:'Modelo',plate:'ABC1D23',entryDate:'2026-10-22T10:00',mileage:15000,keys:1,fuelLevel:'0.5',responsible:'Equipe',services:'Inspeção preventiva'};
 const base={id:'check123',code:'CHK-TESTE',version:1,status:'Finalizado',confirmation:{status:'Confirmado por assinatura presencial',signatureId:'sig123',name:'Cliente de teste'},data:cleanChecklist(data)};
 const generate=async record=>page.evaluate(async record=>{const {makePdf}=await import('/js/modules/checklist/pdf.js');const pdf=await makePdf(record,{id:record.id});return {signatures:window.__signatureCount,signatureReady:window.__signatureReady,headers:window.__headerCount,pages:window.__pageCount,layout:window.__layout,base64:await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(pdf.blob);})};},record);
 const simple=await generate(base);await writeFile(resolve(out,'checklist-simples-qa.pdf'),Buffer.from(simple.base64,'base64'));assert.equal(simple.signatures,2);assert.equal(simple.signatureReady,true);assert.equal(simple.headers,1);assert.equal(simple.pages,simple.layout.length,'No raster overflow page');assert.ok(simple.pages<=3);assert.equal(simple.layout.reduce((n,p)=>n+p.cards,0),0);assert.deepEqual(simple.layout.map(p=>p.footers),simple.layout.map((_,i)=>i===simple.layout.length-1?1:0));assert.ok(simple.layout.every(p=>!p.clipped));console.log('Simple checklist:',simple.pages,'pages, no blank page');
 const lorem=('Descrição completa do componente, com os detalhes da vistoria e todas as condições registradas pela equipe. ').repeat(8).slice(0,500);
 const dense={...base,data:cleanChecklist({...data,inspection:parts.map((part,i)=>({part,condition:i%2?'Sem avarias aparentes':'Arranhado',description:lorem})),description:lorem.repeat(18)+'\n'+('Linha da descrição\n').repeat(80),damagedPoints:['top-front','left-roof'],accessories:{Antena:'Sim',GPS:'Não'},notes:lorem,reason:lorem,warningLights:lorem,belongings:lorem,accessoriesNotes:lorem,media:[0,1,2,3].map(i=>({id:'image'+i,part:parts[i],caption:'Foto de teste '+i}))})};
 const detailed=await generate(dense);assert.equal(detailed.signatures,2);assert.equal(detailed.signatureReady,true);assert.equal(detailed.headers,1);assert.equal(detailed.pages,detailed.layout.length,'No raster overflow page');assert.ok(detailed.pages<=12);assert.equal(detailed.layout.reduce((n,p)=>n+p.cards,0),0);assert.deepEqual(detailed.layout.map(p=>p.footers),detailed.layout.map((_,i)=>i===detailed.layout.length-1?1:0));assert.ok(detailed.layout.every(p=>p.blocks>0));assert.ok(detailed.layout.map(p=>p.description).join('').includes(dense.data.description));assert.ok(detailed.layout.every(p=>!p.clipped));assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'checklist-compacto-qa.pdf'),Buffer.from(detailed.base64,'base64'));
 console.log('Detailed checklist:',detailed.pages,'pages, full long multiline description, signature and 4 photos; footer only on last page');
}finally{await browser.close();server.close();}
