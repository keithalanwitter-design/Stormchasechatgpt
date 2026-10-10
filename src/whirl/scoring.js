/** WHIRL research prototype v0.1. NOT a tornado probability or warning. */
export const WHIRL_WEIGHTS = Object.freeze({rotation:0.25,instability:0.20,organization:0.15,moisture:0.15,initiation:0.15,boundaries:0.10});
export const WHIRL_COMPONENTS = Object.freeze(Object.keys(WHIRL_WEIGHTS));
export function scoreEnvironment(components, options={}) {
  const missing=WHIRL_COMPONENTS.filter(k=>!Number.isFinite(components?.[k]));
  if(missing.length) return {status:'insufficient-data',score:null,missing,version:'WHIRL-E-research-0.1'};
  const invalid=WHIRL_COMPONENTS.filter(k=>components[k]<0||components[k]>1);
  if(invalid.length) return {status:'invalid-input',score:null,invalid,version:'WHIRL-E-research-0.1'};
  const raw=10*WHIRL_COMPONENTS.reduce((sum,k)=>sum+WHIRL_WEIGHTS[k]*components[k],0);
  // Gates are optional research assumptions, not scientifically validated thresholds.
  const gates=[];
  if(options.surfaceBased===false) gates.push({reason:'Elevated / not surface based',cap:2});
  if(options.initiationExpected===false) gates.push({reason:'Initiation not expected in forecast window',cap:3});
  const cap=gates.length?Math.min(...gates.map(g=>g.cap)):10;
  return {status:'experimental',score:Math.round(Math.min(raw,cap)*10)/10,rawScore:Math.round(raw*10)/10,components:{...components},gates,version:'WHIRL-E-research-0.1',isProbability:false};
}
