import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRadar,normalizeStations,tileURL,regionalTiles} from '../src/radar.js';
import {fallbackProjection} from '../src/globe-fallback.js';
test('radar uses recent observations, validates tile host and preserves frame time',()=>{
 const now=Date.now(),time=Math.floor(now/1000)-600;const r=normalizeRadar({host:'https://tilecache.rainviewer.com',radar:{past:[{time,path:'/v2/radar/abc'},{time:time-20000,path:'/v2/radar/old'}]}},now);assert.equal(r.frames.length,1);assert.equal(r.frames[0].time,time);assert.match(tileURL(r,r.frames[0]),/256\/\{z\}\/\{x\}\/\{y\}/);assert.throws(()=>normalizeRadar({host:'https://untrusted.example'},now));assert.throws(()=>normalizeRadar({host:r.host,radar:{past:[]}},now));
 const tiles=regionalTiles(fallbackProjection('regional',[-96,38]),r,r.frames[0]);assert.ok(tiles.length>0);assert.ok(tiles.every(t=>t.width>0&&t.height>0));
});
test('station catalog keeps real locations and source receipt timestamps',()=>{const d=normalizeStations({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[-90,38]},properties:{id:'KLSX',name:'St Louis',latency:{levelTwoLastReceivedTime:'2026-10-11T00:00:00Z'}}},{geometry:null,properties:{id:'KXXX'}}]});assert.equal(d.features.length,1);assert.equal(d.features[0].properties.receivedAt,'2026-10-11T00:00:00Z');});
