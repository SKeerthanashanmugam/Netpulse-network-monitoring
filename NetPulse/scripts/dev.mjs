import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const node=process.execPath;
const children=[spawn(node,['--env-file-if-exists=.env','server/index.js'],{stdio:'inherit'}),spawn(node,[fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url))],{stdio:'inherit'})];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
for(const child of children){child.on('error',e=>{console.error(e.message);stop(1);});child.on('exit',code=>{if(!stopping)stop(code||0);});}
process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));
