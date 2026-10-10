import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'portable-preview');await mkdir(out,{recursive:true});
const pages=['index.html','field-command.html','whirl-lab.html','forecast-lab.html'];const rendered={};
for(const page of pages){
 let html=await readFile(resolve(root,page),'utf8');
 const entry=html.match(/<script type="module" src="([^"]+)"><\/script>/);
 if(entry){
  const result=await build({entryPoints:[resolve(root,entry[1].replace(/^\//,''))],bundle:true,write:false,outdir:out,format:'iife',minify:true,legalComments:'inline',target:'es2022'});
  const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');
  const css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'';
  html=html.replace(entry[0],()=>'<script>'+js+'</script>').replace('</head>',()=>'<style>'+css+'</style></head>');
 }
 html=html.replace(/<link rel="manifest"[^>]+>/g,'');
 rendered[page]=html;
 await writeFile(resolve(out,page),html);
}
// Bundle companion prototypes into the main preview so their links work without extracting a ZIP.
const encoded=Object.fromEntries(Object.entries(rendered).filter(([name])=>name!=='index.html').map(([name,html])=>[name,Buffer.from(html).toString('base64')]));
const bridge=`<script>(()=>{const pages=${JSON.stringify(encoded)},home=location.href,urls={};for(const [name,data] of Object.entries(pages)){let html=new TextDecoder().decode(Uint8Array.from(atob(data),c=>c.charCodeAt(0)));html=html.replaceAll('href="./"','href="'+home+'"');urls[name]=URL.createObjectURL(new Blob([html],{type:'text/html'}));}document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const href=a.getAttribute('href')||'';const key=href.startsWith('./')?href.slice(2):href;if(urls[key]){e.preventDefault();window.open(urls[key],'_blank','noopener');}});})();</script>`;
await writeFile(resolve(out,'StormChase-WHIRL-Preview.html'),rendered['index.html'].replace('</body>',()=>bridge+'</body>'));
console.log('Portable preview generated. WebGL required; official feeds still require network/CORS.');
