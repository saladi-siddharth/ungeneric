/* render-audit.mjs - computed-style audit: renders a page in headless Chromium and
   measures what the CSS actually produced, catching what source heuristics cannot
   (tracked-caps in any declaration order, real font stacks, shadow soup, tiny text,
   low contrast, endless animations in computed form).

   Optional: needs puppeteer (npm i puppeteer). The engine and CLI work without it.

   Usage:
     node render-audit.mjs <file.html|https://url> [--json]
     node render-audit.mjs <file.html|https://url> --annotate report.png
     import { renderAudit } from './render-audit.mjs'  (returns findings like detect())
     import { annotateReport } from './render-audit.mjs'  (screenshot + numbered markers)
*/
import { readFileSync } from 'node:fs';

const SOURCE_ONLY = new Set(['stock-copy', 'caps', 'exclaim', 'badge-sparkle', 'ai-powered', 'greeting', 'stock-hero']);
const RECT_CAP = 12; /* per check, during collection */

/* runs inside the page. withRects=true also records where each offender is (document coords) */
function measurePage(withRects) {
  const els = [...document.querySelectorAll('body *')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  const text = (el) => (el.innerText || '').trim();
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const R = { trackedCaps: [], monoLabels: [], tiny: [], infinite: [], gradients: [], lowContrast: [], shadowed: [], rounded: [], stranded: [] };
  /* counters are independent of rect collection: scores must not depend on withRects */
  const N = { trackedCaps: 0, monoLabels: 0, tiny: 0, infinite: 0, lowContrast: 0, stranded: 0 };
  const fontSizes = [];
  const push = (k, el, note) => { N[k]++; if (withRects && R[k].length < 12) R[k].push({ ...rectOf(el), note: (note || '').slice(0, 60) }); };
  const families = new Set(), shadows = new Map(), radii = new Map();
  let gradients = 0, leafText = 0;
  const GENERIC = /^(system-ui|sans-serif|serif|monospace|ui-sans-serif|ui-serif|ui-monospace|arial|helvetica|times new roman|georgia|-apple-system)$/i;
  const MONO = /mono|code|console|courier|terminal/i;
  const lum = (rgb) => {
    const m2 = rgb.match(/[\d.]+/g); if (!m2 || m2.length < 3) return 1;
    const [r2, g, b] = m2.slice(0, 3).map(v => { const c = parseFloat(v) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    return 0.2126 * r2 + 0.7152 * g + 0.0722 * b;
  };
  for (const el of els.slice(0, 4000)) {
    const cs = getComputedStyle(el);
    const t = text(el);
    cs.fontFamily.split(',').forEach(f => families.add(f.trim().replace(/['"]/g, '')));
    /* tracked caps, proportional: uppercase with tracking beyond 0.08em (sloplint's T3 bar) */
    if (cs.textTransform === 'uppercase' && t && t.length < 80 && (parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize)) > 0.08) push('trackedCaps', el, t);
    if (parseFloat(cs.fontSize) > 0 && parseFloat(cs.fontSize) < 11 && t.length > 3 && !/^(sup|sub)$/i.test(el.tagName)) push('tiny', el, cs.fontSize + ' "' + t.slice(0, 30) + '"');
    /* marquee and caret blink are functional, not decoration */
    if (cs.animationIterationCount === 'infinite' && cs.animationName !== 'none' && !/ugMarq|ugCaret/i.test(cs.animationName)) push('infinite', el, cs.animationName);
    if (/gradient/i.test(cs.backgroundImage)) { gradients++; if (withRects && R.gradients.length < 12) R.gradients.push({ ...rectOf(el), note: cs.backgroundImage.slice(0, 40) }); }
    /* flat hard-offset shadows (zero blur) are a graphic device, not elevation; soup counts blurred shadows */
    if (cs.boxShadow !== 'none' && !/^[^)]*\)\s*-?\d+px\s+-?\d+px\s+0px/.test(cs.boxShadow)) {
      shadows.set(cs.boxShadow, (shadows.get(cs.boxShadow) || 0) + 1);
      if (withRects && R.shadowed.length < 12) R.shadowed.push({ ...rectOf(el), note: cs.boxShadow.slice(0, 40) });
    }
    const br = cs.borderTopLeftRadius;
    if (br && br !== '0px') { radii.set(br, (radii.get(br) || 0) + 1); if (withRects && R.rounded.length < 12) R.rounded.push({ ...rectOf(el), note: br }); }
    /* mono is earned on data (stats, figures, captions, indices); it is a costume on chrome */
    const dataRole = /\b(lbl|num|cap|fig|tol|idx|val|fno)\b|ug-scene-x|ug-scene-cap|ug-index/.test(String(el.className)) || el.closest('.ug-stat, .ug-ro, .ug-stats, [class*=stat], .ug-scene, .ug-media');
    if (MONO.test(cs.fontFamily) && t && t.length <= 40 && el.children.length === 0 && parseFloat(cs.fontSize) <= 14 && !dataRole) push('monoLabels', el, t);
    if (t && el.children.length === 0) { leafText++; fontSizes.push(parseFloat(cs.fontSize)); }
    /* contrast of real text against its effective background */
    if (t && t.length > 12 && el.children.length === 0) {
      let bg = cs.backgroundColor, p = el.parentElement;
      while ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && p) { bg = getComputedStyle(p).backgroundColor; p = p.parentElement; }
      const l1 = lum(cs.color), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < 3 && parseFloat(cs.fontSize) < 18) push('lowContrast', el, ratio.toFixed(2) + ':1 "' + t.slice(0, 30) + '"');
    }
  }
  const famArr = [...families].filter(f => !GENERIC.test(f));
  const bodyMono = MONO.test(getComputedStyle(document.body).fontFamily);
  /* flat type scale: many distinct sizes a pixel or two apart instead of a few clear steps */
  const distinctSizes = [...new Set(fontSizes.map(s => Math.round(s * 2) / 2))].sort((a, b) => a - b);
  let nearPairs = 0;
  for (let i = 1; i < distinctSizes.length; i++) if (distinctSizes[i] - distinctSizes[i - 1] <= 2) nearPairs++;
  const flatScale = distinctSizes.length >= 8 && nearPairs / (distinctSizes.length - 1) >= 0.5 ? distinctSizes.length : 0;
  /* stranded last word: a multi-line heading whose final line holds a single word */
  for (const h of [...document.querySelectorAll('h1,h2,h3')].slice(0, 12)) {
    const words = [];
    const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = tw.nextNode())) {
      const parts = tn.textContent.split(/(\s+)/);
      let off = 0;
      for (const part of parts) {
        if (!part.trim()) { off += part.length; continue; }
        const rg = document.createRange();
        rg.setStart(tn, off); rg.setEnd(tn, off + part.length);
        const rects = rg.getClientRects();
        if (rects.length) words.push({ top: Math.round(rects[0].top), w: part });
        off += part.length;
      }
    }
    if (words.length < 4) continue;
    /* group words into visual lines with vertical tolerance: rotated or shifted spans
       inside a heading jitter rect tops by a few px without changing the line */
    const tol = parseFloat(getComputedStyle(h).fontSize) * 0.5;
    const lineCounts = [];
    for (const w of words) {
      const line = lineCounts.find(l => Math.abs(l.top - w.top) <= tol);
      if (line) line.n++;
      else lineCounts.push({ top: w.top, n: 1 });
    }
    lineCounts.sort((a, b) => a.top - b.top);
    if (lineCounts.length >= 2 && lineCounts[lineCounts.length - 1].n === 1) {
      N.stranded++;
      if (withRects && R.stranded.length < 12) R.stranded.push({ ...rectOf(h), note: '"' + (h.innerText || '').trim().slice(0, 40) + '"' });
    }
  }
  return {
    families: famArr, onlyGeneric: famArr.length === 0,
    trackedCaps: N.trackedCaps, monoLabels: N.monoLabels, tiny: N.tiny,
    infinite: N.infinite, gradients, lowContrast: N.lowContrast, leafText, bodyMono, flatScale, stranded: N.stranded,
    shadowCount: [...shadows.values()].reduce((a, b) => a + b, 0),
    shadowKinds: shadows.size,
    radiusKinds: radii.size, radiusCount: [...radii.values()].reduce((a, b) => a + b, 0),
    reducedMotion: !!document.querySelector('style') && [...document.querySelectorAll('style')].some(s => /prefers-reduced-motion/.test(s.textContent)),
    hasMotionCss: [...document.querySelectorAll('style')].some(s => /@keyframes|transition/.test(s.textContent)) || N.infinite > 0,
    offenders: withRects ? R : undefined,
  };
}

/* shared findings builder; attaches offender rects to findings when measured.offenders exists */
function findingsFromMeasured(m) {
  const F = [];
  const off = m.offenders || {};
  const add = (id, label, why, count, weight, rects) => {
    if (count > 0) F.push({ id, label, why, count, weight: weight * Math.min(count, 4), source: 'rendered', offenders: rects && rects.length ? rects : undefined });
  };
  if (m.onlyGeneric) add('default-font', 'Default system font stack', 'The rendered page resolves only system fonts. Inter, Roboto and system stacks are the AI default.', 1, 4);
  add('tracked-caps', 'Uppercase wide-tracked labels', 'The tracked-caps eyebrow label is on every AI landing page. Quiet labels or none.', m.trackedCaps, 3, off.trackedCaps);
  /* costume = mono sprinkled on chrome of a page whose body voice is not mono; a mono-bodied page is a system */
  add('mono-costume', 'Monospace as a costume', 'Mono labels sprinkled for a techy feel is a costume, not a system. Mono earns its place in code and data.', (!m.bodyMono && m.monoLabels >= 3) ? m.monoLabels : 0, 2, off.monoLabels);
  add('tiny-text', 'Text below readable size', 'Rendered text under 11px is unreadable furniture, usually fake-chart labels.', m.tiny >= 4 ? m.tiny : 0, 2, off.tiny);
  add('loop-motion', 'Motion that loops forever', 'Pulsing, pinging and bouncing on things that are not live is template noise. Motion should explain something.', m.infinite, 5, off.infinite);
  add('any-gradient', 'Decorative gradients', 'Gradient washes that carry no information. Flat surfaces and one accent commit.', m.gradients >= 3 ? m.gradients : 0, 4, off.gradients);
  add('elevation-soup', 'A different shadow on everything', m.shadowKinds + ' distinct shadows. Elevation is a scale of two or three stops, not a spice rack.', m.shadowKinds >= 4 ? 1 : 0, 3, off.shadowed);
  add('shadow-everything', 'Shadows on everything', 'When every surface floats, nothing does. Borders and spacing first, shadows last.', m.shadowCount >= 12 ? 1 : 0, 3, off.shadowed);
  add('one-radius', 'One border radius on everything', 'A single radius regardless of hierarchy is a template value, not a choice.', (m.radiusKinds === 1 && m.radiusCount >= 6) ? 1 : 0, 3, off.rounded);
  add('low-contrast', 'Low-contrast text', 'Rendered text under a 3:1 contrast ratio. Designed pages are readable first.', m.lowContrast >= 4 ? m.lowContrast : 0, 4, off.lowContrast);
  add('flat-type-scale', 'Many near-equal font sizes', m.flatScale + ' sizes a pixel or two apart. A type scale is a few clearly separated steps, not a gradient of indecision.', m.flatScale, 3);
  add('stranded-word', 'Stranded last word in a heading', 'A multi-line heading whose last line holds one word looks untyped. Rewrap or retune the measure.', m.stranded, 2, off.stranded);
  if (m.hasMotionCss && !m.reducedMotion) add('no-reduced-motion', 'Motion without a reduced-motion path', 'Animations with no prefers-reduced-motion fallback exclude people who need stillness.', 1, 3);
  return F.sort((a, b) => b.weight - a.weight);
}

async function loadPage(browser, input, timeout) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  if (/^https?:\/\//i.test(input)) await page.goto(input, { waitUntil: 'domcontentloaded', timeout });
  else await page.setContent(readFileSync(input, 'utf8'), { waitUntil: 'domcontentloaded', timeout });
  await new Promise(r => setTimeout(r, 2500));
  return page;
}

export async function renderAudit(input, { timeout = 30000, collect = false } = {}) {
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer) return { findings: [], skipped: 'puppeteer not installed - run npm i puppeteer for the rendered audit' };
  const browser = await puppeteer.default.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
  try {
    const page = await loadPage(browser, input, timeout);
    const m = await page.evaluate(measurePage, collect);
    return { findings: findingsFromMeasured(m), measured: m };
  } finally {
    await browser.close();
  }
}

const MARKER_COLORS = ['#e5484d', '#f76b15', '#ffc53d', '#46a758', '#3e63dd', '#8e4ec6', '#d6409f', '#12a594', '#e93d82', '#6d56cf', '#ad5700', '#0081f1'];
const MARKERS_PER_FINDING = 8;
const TOTAL_MARKER_CAP = 40;

/* annotateReport(input, outPng): full-page screenshot of the page with numbered
   markers on every element a finding blames, plus a legend panel. Returns findings. */
export async function annotateReport(input, outPng, { timeout = 30000 } = {}) {
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer) return { findings: [], skipped: 'puppeteer not installed - run npm i puppeteer for the rendered audit' };
  const browser = await puppeteer.default.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
  try {
    const page = await loadPage(browser, input, timeout);
    const m = await page.evaluate(measurePage, true);
    const findings = findingsFromMeasured(m);
    /* freeze motion so the capture is at rest */
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await new Promise(r => setTimeout(r, 400));

    let budget = TOTAL_MARKER_CAP;
    const markers = [];
    findings.forEach((f, fi) => {
      const rects = (f.offenders || []).slice(0, MARKERS_PER_FINDING);
      for (const r of rects) {
        if (budget <= 0) break;
        markers.push({ ...r, n: fi + 1, color: MARKER_COLORS[fi % MARKER_COLORS.length] });
        budget--;
      }
    });
    const legend = findings.map((f, fi) => ({ n: fi + 1, color: MARKER_COLORS[fi % MARKER_COLORS.length], label: f.label, count: f.count, marked: Math.min((f.offenders || []).length, MARKERS_PER_FINDING) }));

    await page.evaluate((markers2, legend2) => {
      const host = document.createElement('div');
      host.id = 'ug-annotate-host';
      host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;font-family:ui-monospace,Menlo,monospace;';
      for (const mk of markers2) {
        const box = document.createElement('div');
        box.style.cssText = `position:absolute;left:${mk.x - 2}px;top:${mk.y - 2}px;width:${mk.w + 4}px;height:${mk.h + 4}px;border:2px solid ${mk.color};background:${mk.color}22;box-sizing:border-box;`;
        const tag = document.createElement('div');
        tag.textContent = mk.n;
        tag.title = mk.note || '';
        const tagTop = mk.y < 24 ? '2px' : '-20px';
        tag.style.cssText = `position:absolute;left:-2px;top:${tagTop};min-width:18px;height:18px;line-height:18px;padding:0 4px;background:${mk.color};color:#fff;font-size:12px;font-weight:700;text-align:center;border-radius:3px;`;
        box.appendChild(tag);
        host.appendChild(box);
      }
      if (legend2.length) {
        const panel = document.createElement('div');
        const docW = document.documentElement.scrollWidth;
        panel.style.cssText = `position:absolute;left:${Math.max(0, docW - 384)}px;top:12px;width:360px;background:rgba(12,12,14,.92);color:#eee;padding:12px 14px;border-radius:8px;pointer-events:none;line-height:1.45;`;
        const title = document.createElement('div');
        title.textContent = 'Ungeneric rendered audit';
        title.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:.06em;margin-bottom:8px;color:#fff;';
        panel.appendChild(title);
        for (const lg of legend2) {
          const row = document.createElement('div');
          row.style.cssText = 'font-size:12px;margin:3px 0;display:flex;gap:7px;align-items:baseline;';
          const chip = document.createElement('span');
          chip.textContent = lg.n;
          chip.style.cssText = `flex:0 0 auto;min-width:16px;height:16px;line-height:16px;background:${lg.color};color:#fff;font-weight:700;font-size:11px;text-align:center;border-radius:3px;padding:0 3px;`;
          const txt = document.createElement('span');
          txt.textContent = lg.label + ' x' + lg.count + (lg.count > lg.marked ? ' (' + lg.marked + ' marked)' : '');
          row.appendChild(chip); row.appendChild(txt);
          panel.appendChild(row);
        }
        host.appendChild(panel);
      }
      document.body.appendChild(host);
    }, markers, legend);

    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({ path: outPng, fullPage: true });
    return { findings, measured: m, image: outPng, legend };
  } finally {
    await browser.close();
  }
}

/* CLI */
if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.argv[2];
  if (!input) { console.log('usage: node render-audit.mjs <file.html|https://url> [--json] [--annotate report.png]'); process.exit(1); }
  const ai = process.argv.indexOf('--annotate');
  if (ai >= 0) {
    const out = process.argv[ai + 1] || 'ungeneric-annotated.png';
    const r = await annotateReport(input, out);
    if (r.skipped) { console.log('skipped:', r.skipped); process.exit(0); }
    console.log('Annotated report -', input);
    if (!r.findings.length) console.log('  no rendered tells found - clean capture written');
    for (const f of r.findings) console.log(' ', String(f.weight).padStart(3), '#' + (r.findings.indexOf(f) + 1), f.label, 'x' + f.count, '-', f.why);
    console.log('  image ->', out);
  } else {
    const r = await renderAudit(input);
    if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
    else {
      if (r.skipped) { console.log('skipped:', r.skipped); process.exit(0); }
      console.log('Rendered audit -', input);
      if (!r.findings.length) console.log('  no rendered tells found');
      for (const f of r.findings) console.log(' ', String(f.weight).padStart(3), f.label, 'x' + f.count, '-', f.why);
    }
  }
}
