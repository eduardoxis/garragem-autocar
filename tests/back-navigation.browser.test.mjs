import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url));
const out=resolve(process.env.QA_OUTPUT_DIR||'work/back-qa');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/'){res.setHeader('Content-Type','text/html');return res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/global.css"><link rel="stylesheet" href="/css/components.css"><link rel="stylesheet" href="/css/responsive.css"><div id="app"></div><script type="module" src="/js/onepage.js"></script></html>');}
 res.setHeader('Content-Type','text/javascript');
 if(path==='/js/firebase/authentication.js')return res.end('export const logout=()=>{};');
 if(path==='/js/components/notifications.js')return res.end('export const setupNotifications=()=>{};');
 if(/^\/js\/modules\/[^/]+\/page.js$/.test(path))return res.end(`import {mountShell} from '/js/app.js';const role=new URLSearchParams(location.search).get('role')||'admin';const page=mountShell({role,name:'Equipe GAC'},{title:'Página',active:location.hash.slice(1)});function list(){page.innerHTML='<h1>Listagem</h1><a id=clients href=#clientes>Clientes</a><a id=checklists href=#checklist>Checklist</a><button id=open>Abrir checklist</button>';page.querySelector('#open').onclick=()=>{page.innerHTML='<h1>Detalhes do checklist</h1><button id=back>Voltar</button>';page.querySelector('#back').onclick=list;};}list();`);
 const file=resolve(root,'.'+path);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream'));res.end(await readFile(file));
 }catch(e){res.statusCode=404;res.end(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());const base='http://127.0.0.1:'+server.address().port;
 for(const width of [320,390,760,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/#dashboard');await page.locator('#open').waitFor();
  assert.equal(await page.locator('.mobile-header-brand').isVisible(),width<=760);assert.equal(await page.locator('[data-shell-back]').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#clients').click();await page.waitForURL('**/#clientes');await page.locator('#checklists').click();await page.waitForURL('**/#checklist');await page.locator('#open').click();await page.getByRole('heading',{name:'Detalhes do checklist'}).waitFor();
  await page.locator('[data-shell-back]').click();await page.getByRole('heading',{name:'Listagem'}).waitFor();assert.equal(new URL(page.url()).hash,'#checklist');
  await page.locator('[data-shell-back]').click();await page.waitForURL('**/#clientes');await page.locator('#open').waitFor();await page.locator('[data-shell-back]').click();await page.waitForURL('**/#dashboard');
  if(width===390||width===1440)await page.screenshot({path:resolve(out,'cabecalho-'+width+'.png')});
 }
 await page.goto(base+'/?role=mecanico#checklist');await page.locator('#open').waitFor();assert.equal(await page.locator('.mobile-header-brand').getAttribute('href'),'#fila');await page.locator('[data-shell-back]').click();await page.waitForURL(url=>url.hash==='#fila');assert.deepEqual(errors,[]);
 console.log('Logo mobile and back on 320–1440px: inner checklist, previous routes, direct links and mechanic home verified.');
}finally{await browser.close();server.closeAllConnections();server.close();}
