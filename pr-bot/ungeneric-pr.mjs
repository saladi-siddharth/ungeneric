#!/usr/bin/env node
/* Ungeneric PR bot - LOCAL ONLY.
 * Audits changed HTML files from a pull request and writes a review comment
 * body to stdout (or --out file). It never talks to the network: wiring it to
 * the GitHub API is the repo owner's choice, later.
 *
 * Usage:
 *   node pr-bot/ungeneric-pr.mjs file1.html file2.html ...
 *   node pr-bot/ungeneric-pr.mjs --diff origin/main...HEAD     (uses git diff)
 *   node pr-bot/ungeneric-pr.mjs page.html --badge badge.svg --out comment.md
 *   node pr-bot/ungeneric-pr.mjs page.html --fail-above 50     (exit 1 if worse)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { detect, severity } from '../engine.js';

const args = process.argv.slice(2);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const has = (f) => args.includes(f);

let files = args.filter(a => !a.startsWith('--') && a !== opt('--out') && a !== opt('--badge') && a !== opt('--fail-above') && a !== opt('--diff'));
if (has('--diff')) {
  const range = opt('--diff');
  const out = execSync(`git diff --name-only --diff-filter=ACM ${range}`, { encoding: 'utf8' });
  files = out.split('\n').filter(f => /\.html?$/i.test(f)).filter(Boolean);
}
if (!files.length) { console.error('no HTML files to audit. pass files or --diff <range>'); process.exit(2); }

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function badgeSVG(score) {
  const color = score >= 50 ? '#e05d44' : score >= 22 ? '#dfb317' : '#4c1';
  const label = 'slop score';
  const value = score + '/100';
  const lw = 62, vw = 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + vw}" height="20" role="img" aria-label="${label}: ${value}"><title>${label}: ${value}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${lw + vw}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><rect width="${lw + vw}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="${lw * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${lw * 10 - 100}">${label}</text><text x="${lw * 5}" y="140" transform="scale(.1)" fill="#fff" textLength="${lw * 10 - 100}">${label}</text><text aria-hidden="true" x="${(lw + vw / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${vw * 10 - 100}">${value}</text><text x="${(lw + vw / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${vw * 10 - 100}">${value}</text></g></svg>`;
}

const results = [];
for (const f of files) {
  let html;
  try { html = readFileSync(f, 'utf8'); } catch { results.push({ file: f, error: 'unreadable' }); continue; }
  const d = detect(html);
  results.push({ file: f, score: d.score, sev: severity(d.score), findings: d.findings });
}

const audited = results.filter(r => !r.error);
const worst = audited.length ? Math.max(...audited.map(r => r.score)) : 0;
const avg = audited.length ? Math.round(audited.reduce((s, r) => s + r.score, 0) / audited.length) : 0;

let md = `## Ungeneric report\n\n`;
md += `**Slop score: ${worst}/100** (worst file) · average ${avg}/100 across ${audited.length} HTML file${audited.length === 1 ? '' : 's'}\n\n`;
md += `| File | Score | Verdict |\n| --- | ---: | --- |\n`;
for (const r of results) md += r.error ? `| \`${r.file}\` | - | unreadable |\n` : `| \`${r.file}\` | ${r.score}/100 | ${r.sev.label} |\n`;
const worstFile = audited.find(r => r.score === worst);
if (worstFile && worstFile.findings.length) {
  md += `\n<details><summary>Top findings in <code>${esc(worstFile.file)}</code></summary>\n\n`;
  for (const f of worstFile.findings.slice(0, 6)) md += `- **${f.label}**${f.count > 1 ? ' x' + f.count : ''} - ${f.why}\n`;
  md += `\n</details>\n`;
}
md += `\n_Run \`node cli.mjs <file> -d <direction> --verify\` locally to fix and prove the fix. Heuristic, not a judgment._\n`;

if (has('--out') || opt('--out')) writeFileSync(opt('--out') || 'ungeneric-comment.md', md);
if (has('--badge') || opt('--badge')) writeFileSync(opt('--badge') || 'ungeneric-badge.svg', badgeSVG(worst));
process.stdout.write(md);
const limit = opt('--fail-above');
if (limit != null && worst > Number(limit)) { console.error(`FAIL: worst score ${worst} exceeds ${limit}`); process.exit(1); }
