// Isolated fixture: validates listener reuse without caching authorization decisions.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=new URL('../',import.meta.url);
const server=createServer(async(req,res)=>{
 try{
  res.setHeader('Content-Type','text/javascript');
  const mocks={
   '/js/firebase/firebase-config.js':`export const isFirebaseConfigured=true;export const auth={currentUser:{uid:'staff'},signOut:async()=>{window.signOuts=(window.signOuts||0)+1}};`,
   '/js/firebase/firestore.js':`export async function getProfile(){window.profileReads=(window.profileReads||0)+1;return {...window.profile}}export async function listRecords(name){window.notificationReads.push(name);await new Promise(r=>setTimeout(r,25));return {records:[]}}`,
   '/firebase-auth.js':`export function onAuthStateChanged(auth,cb){window.observers=(window.observers||0)+1;window.emitAuth=cb;queueMicrotask(()=>cb(auth.currentUser));return ()=>{}}`
  };
  if(mocks[req.url])return res.end(mocks[req.url]);
  if(req.url==='/'){
   res.setHeader('Content-Type','text/html');
   return res.end(`<body data-module="checklist"><button id="notification-button"></button><span id="notification-count"></span><script>window.profile={active:true,role:'admin',companyId:'company'};window.notificationReads=[];</script><script type="module">import {requireAuth} from '/js/guards.js';import {setupNotifications} from '/js/components/notifications.js';window.guard=requireAuth;window.setupNotifications=setupNotifications;</script></body>`);
  }
  let source=await readFile(fileURLToPath(new URL('.'+req.url,root)),'utf8');
  source=source.replace('https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js','/firebase-auth.js');res.end(source);
 }catch(e){res.statusCode=404;res.end(e.message)}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
try{
 const page=await browser.newPage();await page.goto(base);await page.waitForFunction(()=>window.guard);
 const first=await page.evaluate(async()=>{for(let i=0;i<5;i++)await window.guard();return {observers:window.observers,reads:window.profileReads}});
 assert.deepEqual(first,{observers:1,reads:5},'Route changes share one observer but revalidate the profile');
 await page.evaluate(()=>{window.profile.role='mecanico';window.setupNotifications({uid:'staff',...window.profile});window.setupNotifications({uid:'staff',...window.profile})});
 await page.waitForTimeout(80);
 assert.deepEqual(await page.evaluate(()=>window.notificationReads.sort()),['reminders','serviceOrders'],'Concurrent mounts coalesce alerts and skip collections forbidden to mechanics');
 await page.evaluate(()=>{window.dispatchEvent(new CustomEvent('gac:datachange'));window.profile.role='admin';window.setupNotifications({uid:'staff',...window.profile})});
 await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>window.notificationReads.length),6,'Mutation invalidates alerts; admins retain all four categories');
 await page.evaluate(()=>{window.profile.active=false;void window.guard()});
 await page.waitForURL('**/login.html?inactive=1');
 console.log('Auth: one observer, fresh role/active checks, inactive account rejected; notifications: shared loading and authorized collections only: OK');
}finally{await browser.close();server.closeAllConnections();server.close()}
