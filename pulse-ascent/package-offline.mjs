import {cp,copyFile,mkdir,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'..');
const distRoot=path.resolve(repo,'dist');
const out=path.join(distRoot,'pulse-ascent-offline');
const depsRoot=path.resolve(repo,'.offline-deps/node_modules/three');

const excluded=new Set(['package-offline.mjs']);

async function copyTree(src,dst){
  await mkdir(dst,{recursive:true});
  for(const name of await readdir(src)){
    if(excluded.has(name)) continue;
    const from=path.join(src,name),to=path.join(dst,name),s=await stat(from);
    if(s.isDirectory()) await copyTree(from,to);
    else await copyFile(from,to);
  }
}

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await copyTree(here,out);

const vendor=path.join(out,'vendor');
await mkdir(path.join(vendor,'addons','postprocessing'),{recursive:true});
await mkdir(path.join(vendor,'addons','shaders'),{recursive:true});
await copyFile(path.join(depsRoot,'build','three.module.js'),path.join(vendor,'three.module.js'));
for(const name of ['EffectComposer.js','RenderPass.js','UnrealBloomPass.js','ShaderPass.js','MaskPass.js','Pass.js']){
  await copyFile(path.join(depsRoot,'examples','jsm','postprocessing',name),path.join(vendor,'addons','postprocessing',name));
}
for(const name of ['CopyShader.js','LuminosityHighPassShader.js']){
  await copyFile(path.join(depsRoot,'examples','jsm','shaders',name),path.join(vendor,'addons','shaders',name));
}

const indexPath=path.join(out,'index.html');
let html=await readFile(indexPath,'utf8');
html=html.replace('https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js','./vendor/three.module.js')
         .replace('https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/','./vendor/addons/');
await writeFile(indexPath,html);

const servePy=`#!/usr/bin/env python3\nimport http.server, socketserver, webbrowser, os\nos.chdir(os.path.dirname(os.path.abspath(__file__)))\nPORT=8080\nurl=f'http://127.0.0.1:{PORT}/'\nprint('PULSE//ASCENT offline server:', url)\ntry: webbrowser.open(url)\nexcept Exception: pass\nwith socketserver.TCPServer(('127.0.0.1',PORT),http.server.SimpleHTTPRequestHandler) as httpd: httpd.serve_forever()\n`;
await writeFile(path.join(out,'serve.py'),servePy);
await writeFile(path.join(out,'START-WINDOWS.bat'),'@echo off\npython serve.py\nif errorlevel 1 py serve.py\npause\n');
await writeFile(path.join(out,'START-MAC.command'),'#!/bin/sh\ncd "$(dirname "$0")"\npython3 serve.py\n');
await writeFile(path.join(out,'README-OFFLINE.txt'),`PULSE//ASCENT — OFFLINE PACKAGE\n\nThis build contains all game code, local assets, and Three.js r185 runtime files. It does not require an internet connection once extracted.\n\nWHY A LOCAL SERVER?\nModern browsers restrict ES modules and asset loading from file:// URLs. Run the included tiny local server instead.\n\nWINDOWS\n1. Extract the ZIP.\n2. Double-click START-WINDOWS.bat.\n3. Your browser should open http://127.0.0.1:8080/\n\nMAC\n1. Extract the ZIP.\n2. If needed: chmod +x START-MAC.command\n3. Double-click START-MAC.command, or run: python3 serve.py\n\nLINUX\nRun: python3 serve.py\n\nANDROID / iOS\nUse any local static-server app and point it at this folder. No remote CDN is required.\n\nLICENSE / PROVENANCE\nGame code and local project assets retain the repository's existing licensing/provenance notes. Three.js r185 is MIT licensed; its LICENSE is included in vendor/THREE-LICENSE.txt.\n`);
await copyFile(path.join(depsRoot,'LICENSE'),path.join(vendor,'THREE-LICENSE.txt'));

const files=[];
async function walk(dir){for(const n of await readdir(dir)){const p=path.join(dir,n),s=await stat(p);if(s.isDirectory())await walk(p);else files.push(path.relative(out,p));}}
await walk(out);
if(html.includes('cdn.jsdelivr.net')) throw new Error('CDN import still present in offline index');
console.log(`Offline package ready: ${out}`);
console.log(`Files: ${files.length}`);
