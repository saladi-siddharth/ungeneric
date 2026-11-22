import { detect, restyle, polish, severity, recommend, SAMPLE, registerDirection, listDirections, getDirection, verify, recompose, hasCompose, setReferenceStyle } from './engine.js';

const $ = (id) => document.getElementById(id);
let direction = 'editorial';
let outHtml = null;
let lastAudit = null;
let pageUrl = null; /* the real URL behind the current source, when fetched */

/* Hide the rebuilt page's own floating controls in the small preview panes;
   they stay in the exported/opened file. */
function previewHtml(html) {
  const css = '<style>#ug-theme,.ug-flip{display:none!important}</style>';
  return html.includes('</head>') ? html.replace('</head>', css + '</head>') : html + css;
}

function showPane(frame, empty, html) {
  if (html == null) { frame.style.display = 'none'; empty.style.display = 'flex'; return; }
  empty.style.display = 'none';
  frame.style.display = 'block';
  frame.srcdoc = previewHtml(html);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

function renderFindings(r) {
  $('scoreBox').style.display = 'flex';
  $('scoreN').textContent = r.score;
  $('scoreLbl').textContent = r.score >= 60 ? 'heavily vibecoded' : r.score >= 30 ? 'pretty generic' : r.score > 0 ? 'mildly templated' : 'no slop found';
  const sev = severity(r.score);
  const mb = $('modeBox');
  mb.style.display = 'block';
  mb.innerHTML = `<b>${sev.mode}</b> — ${sev.label.replace(/^[A-Za-z ]+ - /, '')}`;
  const box = $('findings');
  box.innerHTML = '';
  r.findings.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'finding';
    d.style.animationDelay = (i * 0.04) + 's';
    d.innerHTML = `<b>${f.label}${f.count > 1 ? ' x' + f.count : ''}<span class="w">${f.weight}</span></b><span class="why">${f.why}</span>`;
    box.appendChild(d);
  });
  if (!r.findings.length) box.innerHTML = '<div class="finding"><b>Clean</b><span class="why">No known slop patterns found.</span></div>';
}

function runAudit() {
  const html = $('src').value.trim();
  if (!html) { toast('paste some HTML first'); return null; }
  $('verifyChip').style.display = 'none'; /* a new audit retires the previous verdict */
  const r = detect(html);
  lastAudit = { html, ...r };
  renderFindings(r);
  const rec = recommend(html);
  direction = rec; markDir();
  renderDirList(rec);
  showPane($('beforeFrame'), $('beforeEmpty'), html);
  /* when the page came from a live URL, show that URL with the before/after */
  const host = pageUrl ? pageUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '';
  $('beforeMeta').textContent = host ? host + ' · ' + (html.length / 1024).toFixed(1) + ' KB' : (html.length / 1024).toFixed(1) + ' KB';
  return r;
}

$('sample').addEventListener('click', () => {
  pageUrl = null;
  $('src').value = SAMPLE;
  runAudit();
});
$('audit').addEventListener('click', runAudit);

/* ---- direction library ---- */
const FONT_SETS = { editorial:'Fraunces · Newsreader', brutalist:'Space Grotesk · mono', swiss:'Archivo tight', night:'IBM Plex Mono', blueprint:'Space Grotesk · mono', botanical:'Fraunces · Newsreader', zine:'mono · Grotesk', construct:'Archivo black', noir:'Archivo Narrow · mono', memphis:'Archivo Black · Grotesk', letterpress:'Fraunces · Courier', neon:'Space Grotesk · mono', bauhaus:'Archivo 900', riso:'Archivo 900', arcade:'IBM Plex Mono', mono:'Courier Prime' };
const SWATCH_FALLBACK = { editorial:['#f6f1e6','#17150f','#b7410f'], brutalist:['#f2f2ee','#101010','#d8f34e'], swiss:['#ffffff','#111111','#e2001a'], night:['#0f0f0c','#3a382e','#ffb000'] };

function persistImported() {
  const imp = listDirections().filter(d => !d.builtin && !['blueprint','botanical','zine','construct','noir','memphis','letterpress','neon','bauhaus','riso','arcade','mono'].includes(d.id));
  localStorage.setItem('ug-imported-dirs', JSON.stringify(imp.map(d => getDirection(d.id))));
}
function restoreImported() {
  try { for (const def of JSON.parse(localStorage.getItem('ug-imported-dirs') || '[]')) registerDirection(def); } catch {}
}

function renderDirList(rec) {
  const list = $('dirList');
  list.innerHTML = '';
  const dirs = listDirections();
  $('dirCount').textContent = dirs.length + ' systems';
  $('dirCountTop').textContent = dirs.length;
  dirs.forEach((d, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'dirwrap';
    const sw = (d.swatches && d.swatches.length ? d.swatches : SWATCH_FALLBACK[d.id] || ['#fff','#000','#888']);
    wrap.innerHTML = `<span class="rec" data-for="${d.id}">suggested</span>
      <button class="dir" data-dir="${d.id}"><span><span class="mono">${d.builtin ? String.fromCharCode(65 + i) : (d.author === 'ungeneric' ? 'community' : 'yours')} · ${FONT_SETS[d.id] || 'custom'}</span>${d.name}</span><span class="swatches">${sw.map(c => `<i style="background:${c}"></i>`).join('')}</span></button>`;
    list.appendChild(wrap);
  });
  list.querySelectorAll('button.dir').forEach(b => {
    b.addEventListener('click', () => { direction = b.dataset.dir; markDir(); });
    if (b.dataset.dir === direction) b.classList.add('on');
  });
  if (rec) { const badge = list.querySelector(`.rec[data-for="${rec}"]`); if (badge) badge.style.display = 'block'; }
}
function markDir() {
  document.querySelectorAll('button.dir').forEach(x => x.classList.toggle('on', x.dataset.dir === direction));
  $('exportDir').disabled = false;
  syncFxPicker();
}

/* ---- effects picker ---- */
const FX_PACKS = ['progress', 'navfx', 'story', 'split', 'scramble', 'tilt', 'marquee', 'parallax', 'magnetic', 'cursor', 'theme'];
const FX_LABELS = { progress: 'scroll progress', navfx: 'animated nav', story: 'storytelling', split: 'split type', scramble: 'text scramble', tilt: 'tilt cards', marquee: 'marquee', parallax: 'parallax', magnetic: 'magnetic buttons', cursor: 'custom cursor', theme: 'dark mode' };
let fxIntensity = 'full';
function syncFxPicker() {
  const def = getDirection(direction) || {};
  const active = new Set((def.motion || '').split(/\s+/).filter(Boolean));
  active.delete('i-subtle');
  const list = $('fxList');
  list.innerHTML = '';
  for (const p of FX_PACKS) {
    const b = document.createElement('button');
    b.className = 'fxchip' + (active.has(p) ? ' on' : '');
    b.dataset.pack = p;
    b.textContent = FX_LABELS[p];
    b.addEventListener('click', () => b.classList.toggle('on'));
    list.appendChild(b);
  }
}
function fxOptions() {
  const packs = [...document.querySelectorAll('.fxchip.on')].map(b => b.dataset.pack);
  return { intensity: fxIntensity, packs };
}
document.querySelectorAll('.fxint').forEach(b => b.addEventListener('click', () => {
  fxIntensity = b.dataset.i;
  document.querySelectorAll('.fxint').forEach(x => x.classList.toggle('on', x === b));
}));

$('importDir').addEventListener('click', () => $('dirFile').click());
$('dirFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const def = registerDirection(JSON.parse(await f.text()));
    persistImported();
    renderDirList();
    direction = def.id; markDir();
    toast('added "' + def.name + '" to the library');
  } catch (err) { toast('not a valid direction file: ' + err.message); }
  e.target.value = '';
});
$('exportDir').addEventListener('click', () => {
  const d = getDirection(direction);
  if (!d) return;
  const out = { id: d.id, name: d.name, hint: d.hint || '', author: d.author || 'you', fonts: d.fonts || '', css: d.css, swatches: d.swatches || [] };
  const b = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a2 = document.createElement('a');
  a2.href = URL.createObjectURL(b);
  a2.download = 'ungeneric-direction-' + d.id + '.json';
  a2.click();
  URL.revokeObjectURL(a2.href);
  toast('direction exported - share it, anyone can import it');
});

restoreImported();
renderDirList();
markDir();
syncFxPicker();

$('restyle').addEventListener('click', () => {
  try {
  const html = $('src').value.trim();
  if (!html) { toast('paste some HTML first'); return; }
  $('verifyChip').style.display = 'none';
  const audit = lastAudit && lastAudit.html === html ? lastAudit : detect(html);
  const sev = severity(audit.score);
  let result;
  if (sev.mode === 'none') {
    /* clean page: no rebuild, and no stale output or verdict from a previous run */
    outHtml = null;
    showPane($('afterFrame'), $('afterEmpty'), null);
    $('afterMeta').textContent = '';
    toast('no slop found - nothing to fix');
    return;
  }
  if (sev.mode === 'light') {
    result = polish(html);
    toast('polish mode: design kept, tells removed');
  } else if (hasCompose(direction)) {
    result = recompose(html, direction, { fx: fxOptions() });
    toast('recompose mode: content rebuilt into a new layout');
  } else {
    result = restyle(html, direction, { fx: fxOptions() });
  }
  outHtml = result.html;
  const { fixes, notes } = result;
  const nb = $('notesBox');
  if (notes && notes.length) {
    nb.style.display = 'block';
    $('notes').innerHTML = notes.map(([a2, b2]) => `<div class="finding"><b>${a2} &rarr; ${b2 || '(removed)'}</b></div>`).join('');
  } else nb.style.display = 'none';
  showPane($('beforeFrame'), $('beforeEmpty'), html);
  showPane($('afterFrame'), $('afterEmpty'), outHtml);
  const v = verify(html, outHtml);
  lastVerify = v;
  if (v.after > v.before) {
    /* the rebuild made the score worse: refuse to ship it */
    outHtml = null;
    showPane($('afterFrame'), $('afterEmpty'), null);
    $('afterMeta').textContent = '';
    $('shareCard').style.display = 'none';
    $('editToggle').style.display = 'none';
    $('editExport').style.display = 'none';
    $('compareToggle').style.display = 'none';
    $('compareBox').style.display = 'none';
    $('copyOut').style.display = 'none';
    $('dlOut').style.display = 'none';
    $('dlZip').style.display = 'none';
    $('dlReact').style.display = 'none';
    $('openOut').style.display = 'none';
    const chip0 = $('verifyChip');
    chip0.style.display = 'flex';
    chip0.className = 'verifychip warn';
    $('verifyScore').textContent = 'verified ' + v.before + ' \u2192 ' + v.after;
    $('verifyNote').textContent = 'the rebuild scored worse than the original, so it was not applied';
    return;
  }
  $('shareCard').style.display = 'block';
  $('editToggle').style.display = 'block';
  $('editExport').style.display = 'block';
  $('compareToggle').style.display = 'block';
  edits.length = 0; $('editExport').disabled = true;
  $('compareBox').style.display = 'none';
  const host2 = pageUrl ? pageUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '';
  $('afterMeta').textContent = (host2 ? host2 + ' · ' : '') + fixes.length + ' fixes' + (result.mode === 'polish' ? ' · polish' : result.mode === 'recompose' ? ' · recomposed' : '');
  const chip = $('verifyChip');
  chip.style.display = 'flex';
  chip.className = 'verifychip ' + (v.stillBad.length ? 'warn' : 'pass');
  $('verifyScore').textContent = 'verified ' + v.before + ' \u2192 ' + v.after;
  $('verifyNote').textContent = v.stillBad.length
    ? 'still sloppy: ' + v.stillBad.map(f => f.id + (f.count > 1 ? ' x' + f.count : '')).join(', ')
    : (v.kept.length ? 'no slop re-detected · left for content: ' + v.kept.map(f => f.id).join(', ') : 'no slop re-detected in output');
  $('copyOut').style.display = 'block';
  $('dlOut').style.display = 'block';
  $('dlZip').style.display = 'block';
  $('dlReact').style.display = 'block';
  $('openOut').style.display = 'block';
  toast(fixes.length + ' fixes applied');
  } catch (err) {
    toast('rebuild failed: ' + String(err && err.message || err).slice(0, 90));
  }
});

$('copyOut').addEventListener('click', async () => {
  if (!outHtml) return;
  try { await navigator.clipboard.writeText(outHtml); toast('restyled HTML copied'); }
  catch { toast('clipboard blocked - select and copy from the frame'); }
});

$('openOut').addEventListener('click', () => {
  if (!outHtml) return;
  const b = new Blob([outHtml], { type: 'text/html' });
  window.open(URL.createObjectURL(b), '_blank');
  toast('opened the full-size page in a new tab');
});

$('dlOut').addEventListener('click', () => {
  if (!outHtml) return;
  const b = new Blob([outHtml], { type: 'text/html' });
  const a2 = document.createElement('a');
  a2.href = URL.createObjectURL(b);
  a2.download = 'ungeneric-output.html';
  a2.click();
  URL.revokeObjectURL(a2.href);
  toast('downloaded ungeneric-output.html');
});

/* ---- ZIP export: a real .zip built in the browser, no library (stored entries, CRC32) ---- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function buildZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = enc.encode(f.data);
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); /* UTF-8 flag */
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true);
    parts.push(lh.buffer, name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(ch.buffer, name);
    off += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((a, p) => a + (p.byteLength ?? p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}
function saveBlob(blob, name) {
  const a2 = document.createElement('a');
  a2.href = URL.createObjectURL(blob);
  a2.download = name;
  a2.click();
  URL.revokeObjectURL(a2.href);
}

$('dlZip').addEventListener('click', () => {
  if (!outHtml) return;
  const host = pageUrl ? pageUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : 'pasted';
  saveBlob(buildZip([
    { name: 'index.html', data: outHtml },
    { name: 'README.txt', data: 'Rebuilt by Ungeneric from ' + host + '\nOpen index.html in a browser. No build step, no dependencies - fonts load from a CDN.\n' }
  ]), 'ungeneric-site.zip');
  toast('downloaded ungeneric-site.zip');
});

$('dlReact').addEventListener('click', () => {
  if (!outHtml) return;
  /* the honest React wrapper: an iframe keeps the rebuilt page's scripts and styles intact */
  const esc = outHtml.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const jsx = 'import { useEffect, useRef } from \'react\';\n\nconst html = `' + esc + '`;\n\n'
    + 'export default function RebuiltPage() {\n'
    + '  const ref = useRef(null);\n'
    + '  useEffect(() => {\n'
    + '    const doc = ref.current.contentDocument;\n'
    + '    doc.open(); doc.write(html); doc.close();\n'
    + '  }, []);\n'
    + '  return <iframe ref={ref} title="Rebuilt page" style={{ border: 0, width: \'100%\', height: \'100vh\' }} />;\n'
    + '}\n';
  saveBlob(new Blob([jsx], { type: 'text/jsx' }), 'RebuiltPage.jsx');
  toast('downloaded RebuiltPage.jsx');
});

function setDevice(d) {
  document.querySelector('.panes').classList.toggle('phone', d === 'phone');
  $('devDesktop').classList.toggle('on', d !== 'phone');
  $('devPhone').classList.toggle('on', d === 'phone');
}
$('devDesktop').addEventListener('click', () => setDevice('desktop'));
$('devPhone').addEventListener('click', () => setDevice('phone'));
$('devDesktop').classList.add('on');

/* hooks for scripted demo capture */
window.__loadSample = () => { $('src').value = SAMPLE; return runAudit().score; };
window.__pick = (d) => { direction = d; markDir(); };
window.__go = () => { $('restyle').click(); };
window.__device = (d) => setDevice(d);
window.__fx = (packs, intensity) => { document.querySelectorAll('.fxchip').forEach(b => b.classList.toggle('on', packs.includes(b.dataset.pack))); if (intensity) { fxIntensity = intensity; document.querySelectorAll('.fxint').forEach(x => x.classList.toggle('on', x.dataset.i === intensity)); } };
window.__download = () => $('dlOut').click();
window.__importDef = (def) => { const d = registerDirection(def); persistImported(); renderDirList(); direction = d.id; markDir(); return d.id; };
window.__export = () => $('exportDir').click();
/* first-run: show, don't tell - load the sample, audit it, rebuild it */
if (!$('src').value.trim()) {
  setTimeout(() => {
    window.__loadSample();
    setTimeout(() => { if (!outHtml) $('restyle').click(); }, 1100);
  }, 450);
}
window.__ready = true;

/* ---- audit a live URL (fetched by the local server helper) ---- */
$('fetchUrl').addEventListener('click', async () => {
  const u = $('urlIn').value.trim();
  if (!u) { toast('paste a URL first'); return; }
  toast('fetching the page...');
  try {
    const r = await fetch('/fetch?url=' + encodeURIComponent(u));
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || ('HTTP ' + r.status));
    if (!/<html/i.test(j.html)) throw new Error('that URL did not return an HTML page');
    $('src').value = j.html;
    pageUrl = j.url;
    toast('fetched ' + (j.html.length / 1024).toFixed(0) + ' KB from ' + j.url.replace(/^https?:\/\//, '').slice(0, 40));
    /* clear any stale rebuild so the After pane never shows a different page */
    outHtml = null;
    showPane($('afterFrame'), $('afterEmpty'), null);
    $('afterMeta').textContent = '';
    $('verifyChip').style.display = 'none';
    runAudit();
  } catch (e) {
    toast('could not fetch that page: ' + String(e.message || e).slice(0, 90));
  }
});

/* ---- before/after share card (drawn locally on a canvas) ---- */
let lastVerify = null;
function drawShareCard() {
  if (!lastVerify) return;
  const d = getDirection(direction) || { name: direction };
  const W = 1200, H = 675;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.fillStyle = '#101013'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#2a2a30'; x.lineWidth = 2; x.strokeRect(28, 28, W - 56, H - 56);
  x.fillStyle = '#8a8a92'; x.font = '500 24px ui-monospace, Menlo, monospace'; x.textAlign = 'center';
  x.fillText('S L O P   S C O R E', W / 2, 118);
  /* before */
  x.fillStyle = '#ff5c4d'; x.font = '900 190px Archivo, system-ui, sans-serif'; x.textAlign = 'right';
  x.fillText(String(lastVerify.before), 470, 400);
  x.font = '600 22px ui-monospace, Menlo, monospace'; x.fillStyle = '#8a8a92';
  x.fillText('BEFORE', 470, 448);
  /* arrow */
  x.strokeStyle = '#e8e6df'; x.lineWidth = 6; x.beginPath();
  x.moveTo(520, 360); x.lineTo(680, 360); x.lineTo(656, 340); x.moveTo(680, 360); x.lineTo(656, 380);
  x.stroke();
  /* after */
  x.fillStyle = '#3ddc84'; x.font = '900 190px Archivo, system-ui, sans-serif'; x.textAlign = 'left';
  x.fillText(String(lastVerify.after), 730, 400);
  x.font = '600 22px ui-monospace, Menlo, monospace'; x.fillStyle = '#8a8a92';
  x.fillText('AFTER', 730, 448);
  /* footer */
  x.textAlign = 'center'; x.fillStyle = '#e8e6df'; x.font = '700 30px Archivo, system-ui, sans-serif';
  x.fillText('restyled as "' + d.name + '"', W / 2, 545);
  x.fillStyle = '#8a8a92'; x.font = '500 20px ui-monospace, Menlo, monospace';
  x.fillText('ungeneric - local slop remover, audited in the browser', W / 2, 592);
  const url = cv.toDataURL('image/png');
  $('cardImg').src = url;
  $('cardDl').href = url;
  $('cardBox').style.display = 'block';
}
$('shareCard').addEventListener('click', () => { drawShareCard(); toast('card drawn - right-click or use the link to save'); });

/* ---- style from a reference screenshot ---- */
let refVibe = 'sans';
let lastRefTokens = null;
document.querySelectorAll('.refv').forEach(b => b.addEventListener('click', () => {
  refVibe = b.dataset.v;
  document.querySelectorAll('.refv').forEach(x => x.classList.toggle('on', x === b));
  if (lastRefTokens) applyReference();
}));
$('refShot').addEventListener('click', () => $('refFile').click());
$('refFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => { lastRefTokens = analyzeImage(img); $('refVibe').style.display = 'flex'; showRefSwatches(lastRefTokens); applyReference(); URL.revokeObjectURL(img.src); };
  img.onerror = () => toast('could not read that image');
  img.src = URL.createObjectURL(f);
  e.target.value = '';
});
function analyzeImage(img) {
  const S = 96;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = Math.max(1, Math.round(S * img.height / img.width));
  const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, cv.width, cv.height);
  const d = x.getImageData(0, 0, cv.width, cv.height).data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]); }
  const K = 6;
  const centers = [];
  for (let i = 0; i < K; i++) centers.push(px[Math.floor(px.length * (i + 0.5) / K)].slice());
  let sizes = new Array(K).fill(0);
  for (let it = 0; it < 14; it++) {
    const groups = centers.map(() => []);
    for (const p of px) {
      let bi = 0, bd = 1e12;
      for (let k = 0; k < K; k++) { const dd = (p[0] - centers[k][0]) ** 2 + (p[1] - centers[k][1]) ** 2 + (p[2] - centers[k][2]) ** 2; if (dd < bd) { bd = dd; bi = k; } }
      groups[bi].push(p);
    }
    sizes = groups.map(g => g.length);
    for (let k = 0; k < K; k++) if (groups[k].length) centers[k] = [0, 1, 2].map(j => groups[k].reduce((a, p) => a + p[j], 0) / groups[k].length);
  }
  const order = centers.map((c, k) => k).sort((a, b) => sizes[b] - sizes[a]);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const sat = c => { const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx ? (mx - mn) / mx : 0; };
  const bg = centers[order[0]];
  let ink = null, bestD = 0;
  for (const k of order) { const dd = Math.abs(lum(centers[k]) - lum(bg)); if (dd > bestD) { bestD = dd; ink = centers[k]; } }
  let accent = null, bestS = 0.14;
  for (const k of order) { const c = centers[k]; if (c === bg || c === ink) continue; const s = sat(c); if (s > bestS) { bestS = s; accent = c; } }
  if (!accent) accent = lum(bg) < 140 ? [224, 122, 58] : [183, 65, 15];
  const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  let near = 0;
  for (const p of px) { const dd = (p[0] - bg[0]) ** 2 + (p[1] - bg[1]) ** 2 + (p[2] - bg[2]) ** 2; if (dd < 900) near++; }
  const airy = near / px.length;
  const radius = airy > 0.6 ? '14px' : airy > 0.4 ? '8px' : '0';
  return { bg: hex(bg), ink: hex(ink), surface: hex(mix(bg, ink, 0.05)), line: hex(mix(bg, ink, 0.18)), accent: hex(accent), btnInk: hex(bg), radius, font: refVibe };
}
function applyReference() {
  setReferenceStyle({ ...lastRefTokens, font: refVibe });
  renderDirList(); direction = 'reference'; markDir();
  toast('style read from your screenshot - palette and mood, not a pixel copy');
  if (lastAudit) $('restyle').click();
}
function showRefSwatches(t) {
  const el = $('refSwatches');
  el.style.display = 'flex';
  el.innerHTML = [t.bg, t.ink, t.accent].map(c => `<span title="${c}" style="width:28px;height:28px;display:inline-block;border:1px solid var(--ink);background:${c}"></span>`).join('');
}
window.__refFromImage = (src) => new Promise((res) => {
  const img = new Image();
  img.onload = () => { lastRefTokens = analyzeImage(img); $('refVibe').style.display = 'flex'; showRefSwatches(lastRefTokens); applyReference(); res(lastRefTokens); };
  img.src = src;
});

/* ---- animation presets ---- */
document.querySelectorAll('.fxpre').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.fxpre').forEach(x => x.classList.toggle('on', x === b));
  const p = b.dataset.p;
  if (p === 'calm') window.__fx(['progress', 'story', 'navfx'], 'subtle');
  else if (p === 'bold') { syncFxPicker(); window.__fx([...document.querySelectorAll('.fxchip.on')].map(x => x.dataset.pack), 'full'); }
  else window.__fx(FX_PACKS.slice(), 'full');
}));

/* ---- click-to-edit the after preview ---- */
let editing = false;
const edits = [];
function escForHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function editClick(e) {
  const t = e.target.closest && e.target.closest('h1,h2,h3,p,li,.ug-kicker,.num,.lbl,.ug-logo');
  if (!t) return;
  e.preventDefault(); e.stopPropagation();
  if (t.hasAttribute('data-ugediting')) return;
  t.setAttribute('contenteditable', 'true');
  t.setAttribute('data-ugediting', '1');
  t.dataset.ugorig = t.textContent;
  t.style.outline = '2px dashed currentColor';
  t.focus();
  t.addEventListener('blur', () => {
    t.removeAttribute('contenteditable'); t.style.outline = '';
    if (t.textContent !== t.dataset.ugorig) { edits.push({ from: t.dataset.ugorig, to: t.textContent }); $('editExport').disabled = false; toast('edit noted - Export edited bakes it into the file'); }
  }, { once: true });
}
$('editToggle').addEventListener('click', () => {
  const doc = $('afterFrame').contentDocument;
  if (!doc || !outHtml) { toast('restyle something first'); return; }
  editing = !editing;
  $('editToggle').textContent = editing ? 'Done editing' : 'Edit text in preview';
  if (editing) { doc.addEventListener('click', editClick, true); toast('click any headline or paragraph to edit it'); }
  else doc.removeEventListener('click', editClick, true);
});
$('editExport').addEventListener('click', () => {
  let html = outHtml, applied = 0;
  for (const ed of edits) {
    const esc = escForHtml(ed.from);
    let i = html.indexOf(esc);
    if (i === -1) i = html.indexOf(ed.from);
    if (i !== -1) { html = html.slice(0, i) + escForHtml(ed.to) + html.slice(i + (html.startsWith(esc, i) ? esc : ed.from).length); applied++; }
  }
  outHtml = html;
  $('afterFrame').srcdoc = previewHtml(html);
  edits.length = 0; $('editExport').disabled = true;
  toast(applied + ' edit(s) baked in - Copy HTML or Download file to keep them');
});
window.__demoEdit = (sel, text) => {
  const doc = $('afterFrame').contentDocument;
  const t = doc.querySelector(sel);
  if (!t) return false;
  edits.push({ from: t.textContent, to: text });
  t.textContent = text;
  $('editExport').disabled = false;
  return true;
};

/* ---- before/after compare slider ---- */
function positionCmp(f) {
  $('cmpBefore').style.clipPath = 'inset(0 ' + (100 - f * 100) + '% 0 0)';
  $('cmpHandle').style.left = 'calc(' + (f * 100) + '% - 2px)';
}
$('compareToggle').addEventListener('click', () => {
  const box = $('compareBox');
  const on = box.style.display === 'none' || !box.style.display;
  if (!on) { box.style.display = 'none'; return; }
  if (!outHtml) { toast('restyle something first'); return; }
  box.style.display = 'block';
  $('cmpAfter').srcdoc = previewHtml(outHtml);
  $('cmpBefore').srcdoc = previewHtml(lastAudit ? lastAudit.html : outHtml);
  positionCmp(0.5);
  toast('drag the handle to compare');
});
(function () {
  let drag = false;
  const box = $('compareBox');
  $('cmpHandle').addEventListener('pointerdown', (e) => { drag = true; e.preventDefault(); });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = box.getBoundingClientRect();
    positionCmp(Math.min(Math.max((e.clientX - r.left) / r.width, 0.02), 0.98));
  });
  window.addEventListener('pointerup', () => { drag = false; });
  box.addEventListener('pointerdown', (e) => {
    if (e.target === $('cmpHandle') || $('cmpHandle').contains(e.target)) return;
    const r = box.getBoundingClientRect();
    positionCmp(Math.min(Math.max((e.clientX - r.left) / r.width, 0.02), 0.98));
  });
})();
window.__compare = () => $('compareToggle').click();
window.__cmp = (f) => positionCmp(f);

/* ---------------- mix-your-own style builder ---------------- */
let mixVibe = 'sans', mixRadius = '0';
const hex2rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (c) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function mixTokens() {
  const bg = $('mixBg').value, ink = $('mixInk').value, accent = $('mixAccent').value;
  const m = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  return { bg, ink, surface: rgb2hex(m(hex2rgb(bg), hex2rgb(ink), 0.05)), line: rgb2hex(m(hex2rgb(bg), hex2rgb(ink), 0.18)), accent, btnInk: bg, radius: mixRadius + 'px', font: mixVibe };
}
function applyMix() {
  lastRefTokens = mixTokens();
  setReferenceStyle(lastRefTokens);
  renderDirList(); direction = 'reference'; markDir();
  toast('your custom mix - saved as the reference direction');
  if (lastAudit) $('restyle').click();
}
document.querySelectorAll('.mixv').forEach(b => b.addEventListener('click', () => {
  mixVibe = b.dataset.v;
  document.querySelectorAll('.mixv').forEach(x => x.classList.toggle('on', x === b));
}));
document.querySelectorAll('.mixr').forEach(b => b.addEventListener('click', () => {
  mixRadius = b.dataset.r;
  document.querySelectorAll('.mixr').forEach(x => x.classList.toggle('on', x === b));
}));
$('mixApply').addEventListener('click', applyMix);
window.__applyMix = (bg, ink, accent, vibe, radius) => {
  if (bg) $('mixBg').value = bg; if (ink) $('mixInk').value = ink; if (accent) $('mixAccent').value = accent;
  if (vibe) { mixVibe = vibe; document.querySelectorAll('.mixv').forEach(x => x.classList.toggle('on', x.dataset.v === vibe)); }
  if (radius != null) { mixRadius = String(radius); document.querySelectorAll('.mixr').forEach(x => x.classList.toggle('on', x.dataset.r === String(radius))); }
  applyMix();
};
