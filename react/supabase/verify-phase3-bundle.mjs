#!/usr/bin/env node
// Check the built browser assets without printing the server secret.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(path.join(root, '.env.local'), 'utf8');
const line = env.split(/\r?\n/).find(value => value.startsWith('SUPABASE_SECRET_KEY='));
const secret = line?.slice('SUPABASE_SECRET_KEY='.length).trim().replace(/^(["'])(.*)\1$/, '$2');
if (!secret) throw new Error('SUPABASE_SECRET_KEY is required for this check.');
const assetRoot = path.join(root, '.next', 'static');
let scanned = 0;
const leaked = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (entry.isFile()) {
      scanned++;
      if (readFileSync(absolute).includes(Buffer.from(secret))) leaked.push(path.relative(assetRoot, absolute));
    }
  }
}
visit(assetRoot);
if (leaked.length) throw new Error(`Server secret found in browser assets: ${leaked.join(', ')}`);
console.log(`PASS Server secret absent from ${scanned} built browser assets`);
