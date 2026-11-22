#!/usr/bin/env node
/* install.mjs - install the Ungeneric skill into coding agents' skill folders.
   No dependencies, no network: copies this folder's files into each agent's
   skills directory, project scope by default, global with --global.

   Usage:
     node install.mjs                          detect agents in this project, install for them
     node install.mjs --agents=claude,cursor   pick agents (claude,cursor,codex,antigravity,copilot,gemini,opencode)
     node install.mjs --all                    install into every known agent's project folder
     node install.mjs --global --agents=claude install for every project (home directory)
*/
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_FILES = ['SKILL.md', 'cli.mjs', 'engine.js', 'render-audit.mjs'];

const AGENTS = {
  claude:      { dir: '.claude',   global: true,  invoke: '/ungeneric' },
  cursor:      { dir: '.cursor',   global: true,  invoke: '/ungeneric' },
  codex:       { dir: '.agents',   global: true,  invoke: '$ungeneric (or /skills)' },
  antigravity: { dir: '.agents',   global: true,  globalDir: '.gemini/config', invoke: '/ungeneric' },
  copilot:     { dir: '.github',   global: true,  globalDir: '.copilot', invoke: '/ungeneric (VS Code chat)' },
  gemini:      { dir: '.gemini',   global: true,  invoke: 'use ungeneric' },
  opencode:    { dir: '.opencode', global: false, invoke: '/ungeneric' },
};

const args = process.argv.slice(2);
const isGlobal = args.includes('--global');
const all = args.includes('--all');
const agentsArg = (args.find(a => a.startsWith('--agents=')) || '').replace('--agents=', '');
let picked = agentsArg ? agentsArg.split(',').map(s => s.trim()).filter(Boolean) : null;

if (picked) {
  const bad = picked.filter(a => !AGENTS[a]);
  if (bad.length) { console.error('unknown agent(s): ' + bad.join(', ') + '. Known: ' + Object.keys(AGENTS).join(', ')); process.exit(1); }
}

const cwd = process.cwd();
const home = homedir();

/* default: detect which agents already have a config dir in this project */
if (!picked && !all) {
  picked = Object.entries(AGENTS).filter(([, a]) => existsSync(join(isGlobal ? home : cwd, isGlobal && a.globalDir ? a.globalDir : a.dir))).map(([id]) => id);
  if (!picked.length) {
    console.log('No coding-agent folders found in ' + (isGlobal ? home : cwd) + ' (.claude, .cursor, .agents, .github, .gemini, .opencode).');
    console.log('Pick agents explicitly:  node install.mjs --agents=claude,cursor,codex');
    process.exit(1);
  }
}
if (all) picked = Object.keys(AGENTS);

let installed = 0;
for (const id of picked) {
  const a = AGENTS[id];
  if (isGlobal && !a.global) { console.log(`- ${id}: no global skills folder, skipped (project install only)`); continue; }
  const base = join(isGlobal ? home : cwd, isGlobal && a.globalDir ? a.globalDir : a.dir, 'skills', 'ungeneric');
  mkdirSync(base, { recursive: true });
  for (const f of SKILL_FILES) copyFileSync(join(HERE, f), join(base, f));
  console.log(`+ ${id}: installed ${SKILL_FILES.length} files -> ${base}`);
  console.log(`    invoke with: ${a.invoke} (or "use ungeneric on <file>")`);
  installed++;
}
if (installed) {
  console.log('\nDone. Reload your coding agent, then say: use ungeneric on <your page.html>');
  const first = picked.find(p => !isGlobal || AGENTS[p].global);
  if (first) { const fa = AGENTS[first]; console.log('Test the install:  node ' + join(isGlobal ? home : cwd, isGlobal && fa.globalDir ? fa.globalDir : fa.dir, 'skills', 'ungeneric', 'cli.mjs') + ' --help'); }
}
