import {PRODUCTS,weatherData,createDataService} from './data-services.js';
export const FEEDS={nws:PRODUCTS.nws.url,spc:PRODUCTS.spc.url};
export function parseSourceTime(value){
 if(typeof value==='number'&&value>1e12)return new Date(value).toISOString();
 if(typeof value==='string'&&/^\d{12}$/.test(value)){const s=value;value=`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:00Z`;}
 const ms=Date.parse(value);return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
export function normalizeFeed(kind,data,now=Date.now()){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid GeoJSON FeatureCollection');
 const features=data.features.filter(f=>f?.type==='Feature'&&f.properties&&typeof f.properties==='object');
 const active=kind==='nws'?features.filter(f=>!f.properties.expires||Date.parse(f.properties.expires)>now):features;
 const issue=active.map(f=>parseSourceTime(kind==='nws'?f.properties.sent:f.properties.ISSUE)).filter(Boolean).sort().at(-1)||null;
 const expires=active.map(f=>parseSourceTime(kind==='nws'?f.properties.expires:f.properties.EXPIRE)).filter(Boolean).sort().at(-1)||null;
 const stale=kind==='spc'&&(!expires||Date.parse(expires)<=now);
 return {kind,status:stale?'stale':'ready',data:{type:'FeatureCollection',features:active},source:FEEDS[kind],issuedAt:issue,expiresAt:expires,retrievedAt:new Date(now).toISOString(),isProbability:false};
}
export async function fetchFeed(kind,fetcher){
 if(!FEEDS[kind])throw Error('Unknown feed');const service=fetcher?createDataService({fetcher}):weatherData;
 const snapshot=await service.get(kind,{force:true});return {...normalizeFeed(kind,snapshot.payload,Date.parse(snapshot.retrievedAt)),provider:snapshot.provider,clock:snapshot.clock};
}
