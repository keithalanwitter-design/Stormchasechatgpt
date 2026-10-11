import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
const html=await readFile('portable-preview/StormChase-WHIRL-Preview.html','utf8');
const dom=new JSDOM(html,{url:'https://preview.stormchase.test/',runScripts:'outside-only'});
const w=dom.window;w.TextDecoder=TextDecoder;
w.matchMedia=()=>({matches:true});w.HTMLCanvasElement.prototype.getContext=()=>null;
w.URL.createObjectURL=()=> 'blob:local-preview';w.URL.revokeObjectURL=()=>{};
w.fetch=async()=>{throw Error('No network during portable smoke check');};
const errors=[];w.addEventListener('error',e=>errors.push(e.message));
try{
 for(const script of w.document.querySelectorAll('script')){try{new Function(script.textContent);w.eval(script.textContent);}catch(e){throw new Error('Portable script failed: '+e.message);}}
 assert.match(w.document.querySelector('h1').textContent,/Severe weather/);
 assert.ok(w.document.querySelector('.fallback-globe path'),'No-WebGL interactive geographic fallback remains available');
 w.document.querySelector('#mode-demo').click();
 w.document.querySelector('[data-day="5"]').click();assert.match(w.document.querySelector('#valid-time').textContent,/2027-05-23/);
 w.document.querySelector('[data-tab="research"]').click();assert.equal(w.document.querySelector('#research-view').classList.contains('hidden'),false);
 assert.deepEqual(errors,[]);
 console.log('Portable scripts parsed; no-WebGL boot, forecast controls and research tab passed (DOM-only).');
}finally{w.close();}
