import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountBrowserLocation,locationFromPosition,locationError} from '../src/browser-location.js';
const fix=()=>({coords:{latitude:38.523456,longitude:-89.987654,accuracy:42},timestamp:Date.now()});
test('device fix is rounded before forecasts; accuracy and UTC capture time are retained',()=>{
 const p=fix(),x=locationFromPosition(p);assert.deepEqual(x.center,[-89.99,38.52]);assert.equal(x.browserFix.accuracyM,42);assert.equal(x.browserFix.capturedAt,new Date(p.timestamp).toISOString());assert.equal(JSON.stringify(x).includes('38.523456'),false);
 assert.throws(()=>locationFromPosition({...p,timestamp:Date.now()-180000}),/old/);assert.throws(()=>locationFromPosition({...p,coords:{...p.coords,latitude:95}}),/invalid/);assert.throws(()=>locationFromPosition({...p,coords:{...p.coords,accuracy:NaN}}),/invalid/);
});
test('one-shot request is opt-in; cancellation and point changes ignore late fixes',()=>{
 const dom=new JSDOM('<div id="host"></div>'),host=dom.window.document.querySelector('#host');let success,fail,options,calls=0;const points=[];
 const control=mountBrowserLocation(host,{secure:true,geolocation:{getCurrentPosition(s,e,o){calls++;success=s;fail=e;options=o;}},onLocation:p=>points.push(p)});
 const click=id=>host.querySelector(id).click();assert.equal(calls,0);click('#use-location');assert.equal(calls,1);assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,false);click('#cancel-location');success(fix());assert.equal(points.length,0);
 host.querySelector('#location-high-accuracy').checked=true;click('#use-location');assert.equal(options.enableHighAccuracy,true);control.clear();success(fix());assert.equal(points.length,0);
 click('#use-location');success(fix());assert.equal(points.length,1);assert.match(host.querySelector('#location-status').textContent,/±42 m.*rounded/);assert.equal(control.isPending(),false);
 click('#use-location');fail({code:1});assert.match(host.textContent,/permission was denied/);assert.equal(host.querySelector('#use-location').disabled,false);dom.window.close();
});
test('unsupported and insecure contexts preserve manual search and do not request location',()=>{
 const dom=new JSDOM('<div></div>'),host=dom.window.document.querySelector('div');let calls=0;mountBrowserLocation(host,{secure:false,geolocation:{getCurrentPosition(){calls++;}}});host.querySelector('button').click();assert.equal(calls,0);assert.match(host.textContent,/requires HTTPS/);
 mountBrowserLocation(host,{secure:true,geolocation:null});host.querySelector('button').click();assert.match(host.textContent,/does not support location/);assert.match(locationError({code:3}),/too long/);dom.window.close();
});
