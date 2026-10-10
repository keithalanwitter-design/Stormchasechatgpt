// Real point forecasts. Model output is not an observation or a WHIRL probability.
export const VARIABLES=['temperature_2m','dew_point_2m','cape','convective_inhibition','wind_speed_10m','wind_direction_10m','cloud_cover','precipitation'];
export function validPoint(center){return Array.isArray(center)&&center.length===2&&center.every(Number.isFinite)&&Math.abs(center[0])<=180&&Math.abs(center[1])<=90;}
export function modelURL(center){if(!validPoint(center))throw Error('Invalid coordinates');const q=new URLSearchParams({latitude:center[1],longitude:center[0],hourly:VARIABLES.join(','),timezone:'UTC',forecast_days:'6',wind_speed_unit:'kn'});return 'https://api.open-meteo.com/v1/gfs?'+q;}
export function normalizeModel(data,url,now=Date.now()){
 if(data?.utc_offset_seconds!==0||!validPoint([data?.longitude,data?.latitude])||!Array.isArray(data?.hourly?.time)||!data.hourly.time.length)throw Error('Invalid UTC model response');
 const h=data.hourly,u=data.hourly_units;const expected={temperature_2m:'°C',dew_point_2m:'°C',cape:'J/kg',convective_inhibition:'J/kg',wind_speed_10m:'kn',wind_direction_10m:'°',cloud_cover:'%',precipitation:'mm'};
 for(const key of VARIABLES)if(!Array.isArray(h[key])||h[key].length!==h.time.length||u?.[key]!==expected[key])throw Error('Missing series or unexpected units: '+key);
 const rows=h.time.map((t,i)=>{
  if(typeof t!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(t)||!Number.isFinite(Date.parse(t+'Z')))throw Error('Invalid model valid time');
  const values=Object.fromEntries(VARIABLES.map(k=>[k,typeof h[k][i]==='number'&&Number.isFinite(h[k][i])?h[k][i]:null]));
  return {validAt:new Date(t+'Z').toISOString(),...values};
 });
 if(rows.some((r,i)=>i&&Date.parse(r.validAt)<=Date.parse(rows[i-1].validAt)))throw Error('Unordered model times');
 return {kind:'model',provider:'Open-Meteo',model:'NOAA GFS / HRRR seamless',source:url,gridCenter:[data.longitude,data.latitude],retrievedAt:new Date(now).toISOString(),issuedAt:null,runTime:null,rows,units:expected};
}
export function rowAt(data,lead,now=Date.now()){
 if(!data||!Number.isFinite(lead)||lead<0||lead>120||now-Date.parse(data.retrievedAt)>3600000)return null;
 const target=Math.floor(now/3600000)*3600000+lead*3600000;
 return data.rows.find(r=>Date.parse(r.validAt)===target)||null;
}
async function json(url,fetcher,signal){const r=await fetcher(url,{signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
export async function fetchModel(center,fetcher=fetch,signal){const url=modelURL(center);return normalizeModel(await json(url,fetcher,signal),url);}
function nwsURL(value){const u=new URL(value);if(u.origin!=='https://api.weather.gov')throw Error('Unexpected NWS endpoint');return u.href;}
export async function fetchNWSPoint(center,fetcher=fetch,signal){
 if(!validPoint(center))throw Error('Invalid coordinates');
 const point=await json(`https://api.weather.gov/points/${center[1].toFixed(4)},${center[0].toFixed(4)}`,fetcher,signal);
 const url=nwsURL(point?.properties?.forecastHourly);const d=await json(url,fetcher,signal);
 if(!Array.isArray(d?.properties?.periods))throw Error('Invalid NWS hourly forecast');
 return {kind:'official_forecast',source:url,issuedAt:d.properties.updateTime||d.properties.generatedAt||null,retrievedAt:new Date().toISOString(),location:point.properties.relativeLocation?.properties,periods:d.properties.periods.map(p=>({startTime:p.startTime,endTime:p.endTime,temperature:p.temperature,unit:p.temperatureUnit,windSpeed:p.windSpeed,windDirection:p.windDirection,shortForecast:p.shortForecast})).filter(p=>Number.isFinite(Date.parse(p.startTime))&&Number.isFinite(Date.parse(p.endTime)))};
}
export function scenarioBaseline(row){return {cape:row?.cape??null,cin:row?.convective_inhibition==null?null:Math.abs(row.convective_inhibition),dewpoint:row?.dew_point_2m??null,srh:null,shear:null,lcl:null};}
export const INGREDIENTS=[
 {id:'cape',label:'Instability',name:'CAPE',unit:'J/kg',min:0,max:5000,step:50,color:'#a99bff',hint:'Energy available to an ascending parcel. This feed does not specify a mixed-layer parcel.'},
 {id:'cin',label:'The cap',name:'CIN magnitude',unit:'J/kg',min:0,max:500,step:5,color:'#e7b779',hint:'Inhibition can delay initiation. Lifting and parcel choice matter; no tornado gate is applied.'},
 {id:'dewpoint',label:'Moisture',name:'2 m dew point',unit:'°C',min:-20,max:30,step:.5,color:'#64dece',hint:'Near-surface moisture is one clue. It does not measure moisture depth or downdraft buoyancy.'},
 {id:'srh',label:'Low-level rotation',name:'SRH 0–500 m',unit:'m²/s²',min:-100,max:500,step:5,color:'#f196c5',hint:'Requires a vertical wind profile and storm motion. Manual assumption until sounding extraction is connected.'},
 {id:'shear',label:'Storm organization',name:'Effective shear',unit:'kt',min:0,max:80,step:1,color:'#78bfff',hint:'Requires an effective inflow layer and vertical winds. Manual assumption, not 10 m wind speed.'},
 {id:'lcl',label:'Cloud base',name:'Mixed-layer LCL',unit:'m AGL',min:0,max:3000,step:50,color:'#c9d88b',hint:'Requires a defined parcel and sounding. Manual assumption; no cloud-base estimate is substituted.'}
];
export function validateScenario(x){
 if(x?.version!=='scenario-0.8'||!validPoint(x?.location?.center)||typeof x?.location?.name!=='string'||x.location.name.length>100||!Number.isInteger(x.lead)||x.lead<0||x.lead>120||!x.values)throw Error('Invalid scenario file');
 for(const d of INGREDIENTS){const v=x.values[d.id];if(v!==null&&(!Number.isFinite(v)||v<d.min||v>d.max))throw Error('Out-of-range ingredient: '+d.id);}
 if(!['unknown','possible','observed'].includes(x.boundary))throw Error('Invalid boundary context');return x;
}
