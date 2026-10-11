export const RADAR_URL='https://api.rainviewer.com/public/weather-maps.json';
export const STATIONS_URL='https://api.weather.gov/radar/stations';
export function normalizeRadar(data,now=Date.now()){
 if(data?.host!=='https://tilecache.rainviewer.com')throw Error('Unexpected radar tile host');
 const frames=(data.radar?.past||[]).filter(f=>Number.isFinite(f.time)&&f.time*1000<=now+60000&&now-f.time*1000<=3*3600000&&/^\/v2\/radar\/[a-zA-Z0-9_-]+$/.test(f.path)).sort((a,b)=>a.time-b.time);
 if(!frames.length)throw Error('No recent radar frames');
 return {host:data.host,frames,retrievedAt:new Date(now).toISOString()};
}
export function tileURL(radar,frame,z='{z}',x='{x}',y='{y}') {return `${radar.host}${frame.path}/256/${z}/${x}/${y}/2/1_1.png`;}
export function normalizeStations(data){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid radar station catalog');
 return {type:'FeatureCollection',features:data.features.filter(f=>/^K?[A-Z0-9]{3,4}$/.test(f.properties?.id)&&f.geometry?.type==='Point'&&f.geometry.coordinates?.length===2&&f.geometry.coordinates.every(Number.isFinite)).map(f=>({...f,properties:{id:f.properties.id,name:f.properties.name,receivedAt:f.properties.latency?.levelTwoLastReceivedTime||null}}))};
}
export async function fetchJSON(url,fetcher=fetch){const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);try{const r=await fetcher(url,{signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json();}finally{clearTimeout(t);}}
// SVG regional fallback: place real Web Mercator tiles in the same projection.
export function regionalTiles(projection,radar,frame,z=4){
 const n=2**z,lat=y=>Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI;const out=[];
 for(let x=0;x<n;x++)for(let y=0;y<n;y++){const a=projection([x/n*360-180,lat(y)]),b=projection([(x+1)/n*360-180,lat(y+1)]);if(b[0]<0||a[0]>1000||b[1]<0||a[1]>720)continue;out.push({x:a[0],y:a[1],width:b[0]-a[0],height:b[1]-a[1],url:tileURL(radar,frame,z,x,y)});}return out;
}
