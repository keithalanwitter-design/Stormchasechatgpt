import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreEnvironment} from '../src/whirl/scoring.js';
test('all-zero and all-one components',()=>{
 const zero=Object.fromEntries(['rotation','instability','organization','moisture','initiation','boundaries'].map(k=>[k,0]));
 assert.equal(scoreEnvironment(zero).score,0);
 assert.equal(scoreEnvironment(Object.fromEntries(Object.keys(zero).map(k=>[k,1]))).score,10);
});
test('missing inputs are not silently imputed',()=>assert.equal(scoreEnvironment({rotation:1}).status,'insufficient-data'));
test('surface-based gate caps experimental score',()=>{
 const all=Object.fromEntries(['rotation','instability','organization','moisture','initiation','boundaries'].map(k=>[k,1]));
 assert.equal(scoreEnvironment(all,{surfaceBased:false}).score,2);
});
