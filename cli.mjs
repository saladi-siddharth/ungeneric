#!/usr/bin/env node
/* Ungeneric CLI - audit and unslop AI-looking UI from any terminal.
 * Usage:
 *   node cli.mjs page.html                     audit a file
 *   node cli.mjs https://example.com           audit a live page
 *   node cli.mjs page.html -d swiss -o out.html   restyle with a direction
 *   node cli.mjs page.html --polish -o out.html   polish mode (keep design, strip tells)
 *   node cli.mjs page.html --json              machine-readable audit
 * Directions: editorial | brutalist | swiss | night   (auto-picked if omitted)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readFileSync as rfs, existsSync } from 'node:fs';
import { detect, restyle, polish, severity, recommend, DIRECTIONS, registerDirection, listDirections, verify, recompose, hasCompose } from './engine.js';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Ungeneric CLI\n  node cli.mjs <file.html|https://url> [-d direction] [--polish] [-o out.html] [--verify] [--json] [--render] [--annotate report.png] [--max-score N] [--fx subtle|full|off] [--fx-packs a,b,c] [--no-recompose]\n  --render also audits computed styles in a real browser (needs puppeteer). --annotate writes a screenshot with numbered markers on the blamed elements. --max-score N exits 2 when the score exceeds N (CI gate).\n  heavy-slop pages with a composed direction (editorial/brutalist/night) are rebuilt into a new layout by default; --no-recompose forces a reskin.');
  process.exit(args.length ? 0 : 1);
}
const input = args[0] && !args[0].startsWith('--') ? args[0] : null;
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const has = (f) => args.includes(f);

if (has('--directions')) {
  for (const d of listDirections()) console.log(`${d.builtin ? '*' : ' '} ${d.id.padEnd(12)} ${d.name} - ${d.hint}${d.author && !d.builtin ? '  (by ' + d.author + ')' : ''}`);
  process.exit(0);
}
if (!input) { console.error('give me a file or a URL'); process.exit(1); }
let html;
if (/^https?:\/\//.test(input)) {
  const res = await fetch(input, { headers: { 'user-agent': 'ungeneric-cli/3 (+local audit tool)' } });
  if (!res.ok) { console.error(`fetch failed: HTTP ${res.status} for ${input}`); process.exit(2); }
  html = await res.text();
} else {
  html = readFileSync(input, 'utf8');
  /* framework sources: audit the markup the component renders, not the JSX spellings */
  if (/\.(jsx|tsx|vue|svelte|astro)$/i.test(input)) {
    html = html.replace(/\bclassName\s*=/g, 'class=').replace(/\bhtmlFor\s*=/g, 'for=');
    console.error('(framework source: auditing rendered-markup patterns in ' + input.split('/').pop() + ')');
  }
}

const d = detect(html);
const sev = severity(d.score);

/* --render: audit the COMPUTED styles in a real browser, not just the source.
   Catches what source scanning cannot (injected CSS, declaration order, inheritance). */
let rendered = null;
if (has('--render') || has('--annotate')) {
  const anno = opt('--annotate');
  const { renderAudit, annotateReport } = await import('./render-audit.mjs');
  rendered = anno ? await annotateReport(input, anno) : await renderAudit(input);
  if (anno && !rendered.skipped) console.log(`annotated report -> ${anno} (${rendered.findings.length} rendered findings marked)`);
  if (!rendered.skipped) {
    const seen = new Set(d.findings.map(f => f.id));
    for (const f of rendered.findings) if (!seen.has(f.id)) d.findings.push(f);
    d.findings.sort((a, b) => b.weight - a.weight);
    d.score = Math.min(100, d.score + rendered.findings.filter(f => !seen.has(f.id)).reduce((a, f) => a + f.weight, 0));
  }
}

const maxScore = opt('--max-score') !== null ? parseInt(opt('--max-score'), 10) : null;
if (has('--json')) {
  console.log(JSON.stringify({ input, score: d.score, severity: sev.mode, recommend: recommend(html), findings: d.findings, rendered: rendered ? (rendered.skipped ? { skipped: rendered.skipped } : { findings: rendered.findings, measured: rendered.measured }) : undefined }, null, 2));
  process.exit(maxScore !== null && d.score > maxScore ? 2 : 0);
}

console.log(`\nUngeneric audit - ${input}`);
console.log(`Slop score: ${d.score}/100   (${sev.label})`);
console.log(`Suggested direction: ${DIRECTIONS[recommend(html)].name}\n`);
for (const f of d.findings)
  console.log(`  ${String(f.weight).padStart(3)}  ${f.label}${f.count > 1 ? ' x' + f.count : ''}${f.source === 'rendered' ? '  [rendered]' : ''}\n      ${f.why}`);
if (!d.findings.length) console.log('  no known slop patterns found.');
if (rendered && rendered.skipped) console.log(`  (rendered audit skipped: ${rendered.skipped})`);

let dir = opt('-d') || opt('--direction');
if (dir && (dir.endsWith('.json') || existsSync(dir))) {
  const def = registerDirection(JSON.parse(rfs(dir, 'utf8')));
  dir = def.id;
}
if (dir && !listDirections().some(d2 => d2.id === dir)) {
  console.error(`unknown direction '${dir}'. Known: ` + listDirections().map(d2 => d2.id).join(', '));
  process.exit(1);
}
const out = opt('-o');
if (dir || has('--polish') || out) {
  const fxArg = opt('--fx');
  const fxPacks = opt('--fx-packs');
  const fx = fxArg === 'off' ? { off: true } : (fxArg || fxPacks ? { intensity: fxArg === 'subtle' ? 'subtle' : 'full', packs: fxPacks ? fxPacks.split(',') : undefined } : undefined);
  const picked = dir || recommend(html);
  const result = has('--polish') || (sev.mode === 'light' && !dir)
    ? polish(html)
    : (sev.mode === 'heavy' && hasCompose(picked) && !has('--no-recompose'))
      ? recompose(html, picked, fx ? { fx } : {})
      : restyle(html, picked, fx ? { fx } : {});
  const target = out || 'ungeneric-output.html';
  writeFileSync(target, result.html);
  console.log(`\n${result.mode === 'polish' ? 'Polished' : result.mode === 'recompose' ? 'Recomposed' : 'Restyled'} -> ${target}`);
  for (const f of result.fixes) console.log('  * ' + f);
  if (has('--verify')) {
    const v = verify(html, result.html);
    const mark = v.improved ? 'VERIFIED' : 'NOT IMPROVED';
    console.log(`\nVerification - ${mark}`);
    console.log(`  score: ${v.before} -> ${v.after}  (delta ${v.delta})`);
    if (v.kept.length) console.log(`  kept (needs content work, not CSS): ${v.kept.map(f => f.id + (f.count > 1 ? ' x' + f.count : '')).join(', ')}`);
    if (v.stillBad.length) {
      console.log(`  STILL SLOPPY (fix before shipping): ${v.stillBad.map(f => f.id + (f.count > 1 ? ' x' + f.count : '')).join(', ')}`);
    } else {
      console.log('  no slop re-detected in output.');
    }
    if (!v.improved || v.stillBad.length) process.exitCode = 3;
  }
}
if (maxScore !== null && d.score > maxScore) {
  console.log(`\nCI gate: score ${d.score} exceeds --max-score ${maxScore}`);
  process.exit(2);
}
console.log('');
