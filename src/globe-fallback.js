import {geoOrthographic,geoMercator,geoPath,geoGraticule10,geoArea,geoDistance} from 'd3-geo';
// Natural Earth is geographic context. This renderer never manufactures weather.
export function sphericalGeometry(g){
 if(!g)return null;
 const polygon=rings=>geoArea({type:'Polygon',coordinates:rings})>2*Math.PI?rings.map(r=>[...r].reverse()):rings;
 return g.type==='Polygon'?{...g,coordinates:polygon(g.coordinates)}:g.type==='MultiPolygon'?{...g,coordinates:g.coordinates.map(polygon)}:g;
}
export function fallbackProjection(view,center=[-92,31],scale=1){
 return view==='globe'?geoOrthographic().rotate([-center[0],-center[1]]).translate([500,360]).scale(295*scale).clipAngle(90):geoMercator().center([center[0],Math.max(-85,Math.min(85,center[1]))]).translate([500,360]).scale(900*scale).clipExtent([[0,0],[1000,720]]);
}
export function pickCoordinate(projection,p,view){
 if(view==='globe'&&Math.hypot(p[0]-500,p[1]-360)>projection.scale())return null;
 const c=projection.invert(p);return c&&c.every(Number.isFinite)&&Math.abs(c[1])<=90?[((c[0]+180)%360+360)%360-180,c[1]]:null;
}
export function mountGlobeFallback(host,{world,states,onPoint,onRegion,onMove}={}){
 const land={...world,features:world.features.map(f=>({...f,geometry:sphericalGeometry(f.geometry)}))};
 let view='globe',center=[-92,31],scale=1,current={},drag=null,projection;
 host.innerHTML='<svg class="fallback-globe" viewBox="0 0 1000 720" role="application" aria-label="Interactive geographic globe. Drag or use arrow keys to rotate; select a point for live guidance." tabindex="0"></svg><span class="renderer-note">Geographic globe · 2D renderer · Natural Earth</span>';
 const svg=host.querySelector('svg');
 function draw(){
  projection=fallbackProjection(view,center,scale);const path=geoPath(projection),sphere=path({type:'Sphere'});
  const regionPaths=current.scope==='demo'?(current.regions?.features||[]).map(f=>`<path d="${path(sphericalGeometry(f.geometry))||''}" data-region="${f.properties.id}" fill="#b5a3ff" fill-opacity="${current.opacity||.2}" stroke="#cfbeff" stroke-width="1.3"/>`).join(''):'';
  const official=['spc','nws'].map(kind=>current.feeds?.[kind]?.status==='ready'&&current.scope!=='demo'?current.feeds[kind].data.features.map(f=>f.geometry?`<path d="${path(sphericalGeometry(f.geometry))||''}" fill="${kind==='spc'?'#e1bf80':'#ff8c8a'}" fill-opacity=".2" stroke="${kind==='spc'?'#e1bf80':'#ff8c8a'}" stroke-width="1"/>`:'').join(''):'').join('');
  const p=current.point?.center,visible=p&&(view!=='globe'||geoDistance(p,center)<Math.PI/2);const xy=visible?projection(p):null;
  svg.innerHTML=`<defs><radialGradient id="planet-ocean" cx="32%" cy="25%"><stop stop-color="#264267"/><stop offset=".7" stop-color="#10213c"/><stop offset="1" stop-color="#050c1c"/></radialGradient><radialGradient id="planet-shade" cx="27%" cy="25%"><stop stop-color="#75bfff" stop-opacity=".13"/><stop offset=".65" stop-color="#02050e" stop-opacity="0"/><stop offset="1" stop-color="#02050e" stop-opacity=".85"/></radialGradient><filter id="planet-glow"><feGaussianBlur stdDeviation="15"/></filter><clipPath id="planet-clip"><path d="${sphere||''}"/></clipPath></defs>${view==='globe'?'<circle cx="500" cy="360" r="303" fill="none" stroke="#548cf0" stroke-opacity=".25" stroke-width="12" filter="url(#planet-glow)"/>':''}<path d="${sphere||''}" fill="url(#planet-ocean)" stroke="#729dd0" stroke-opacity=".35"/><g clip-path="url(#planet-clip)"><path d="${path(land)||''}" fill="#33536c" stroke="#80acc1" stroke-opacity=".55" stroke-width=".65"/><path d="${path(geoGraticule10())||''}" fill="none" stroke="#94bcdf" stroke-opacity=".11" stroke-width=".6"/><path d="${path(states)||''}" fill="none" stroke="#98b4d8" stroke-opacity=".28" stroke-width=".55"/>${regionPaths}${official}<path d="${sphere||''}" fill="url(#planet-shade)" pointer-events="none"/>${xy?`<circle cx="${xy[0]}" cy="${xy[1]}" r="15" fill="#abf1e4" fill-opacity=".12" stroke="#aaf0dc" stroke-opacity=".5"/><circle cx="${xy[0]}" cy="${xy[1]}" r="4" fill="#d3fff5"/>`:''}</g>`;
 }
 function coords(e){const r=svg.getBoundingClientRect();const s=Math.min(r.width/1000,r.height/720);return [(e.clientX-r.left-(r.width-1000*s)/2)/s,(e.clientY-r.top-(r.height-720*s)/2)/s];}
 svg.onpointerdown=e=>{if(e.button!==0)return;drag={at:coords(e),center:[...center],moved:false};svg.setPointerCapture?.(e.pointerId);};
 svg.onpointermove=e=>{if(!drag)return;const at=coords(e),dx=at[0]-drag.at[0],dy=at[1]-drag.at[1];if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){center=[drag.center[0]-dx*.18/scale,Math.max(-75,Math.min(75,drag.center[1]+dy*.15/scale))];draw();}};
 svg.onpointerup=e=>{if(!drag)return;const moved=drag.moved;drag=null;svg.releasePointerCapture?.(e.pointerId);onMove?.(center);if(!moved){const region=e.target.dataset.region;if(region&&current.scope==='demo')onRegion?.(region);else if(current.scope==='live'){const c=pickCoordinate(projection,coords(e),view);if(c)onPoint?.(c);}}};
 svg.onpointercancel=()=>drag=null;
 svg.onkeydown=e=>{const keys={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,8],ArrowDown:[0,-8]};if(keys[e.key]){e.preventDefault();center=[center[0]+keys[e.key][0],Math.max(-75,Math.min(75,center[1]+keys[e.key][1]))];draw();onMove?.(center);}else if(e.key==='Enter'&&current.scope==='live')onPoint?.(center);};
 draw();return {setView(v,c){view=v;center=c|| (v==='globe'?[-92,31]:[-96,38]);scale=1;draw();},update(x){current=x;draw();}};
}
