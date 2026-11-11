import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();const slug=process.argv[2];
if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('Use a valid project slug.');
const project=path.join(root,'projects',slug);const composer=path.join(root,'engine','remotion-composer');
const props=path.join(project,'artifacts','scenes.json');
const config=JSON.parse(fs.readFileSync(props,'utf8'));
if(!Array.isArray(config.scenes)||!config.scenes.length)throw new Error('No scenes.');
for(const scene of config.scenes){
 if(!Number.isFinite(scene.duration)||scene.duration<=0)throw new Error('Every scene needs duration > 0.');
 if(['image','video'].includes(scene.type)){
  const media=path.resolve(project,'public',scene.src||'');const base=path.resolve(project,'public')+path.sep;
  if(!media.startsWith(base)||!fs.existsSync(media)||!fs.statSync(media).isFile())throw new Error('Asset missing or outside project public directory.');
 }
}
const staging=path.join(composer,'projects',slug);fs.mkdirSync(staging,{recursive:true});
fs.copyFileSync(path.join(project,'index.tsx'),path.join(staging,'index.tsx'));
fs.mkdirSync(path.join(project,'renders'),{recursive:true});
const cli=path.join(composer,'node_modules','@remotion','cli','remotion-cli.js');
if(!fs.existsSync(cli))throw new Error('Run setup first: Remotion dependencies missing.');
const result=spawnSync(process.execPath,[cli,'render',path.join(staging,'index.tsx'),'OpenVideo',path.join(project,'renders','final.mp4'),`--props=${props}`,`--public-dir=${path.join(project,'public')}`,'--port=3493','--concurrency=2','--crf=18'],{cwd:composer,stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;process.exit(result.status??1);
