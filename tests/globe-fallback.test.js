import test from 'node:test';
import assert from 'node:assert/strict';
import {geoArea,geoPath} from 'd3-geo';
import {fallbackProjection,pickCoordinate,sphericalGeometry} from '../src/globe-fallback.js';
test('globe point picking inverses the geographic projection and rejects space outside the globe',()=>{
 const p=fallbackProjection('globe',[-90,38]);const xy=p([-89,37]),c=pickCoordinate(p,xy,'globe');assert.ok(Math.abs(c[0]+89)<1e-6);assert.ok(Math.abs(c[1]-37)<1e-6);assert.equal(pickCoordinate(p,[0,0],'globe'),null);
 const r=fallbackProjection('regional',[-96,38]);assert.ok(geoPath(r)({type:'Point',coordinates:[-90,38]}));assert.ok(pickCoordinate(r,r([-90,38]),'regional').every(Number.isFinite));
});
test('small RFC GeoJSON polygons are rewound for spherical rendering without mutating the source',()=>{
 const geometry={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};const original=JSON.stringify(geometry);const result=sphericalGeometry(geometry);assert.ok(geoArea(result)<2*Math.PI);assert.equal(JSON.stringify(geometry),original);assert.equal(sphericalGeometry(null),null);
});
