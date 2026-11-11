import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const target=path.join(root,'config','local.json');
if(fs.existsSync(target)){console.log('Keeping existing local config:',target);process.exit(0);}
const engine=path.join(root,'engine');
const python=path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const config={projectsDirectory:path.join(root,'projects'),openMontagePath:engine,remotionPath:path.join(engine,'remotion-composer'),ffmpegPath:'ffmpeg',ffprobePath:'ffprobe',pythonPath:python,codexPath:'codex',preferredPort:3000,autoFallback:true,render:{width:1080,height:1920,fps:30,workers:2},freeOnly:true};
fs.mkdirSync(path.dirname(target),{recursive:true});fs.mkdirSync(config.projectsDirectory,{recursive:true});
fs.writeFileSync(target,JSON.stringify(config,null,2));console.log('Configured:',target);
