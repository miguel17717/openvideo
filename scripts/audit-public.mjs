import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();const prohibited=['dos'+'link'];const skip=new Set(['.git','node_modules','.venv','dist','projects']);
let count=0;const errors=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name);const rel=path.relative(root,file);
 if(entry.isDirectory()){if(!skip.has(entry.name))walk(file);continue;}
 if(entry.name==='.env'||entry.name==='.env.local'||entry.name==='local.json'){errors.push('Local config/secret file: '+rel);continue;}
 const bytes=fs.readFileSync(file);count++;
 if(prohibited.some(t=>rel.toLowerCase().includes(t)||bytes.toString('utf8').toLowerCase().includes(t)))errors.push('Prohibited branding: '+rel);
 if(bytes.length>50*1024*1024)errors.push('Oversized file: '+rel);
 const normalized=rel.replaceAll('\\','/');
 const shippedUpstreamAsset=/^engine\/\.agents\/skills\/[^/]+\/assets\/sfx\/[^/]+\.mp3$/.test(normalized)||/^engine\/\.agents\/skills\/hyperframes-animation\/examples\/assets\/[^/]+\.mp4$/.test(normalized)||normalized==='engine/assets/signal-from-tomorrow-demo.mp4';
 if(/\.(mp4|mov|wav|mp3|onnx)$/i.test(rel)&&!shippedUpstreamAsset)errors.push('Production media/model: '+rel);
}}
walk(root);console.log(JSON.stringify({filesChecked:count,issues:errors},null,2));if(errors.length)process.exit(1);
