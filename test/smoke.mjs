// Ungeneric smoke test: audit -> rebuild -> re-audit must measurably improve,
// output must be a complete HTML document. Exits non-zero on any failure.
import { detect, restyle, recompose, polish, recommend, extract, registerDirection, listDirections, severity, SAMPLE } from '../engine.js';
import { readFileSync, readdirSync } from 'node:fs';

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log((cond ? '  ok  ' : 'FAIL  ') + name + (detail ? '  (' + detail + ')' : ''));
  if (!cond) failures++;
};

// load the full direction library the way the CLI does
for (const f of readdirSync(new URL('../directions/', import.meta.url))) {
  if (f.endsWith('.json')) registerDirection(JSON.parse(readFileSync(new URL('../directions/' + f, import.meta.url), 'utf8')));
}
const dirs = listDirections();
check('16 directions registered', dirs.length === 16, dirs.length + ' found');

// 1. built-in sample: heavy slop detected
const a = detect(SAMPLE);
check('sample audit finds slop', a.score >= 50, 'score ' + a.score);
check('sample audit returns findings', a.findings.length > 3, a.findings.length + ' findings');

// 2. every direction: recompose (falls back to restyle) lowers the score, full document out
for (const d of dirs) {
  let r;
  try { r = recompose(SAMPLE, d.id, {}); } catch (e) { check('recompose ' + d.id, false, e.message); continue; }
  const out = r.html || r;
  const b = detect(out);
  check('recompose ' + d.id + ' lowers score', b.score < a.score, a.score + ' -> ' + b.score);
  check('recompose ' + d.id + ' is a full document', /<!doctype html>/i.test(out) && out.includes('</html>'));
}

// 3. recommend() returns a known direction
const rec = recommend(SAMPLE);
check('recommend returns a known direction', dirs.some(d => d.id === rec), rec);

// 4. real-world fixtures: must compose without throwing and not get worse
for (const f of ['stripe_com', 'example_com']) {
  let html;
  try { html = readFileSync(new URL('../rwtest/' + f + '-before.html', import.meta.url), 'utf8'); }
  catch { console.log('skip  rwtest/' + f + ' (fixture missing)'); continue; }
  const before = detect(html);
  if (severity(before.score).mode === 'none') {
    // product behavior: clean pages are left alone
    check('real page ' + f + ' read as clean and left alone', before.score <= 5, 'score ' + before.score);
    continue;
  }
  let r;
  try { r = recompose(html, recommend(html), {}); } catch (e) { check('real page ' + f, false, e.message); continue; }
  const after = detect(r.html || r);
  check('real page ' + f + ' improves', after.score <= before.score, before.score + ' -> ' + after.score);
}

// 5. extract() pulls the content slots the recomposer needs
const ex = extract(SAMPLE);
check('extract finds a headline', !!(ex && (ex.h1 || ex.headline)), Object.keys(ex || {}).slice(0, 8).join(','));

// 6. polish mode keeps the page intact
const p = polish(SAMPLE);
const ph = p.html || p;
check('polish returns a full document', /<!doctype html>/i.test(ph) && ph.includes('</html>'));

console.log(failures ? '\n' + failures + ' FAILURES' : '\nall checks passed');
process.exit(failures ? 1 : 0);
