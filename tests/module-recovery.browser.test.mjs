import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
let updated = false, broken = false, ordinaryError = false, documents = 0;
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/') {
    documents++;
    res.setHeader('Content-Type', 'text/html');
    return res.end('<html><body><div id="app"></div><script type="module" src="/js/onepage.js"></script></body></html>');
  }
  res.setHeader('Content-Type', 'text/javascript');
  if (path === '/js/utils/masks.js') return res.end('export const installInputMasks=()=>{};');
  if (path === '/js/utils/checklist.js') return res.end(updated && !broken ? 'export const legacy=true;export const checklistDescription=()=>"Atualizado";' : 'export const legacy=true;');
  if (path === '/js/modules/dashboard/page.js') return res.end('import {legacy} from "../../utils/checklist.js";document.querySelector("#app").innerHTML="<a href=#checklist>Checklist</a>";');
  if (path === '/js/modules/checklist/page.js') return res.end(ordinaryError ? 'throw new Error("Acesso negado");' : 'import {checklistDescription} from "../../utils/checklist.js";document.querySelector("#app").innerHTML="<h1>Checklist: "+checklistDescription()+"</h1>";');
  try { return res.end(await readFile(new URL('..' + path, import.meta.url))); }
  catch { res.statusCode = 404; return res.end(''); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const origin = 'http://127.0.0.1:' + server.address().port;
  let page = await browser.newPage();page.setDefaultTimeout(10000);
  await page.goto(origin + '/#dashboard');
  await page.getByRole('link', { name: 'Checklist' }).waitFor();
  updated = true; // Deploy while the old utility is already in the tab's module map.
  await page.getByRole('link', { name: 'Checklist' }).click();
  await page.getByRole('heading', { name: 'Checklist: Atualizado' }).waitFor();
  assert.equal(documents, 2, 'One automatic reload clears the stale module map');
  await page.close();
  documents = 0; broken = true;
  page = await browser.newPage();page.setDefaultTimeout(10000);
  await page.goto(origin + '/#checklist');
  await page.locator('#retry-route').waitFor();
  assert.equal(documents, 2, 'A persistent deployment error must not cause a reload loop');
  await page.locator('#retry-route').click();
  await page.locator('#retry-route').waitFor();
  assert.equal(documents, 3, 'Manual retry reloads the document instead of reusing failed modules');
  await page.close();
  documents = 0; ordinaryError = true;
  page = await browser.newPage();page.setDefaultTimeout(10000);
  await page.goto(origin + '/#checklist');
  await page.locator('#retry-route').waitFor();
  assert.equal(documents, 1, 'Ordinary errors keep the existing retry flow');
  console.log('Deploy with an open tab: checklist recovered; persistent errors do not loop; manual refresh and ordinary errors verified.');
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
