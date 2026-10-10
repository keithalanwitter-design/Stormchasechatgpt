// Fixtures are independent of the draft WHIRL research formula.
export const DEMO_RUN = '2027-05-18T00:00:00Z';
export const MODELS = {GFS:120, HRRR:48, RAP:21, NAM:84}; // Synthetic catalog, not live availability.
export const LAYERS = [
 {id:'whirl',name:'WHIRL environments',unit:'Illustrative regions',color:'#a9a2ff'},
 {id:'cape',name:'Mixed-layer CAPE',unit:'J/kg',color:'#c5e87c'},
 {id:'cin',name:'Mixed-layer CIN',unit:'J/kg',color:'#edaf70'},
 {id:'srh',name:'0–500 m SRH',unit:'m²/s²',color:'#b49cfa'},
 {id:'shear',name:'Effective shear',unit:'kt',color:'#81cedf'},
 {id:'lcl',name:'Mixed-layer LCL',unit:'m AGL',color:'#9abeef'},
 {id:'boundaries',name:'Boundary context',unit:'Conceptual line',color:'#ee99ac'}
];
export const REGIONS = [
 {id:'plains',name:'Southern Plains',sub:'Oklahoma · southern Kansas',center:[-97.9,36.6],ring:[[-100.5,34.7],[-98.7,34.5],[-96.3,36],[-96.2,38.2],[-98.3,38.7],[-100.2,37.1],[-100.5,34.7]],values:{cape:2200,cin:-45,srh:185,shear:48,lcl:950},context:'A conceptual dryline intersects returning moisture. Initiation and storm mode remain unresolved.'},
 {id:'midwest',name:'Mid-Mississippi Valley',sub:'Missouri · Illinois',center:[-90.5,38.9],ring:[[-93.9,37.2],[-91.8,36.7],[-88.4,38.2],[-87.7,40.1],[-90.4,40.7],[-93.3,39.2],[-93.9,37.2]],values:{cape:1450,cin:-35,srh:235,shear:52,lcl:820},context:'An illustrative warm-front environment. Prior convection could alter the inflow and boundary position.'},
 {id:'southeast',name:'Lower Mississippi Valley',sub:'Arkansas · Mississippi',center:[-91.4,33.5],ring:[[-94.3,32],[-91.5,31.7],[-88.8,33.8],[-90.3,35.5],[-93.5,34.9],[-94.3,32]],values:{cape:850,cin:-20,srh:265,shear:56,lcl:720},context:'A synthetic lower-buoyancy, stronger-shear scenario. A supercell-oriented index may not transfer to linear convection.'}
];
export const CITIES=[['Belleville, IL',-89.98,38.52],['St. Louis, MO',-90.2,38.63],['Oklahoma City, OK',-97.52,35.47],['Wichita, KS',-97.34,37.69],['Springfield, IL',-89.65,39.79],['Memphis, TN',-90.05,35.15],['Dallas, TX',-96.8,32.78],['Chicago, IL',-87.63,41.88]];
export function validTime(lead){if(!Number.isFinite(lead)||lead<0||lead>120)throw new Error('Invalid forecast lead');return new Date(Date.parse(DEMO_RUN)+lead*3600000).toISOString();}
export function available(model,lead){return Object.hasOwn(MODELS,model)&&lead>=0&&lead<=MODELS[model];}
export function valuesFor(region,model,lead){
 if(!available(model,lead))return null;
 const m={GFS:1,HRRR:1.08,RAP:.94,NAM:1.04}[model];const t=0.8+0.2*Math.cos(lead/24);
 return Object.fromEntries(Object.entries(region.values).map(([k,v])=>[k,Math.round(v*m*t)]));
}
export function demoFeatures(lead=24,model='GFS'){
 return {type:'FeatureCollection',features:available(model,lead)?REGIONS.map((r,i)=>({type:'Feature',id:i,properties:{id:r.id,name:r.name,kind:'synthetic',version:'demo-geography-0.6',validTime:validTime(lead)},geometry:{type:'Polygon',coordinates:[r.ring.map(([x,y])=>[x+lead/120*.7,y])]}})):[]};
}
export function searchLocation(q){
 const text=q.trim();const pair=text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
 if(pair){const lat=Number(pair[1]),lon=Number(pair[2]);return Math.abs(lat)<=90&&Math.abs(lon)<=180?{name:text,center:[lon,lat]}:null;}
 const city=CITIES.find(c=>c[0].toLowerCase().includes(text.toLowerCase()));return text&&city?{name:city[0],center:city.slice(1)}:null;
}
export function validateCase(c){
 if(!c||typeof c!=='object'||!c.id||!['tornado','control','unresolved'].includes(c.outcome))return 'ID and valid outcome required';
 if(typeof c.id!=='string'||c.id.length>200)return 'Case ID must be a string of at most 200 characters';
 if(!Number.isFinite(Date.parse(c.predictionTime)))return 'Valid UTC predictionTime required';
 for(const key of ['predictionTime','inputTime','onsetTime'])if(c[key]&&(!/T.*(?:Z|\+00:00)$/.test(c[key])||!Number.isFinite(Date.parse(c[key]))))return 'Case times must be valid UTC ISO timestamps';
 if(c.outcome==='tornado'&&(!c.labelSource||!Number.isFinite(Date.parse(c.onsetTime))))return 'Tornado labels require source and onset time';
 if(c.outcome==='control'&&!c.coverageEvidence)return 'Controls require coverage evidence; no report is insufficient';
 if(c.inputTime&&(!Number.isFinite(Date.parse(c.inputTime))||Date.parse(c.inputTime)>Date.parse(c.predictionTime)))return 'Input time must precede prediction time';
 if(c.onsetTime&&Date.parse(c.predictionTime)>Date.parse(c.onsetTime))return 'Pre-onset prediction cannot follow tornado onset';return null;
}
