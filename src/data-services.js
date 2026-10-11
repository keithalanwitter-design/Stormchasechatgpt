// Shared browser-side data adapters. No server or public WHIRL inference is implied.
export const PRODUCTS=Object.freeze({
 radar:Object.freeze({id:'radar',provider:'RainViewer',url:'https://api.rainviewer.com/public/weather-maps.json',format:'radar-catalog',render:'raster',clock:'observation',ttlMs:240000,timeoutMs:15000}),
 stations:Object.freeze({id:'stations',provider:'NOAA / NWS',url:'https://api.weather.gov/radar/stations',format:'geojson',render:'point',clock:'station-status',ttlMs:240000,timeoutMs:15000}),
 spc:Object.freeze({id:'spc',provider:'NOAA / SPC',url:'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson',format:'geojson',render:'polygon',clock:'issued-outlook',ttlMs:240000,timeoutMs:12000}),
 nws:Object.freeze({id:'nws',provider:'NOAA / NWS',url:'https://api.weather.gov/alerts/active?status=actual',format:'geojson',render:'polygon',clock:'issued-alert',ttlMs:240000,timeoutMs:12000})
});
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
export function createDataService({fetcher=(...args)=>fetch(...args),now=()=>Date.now()}={}){
 const cache=new Map(),pending=new Map();
 return {async get(id,{force=false}={}){
  const product=PRODUCTS[id];if(!product)throw Error('Unsupported weather product');
  if(pending.has(id))return clone(await pending.get(id));
  const saved=cache.get(id);if(!force&&saved&&now()-Date.parse(saved.retrievedAt)<product.ttlMs)return clone(saved);
  const task=(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),product.timeoutMs);try{
   const response=await fetcher(product.url,{signal:c.signal,headers:{Accept:product.format==='geojson'?'application/geo+json':'application/json'}});
   if(!response.ok)throw Error(`HTTP ${response.status}`);const payload=await response.json();
   if(product.format==='geojson'&&(payload?.type!=='FeatureCollection'||!Array.isArray(payload.features)))throw Error('Invalid GeoJSON FeatureCollection');
   if(product.format==='radar-catalog'&&(!payload?.radar||!Array.isArray(payload.radar.past)))throw Error('Invalid radar catalog');
   const snapshot={product:id,provider:product.provider,source:product.url,clock:product.clock,retrievedAt:new Date(now()).toISOString(),payload};cache.set(id,clone(snapshot));return snapshot;
  }finally{clearTimeout(t);}})();pending.set(id,task);
  try{return clone(await task);}finally{if(pending.get(id)===task)pending.delete(id);}
 },clear(){cache.clear();}};
}
export const weatherData=createDataService();
