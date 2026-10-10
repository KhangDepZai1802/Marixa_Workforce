#!/usr/bin/env node
// Reports filenames only. Scans the working tree selected by Git, not historical commits.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { readEnv } from './backup.mjs';
const env=readEnv(), values=Object.entries(env).filter(([key,value])=>!key.startsWith('NEXT_PUBLIC_')&&value.length>=12).map(([,value])=>value);
const credentials=JSON.parse(readFileSync('.env.phase2.local','utf8'));values.push(...Object.values(credentials.passwords));
const git=spawnSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:'..',encoding:'utf8'});assert.equal(git.status,0);
const files=[...new Set(git.stdout.split('\0').filter(Boolean))];const leaks=[];
for(const file of files){const absolute=path.resolve('..',file);if(!existsSync(absolute))continue;const data=readFileSync(absolute);if(values.some(value=>data.includes(Buffer.from(value))))leaks.push(file);}
assert.deepEqual(leaks,[],'Secrets found in working-tree files selected by Git');
const example=readFileSync('.env.example','utf8').split(/\r?\n/).filter(Boolean);assert(example.every(line=>/^[A-Z_]+=\s*$/.test(line)),'.env.example must contain empty values');
const ignored=spawnSync('git',['check-ignore','.env.local','.env.phase2.local','.env.production.local','.env.backup.local'],{encoding:'utf8'});assert.equal(ignored.status,0);assert.equal(ignored.stdout.trim().split(/\r?\n/).length,4);
let bundles=0;function visit(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else{bundles++;const bytes=readFileSync(file);assert(!values.some(value=>bytes.includes(Buffer.from(value))),`Secret in browser asset ${file}`);}}}visit('.next/static');
console.log(`PASS ${files.length} Git-selected working-tree files and ${bundles} browser assets: no current server/test secrets; environment files ignored`);
