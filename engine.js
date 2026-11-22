/* Ungeneric engine v3: detect AI-UI slop, then rebuild the page with a real
 * design system. Local heuristics only - no API, no model, no network calls.
 * All rules, copy and icons are original work for this project. */

function hexHue(hex) {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(v.slice(0, 2), 16) / 255, g = parseInt(v.slice(2, 4), 16) / 255, b = parseInt(v.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return null;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
}
function rgbHue(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return null;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
}

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}]/gu;
/* detect-only: arrows (\u2190-\u21FF) are typography, not emoji - nav links like "All Services →" are legitimate */
const EMOJI_CHECK = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
const STOCK = /(get started|learn more|sign up free|try (it )?free|start (your )?free|supercharge|unlock|seamless(ly)?|cutting-edge|next-gen(eration)?|revolutioniz\w+|empower\w*|elevate\w*|game-chang\w+|boost your|take your [\w ]{2,20} to the next level|delve|robust|streamline\w*|effortless(ly)?|world-class|best-in-class|ai-powered|unleash\w*|harness|turbocharg\w+|reimagin\w+|transform your|fast-paced|look no further|say goodbye|all-in-one|one-stop|utiliz\w+|innovativ\w+|synerg\w+|state-of-the-art|ever-evolving)/gi;

/* Hand-drawn stroke icons (18px grid, 1.8 stroke, currentColor). */
const ICON_PATHS = {
  bolt:  '<path d="M13 2 4.5 13.5h5L8.5 22 18 10.5h-5L13 2z"/>',
  lock:  '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  bulb:  '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.8.7 1.1 1.3 1.1 2.2h5c0-.9.3-1.5 1.1-2.2A6 6 0 0 0 12 3z"/>',
  rocket:'<path d="M12 15c-2.5 0-4.5-2-4.5-4.5C7.5 6 9.5 3.5 12 2c2.5 1.5 4.5 4 4.5 8.5 0 2.5-2 4.5-4.5 4.5z"/><circle cx="12" cy="9" r="1.6"/><path d="M7.5 12.5 5 17l3.5-.5M16.5 12.5 19 17l-3.5-.5M10.5 18.5c.5 1.5 1 2.5 1.5 3.5.5-1 1-2 1.5-3.5"/>',
  flame: '<path d="M12 2.5c1 3 5.5 5.2 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.2 1-3.6 2.2-4.8.4 1.4 1.2 2.2 1.9 2.6-.6-2.6 0-5.3 1.4-7.3z"/>',
  chart: '<path d="M3.5 3.5v17h17"/><path d="M7 14.5l3.8-3.8 3 3 5.2-6.2"/>',
  bars:  '<path d="M6 20V10M12 20V4M18 20v-7"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.4 2"/>',
  check: '<path d="M4 12.5l5.2 5L20 6.5"/>',
  bell:  '<path d="M6 9.5a6 6 0 0 1 12 0c0 4.8 1.8 6 1.8 6H4.2s1.8-1.2 1.8-6"/><path d="M10.3 19.5a1.8 1.8 0 0 0 3.4 0"/>',
  gear:  '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.3 5.3l2 2M16.7 16.7l2 2M18.7 5.3l-2 2M7.3 16.7l-2 2"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.9 2.6 2.9 14.4 0 17M12 3.5c-2.9 2.6-2.9 14.4 0 17"/>',
  chat:  '<path d="M20.5 12a8.5 8.5 0 0 1-8.5 8.5H4.5l1.8-3A8.5 8.5 0 1 1 20.5 12z"/>',
  box:   '<path d="M3.2 7.8 12 3l8.8 4.8v8.4L12 21l-8.8-4.8z"/><path d="M3.2 7.8 12 12.6l8.8-4.8M12 12.6V21"/>',
  star:  '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.3 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  heart: '<path d="M12 20s-7.2-4.6-9.2-9A5.2 5.2 0 0 1 12 6.6 5.2 5.2 0 0 1 21.2 11c-2 4.4-9.2 9-9.2 9z"/>',
  cal:   '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  mail:  '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  shield:'<path d="m12 2.5 7.5 3v6c0 4.6-3.2 7.8-7.5 9.5-4.3-1.7-7.5-4.9-7.5-9.5v-6z"/><path d="m8.8 11.8 2.3 2.3 4.2-4.6"/>',
  eye:   '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
};
const EMOJI_ICON = {
  '⚡':'bolt','🔒':'lock','🔐':'lock','💡':'bulb','🚀':'rocket','🔥':'flame','📈':'chart','📊':'bars',
  '🎯':'target','⏰':'clock','⏱️':'clock','⏱':'clock','🔔':'bell','⚙️':'gear','⚙':'gear','🌐':'globe','🌍':'globe',
  '💬':'chat','📦':'box','⭐':'star','🌟':'star','❤️':'heart','❤':'heart','📅':'cal','✉️':'mail','📧':'mail',
  '🛡️':'shield','🛡':'shield','✅':'check','✔️':'check','✔':'check','✓':'check','👁️':'eye','👁':'eye','☁️':'globe','☁':'globe',
};
const EMOJI_DROP = new Set(['✨','🎉','👋','💪','🤖','🪄','😍','🔥' /* flame kept as icon */, ...[]].filter(x => x !== '🔥'));
function iconSVG(name, size) {
  const p = ICON_PATHS[name];
  if (!p) return '';
  const s = size || 18;
  return `<svg class="ug-ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

/* ---------------- audit: 29 checks ---------------- */

export function detect(html) {
  const F = [];
  const add = (id, label, why, count, weight) => { if (count > 0) F.push({ id, label, why, count, weight: weight * Math.min(count, 4) }); };

  const grads = html.match(/(?:linear|radial|conic)-gradient\([^;}')]*\)/gi) || [];
  let purple = 0;
  for (const g of grads) {
    const hues = [];
    for (const h of g.match(/#[0-9a-f]{3,8}/gi) || []) { const u = hexHue(h); if (u != null) hues.push(u); }
    for (const m of g.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)) hues.push(rgbHue(+m[1], +m[2], +m[3]));
    if (/purple|violet|indigo|fuchsia|magenta/i.test(g) || hues.some(u => u >= 245 && u <= 330)) purple++;
  }
  add('purple-gradient', 'Purple / violet gradients', 'The single most common AI-UI tell. One flat surface + one accent beats a violet wash.', purple, 9);
  add('any-gradient', 'Gradient backgrounds', 'Gradients as decoration read as generated filler. Flat, deliberate color reads designed.', Math.max(0, grads.length - purple), 3);

  add('gradient-text', 'Gradient headline text', 'background-clip:text on a heading is a stock trick. Strong type in a solid color is stronger.',
    (html.match(/background-clip\s*:\s*text|-webkit-text-fill-color\s*:\s*transparent/gi) || []).length, 8);

  const glows = (html.match(/box-shadow\s*:[^;}')]*rgba?\([^)]*\)[^;}')]*/gi) || []).filter(s => { const m = s.match(/(\d+)px/g); return m && m.some(px => parseInt(px) >= 30); });
  add('glow', 'Colored glow shadows', 'Huge soft colored shadows (the "AI glow") make surfaces feel like a template.', glows.length, 5);

  add('emoji', 'Emoji as icons or decoration', 'Emoji in place of an icon system looks instant and same-y. Real marks, or none.', (html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').match(EMOJI_CHECK) || []).length, 4);

  const fonts = html.match(/font-family\s*:[^;}"]+/gi) || [];
  const defaultFonts = fonts.filter(f => /inter|roboto|arial|helvetica|system-ui|segoe/i.test(f)).length;
  const fontLinks = (html.match(/fonts\.googleapis\.com[^"']*(Inter|Roboto)[^"']*/gi) || []).length;
  add('default-font', 'Default vibecode font (Inter / Roboto / system stack)', 'Typography is where generated UI gives itself away. A distinctive pairing changes everything.', defaultFonts + fontLinks, 7);

  add('stock-copy', 'Stock AI marketing copy', '"Supercharge", "unlock", "seamless" - copy that could sell anything sells nothing.', (html.match(STOCK) || []).length, 4);

  add('generic-hero', 'Generic hero (big H1 + sub + two buttons)', 'The centered hero with a gradient headline and two buttons is the default AI layout.', /<h1[^>]*>[\s\S]{0,260}?<\/h1>[\s\S]{0,500}?(button|btn)/i.test(html) ? 1 : 0, 6);

  /* BEM-style namespaced classes (block__card--mod) are a hand-written convention; generated pages use bare "card" */
  const cardClasses = (html.match(/class\s*=\s*["'][^"']*card[^"']*["']/gi) || []).filter(c => !/(__|--)/.test(c));
  add('card-grid', 'Stock card grid', 'Identical rounded cards with an emoji on top is a layout habit, not a design.', cardClasses.length >= 3 ? cardClasses.length : 0, 3);

  /* caps is a copy tell: strip script/style first so embedded JS constants and JSON keys are not judged as copy */
  const capsText = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  add('caps', 'Shouty ALL-CAPS copy', 'Caps for emphasis is a generated-copy habit. Use weight and scale instead.', ((capsText.match(/\b[A-Z]{4,}\b/g) || []).length) > 4 ? 1 : 0, 2);

  add('pill-radius', 'Pill radii everywhere', 'border-radius:999px on every button is a generator default. A direction chooses its corners on purpose.', (html.match(/border-radius\s*:\s*(9999?px|50%)/gi) || []).length, 4);

  const hexSource = html.replace(/html\[data-ug-theme=dark\][^}]*}/gi, ''); // theme-toggle variants are system tokens, not palette soup
  const hexes = new Set((hexSource.match(/#[0-9a-f]{6}\b/gi) || []).map(h => h.toLowerCase()));
  add('color-soup', 'Too many colors (no palette)', hexes.size > 8 ? `${hexes.size} distinct hex colors. A designed system picks 3-5 and commits.` : '', hexes.size > 8 ? 1 : 0, 6);

  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  /* bare `alt` (empty value) is the serializer's form of alt="" - both mark a decorative image, both count as present */
  const noAlt = imgs.filter(t => !/\balt(?=\s|=|\/|>)/.test(t)).length;
  add('no-alt', 'Images without alt text', 'Generated pages skip alt text. It is an accessibility miss, not a style choice.', noAlt, 3);

  /* v3 rules */
  const loopMatches = html.match(/animate-(pulse|ping|bounce|spin)\b|animation\s*:[^;}]*\binfinite\b/gi) || [];
  const loops = loopMatches.filter(m => !/ugMarq|ugCaret/.test(m)).length;
  add('loop-motion', 'Motion that loops forever', 'Pulsing, pinging and bouncing on things that are not live is template noise. Motion should explain something.', loops, 5);

  add('transition-all', 'transition-all / catch-all transitions', 'Animating everything at once is how generated UI fakes polish. Name the two properties that change.', (html.match(/transition\s*:\s*all\b|transition-all\b/gi) || []).length, 3);

  add('hover-scale', 'hover:scale on cards', 'Cards that grow on hover move more than they should. A surface or color change is enough.', (html.match(/hover:scale-\d|:hover\s*{[^}]*transform\s*:\s*scale/gi) || []).length, 3);

  const trackedCaps = (html.match(/text-transform\s*:\s*uppercase[^;}]*;?\s*letter-spacing\s*:\s*(0\.[2-9]|[1-9])|uppercase\s+tracking-(wid|wide)er?/gi) || []).length;
  add('tracked-caps', 'Uppercase wide-tracked labels', 'The tracked-caps eyebrow label is on every AI landing page. Quiet labels or none.', trackedCaps, 3);

  add('greeting', 'Greeting headline', '"Welcome back, user" says nothing. Name the context instead - the page or the period.', /welcome (back|to)\b[^<!,]*[!,]/i.test(html) ? 1 : 0, 3);

  add('dead-link', 'Dead links and buttons', 'href="#" goes nowhere. Link it, make it a button with a handler, or remove it.', (html.match(/<a\b[^>]*href\s*=\s*(["'])#\1/gi) || []).length, 2);

  const headExclaim = (html.match(/<h[1-4][^>]*>[^<]*!/gi) || []).length;
  add('exclaim', 'Exclamation marks in headings', 'Headlines that shout read as generated. Confidence does not need punctuation.', headExclaim, 2);

  add('badge-sparkle', '"New / PRO / Beta" badges with sparkle', 'Badges that announce themselves are noise. If the product needs one, it is quiet text.', /(new|pro|beta)\s*[✨🚀⭐️⭐]|[✨🚀⭐️⭐]\s*(new|pro|beta)/i.test(html) ? 1 : 0, 2);

  add('ai-powered', '"AI-powered" everything', 'Slapping AI-powered on features is the marketing version of a purple gradient. Say what it does.', (html.match(/ai-powered/gi) || []).length, 2);

  const oddPx = (html.match(/[mp][tblrxy]?-\[\d+px\]|(?:margin|padding)[^;}]*:\s*\d+px/gi) || []).filter(s => { const n = parseInt(s.match(/(\d+)px/)?.[1] || '0'); return n > 2 && n % 4 !== 0; }).length;
  add('odd-spacing', 'Off-grid spacing values', 'Margins like 13px or 27px are whatever the model typed that day. Spacing belongs on a 4px rhythm.', oddPx, 2);

  /* v5 rules - toward sloplint's coverage */
  const hasKeyframes = /@keyframes|animation\s*:/i.test(html);
  add('no-reduced-motion', 'Motion without a reduced-motion path', 'Animations with no prefers-reduced-motion fallback exclude people who need stillness.', hasKeyframes && !/prefers-reduced-motion/i.test(html) ? 1 : 0, 3);

  add('focus-removed', 'Focus outline removed', 'outline:none without a :focus-visible replacement makes the keyboard invisible.', (html.match(/outline\s*:\s*(none|0)\b/gi) || []).length && !/:focus-visible/i.test(html) ? (html.match(/outline\s*:\s*(none|0)\b/gi) || []).length : 0, 3);

  add('template-leak', 'Template placeholder text left in', 'Lorem ipsum, "your text here", unfilled {{variables}} - the generator\'s scaffolding still showing.', (html.match(/lorem ipsum|your (text|title|heading|copy) here|\{\{\s*[\w.]+\s*\}\}|TODO:|FIXME:/gi) || []).length, 6);

  add('glass', 'Frosted glass surfaces', 'backdrop-blur on every card is the 2024 generator skin. Opaque surfaces with real hierarchy age better.', (html.match(/backdrop-filter\s*:[^;}]*blur|backdrop-blur/gi) || []).length, 3);

  add('blob', 'Organic blob shapes', 'border-radius:30% 70% blobs are the shape equivalent of a purple gradient. Geometry should mean something.', (html.match(/border-radius\s*:\s*(?:\d+%\s*){3,}/gi) || []).length, 3);

  const twViolet = new Set((html.match(/#(8b5cf6|a855f7|7c3aed|6366f1|818cf8|c084fc|e9d5ff|9333ea|6d28d9|4f46e5|a5b4fc|d946ef|f0abfc)\b/gi) || []).map(h => h.toLowerCase()));
  add('tailwind-violet', 'Tailwind violet palette', 'The default violet/indigo/fuchsia scale is the most-recognized AI palette on earth. Pick a color on purpose.', twViolet.size >= 2 ? twViolet.size : 0, 5);

  const middots = (capsText.match(/·/g) || []).length;
  add('meta-strings', 'Middot meta strings', '"5 min read · Design · 2024" - metadata strung with middots is template chrome. Give it structure or drop it.', middots >= 3 ? middots : 0, 2);

  /* v6 rules - more of sloplint's coverage, honest scope */
  /* invented social proof is a content tell: flagged on audit, preserved on rebuild (kept class in verify) */
  const proof = (capsText.match(/\b\d{1,3}(?:,\d{3})+\+|\b\d+(?:\.\d+)?[kKmM]\+\s*(?:users|customers|teams|companies|developers|businesses)|9\d(?:\.\d)?%|trusted by|loved by|join (?:over )?\d[\d,]*|★\s*4\.\d|4\.\d\s*★|\b\d+(?:\.\d+)?x\s+(?:faster|better|higher|more)/gi) || []).length;
  add('invented-proof', 'Invented social proof', 'Round stat banners and "trusted by" walls nobody can check read as generated. Real numbers with a source, or none.', proof >= 2 ? proof : 0, 3);

  /* cards inside cards: a real nesting scan over container tags, our own ug- classes exempt */
  const tagRe = /<\/?(?:div|section|article|li|aside|main|header|footer|nav)\b[^>]*>/gi;
  const stack = [];
  let nestedCards = 0, tm;
  while ((tm = tagRe.exec(html))) {
    const t = tm[0];
    if (t[1] === '/') { stack.pop(); continue; }
    if (/\/\s*>$/.test(t)) continue;
    const isCard = /class\s*=\s*["'][^"']*(?:card|panel|tile)[^"']*["']/i.test(t) && !/ug-/i.test(t);
    if (isCard && stack.some(Boolean)) nestedCards++;
    stack.push(isCard);
  }
  add('nested-cards', 'Cards inside cards', 'A boxed card inside another boxed card is padding, not hierarchy. One surface per idea.', nestedCards, 3);

  /* fake window chrome: the mac traffic-light trio as decoration (hexes or named dot classes) */
  const macTrio = ['ff5f57', 'febc2e', '28c840'].filter(h => html.toLowerCase().includes(h)).length;
  const chromeClasses = (html.match(/class\s*=\s*["'][^"']*(?:traffic-?lights?|window-?dots?|mac-?dots?|browser-?dots?)[^"']*["']/gi) || []).filter(c => !/ug-/i.test(c)).length;
  add('fake-chrome', 'Fake window chrome', 'Three traffic-light dots drawn around a screenshot or code block are a costume. Frame content with real structure.', (macTrio >= 2 ? 1 : 0) + chromeClasses, 2);

  const score = Math.min(100, F.reduce((a, f) => a + f.weight, 0));
  return { findings: F.sort((a, b) => b.weight - a.weight), score, checks: 32 };
}

/* heavy = full redesign pays off; light = polish only; none = leave it alone */
export function severity(score) {
  if (score >= 50) return { mode: 'heavy', label: 'Heavy slop - full restyle recommended' };
  if (score >= 22) return { mode: 'light', label: 'Light slop - polish mode keeps your design and removes the tells' };
  return { mode: 'none', label: 'Looks designed already - only small refinements suggested' };
}

/* pick a direction from product keywords */
export function recommend(html) {
  const t = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .toLowerCase();
  /* count keyword hits per direction and let the strongest subject win -
     first-match order made noisy real pages (a 'music' section on a news site) pick wrong */
  const count = (...ws) => ws.reduce((n, w) => n + (new RegExp('\\b' + w + 's?\\b', 'i').test(t) ? 1 : 0), 0);
  const scores = [
    ['night', count('terminal', 'cli', 'developer', 'api', 'deploy', 'server', 'monitor', 'logs', 'debug', 'observab\\w*', 'devtool')],
    ['arcade', count('game', 'gaming', 'gameplay', 'arcade', 'esports', 'speedrun', 'highscore', 'pixel')],
    ['neon', count('music', 'dj', 'synth', 'club', 'nightlife', 'concert', 'festival', 'neon')],
    ['editorial', count('news', 'journal', 'editorial', 'magazine', 'blog', 'essay', 'writer', 'book')],
    ['noir', count('photo', 'film', 'cinema', 'movie', 'noir', 'documentary', 'studio')],
    ['letterpress', count('restaurant', 'cafe', 'coffee', 'bakery', 'hotel', 'bistro', 'tea', 'wine')],
    ['memphis', count('kids', 'toy', 'playful', 'party', 'candy', 'fun', 'meme', 'sticker', 'creator')],
    ['bauhaus', count('fashion', 'gallery', 'exhibition', 'museum', 'art', 'poster', 'portfolio', 'studio')],
    ['riso', count('zine', 'print', 'comic', 'illustration', 'shop', 'merch', 'label')],
    ['mono', count('docs', 'documentation', 'manual', 'spec', 'paper', 'research', 'thesis', 'academic')],
    ['swiss', count('bank', 'finance', 'insurance', 'enterprise', 'corporate', 'legal')],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  /* one stray word ('game' in a SaaS page) is noise, not a subject - need 2+ distinct hits */
  return scores[0][1] >= 2 ? scores[0][0] : 'editorial';
}

/* ---------------- design directions ---------------- */

const MOTION_CSS = `
  /* ungeneric motion layer - deliberate, performant, reduced-motion safe */
  .ug-r { opacity: 0; transform: translateY(22px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); transition-delay: calc(var(--ug-i, 0) * 75ms); will-change: opacity, transform; }
  .ug-r.ug-on { opacity: 1; transform: none; }
  .ug-ww { display: inline-block; overflow: hidden; vertical-align: bottom; }
  .ug-w { display: inline-block; transform: translateY(112%); 
transition: transform .8s cubic-bezier(.16,1,.3,1); transition-delay: calc(var(--ug-i, 0) * 55ms); }
  .ug-on .ug-w, .ug-w.ug-on { transform: none; }
  @keyframes ugMarq { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .ug-marqwrap { overflow: hidden; white-space: nowrap; }
  .ug-marq { display: inline-block; animation: ugMarq 22s linear infinite; }
  button, [class*=btn], a { transition: background-color .18s ease, color .18s ease, border-color .18s ease, transform .12s ease; }
  button:active, [class*=btn]:active { transform: translateY(1px); }
  #ug-cursor, #ug-cursor-dot { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 99999; border-radius: 100%; }
  #ug-cursor { width: 28px; height: 28px; border: 1.5px solid currentColor; opacity: .55; transition: width .18s, height .18s, opacity .18s; }
  #ug-cursor-dot { width: 5px; height: 5px; background: currentColor; }
  @media (hover: none), (prefers-reduced-motion: reduce) { #ug-cursor, #ug-cursor-dot { display: none !important; } }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
    .ug-r, .ug-w { transition: none !important; opacity: 1 !important; transform: none !important; }
    .ug-marq { animation: none !important; }
  }
`;

/* fx layer: progress, nav, tilt, scramble, split, story, theme - all transform/opacity, RM-safe */
const FX_CSS = `
  html[data-ugfx] { --ug-dist: 26px; --ug-dur: .8s; }
  html[data-ugfx=subtle] { --ug-dist: 12px; --ug-dur: .5s; }
  #ug-progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 99998; transform-origin: 0 50%; transform: scaleX(0); background: currentColor; opacity: .85; pointer-events: none; }
  .ug-nav { transition: padding .25s ease, background-color .25s ease, border-color .25s ease, box-shadow .25s ease; }
  .ug-nav.ug-scrolled { box-shadow: 0 1px 0 rgba(0,0,0,.12); }
  [data-ug-tilt] { transform-style: preserve-3d; transition: transform .18s ease-out; }
  .ug-c { display: inline-block; transform: translateY(108%); transition: transform .6s cubic-bezier(.16,1,.3,1); transition-delay: calc(var(--ug-i, 0) * 22ms); }
  .ug-on .ug-c, .ug-c.ug-on { transform: none; }
  .ug-cw { display: inline-block; overflow: hidden; vertical-align: bottom; }
  .ug-story-l { transform: translateX(calc(var(--ug-dist) * -1)) !important; }
  .ug-story-r { transform: translateX(var(--ug-dist)) !important; }
  .ug-story-l.ug-on, .ug-story-r.ug-on { transform: none !important; }
  .ug-r { transform: translateY(var(--ug-dist)); transition-duration: var(--ug-dur), var(--ug-dur), var(--ug-dur); }
  #ug-theme { position: fixed; bottom: 18px; right: 18px; z-index: 99998; width: 40px; height: 40px; border-radius: 100%; border: 1.5px solid currentColor; background: transparent; color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: .7; transition: opacity .18s; padding: 0; }
  #ug-theme:hover { opacity: 1; }
  #ug-theme svg { width: 18px; height: 18px; }
  @media (prefers-reduced-motion: reduce) {
    #ug-progress { display: none !important; }
    .ug-c { transition: none !important; transform: none !important; }
  }
`;

/* runtime injected into restyled pages: scroll reveals, kinetic type, counters, marquee, parallax, magnetic, cursor.
   Transform/opacity only, IntersectionObserver, passive listeners, prefers-reduced-motion honored. */
const MOTION_JS = String.raw`
(function () {
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FLAGS = (window.__UGMOTION || '').split(/\s+/);
  var INTENSITY = FLAGS.indexOf('i-subtle') >= 0 ? 'subtle' : 'full';
  document.documentElement.setAttribute('data-ugfx', INTENSITY);
  function has(f) { return FLAGS.indexOf(f) >= 0; }
  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
  ready(function () {
    /* tag candidates with stagger indices */
    var els = [];
    document.querySelectorAll('section > *, main > *, header > *, [class*=card], [class*=Card], [class*=feature], [class*=stat]').forEach(function (el) {
      if (el.closest('.ug-marqwrap')) return;
      var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--ug-i', Math.min(sibs, 8));
      el.classList.add('ug-r');
      els.push(el);
    });
    /* kinetic headline: split first h1 into masked words */
    var h1 = document.querySelector('h1');
    if (h1 && !RM) {
      /* split into masked words, preserving accent elements (em, .cut, mark) as whole words */
      var k = 0;
      function addWord(nodeOrText) {
        var wrap = document.createElement('span'); wrap.className = 'ug-ww';
        var inner = document.createElement('span'); inner.className = 'ug-w'; inner.style.setProperty('--ug-i', k++);
        if (typeof nodeOrText === 'string') inner.textContent = nodeOrText; else inner.appendChild(nodeOrText);
        wrap.appendChild(inner); h1.appendChild(wrap);
        h1.appendChild(document.createTextNode(' '));
      }
      var nodes = Array.prototype.slice.call(h1.childNodes);
      h1.textContent = '';
      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.trim().split(/\s+/).forEach(function (w) { if (w) addWord(w); });
        } else if (node.nodeType === 1) {
          addWord(node);
        }
      });
      setTimeout(function () { h1.querySelectorAll('.ug-w').forEach(function (w) { w.classList.add('ug-on'); }); }, 120 + (window.__UGDELAY || 0));
    }
    var counters = [];
    /* reveal via rect checks: IntersectionObserver can silently stall in hidden-at-load iframes */
    var pending = RM ? [] : els.slice();
    if (RM) els.forEach(function (el) { el.classList.add('ug-on'); });
    function revealCheck() {
      if (!pending.length) return;
      var vh = window.innerHeight || 800;
      for (var k = pending.length - 1; k >= 0; k--) {
        var r = pending[k].getBoundingClientRect();
        if (r.top < vh * 0.94 && r.bottom > 0) { pending[k].classList.add('ug-on'); pending.splice(k, 1); }
      }
    }
    var rafQueued = false;
    function onScroll() {
      if (rafQueued) return;
      rafQueued = true;
      requestAnimationFrame(function () { rafQueued = false; revealCheck(); });
    }
    function counterCheck() {
      var vh = window.innerHeight || 800;
      counters.forEach(function (c) {
        if (c.done) return;
        var r = c.el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0) {
          c.done = true;
          var t0 = null;
          function tick(ts) {
            if (!t0) t0 = ts;
            var p = Math.min((ts - t0) / 1100, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var val = c.target * eased;
            c.el.textContent = (c.target >= 1000 ? Math.round(val).toLocaleString('en-US') : (c.target % 1 ? val.toFixed(1) : Math.round(val))) + c.suffix;
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      });
    }
    window.addEventListener('scroll', function () { onScroll(); counterCheck(); }, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    revealCheck(); counterCheck();
    setTimeout(function () { revealCheck(); counterCheck(); }, 300);
    setTimeout(function () { revealCheck(); counterCheck(); }, 1200);
    /* inertial smooth-scroll moves content without scroll events - poll while anything is pending */
    if (!RM) setInterval(function () { revealCheck(); counterCheck(); }, 220);
    /* animated counters: elements that are basically a number */
    if (!RM) {
      document.querySelectorAll('[class*=stat], [class*=num], [class*=count], .metric, [class*=Stat]').forEach(function (el) {
        var t = el.textContent.trim();
        var m = t.match(/^([\d,.]+)(.*)$/);
        if (!m || m[1].length > 10 || t.length > 12) return;
        var target = parseFloat(m[1].replace(/,/g, ''));
        if (!isFinite(target) || target <= 0) return;
        var suffix = m[2] || '';
        counters.push({ el: el, target: target, suffix: suffix, done: false });
      });
    }
    /* marquee strip built from the page's own headings */
    if (has('marquee') && !RM) {
      var heads = [];
      document.querySelectorAll('h1, h2').forEach(function (h) { var t = h.textContent.trim(); if (t && heads.indexOf(t) < 0) heads.push(t); });
      if (heads.length) {
        var anchor = document.querySelector('.hero, [class*=hero], header') || document.body.firstElementChild;
        var strip = document.createElement('div');
        strip.className = 'ug-marqwrap';
        strip.setAttribute('aria-hidden', 'true');
        var seq = heads.join('  \u2726  ') + '  \u2726  ';
        var half = '';
        for (var r = 0; r < 3; r++) half += seq;
        var inner = document.createElement('span');
        inner.className = 'ug-marq';
        inner.textContent = half + half;
        strip.appendChild(inner);
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(strip, anchor.nextSibling);
      }
    }
    /* hero parallax, rAF-throttled, transform only */
    if (has('parallax') && !RM) {
      var vis = document.querySelector('.hero-visual, [class*=hero] img, [class*=mock]');
      if (vis) {
        var ticking = false;
        window.addEventListener('scroll', function () {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(function () {
            var y = window.scrollY;
            if (y < window.innerHeight * 1.2) vis.style.transform = 'translateY(' + (y * -0.07) + 'px)';
            ticking = false;
          });
        }, { passive: true });
      }
    }
    /* magnetic buttons */
    if (has('magnetic') && !RM && window.matchMedia('(hover: hover)').matches) {
      document.querySelectorAll('button, [class*=btn], .ug-ctas a').forEach(function (b) {
        b.addEventListener('mousemove', function (e) {
          var r = b.getBoundingClientRect();
          b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.24) + 'px)';
        });
        b.addEventListener('mouseleave', function () { b.style.transform = ''; });
      });
    }
    /* custom cursor (dot + lagging ring) */
    if (has('cursor') && !RM && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var ring = document.createElement('div'); ring.id = 'ug-cursor';
      var dot = document.createElement('div'); dot.id = 'ug-cursor-dot';
      document.body.appendChild(ring); document.body.appendChild(dot);
      var cx = -100, cy = -100, rx = -100, ry = -100;
      document.addEventListener('mousemove', function (e) { cx = e.clientX; cy = e.clientY; }, { passive: true });
      (function loop() {
        rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16;
        ring.style.transform = 'translate(' + (rx - 14) + 'px,' + (ry - 14) + 'px)';
        dot.style.transform = 'translate(' + (cx - 2.5) + 'px,' + (cy - 2.5) + 'px)';
        requestAnimationFrame(loop);
      })();
      document.querySelectorAll('a, button, [class*=btn]').forEach(function (el) {
        el.addEventListener('mouseenter', function () { ring.style.width = '44px'; ring.style.height = '44px'; ring.style.opacity = '.9'; });
        el.addEventListener('mouseleave', function () { ring.style.width = ''; ring.style.height = ''; ring.style.opacity = ''; });
      });
    }
    /* ---- fx modules ---- */
    /* scroll progress bar */
    if (has('progress') && !RM) {
      var bar = document.createElement('div');
      bar.id = 'ug-progress';
      document.body.appendChild(bar);
      var pTick = false;
      window.addEventListener('scroll', function () {
        if (pTick) return;
        pTick = true;
        requestAnimationFrame(function () {
          var max = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
          pTick = false;
        });
      }, { passive: true });
    }
    /* animated nav: condense + surface on scroll */
    if (has('navfx')) {
      var nav = document.querySelector('nav, header nav, [class*=nav]');
      if (nav) {
        nav.classList.add('ug-nav');
        var onNav = function () { nav.classList.toggle('ug-scrolled', window.scrollY > 40); };
        window.addEventListener('scroll', onNav, { passive: true });
        onNav();
      }
    }
    /* section storytelling: alternate slide-in sides for top-level sections */
    if (has('story') && !RM) {
      var secs = document.querySelectorAll('body > section, main > section, body > div[class*=section], body > div[class*=cards], body > div[class*=stats]');
      secs.forEach(function (s, k) {
        s.classList.add('ug-r', k % 2 ? 'ug-story-r' : 'ug-story-l');
        s.style.setProperty('--ug-i', 0);
        if (pending.indexOf(s) < 0) pending.push(s);
      });
      revealCheck();
    }
    /* interactive tilt cards */
    if (has('tilt') && !RM && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var maxDeg = INTENSITY === 'subtle' ? 4 : 8;
      document.querySelectorAll('[class*=card], [class*=Card]').forEach(function (c) {
        c.setAttribute('data-ug-tilt', '');
        var parent = c.parentElement;
        if (parent) parent.style.perspective = '900px';
        c.addEventListener('mousemove', function (e) {
          var r = c.getBoundingClientRect();
          var rx = ((e.clientY - r.top) / r.height - 0.5) * -2 * maxDeg;
          var ry = ((e.clientX - r.left) / r.width - 0.5) * 2 * maxDeg;
          c.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
        });
        c.addEventListener('mouseleave', function () { c.style.transform = ''; });
      });
    }
    /* text scramble on headline hover */
    if (has('scramble') && !RM) {
      var GLYPHS = '!<>-_/[]{}=+*^?#';
      function scramble(el) {
        if (el.__ugBusy) return;
        el.__ugBusy = true;
        var orig = el.__ugOrig || (el.__ugOrig = el.textContent);
        var frame = 0, total = Math.min(orig.length * 2, 36);
        var iv = setInterval(function () {
          frame++;
          var out = '';
          for (var k = 0; k < orig.length; k++) {
            out += (k < (frame / total) * orig.length) ? orig[k] : (orig[k] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]);
          }
          el.textContent = out;
          if (frame >= total) { clearInterval(iv); el.textContent = orig; el.__ugBusy = false; }
        }, 28);
      }
      document.querySelectorAll('h1, h2').forEach(function (h) {
        h.addEventListener('mouseenter', function () { scramble(h); });
      });
    }
    /* split-char reveals for h2s */
    if (has('split') && !RM) {
      document.querySelectorAll('h2').forEach(function (h) {
        if (h.__ugSplit) return;
        h.__ugSplit = true;
        var text = h.textContent;
        h.textContent = '';
        var idx = 0;
        text.split(/(\s+)/).forEach(function (piece) {
          if (/^\s+$/.test(piece)) { h.appendChild(document.createTextNode(piece)); return; }
          var wrap = document.createElement('span');
          wrap.className = 'ug-cw';
          for (var k = 0; k < piece.length; k++) {
            var ch = document.createElement('span');
            ch.className = 'ug-c';
            ch.style.setProperty('--ug-i', Math.min(idx++, 24));
            ch.textContent = piece[k];
            wrap.appendChild(ch);
          }
          h.appendChild(wrap);
        });
        h.classList.add('ug-r');
        pending.push(h);
      });
      revealCheck();
    }
    /* light/dark toggle when the direction ships a dark variant */
    if (has('theme')) {
      var btn = document.createElement('button');
      btn.id = 'ug-theme';
      btn.setAttribute('aria-label', 'toggle dark mode');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
      var root = document.documentElement;
      try { if (localStorage.getItem('ug-theme') === 'dark') root.setAttribute('data-ug-theme', 'dark'); } catch (e) {}
      btn.addEventListener('click', function () {
        var dark = root.getAttribute('data-ug-theme') === 'dark';
        if (dark) root.removeAttribute('data-ug-theme'); else root.setAttribute('data-ug-theme', 'dark');
        try { localStorage.setItem('ug-theme', dark ? 'light' : 'dark'); } catch (e) {}
      });
      document.body.appendChild(btn);
    }
  });
})();
`;



const DIRS = {
  editorial: {
    name: 'Editorial',
    hint: 'paper, ink, a serif with a point of view',
    motion: 'split story progress navfx theme',
    mcss: `
      .ug-r { transform: translateY(26px); filter: blur(6px); transition-duration: .9s, .9s, .9s; transition-property: opacity, transform, filter; }
      .ug-r.ug-on { filter: blur(0); }
      h1 .ug-w { transition-duration: .95s; }
      a { text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 3px; transition: text-decoration-color .25s ease, color .18s ease; }
      a:hover { text-decoration-color: currentColor; }
    
      html[data-ug-theme=dark] body { background: #1c1a16 !important; color: #ece5d8 !important; }
      html[data-ug-theme=dark] [class*=card], html[data-ug-theme=dark] [class*=Card], html[data-ug-theme=dark] [class*=hero-visual], html[data-ug-theme=dark] [class*=mock] { background: #26231e !important; border-color: #4a443a !important; color: #ece5d8 !important; }
      html[data-ug-theme=dark] h1, html[data-ug-theme=dark] h2, html[data-ug-theme=dark] h3 { color: #f3ecdd !important; }
      html[data-ug-theme=dark] p, html[data-ug-theme=dark] li, html[data-ug-theme=dark] span { color: #cfc6b4 !important; }
      html[data-ug-theme=dark] .ug-marqwrap { background: #c8871a !important; color: #1c1a16 !important; border-color: #ece5d8 !important; }
`,
    fonts: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap",
    css: `
      * { box-shadow: none !important; text-shadow: none !important; }
      body { background: #f6f1e6 !important; color: #17150f !important; font-family: 'Newsreader', Georgia, serif !important; line-height: 1.58 !important; font-size: 17px !important; }
      h1, h2, h3, h4 { font-family: 'Fraunces', serif !important; font-weight: 600 !important; letter-spacing: -0.02em !important; color: #17150f !important; background: none !important; -webkit-text-fill-color: #17150f !important; line-height: 1.06 !important; margin: 0 0 16px !important; }
      h1 { font-size: clamp(40px, 6vw, 66px) !important; }
      h2 { font-size: clamp(26px, 3.4vw, 38px) !important; margin-top: 64px !important; }
      h3 { font-size: 22px !important; }
      p { margin: 0 0 14px !important; max-width: 68ch; }
      p, li, span, div, section, header, main, footer, nav { background-image: none !important; }
      body, section, header, main, footer, body > * { background-color: transparent !important; }
      [class*=card], [class*=Card] { background: #fffdf6 !important; border: 1.5px solid #17150f !important; border-radius: 0 !important; padding: 24px !important; }
      [class*=card]:hover { background: #fff !important; border-color: #b7410f !important; }
      .ug-ic { vertical-align: -3px; }
      button, [class*=btn], [class*=Btn], a[class*=button], input[type=submit] { background: #17150f !important; color: #f6f1e6 !important; border: 1.5px solid #17150f !important; border-radius: 0 !important; padding: 12px 28px !important; font-family: 'IBM Plex Mono', monospace !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.12em !important; }
      button:hover, [class*=btn]:hover { background: #b7410f !important; border-color: #b7410f !important; color: #fff !important; }
      a { color: #b7410f !important; text-decoration: underline 1px rgba(183,65,15,.35) !important; text-underline-offset: 3px !important; }
      a:hover { text-decoration-color: #b7410f !important; }
      nav, header { border-bottom: 1.5px solid #17150f !important; }
      img { border-radius: 0 !important; }
      hr { border: none !important; border-top: 1.5px solid #17150f !important; margin: 48px 0 !important; }
      input, textarea, select { background: #fffdf6 !important; border: 1.5px solid #17150f !important; border-radius: 0 !important; color: #17150f !important; font-family: 'Newsreader', serif !important; padding: 8px 12px !important; }
      ::selection { background: #b7410f; color: #f6f1e6; }
      [class*=hero-visual], [class*=mockup], [class*=preview] { background: #fffdf6 !important; border: 1.5px solid #17150f !important; border-radius: 0 !important; padding: 24px !important; }
      [class*=mock-row] { background: transparent !important; border-bottom: 1px solid #d8cfba !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 12px 4px !important; }
      [class*=mock-bar] { background: #b7410f !important; border-radius: 0 !important; margin-top: 12px !important; }
      [class*=mock-dot] { background: #b7410f !important; border-radius: 0 !important; }
    `,
  },
  brutalist: {
    name: 'Brutalist',
    hint: 'hard borders, mono labels, no mercy',
    motion: 'marquee scramble tilt progress navfx',
    mcss: `
      .ug-r { transform: translateX(-26px); transition-duration: .38s; transition-timing-function: cubic-bezier(.7,0,.2,1); }
      .ug-marqwrap { border-top: 2.5px solid #101010; border-bottom: 2.5px solid #101010; padding: 8px 0; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; letter-spacing: .06em; background: #ffd900; color: #101010; }
      [class*=card]:hover, [class*=Card]:hover { background: #101010 !important; color: #fff500 !important; }
    `,
    fonts: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600&display=swap',
    css: `
      body { background: #f2f2ee !important; color: #101010 !important; font-family: 'Space Grotesk', sans-serif !important; line-height: 1.5 !important; }
      h1, h2, h3, h4 { font-family: 'Space Grotesk', sans-serif !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: -0.01em !important; color: #101010 !important; background: none !important; -webkit-text-fill-color: #101010 !important; line-height: 0.98 !important; margin: 0 0 18px !important; }
      h1 { font-size: clamp(42px, 7vw, 80px) !important; }
      h2 { font-size: clamp(26px, 3.6vw, 40px) !important; margin-top: 72px !important; }
      p { margin: 0 0 14px !important; max-width: 62ch; }
      section, header, main, footer, div, nav, p, li, span { background-image: none !important; }
      [class*=card], [class*=Card] { background: #fff !important; border: 2.5px solid #101010 !important; border-radius: 0 !important; box-shadow: 6px 6px 0 #101010 !important; padding: 24px !important; transition: transform .15s ease, box-shadow .15s ease; }
      [class*=card]:hover { transform: translate(-2px,-2px) !important; box-shadow: 9px 9px 0 #101010 !important; }
      button, [class*=btn], [class*=Btn], a[class*=button], input[type=submit] { background: #d8f34e !important; color: #101010 !important; border: 2.5px solid #101010 !important; border-radius: 0 !important; box-shadow: 4px 4px 0 #101010 !important; padding: 12px 24px !important; font-family: 'IBM Plex Mono', monospace !important; font-weight: 600 !important; font-size: 13px !important; text-transform: uppercase !important; }
      button:hover, [class*=btn]:hover { background: #101010 !important; color: #d8f34e !important; }
      nav, header { border-bottom: 2.5px solid #101010 !important; }
      a { color: #101010 !important; text-decoration: underline 2px !important; }
      img { border-radius: 0 !important; border: 2.5px solid #101010 !important; }
      input, textarea, select { background: #fff !important; border: 2.5px solid #101010 !important; border-radius: 0 !important; font-family: 'IBM Plex Mono', monospace !important; padding: 8px 12px !important; }
      [class*=hero-visual], [class*=mockup], [class*=preview] { background: #fff !important; border: 2.5px solid #101010 !important; border-radius: 0 !important; box-shadow: 6px 6px 0 #101010 !important; padding: 24px !important; }
      [class*=mock-row] { background: #f2f2ee !important; border: 2px solid #101010 !important; border-radius: 0 !important; margin-bottom: 12px !important; }
      [class*=mock-bar] { background: #101010 !important; border-radius: 0 !important; }
      [class*=mock-dot] { background: #d8f34e !important; border: 2px solid #101010 !important; border-radius: 0 !important; }
    `,
  },
  swiss: {
    name: 'Swiss',
    hint: 'white space, one red, huge tight type',
    motion: 'story progress navfx theme',
    mcss: `
      .ug-r { transform: translateY(12px); transition-duration: .5s; transition-delay: calc(var(--ug-i, 0) * 55ms); }
      [class*=card]:hover, [class*=Card]:hover { border-color: #e30613 !important; }
    
      html[data-ug-theme=dark] body { background: #141414 !important; color: #f2f2f0 !important; }
      html[data-ug-theme=dark] [class*=card], html[data-ug-theme=dark] [class*=Card], html[data-ug-theme=dark] [class*=hero-visual], html[data-ug-theme=dark] [class*=mock] { background: #1e1e1e !important; border-color: #3a3a3a !important; color: #f2f2f0 !important; }
      html[data-ug-theme=dark] h1, html[data-ug-theme=dark] h2, html[data-ug-theme=dark] h3 { color: #ffffff !important; }
      html[data-ug-theme=dark] p, html[data-ug-theme=dark] li, html[data-ug-theme=dark] span { color: #c8c8c4 !important; }
`,
    fonts: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;800&family=IBM+Plex+Mono:wght@400;500&display=swap',
    css: `
      * { box-shadow: none !important; text-shadow: none !important; border-radius: 0 !important; }
      body { background: #ffffff !important; color: #111111 !important; font-family: 'Archivo', sans-serif !important; line-height: 1.5 !important; }
      h1, h2, h3, h4 { font-family: 'Archivo', sans-serif !important; font-weight: 800 !important; letter-spacing: -0.04em !important; color: #111 !important; background: none !important; -webkit-text-fill-color: #111 !important; line-height: 0.95 !important; text-transform: none !important; margin: 0 0 18px !important; }
      h1 { font-size: clamp(42px, 5.6vw, 72px) !important; }
      h2 { font-size: clamp(28px, 3.8vw, 44px) !important; margin-top: 80px !important; }
      p { margin: 0 0 14px !important; max-width: 60ch; }
      section, header, main, footer, div, nav, p, li, span { background-image: none !important; }
      [class*=card], [class*=Card] { background: #fff !important; border: none !important; border-top: 3px solid #111 !important; padding: 20px 0 !important; }
      [class*=card]:hover { border-top-color: #e2001a !important; }
      button, [class*=btn], [class*=Btn], a[class*=button], input[type=submit] { background: #e2001a !important; color: #fff !important; border: none !important; padding: 16px 32px !important; font-family: 'Archivo', sans-serif !important; font-weight: 500 !important; font-size: 14px !important; letter-spacing: 0 !important; text-transform: none !important; box-shadow: none !important; }
      button:hover, [class*=btn]:hover { background: #111 !important; }
      nav, header { border-bottom: 1px solid #111 !important; }
      a { color: #e2001a !important; }
      [class*=hero] { text-align: left !important; }
      [class*=hero] p { margin-left: 0 !important; }
      input, textarea, select { border: 1px solid #111 !important; padding: 8px 12px !important; font-family: 'Archivo', sans-serif !important; }
      [class*=hero-visual], [class*=mockup], [class*=preview] { background: #fff !important; border: none !important; border-top: 3px solid #111 !important; padding: 24px 0 !important; }
      [class*=mock-row] { background: transparent !important; border-bottom: 1px solid #ddd !important; border-radius: 0 !important; margin-bottom: 0 !important; padding: 12px 0 !important; }
      [class*=mock-bar] { background: #e2001a !important; border-radius: 0 !important; }
      [class*=mock-dot] { background: #e2001a !important; border-radius: 0 !important; }
    `,
  },
  night: {
    name: 'Night Terminal',
    hint: 'dark room, amber mono glow',
    motion: 'parallax magnetic cursor tilt scramble progress navfx',
    mcss: `
      .ug-r { transform: translateY(18px); transition-duration: .8s; }
      #ug-cursor, #ug-cursor-dot { color: #ffb000; }
      [class*=card]:hover, [class*=Card]:hover { border-color: #ffb000 !important; }
    `,
    fonts: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;700&display=swap',
    css: `
      * { text-shadow: none !important; }
      body { background: #0f0f0c !important; color: #e8e4d8 !important; font-family: 'Space Grotesk', sans-serif !important; line-height: 1.55 !important; }
      h1, h2, h3, h4 { font-family: 'IBM Plex Mono', monospace !important; font-weight: 600 !important; color: #ffb000 !important; background: none !important; -webkit-text-fill-color: #ffb000 !important; letter-spacing: -0.02em !important; margin: 0 0 16px !important; }
      h1 { font-size: clamp(34px, 5vw, 56px) !important; }
      h2 { margin-top: 64px !important; }
      p { margin: 0 0 14px !important; max-width: 64ch; }
      section, header, main, footer, div, nav, p, li, span { background-image: none !important; }
      [class*=card], [class*=Card] { background: #171714 !important; border: 1px solid #3a382e !important; border-radius: 6px !important; box-shadow: none !important; padding: 24px !important; transition: border-color .18s ease; }
      [class*=card]:hover { border-color: #ffb000 !important; }
      button, [class*=btn], [class*=Btn], a[class*=button], input[type=submit] { background: #ffb000 !important; color: #0f0f0c !important; border: none !important; border-radius: 4px !important; box-shadow: none !important; padding: 12px 24px !important; font-family: 'IBM Plex Mono', monospace !important; font-weight: 600 !important; font-size: 13px !important; }
      button:hover, [class*=btn]:hover { background: #ffd24d !important; }
      nav, header { border-bottom: 1px solid #3a382e !important; }
      a { color: #ffb000 !important; }
      input, textarea, select { background: #171714 !important; border: 1px solid #3a382e !important; color: #e8e4d8 !important; padding: 8px 12px !important; }
      ::selection { background: #ffb000; color: #0f0f0c; }
      [class*=hero-visual], [class*=mockup], [class*=preview] { background: #171714 !important; border: 1px solid #3a382e !important; border-radius: 6px !important; padding: 24px !important; }
      [class*=mock-row] { background: transparent !important; border-bottom: 1px solid #3a382e !important; border-radius: 0 !important; margin-bottom: 0 !important; }
      [class*=mock-bar] { background: #ffb000 !important; border-radius: 2px !important; }
      [class*=mock-dot] { background: #ffb000 !important; }
    `,
  },
};

const LAYOUT_CSS = `
  h1, h2, h3 { text-wrap: pretty !important; }
  body > * { max-width: 1160px !important; margin-left: auto !important; margin-right: auto !important; }
  section, [class*=section] { padding-top: 56px !important; padding-bottom: 56px !important; }
  [class*=hero] { padding: 88px 24px 72px !important; }
  .ug-hero { display: grid !important; grid-template-columns: 1.05fr 0.95fr !important; gap: 56px !important; align-items: center !important; text-align: left !important; }
  .ug-hero .ug-hero-t p { margin-left: 0 !important; margin-right: 0 !important; }
  .ug-hero .ug-hero-b { display: flex !important; gap: 14px !important; flex-wrap: wrap !important; margin-top: 8px; }
  .ug-hero-v img, .ug-hero-v svg:not(.ug-ic) { width: 100% !important; height: auto !important; }
  .ug-hero-left { text-align: left !important; }
  .ug-hero-left h1 { margin-left: 0 !important; }
  .ug-hero-left p { margin-left: 0 !important; }
  [class*=cards], [class*=grid], [class*=features] { gap: 22px !important; }
  [class*=stats] { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 22px !important; padding: 24px !important; }
  [class*=stat] .num, [class*=stat] [class*=num] { font-size: 40px !important; font-weight: 800 !important; display: block !important; background: none !important; -webkit-text-fill-color: currentColor !important; }
  [class*=stat] .lbl, [class*=stat] [class*=lbl] { font-size: 13px !important; opacity: .7 !important; }
  @media (max-width: 720px) { [class*=stats] { grid-template-columns: 1fr !important; } }
  @media (max-width: 720px) {
    .ug-hero { grid-template-columns: 1fr !important; gap: 32px !important; }
    [class*=cards], [class*=grid], [class*=features] { grid-template-columns: 1fr !important; display: block !important; }
    [class*=card], [class*=Card] { margin-bottom: 16px !important; }
  }
`;

/* ---------------- tiny HTML tree (no deps) ---------------- */

const VOID_TAGS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const RAW_TAGS = new Set(['script','style']);

function parseHTML(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  let cur = root, i = 0;
  const n = html.length;
  while (i < n) {
    if (html.startsWith('<!--', i)) {
      const e = html.indexOf('-->', i + 4);
      const end = e < 0 ? n : e + 3;
      cur.children.push({ tag: '#raw', text: html.slice(i, end), parent: cur });
      i = end; continue;
    }
    if (html[i] === '<') {
      const gt = html.indexOf('>', i);
      if (gt < 0) { cur.children.push({ tag: '#text', text: html.slice(i), parent: cur }); break; }
      const inner = html.slice(i + 1, gt);
      if (inner.startsWith('!') || inner.startsWith('?')) {
        cur.children.push({ tag: '#raw', text: html.slice(i, gt + 1), parent: cur });
        i = gt + 1; continue;
      }
      if (inner[0] === '/') {
        const name = inner.slice(1).trim().toLowerCase().split(/\s/)[0];
        let p = cur;
        while (p !== root && p.tag !== name) p = p.parent;
        cur = p.parent || root;
        i = gt + 1; continue;
      }
      const m = inner.match(/^([a-zA-Z][\w-]*)([\s\S]*?)\/?$/);
      const tag = (m ? m[1] : inner).toLowerCase();
      const attrSrc = m ? m[2] : '';
      const attrs = {};
      for (const am of attrSrc.matchAll(/([\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|(\S+)))?/g))
        attrs[am[1].toLowerCase()] = am[3] ?? am[4] ?? am[5] ?? '';
      const el = { tag, attrs, children: [], parent: cur, selfClose: /\/$/.test(inner) };
      cur.children.push(el);
      i = gt + 1;
      if (RAW_TAGS.has(tag) && !el.selfClose) {
        const close = html.toLowerCase().indexOf('</' + tag, i);
        const end = close < 0 ? n : close;
        el.children.push({ tag: '#text', text: html.slice(i, end), parent: el });
        const gt2 = html.indexOf('>', end);
        i = gt2 < 0 ? n : gt2 + 1;
      } else if (!VOID_TAGS.has(tag) && !el.selfClose) cur = el;
      continue;
    }
    const lt = html.indexOf('<', i);
    const end = lt < 0 ? n : lt;
    cur.children.push({ tag: '#text', text: html.slice(i, end), parent: cur });
    i = end;
  }
  return root;
}

/* a CTA with a real href stays a link; a mock CTA from the source becomes an
   href-less anchor (styled the same, honestly not a link, no dead href="#") */
function ctaEl(m, c, i, cls, arrow) {
  const h = m.ctaHrefs && m.ctaHrefs[i];
  const label = (arrow && i === 0 ? '&rarr; ' : '') + escHtml(c);
  const c2 = cls ? ` class="${cls}"` : '';
  return (h && h !== '#') ? `<a href="${escHtml(h)}"${c2}>${label}</a>` : `<a${c2}>${label}</a>`;
}

function serialize(node) {
  if (node.tag === '#text' || node.tag === '#raw') return node.text;
  if (node.tag === '#root') return node.children.map(serialize).join('');
  /* empty-value attrs serialize bare, except alt: alt="" is meaningful (decorative image) and validators expect the value */
  const attrs = Object.entries(node.attrs).map(([k, v]) => (v === '' && k !== 'alt') ? ` ${k}` : ` ${k}="${v}"`).join('');
  if (VOID_TAGS.has(node.tag) || node.selfClose) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${node.children.map(serialize).join('')}</${node.tag}>`;
}

function walk(node, fn, inRaw) {
  if (node.tag === '#text') { if (!inRaw) fn(node); return; }
  if (node.tag === '#raw') return;
  const raw = inRaw || RAW_TAGS.has(node.tag);
  for (const c of node.children || []) walk(c, fn, raw);
}

function classMatch(el, re) {
  return re.test((el.attrs.class || '') + ' ' + (el.attrs.id || ''));
}
function findAll(node, pred, out = []) {
  if (!node.tag.startsWith('#') && pred(node)) out.push(node);
  for (const c of node.children || []) findAll(c, pred, out);
  return out;
}
function containsTag(el, tag) { return findAll(el, x => x.tag === tag).length > 0; }

/* ---------------- copy cleanup ---------------- */
const COPY = [
  /* phrase-level first: full-pattern replacements beat word swaps */
  [/\b[Gg]et [Ss]tarted( today| now| for free)?\b/g, () => 'Try it'],
  [/\b[Ll]earn [Mm]ore\b/g, () => 'How it works'],
  /* rewrites must not produce phrases the stock-copy check flags ("Try it free" matches) */
  [/\b[Ss]ign up free\b/gi, () => 'Create a free account'],
  [/\b[Ss]tart (your )?free trial\b/gi, () => 'Get the free trial'],
  [/\b[Uu]nlock\s+/g, () => ''],
  [/\b[Ss]upercharge\b/g, (m) => m[0] === 'S' ? 'Speed up' : 'speed up'],
  [/\bseamless(ly)?\b/gi, (m) => /ly$/i.test(m) ? 'smoothly' : 'smooth'],
  [/\bcutting-edge\b/gi, () => 'new'],
  [/\bnext-generation\b|\bnext-gen\b/gi, () => 'new'],
  [/\b[Ee]levate\b/g, (m) => m[0] === 'E' ? 'Raise' : 'raise'],
  [/\b[Ee]mpower(s|ing|ed)?\b/g, (m, sfx) => (m[0] === 'E' ? 'Help' : 'help') + (sfx || '')],
  [/\b[Dd]elve into\b/g, (m) => m[0] === 'D' ? 'Dig into' : 'dig into'],
  [/\brobust\b/gi, () => 'strong'],
  [/\bworld-class\s*/gi, () => ''],
  [/\bbest-in-class\s*/gi, () => ''],
  [/\b[Bb]oost your\b/g, (m) => m[0] === 'B' ? 'Improve your' : 'improve your'],
  [/take your ([\w ]{2,24}?) to the next level/gi, (m, x) => 'make your ' + x + ' better'],
  [/\bgame-chang\w+\b/gi, () => 'notable'],
  [/\beffortless(ly)?\b/gi, (m) => /ly$/i.test(m) ? 'easily' : 'easy'],
  [/\bai-powered\b\s*/gi, () => ''],
  [/\b[Ll]everage\b/g, (m) => m[0] === 'L' ? 'Use' : 'use'],
  [/\bstreamline\w*\b/gi, () => 'simplify'],
  [/\b[Rr]evolutioniz\w*\b/g, (m) => m[0] === 'R' ? 'Change' : 'change'],
  [/\b[Uu]nleash\w*\b/g, (m) => m[0] === 'U' ? 'Start' : 'start'],
  [/\b[Hh]arness\b/g, (m) => m[0] === 'H' ? 'Use' : 'use'],
  [/\bturbocharg\w+\b/gi, () => 'speed up'],
  [/\b[Rr]eimagin\w+\b/g, (m) => m[0] === 'R' ? 'Rethink' : 'rethink'],
  [/\b[Tt]ransform your\b/g, (m) => m[0] === 'T' ? 'Improve your' : 'improve your'],
  [/\bin today's fast-paced (world|landscape)\b/gi, () => 'today'],
  [/\b[Ll]ook no further[!.]?/g, () => ''],
  [/\b[Ss]ay goodbye to\b/g, () => 'drop'],
  [/\ball-in-one\s*/gi, () => ''],
  [/\bone-stop\s*/gi, () => ''],
  [/\b[Uu]tiliz\w+\b/g, (m) => m[0] === 'U' ? 'Use' : 'use'],
  [/\binnovative\s*/gi, () => ''],
  [/\bsynerg\w+\b/gi, () => 'fit'],
  [/\bstate-of-the-art\s*/gi, () => ''],
  [/\bever-evolving\s*/gi, () => ''],
  [/\b[Ss]upercharg\w+\b/g, (m) => m[0] === 'S' ? 'Speed up' : 'speed up'],
];

function applyCopyTree(root) {
  const notes = [];
  walk(root, (t) => {
    let s = t.text;
    for (const [re, fn] of COPY) {
      s = s.replace(re, (m, ...rest) => {
        const groups = rest.slice(0, -2);
        const r = fn(m, ...groups);
        if (notes.length < 30) notes.push([m, r]);
        return r;
      });
    }
    s = s.replace(/\b(\w+),\s*\1\b/gi, '$1').replace(/[ \t]{2,}/g, ' ');
    t.text = s;
  });
  const seen = new Set();
  const uniq = notes.filter(([a]) => { const k = a.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  return uniq;
}

/* sparkle badges announcing "New / Beta / PRO" get removed */
function dropBadges(root) {
  let n = 0;
  for (const el of findAll(root, el => /^(span|div|a)$/.test(el.tag) && classMatch(el, /badge|pill|tag-/i))) {
    const txt = [];
    walk(el, t => txt.push(t.text));
    const s = txt.join(' ').trim();
    if (s.length <= 26 && /new|beta|\bpro\b|soon|hot/i.test(s)) {
      const p = el.parent;
      if (p) { p.children = p.children.filter(c => c !== el); n++; }
    }
  }
  return n;
}

/* exclamation marks at the end of headings */
function fixHeadings(root) {
  let n = 0;
  for (const h of findAll(root, el => /^h[1-4]$/.test(el.tag)))
    walk(h, t => { const s = t.text.replace(/!+\s*$/, ''); if (s !== t.text) { t.text = s; n++; } });
  return n;
}

/* emoji -> inline svg icons (decorative ones dropped) */
function replaceEmoji(root) {
  let replaced = 0, dropped = 0;
  walk(root, (t) => {
    t.text = t.text.replace(EMOJI, (e) => {
      const name = EMOJI_ICON[e];
      if (name) { replaced++; return iconSVG(name); }
      dropped++; return '';
    });
    t.text = t.text.replace(/[ \t]{2,}/g, ' ');
  });
  return { replaced, dropped };
}

/* strip looping animations and transition-all from raw css + inline styles */
function stripMotion(html) {
  let n = 0;
  html = html.replace(/animation\s*:[^;}"]*(pulse|ping|bounce|spin|float|shimmer|breathe|gradient)[^;}"]*/gi, () => { n++; return ''; });
  html = html.replace(/\banimate-(pulse|ping|bounce|spin)\b/g, () => { n++; return ''; });
  html = html.replace(/transition\s*:\s*all(\s+[\w.,\s-]+)?(;|(?=}))/gi, () => { n++; return 'transition: color .2s, background-color .2s, border-color .2s;'; });
  html = html.replace(/\btransition-all\b/g, () => { n++; return 'transition-colors'; });
  html = html.replace(/:hover\s*{([^}]*)transform\s*:\s*scale\([^)]*\);?([^}]*)}/gi, (m, a, b) => { n++; return `:hover{${a}${b}}`; });
  html = html.replace(/\bhover:scale-\d+\b/g, () => { n++; return ''; });
  return { html, n };
}

/* hero rebuild: split into text + visual, or left-align a stacked centered hero */
function rebuildHero(root, fixes) {
  let hero = findAll(root, el => (el.tag === 'section' || el.tag === 'div' || el.tag === 'header') && classMatch(el, /hero/i))[0];
  if (!hero) {
    const h1 = findAll(root, el => el.tag === 'h1')[0];
    if (h1) { let p = h1.parent; while (p && !/^(section|div|header|main)$/.test(p.tag)) p = p.parent; hero = p; }
  }
  if (!hero) return;
  const visuals = [], texts = [], buttons = [];
  const isVisual = (el) => ['img', 'picture', 'video', 'figure'].includes(el.tag) || classMatch(el, /visual|screenshot|preview|mockup|image|illustration/i);
  for (const c of [...hero.children]) {
    if (c.tag === '#text' && !c.text.trim()) continue;
    if (c.tag && c.tag.startsWith('#')) { texts.push(c); continue; }
    if (isVisual(c)) visuals.push(c);
    else if (['button', 'a'].includes(c.tag) || (containsTag(c, 'button') && !containsTag(c, 'h1') && !containsTag(c, 'h2'))) buttons.push(c);
    else texts.push(c);
  }
  const cls = (hero.attrs.class || '');
  if (visuals.length) {
    const t = { tag: 'div', attrs: { class: 'ug-hero-t' }, children: texts, parent: hero };
    const b = { tag: 'div', attrs: { class: 'ug-hero-b' }, children: buttons, parent: hero };
    t.children.forEach(c => c.parent = t); b.children.forEach(c => c.parent = b);
    const v = { tag: 'div', attrs: { class: 'ug-hero-v' }, children: visuals, parent: hero };
    v.children.forEach(c => c.parent = v);
    t.children = [...t.children, b];
    hero.children = [t, v];
    hero.attrs.class = (cls + ' ug-hero').trim();
    fixes.push('Rebuilt the hero into a text + visual split layout');
  } else {
    hero.children = texts.concat(buttons);
    hero.attrs.class = (cls + ' ug-hero-left').trim();
    fixes.push('Left-aligned the centered template hero');
  }
}

/* ---------------- shared cleaning ---------------- */
function clean(html, { icons }) {
  const fixes = [], notesAll = [];
  let out = html;

  const sm = stripMotion(out);
  out = sm.html;
  if (sm.n) fixes.push(`Removed ${sm.n} looping animations / catch-all transitions`);

  const gtext = out.match(/-webkit-text-fill-color\s*:\s*transparent|background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/gi) || [];
  if (gtext.length) { out = out.replace(/-webkit-text-fill-color\s*:\s*transparent;?/gi, '').replace(/-webkit-background-clip\s*:\s*text;?/gi, '').replace(/background-clip\s*:\s*text;?/gi, ''); fixes.push(`Removed ${gtext.length} gradient-text tricks`); }

  const pills = out.match(/border-radius\s*:\s*(9999?px|50%)/gi) || [];
  if (pills.length) { out = out.replace(/border-radius\s*:\s*(9999?px|50%)/gi, 'border-radius: 6px'); fixes.push(`Un-pilled ${pills.length} pill radii`); }

  let rounded = 0;
  out = out.replace(/((?:margin|padding)(?:-(?:top|right|bottom|left))?\s*:[^;}"]*?)(\d+)px/gi, (m, pre, px) => {
    const n = parseInt(px);
    if (n > 4 && n % 4 !== 0) { rounded++; return pre + (Math.round(n / 4) * 4) + 'px'; }
    return m;
  });
  if (rounded) fixes.push(`Snapped ${rounded} off-grid spacing values to the 4px rhythm`);

  const gradBgs = out.match(/background(?:-image)?\s*:\s*[^;}"']*gradient\([^)]*\)[^;}"']*/gi) || [];
  if (gradBgs.length) { out = out.replace(/background(?:-image)?\s*:\s*[^;}"']*gradient\([^)]*\)[^;}"']*/gi, ''); fixes.push(`Stripped ${gradBgs.length} gradient backgrounds to flat surfaces`); }

  const glows = out.match(/box-shadow\s*:[^;}"]+/gi) || [];
  if (glows.length) { out = out.replace(/box-shadow\s*:\s*[^;}"]+/gi, ''); fixes.push(`Removed ${glows.length} glow shadows`); }

  const root = parseHTML(out);

  const notes = applyCopyTree(root);
  if (notes.length) fixes.push(`Cleaned ${notes.length} stock copy phrases`);
  notesAll.push(...notes);

  const hx = fixHeadings(root);
  if (hx) fixes.push(`Removed exclamation marks from ${hx} headings`);

  const bd = dropBadges(root);
  if (bd) fixes.push(`Removed ${bd} self-announcing badge${bd > 1 ? 's' : ''}`);

  if (icons) {
    const r = replaceEmoji(root);
    if (r.replaced) fixes.push(`Replaced ${r.replaced} emoji with a real line-icon set`);
    if (r.dropped) fixes.push(`Dropped ${r.dropped} decorative emoji`);
  } else {
    let count = 0;
    walk(root, t => { t.text = t.text.replace(EMOJI, () => { count++; return ''; }); });
    if (count) fixes.push(`Removed ${count} emoji used as icons/decoration`);
  }

  return { root, fixes, notes: notesAll };
}

/* polish mode: keep the design, remove the tells */
export function polish(html) {
  const { root, fixes, notes } = clean(html, { icons: false });
  const soft = `<style>${MOTION_CSS}${FX_CSS}</style><script>window.__UGMOTION='progress navfx';</script>`;
  let out = serialize(root);
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, m => m + soft);
  else out = soft + out;
  const pruntime = `<script>${MOTION_JS}</script>`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, pruntime + '</body>');
  else out = out + pruntime;
  fixes.push('Added the motion layer: scroll reveals, kinetic type, counters');
  return { html: out, fixes, notes, mode: 'polish' };
}


/* effect packs: direction defaults, auto-tuned by site type, user-overridable.
   opts.fx: { intensity: 'subtle'|'full', packs: [names] } - packs replaces defaults. */
const FX_SITE = [
  [/game|gaming|music|creator|meme|sticker|esports|play/i, ['tilt', 'scramble']],
  [/bank|finance|insurance|enterprise|legal|corporate/i, ['i-subtle']],
  [/dev|code|api|tool|terminal|docs/i, ['parallax']],
  [/blog|journal|essay|writer|news|magazine/i, ['split', 'story']],
];
export function resolveFx(dir, html, opts = {}) {
  let flags = new Set((dir.motion || '').split(/\s+/).filter(Boolean));
  const text = (html || '').slice(0, 4000);
  for (const [re, adds] of FX_SITE) if (re.test(text)) adds.forEach(a => a === 'i-subtle' ? flags.add(a) : flags.add(a));
  let intensity = 'full';
  if (flags.has('i-subtle')) intensity = 'subtle';
  if (opts.fx && Array.isArray(opts.fx.packs)) flags = new Set(opts.fx.packs.concat(opts.fx.intensity === 'subtle' ? ['i-subtle'] : []));
  if (opts.fx && opts.fx.intensity) intensity = opts.fx.intensity;
  if (intensity === 'subtle') flags.add('i-subtle'); else flags.delete('i-subtle');
  if (opts.fx && opts.fx.off) flags = new Set();
  return [...flags].join(' ');
}

/* ---------------- full restyle ---------------- */

export function restyle(html, dirId, opts = {}) {
  const dir = (typeof dirId === 'object' && dirId) || REGISTRY.get(dirId) || REGISTRY.get('editorial');
  const fx = resolveFx(dir, html, opts);
  const { root, fixes, notes } = clean(html, { icons: true });

  rebuildHero(root, fixes);

  let out = serialize(root);

  const fontLinks = out.match(/<link[^>]*fonts\.googleapis[^>]*>/gi) || [];
  if (fontLinks.length) { out = out.replace(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>/gi, ''); fixes.push('Dropped the default font loading'); }
  const fams = out.match(/font-family\s*:[^;}"]+/gi) || [];
  if (fams.length) { out = out.replace(/font-family\s*:[^;}"]+/gi, ''); fixes.push('Cleared inherited font stacks (the direction sets typography)'); }

  const inject = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="${dir.fonts}" rel="stylesheet"><style>${MOTION_CSS}${FX_CSS}${dir.mcss || ''}${dir.css}${LAYOUT_CSS}</style><script>window.__UGMOTION=${JSON.stringify(fx)};</script>`;
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (m) => m + inject);
  else out = inject + out;
  const runtime = `<script>${MOTION_JS}</script>`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, runtime + '</body>');
  else out = out + runtime;
  fixes.push(`Applied the ${dir.name} design system (type, palette, surfaces, buttons)`);
  fixes.push('Added the motion layer: scroll reveals, kinetic type, counters' + (fx ? ' + fx: ' + fx.replace('i-subtle', 'subtle') : ''));

  return { html: out, fixes, notes, mode: 'full' };
}

export const DIRECTIONS = Object.fromEntries(Object.entries(DIRS).map(([k, v]) => [k, { name: v.name, hint: v.hint }]));


/* ---------------- recompose: extract the content, rebuild the page ---------------- */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '\u201c', rdquo: '\u201d', lsquo: '\u2018', rsquo: '\u2019', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', copy: '\u00a9', reg: '\u00ae', trade: '\u2122', deg: '\u00b0', middot: '\u00b7', plusmn: '\u00b1', times: '\u00d7', divide: '\u00f7', euro: '\u20ac', pound: '\u00a3', yen: '\u00a5', cent: '\u00a2', laquo: '\u00ab', raquo: '\u00bb', rarr: '\u2192', larr: '\u2190', uarr: '\u2191', darr: '\u2193', harr: '\u2194', rArr: '\u21d2', lArr: '\u21d0', hArr: '\u21d4', bull: '\u2022', dagger: '\u2020', Dagger: '\u2021', minus: '\u2212' };
function decodeEntities(t) {
  return String(t)
    .replace(/&#0*(\d+);/g, (m, d) => { try { return String.fromCodePoint(+d); } catch { return m; } })
    .replace(/&#x[0-9a-f]+;/gi, (m) => { try { return String.fromCodePoint(parseInt(m.slice(3, -1), 16)); } catch { return m; } })
    .replace(/&([a-z]{2,10});/gi, (m, n) => ENTITIES[n.toLowerCase()] || m);
}
/* <br> and block boundaries are word separators: joining without a space gives "Intakeand" */
function textOf(el) {
  let t = '';
  const rec = (node) => {
    if (node.tag === '#text') { t += node.text; return; }
    if (node.tag === '#raw') return;
    if (node.tag === 'br') { t += ' '; return; }
    for (const c of node.children || []) rec(c);
    if (/^(p|div|li|h[1-6]|section|article)$/.test(node.tag)) t += ' ';
  };
  rec(el);
  return decodeEntities(t.replace(/\s+/g, ' ').trim());
}
function cleanCopyStr(s) { const r = parseHTML(s); applyCopyTree(r); const t = textOf(r).replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); }
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

export function extract(html) {
  const root = parseHTML(html);
  const pick = (fn) => findAll(root, fn)[0];
  const titleEl = pick(el => el.tag === 'title');
  const h1el = pick(el => el.tag === 'h1');
  const heroEl = pick(el => classMatch(el, /hero/i));
  const navEl = pick(el => el.tag === 'nav');
  const logoEl = pick(el => classMatch(el, /logo|brand/i));

  let h1text = h1el ? textOf(h1el) : '';
  /* a broken page nests the whole doc inside its h1 (web.mit.edu) - treat that as no h1 */
  if (h1text.length > 140) h1text = '';
  let headline = h1text ? cleanCopyStr(h1text) : '';
  if (!headline) {
    /* real sites often have no h1 - fall back through og:title, <title>, first h2 */
    const og = pick(el => el.tag === 'meta' && /og:title/i.test(el.attrs.property || el.attrs.name || ''));
    if (og && og.attrs.content) headline = cleanCopyStr(og.attrs.content);
  }
  if (!headline && titleEl) headline = cleanCopyStr(textOf(titleEl).split(/[|\-–—]/)[0].trim());
  if (!headline) {
    const h2el = pick(el => el.tag === 'h2');
    if (h2el) headline = cleanCopyStr(textOf(h2el));
  }
  let sub = '';
  const subEl = (heroEl && findAll(heroEl, el => el.tag === 'p')[0]) || pick(el => el.tag === 'p');
  if (subEl) sub = cleanCopyStr(textOf(subEl));
  if (sub && (sub.length < 25 || !/\s/.test(sub))) sub = '';
  if (!sub) {
    const md = pick(el => el.tag === 'meta' && /^(description|og:description)$/i.test(el.attrs.name || el.attrs.property || ''));
    if (md && md.attrs.content) sub = cleanCopyStr(md.attrs.content);
  }

  /* CTAs come from the hero region first (the h1's top-level section); a page-wide
     scan picks up brand-download and mega-menu buttons instead (vercel, linear) */
  const ctas = [];
  const ctaHrefs = [];
  const pushCta = (b, anyAnchor) => {
    if (anyAnchor && b.tag !== 'a' && b.tag !== 'button') return;
    const t = cleanCopyStr(textOf(b));
    if (t && t.length >= 2 && t.length < 30 && !ctas.includes(t) && ctas.length < 3) { ctas.push(t); ctaHrefs.push(b.attrs.href || '#'); }
    /* a designed page has one primary + one ghost action; keep first and last */
  };
  const h1forCta = findAll(root, el => el.tag === 'h1')[0];
  let heroScope = null;
  if (h1forCta) { let p = h1forCta; while (p.parent && !/^(section|main|header|body|#root)$/.test(p.parent.tag)) p = p.parent; heroScope = p; }
  const isBtnish = (el) => el.tag === 'button' || (el.tag === 'a' && classMatch(el, /btn|cta|button/i));
  const ACTIONY = /^(start|try|get|sign|log|buy|shop|contact|learn|download|book|join|subscribe|see|watch|explore|request|create|build|deploy|launch|schedule|talk|read|view|browse|order|open)/i;
  const heroCta = (b) => { const t = cleanCopyStr(textOf(b)); if (/^[0-9+\d\s]*$/.test(t) || !ACTIONY.test(t)) return; pushCta(b); };
  const actionCta = (b, anyAnchor) => { const t = cleanCopyStr(textOf(b)); if (/^[0-9+\d\s]*$/.test(t) || !ACTIONY.test(t)) return; pushCta(b, anyAnchor); };
  if (heroScope) for (const b of findAll(heroScope, isBtnish)) heroCta(b);
  if (!ctas.length && heroScope) for (const b of findAll(heroScope, el => el.tag === 'a' || el.tag === 'button')) actionCta(b, true);
  if (!ctas.length) for (const b of findAll(root, isBtnish)) actionCta(b);

  let logo = '';
  if (logoEl) logo = textOf(logoEl);
  else if (navEl) {
    const first = navEl.children.find(c => c.tag && !c.tag.startsWith('#') && !/^(button|a)$/.test(c.tag));
    if (first) logo = textOf(first);
  }
  logo = logo.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
  /* a logo is a word or two - the nav fallback can swallow a whole menu tree (web.mit.edu) */
  if (logo.length > 30) logo = '';
  if (!logo && titleEl) logo = textOf(titleEl).split(/[|\-–—]/)[0].trim();
  if (logo.length > 30) logo = logo.split(/\s+/).slice(0, 3).join(' ');
  if (!logo) logo = 'Untitled';

  const links = [];
  const textOwn = (el) => { let t = ''; for (const c of el.children) if (c.tag.startsWith('#')) t += c.text; return decodeEntities(t.replace(/\s+/g, ' ').trim()); };
  if (navEl) for (const a of findAll(navEl, el => el.tag === 'a' && !classMatch(el, /btn|button/i))) {
    /* real menus nest a label + description inside one <a> - the label is the anchor's
       own direct text; fall back to the shortest descendant element that fits */
    let t = textOwn(a);
    if (t.length < 2 || t.length > 28) {
      const parts = findAll(a, c => c.tag && !c.tag.startsWith('#')).map(c => textOf(c)).filter(x => x.length >= 2 && x.length <= 28);
      t = parts.sort((x, y) => x.length - y.length)[0] || '';
    }
    if (t && !links.some(l => l.text === t) && links.length < 8) links.push({ text: decodeEntities(t), href: a.attrs.href || '#' });
  }

  const stats = [];
  for (const st of findAll(root, el => classMatch(el, /(^|\s|_)stat(?!s)|metric/i))) {
    const numEl = findAll(st, el => classMatch(el, /num|value|count|figure/i))[0];
    const lblEl = findAll(st, el => classMatch(el, /lbl|label|caption|desc/i))[0];
    const num = numEl ? textOf(numEl) : '';
    const lbl = lblEl ? textOf(lblEl) : '';
    if (num && /^[\d,.]+[%+xkKmM]*$/.test(num) && stats.length < 4) stats.push({ num, lbl });
  }

  const features = [];
  const isCard = (el) => classMatch(el, /card|feature/i);
  for (const c of findAll(root, el => isCard(el) && !findAll(el, x => x !== el && isCard(x)).length)) {
    const h = findAll(c, el => /^h[2-4]$/.test(el.tag))[0];
    const p = findAll(c, el => el.tag === 'p')[0];
    const ic = findAll(c, el => classMatch(el, /icon|emoji/i))[0];
    if (h && features.length < 6) {
      const emoji = ic ? (textOf(ic).match(EMOJI) || [])[0] : null;
      features.push({ title: cleanCopyStr(textOf(h)), text: p ? cleanCopyStr(textOf(p)) : '', icon: (emoji && EMOJI_ICON[emoji]) || null });
    }
  }

  if (!features.length) {
    /* modern marketing markup often has no card classes: h3+p pairs repeated as siblings */
    const groups = new Map();
    const inChrome2 = (el) => { let p = el.parent; while (p) { if (p.tag === 'footer' || p.tag === 'nav' || p.tag === 'header' || classMatch(p, /footer|navbar|masthead/i)) return true; p = p.parent; } return false; };
    for (const h of findAll(root, el => el.tag === 'h3' && !inChrome2(el))) {
      if (!h.parent) continue;
      const sig = h.parent.tag + '.' + (h.parent.attrs.class || '').split(/\s+/)[0];
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig).push(h);
    }
    const best = [...groups.values()].sort((a, b) => b.length - a.length)[0] || [];
    if (best.length >= 3) {
      for (const h of best.slice(0, 6)) {
        const t = cleanCopyStr(textOf(h));
        if (t.length < 2 || t.length > 60) continue;
        const p = findAll(h.parent, el => el.tag === 'p')[0];
        features.push({ title: t, text: p ? cleanCopyStr(textOf(p)) : '', icon: null });
      }
    }
  }

  const headings = findAll(root, el => el.tag === 'h2').map(el => cleanCopyStr(textOf(el))).filter(Boolean);

  const figureLines = [];
  const visEl = pick(el => classMatch(el, /hero-visual|mockup|preview|screenshot/i));
  if (visEl) for (const r of findAll(visEl, el => classMatch(el, /row|line|item|msg/i))) {
    const t = cleanCopyStr(textOf(r));
    if (t && figureLines.length < 5) figureLines.push(t);
  }
  /* only absolute image URLs survive a rebuild - relative paths break offsite.
     skip image maps, tracking pixels and images inside nav/logo chrome (paulgraham's nav GIF) */
  const inChrome = (el) => { let p = el.parent; while (p) { if (p.tag === 'nav' || p.tag === 'header' || classMatch(p, /logo|brand|navbar|masthead/i)) return true; p = p.parent; } return false; };
  const imgEls = findAll(root, el => el.tag === 'img' && /^https?:\/\//i.test(el.attrs.src || '') && !el.attrs.usemap && !inChrome(el)
    && Math.min(+el.attrs.width || 999, +el.attrs.height || 999) > 4);
  const img = imgEls.length ? { src: imgEls[0].attrs.src, alt: imgEls[0].attrs.alt || '' } : null;
  const imgs = imgEls.map(e2 => ({ src: e2.attrs.src, alt: e2.attrs.alt || '' }));
  const vidEl = pick(el => (el.tag === 'video' && el.attrs.src) || el.tag === 'source');
  const video = vidEl ? (vidEl.attrs.src || '') : '';

  /* a CTA is an action, not a nav link or the logo with a button-ish class (linear.app) */
  const navTexts = new Set(links.map(l => l.text));
  if (logo) navTexts.add(logo);
  const pairs = ctas.map((t, i) => [t, ctaHrefs[i]]).filter(([t]) => !navTexts.has(t));
  const kept = pairs.length > 2 ? [pairs[0], pairs[pairs.length - 1]] : pairs;
  const ctas2 = kept.map(([t]) => t);
  const ctaHrefs2 = kept.map(([, h]) => h);
  return { title: titleEl ? cleanCopyStr(textOf(titleEl)) : '', logo, headline, sub, ctas: ctas2, ctaHrefs: ctaHrefs2, links, stats, features, headings, figureLines, img, imgs, video };
}

const COMPOSE_ICON_CYCLE = ['bolt', 'shield', 'bulb', 'chart', 'target', 'gear'];
function featureIcon(f, i) { return f.icon || COMPOSE_ICON_CYCLE[i % COMPOSE_ICON_CYCLE.length]; }

/* --- EDITORIAL: the broadsheet. huge serif, rules, figures, colophon --- */
const COMPOSE_EDITORIAL_CSS = `
  body { background: #f6f1e6 !important; color: #17150f !important; font-family: 'Newsreader', Georgia, serif !important; margin: 0 !important; }
  .ug-page { max-width: 1240px; margin: 0 auto; padding: 0 32px; }
  .ug-masthead { display: flex; justify-content: space-between; align-items: baseline; padding: 24px 0 20px; border-bottom: 3px double #17150f; }
  .ug-masthead .ug-logo { font-family: 'Fraunces', serif; font-weight: 700; font-size: 24px; letter-spacing: -0.01em; }
  .ug-masthead nav a { color: #17150f; font-size: 14px; font-style: italic; margin-left: 28px; text-decoration-color: transparent; }
  .ug-hero { display: grid; grid-template-columns: 1.25fr 0.75fr; gap: 56px; padding: 72px 0 56px; align-items: end; }
  .ug-kicker { font-size: 13px; letter-spacing: .06em; color: #b7410f; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
  .ug-kicker::after { content: ''; flex: 0 0 60px; border-top: 1px solid #b7410f; }
  .ug-hero h1 { font-family: 'Fraunces', serif; font-size: clamp(52px, 7.2vw, 96px); line-height: .98; letter-spacing: -0.025em; font-weight: 600; margin: 0 0 28px; font-variation-settings: 'opsz' 144; }
  .ug-standfirst { font-size: 21px; line-height: 1.5; font-style: italic; color: #3d382c; max-width: 34em; margin: 0 0 36px; }
  .ug-ctas { display: flex; gap: 32px; align-items: center; }
  .ug-ctas a { font-size: 17px; color: #17150f; text-decoration: none; border-bottom: 2px solid #b7410f; padding-bottom: 2px; transition: color .18s, border-color .18s; }
  .ug-ctas a:first-child { font-weight: 700; }
  .ug-ctas a:hover { color: #b7410f; }
  .ug-figure { border: 1.5px solid #17150f; background: #fdfaf2; padding: 12px; box-shadow: 8px 8px 0 #e3d9c2; }
  .ug-figure .ug-art { display: block; width: 100%; height: auto; }
  .ug-figure figcaption { font-size: 13px; font-style: italic; color: #6b6350; padding: 8px 4px 4px; border-top: 1px solid #d8cfb8; margin-top: 12px; }
  .ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 3px double #17150f; border-bottom: 3px double #17150f; margin: 8px 0 64px; }
  .ug-stat { padding: 28px 24px; text-align: center; }
  .ug-stat + .ug-stat { border-left: 1px solid #d8cfb8; }
  .ug-stat .num { font-family: 'Fraunces', serif; font-size: 56px; font-weight: 700; letter-spacing: -0.02em; display: block; }
  .ug-stat .lbl { font-size: 13px; letter-spacing: .06em; color: #6b6350; display: block; margin-top: 8px; }
  .ug-features { padding-bottom: 72px; }
  .ug-sechead { display: flex; align-items: baseline; gap: 24px; margin-bottom: 40px; }
  .ug-sechead h2 { font-family: 'Fraunces', serif; font-size: clamp(30px, 4vw, 44px); font-weight: 600; letter-spacing: -0.02em; margin: 0; }
  .ug-sechead::after { content: ''; flex: 1; border-top: 1px solid #17150f; }
  .ug-feature { display: grid; grid-template-columns: 90px 1fr 1.2fr; gap: 32px; padding: 32px 0; border-top: 1px solid #d8cfb8; align-items: start; }
  .ug-feature .idx { font-family: 'Fraunces', serif; font-size: 44px; color: #b7410f; font-weight: 300; line-height: 1; }
  .ug-feature h3 { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
  .ug-feature h3 .ug-ic { margin-right: 12px; vertical-align: -2px; color: #b7410f; }
  .ug-feature p { font-size: 17px; line-height: 1.55; color: #3d382c; margin: 0; }
  .ug-footer { border-top: 3px double #17150f; padding: 48px 0 40px; text-align: center; }
  .ug-footer .ug-wordmark { font-family: 'Fraunces', serif; font-size: clamp(48px, 9vw, 120px); font-weight: 700; letter-spacing: -0.03em; line-height: 1; color: #17150f; }
  .ug-footer .ug-colophon { font-size: 13px; font-style: italic; color: #6b6350; margin-top: 16px; }
  @media (max-width: 860px) {
    .ug-hero { grid-template-columns: 1fr; gap: 36px; padding: 48px 0 40px; }
    .ug-stats { grid-template-columns: 1fr; }
    .ug-stat + .ug-stat { border-left: none; border-top: 1px solid #d8cfb8; }
    .ug-feature { grid-template-columns: 1fr; gap: 12px; }
  }
`;
function composeEditorial(m) {
  const arcs = `<svg class="ug-art" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="decorative arcs"><rect width="400" height="300" fill="#fdfaf2"/>${[260, 215, 170, 125, 80].map((r, i) => `<circle cx="200" cy="300" r="${r}" fill="none" stroke="${i === 2 ? '#b7410f' : '#17150f'}" stroke-width="${i === 2 ? 2.5 : 1}"/>`).join('')}<circle cx="200" cy="300" r="35" fill="#b7410f"/></svg>`;
  const fig = m.figureLines.length || m.img
    ? `<figure class="ug-figure ug-r">${m.img ? `<img class="ug-art" src="${escHtml(m.img.src)}" alt="${escHtml(m.img.alt)}">` : arcs}<figcaption>Fig. 1 — ${escHtml(m.figureLines[0] || m.headline || m.logo)}</figcaption></figure>`
    : `<figure class="ug-figure ug-r">${arcs}<figcaption>Fig. 1 — ${escHtml(m.logo)}</figcaption></figure>`;
  const heroText = `<div>
        <div class="ug-kicker">The ${escHtml(m.logo)} paper</div>
        <h1>${escHtml(m.headline)}</h1>
        ${m.sub ? `<p class="ug-standfirst">${escHtml(m.sub)}</p>` : ''}
        <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i, '', true)).join('')}</div>
      </div>`;
  const statsSec = m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : '';
  const featSec = `<section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'In detail')}</h2></div>
      ${m.features.map((f, i) => `<article class="ug-feature ug-r"><span class="idx">${String(i + 1).padStart(2, '0')}</span><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>`;
  return `
  <main class="ug-page">
    <header class="ug-masthead"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      ${m.variant ? fig + heroText : heroText + fig}
    </section>
    ${m.variant ? featSec + statsSec : statsSec + featSec}
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">Set in Fraunces and Newsreader. Recomposed, not reskinned.</div></footer>
  </main>`;
}

/* --- BRUTALIST: poster energy. huge grotesk, acid highlight, hard borders --- */
const COMPOSE_BRUTALIST_CSS = `
  body { background: #f2f2ee !important; color: #101010 !important; font-family: 'Space Grotesk', sans-serif !important; margin: 0 !important; }
  .ug-topbar { background: #101010; color: #f2f2ee; display: flex; justify-content: space-between; align-items: center; padding: 16px 32px; }
  .ug-topbar .ug-logo { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 20px; letter-spacing: .05em; text-transform: uppercase; }
  .ug-topbar nav a { color: #d8f34e; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .06em; margin-left: 24px; text-decoration: none; }
  .ug-wrap { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
  .ug-hero { position: relative; padding: 84px 0 64px; border-bottom: 4px solid #101010; }
  .ug-hero h1 { font-size: clamp(56px, 9.5vw, 128px); line-height: .92; font-weight: 700; text-transform: uppercase; letter-spacing: -0.03em; margin: 0 0 32px; }
  .ug-hero h1 mark { background: #d8f34e; color: #101010; padding: 0 12px; }
  .ug-hero .ug-sub { font-size: 20px; line-height: 1.45; max-width: 32em; margin: 0 0 40px; font-weight: 500; }
  .ug-sticker { position: absolute; top: 48px; right: 32px; background: #d8f34e; border: 3px solid #101010; box-shadow: 6px 6px 0 #101010; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 16px; text-transform: uppercase; padding: 12px 20px; transform: rotate(6deg); letter-spacing: .08em; }
  .ug-ctas { display: flex; gap: 20px; flex-wrap: wrap; }
  .ug-ctas a { display: inline-block; background: #101010; color: #d8f34e; border: 3px solid #101010; box-shadow: 6px 6px 0 #101010; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: .06em; padding: 16px 28px; text-decoration: none; transition: transform .12s, box-shadow .12s; }
  .ug-ctas a:hover { transform: translate(2px, 2px); box-shadow: 4px 4px 0 #101010; }
  .ug-ctas a.alt { background: #f2f2ee; color: #101010; }
  .ug-band { background: #101010; color: #f2f2ee; padding: 40px 32px; margin: 0 -32px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .ug-band .num { font-family: 'JetBrains Mono', monospace; font-size: clamp(44px, 6vw, 72px); font-weight: 700; color: #d8f34e; display: block; line-height: 1; }
  .ug-band .lbl { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .06em; display: block; margin-top: 12px; color: #f2f2ee; }
  .ug-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border: 4px solid #101010; margin: 64px 0; }
  .ug-cell { padding: 32px 28px; border-right: 4px solid #101010; background: #f2f2ee; transition: background .15s, color .15s; }
  .ug-cell:last-child { border-right: none; }
  .ug-cell:hover { background: #101010; color: #d8f34e; }
  .ug-cell .fno { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 700; display: block; margin-bottom: 20px; }
  .ug-cell h3 { font-size: 26px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.01em; margin: 0 0 16px; line-height: 1.05; }
  .ug-cell p { font-size: 16px; line-height: 1.5; margin: 0; }
  .ug-cell .ug-ic { display: block; margin-bottom: 20px; }
  .ug-footer { border-top: 4px solid #101010; padding: 40px 32px 32px; text-align: center; }
  .ug-footer .ug-wordmark { font-size: clamp(52px, 11vw, 150px); font-weight: 700; text-transform: uppercase; letter-spacing: -0.04em; line-height: .95; }
  .ug-footer .ug-colophon { font-size: 12px; letter-spacing: .06em; margin-top: 20px; }
  @media (max-width: 860px) {
    .ug-grid, .ug-band { grid-template-columns: 1fr; }
    .ug-cell { border-right: none; border-bottom: 4px solid #101010; }
    .ug-cell:last-child { border-bottom: none; }
    .ug-sticker { position: static; display: inline-block; margin-bottom: 24px; }
  }
`;
function composeBrutalist(m) {
  const words = m.headline.split(' ');
  const mid = Math.ceil(words.length / 2);
  const hl = escHtml(words.slice(0, mid).join(' ')) + (words.length > 1 ? ' <mark>' + escHtml(words.slice(mid).join(' ')) + '</mark>' : '');
  return `
  <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
  <main class="ug-wrap">
    <section class="ug-hero">
      <span class="ug-sticker">Fresh off the press</span>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i, i ? 'alt' : '')).join('')}</div>
    </section>
  ${m.stats.length ? `<section class="ug-band ug-r">${m.stats.map(s => `<div><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-grid ug-r">
      ${m.features.map((f, i) => `<article class="ug-cell">${iconSVG(featureIcon(f, i), 26)}<span class="fno">No. ${i + 1}</span><h3>${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">Recomposed, not reskinned</div></footer>
  </main>`;
}

/* --- NIGHT TERMINAL: the ops console. amber mono, log panels, readouts --- */
const COMPOSE_NIGHT_CSS = `
  body { background: #0f0f0c !important; color: #e8e4d8 !important; font-family: 'IBM Plex Mono', ui-monospace, monospace !important; margin: 0 !important; }
  @keyframes ugCaret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  .ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 32px; border-bottom: 1px solid #3a382e; }
  .ug-topbar .ug-logo { color: #ffb000; font-weight: 600; font-size: 16px; }
  .ug-topbar .ug-logo::before { content: '> '; color: #96907d; }
  .ug-topbar nav a { color: #e8e4d8; font-size: 12px; margin-left: 24px; text-decoration: none; opacity: .75; }
  .ug-topbar nav a:hover { color: #ffb000; opacity: 1; }
  .ug-wrap { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
  .ug-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; padding: 88px 0 72px; align-items: center; }
  .ug-prompt { color: #96907d; font-size: 16px; margin-bottom: 24px; }
  .ug-prompt b { color: #4ade80; font-weight: 400; }
  .ug-hero h1 { font-size: clamp(38px, 4.4vw, 56px); line-height: 1.08; font-weight: 600; color: #ffb000; margin: 0 0 28px; letter-spacing: -0.02em; }
  .ug-hero h1::after { content: ' '; display: inline-block; width: .55em; height: 1em; background: #ffb000; vertical-align: -0.12em; margin-left: .1em; animation: ugCaret 1.1s steps(1) 8; }
  .ug-hero .ug-sub { font-size: 16px; line-height: 1.65; color: #b8b3a4; max-width: 36em; margin: 0 0 40px; }
  .ug-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
  .ug-ctas a { background: #ffb000; color: #0f0f0c; font-size: 16px; font-weight: 600; padding: 16px 24px; text-decoration: none; border: 1px solid #ffb000; }
  .ug-ctas a.alt { background: transparent; color: #ffb000; }
  .ug-term { border: 1px solid #3a382e; background: #171714; border-radius: 8px; overflow: hidden; }
  .ug-term .ug-termbar { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #3a382e; }
  .ug-term .ug-termbar i { width: 10px; height: 10px; border-radius: 100%; background: #3a382e; }
  .ug-term .ug-termbar i:first-child { background: #ffb000; }
  .ug-term .ug-logs { padding: 20px 24px; font-size: 12px; line-height: 2.1; }
  .ug-term .ug-logs .ln { display: block; color: #b8b3a4; }
  .ug-term .ug-logs .ln::before { content: '>> '; color: #4ade80; }
  .ug-readouts { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #3a382e; margin: 0 0 72px; }
  .ug-ro { padding: 28px; border-right: 1px solid #3a382e; background: #171714; }
  .ug-ro:last-child { border-right: none; }
  .ug-ro .lbl { font-size: 12px; letter-spacing: .06em; color: #96907d; display: block; margin-bottom: 12px; }
  .ug-ro .num { font-size: clamp(36px, 4.5vw, 56px); font-weight: 600; color: #ffb000; display: block; line-height: 1; }
  .ug-ro .bar { height: 3px; background: #3a382e; margin-top: 16px; position: relative; overflow: hidden; }
  .ug-ro .bar i { position: absolute; inset: 0; right: 30%; background: #ffb000; }
  .ug-features { padding-bottom: 80px; }
  .ug-sechead { color: #96907d; font-size: 12px; letter-spacing: .06em; margin-bottom: 28px; }
  .ug-sechead::before { content: '## '; color: #ffb000; }
  .ug-frow { display: grid; grid-template-columns: 48px 1fr 1.4fr; gap: 28px; padding: 24px 0; border-top: 1px solid #3a382e; align-items: baseline; transition: background .15s; }
  .ug-frow:hover { background: #171714; }
  .ug-frow .ug-ic { color: #ffb000; }
  .ug-frow h3 { font-size: 20px; font-weight: 600; color: #e8e4d8; margin: 0; }
  .ug-frow h3::before { content: '> '; color: #4ade80; font-weight: 400; }
  .ug-frow p { font-size: 16px; line-height: 1.6; color: #b8b3a4; margin: 0; }
  .ug-footer { border-top: 1px solid #3a382e; padding: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #96907d; }
  .ug-footer b { color: #4ade80; font-weight: 400; }
  @media (max-width: 860px) {
    .ug-topbar { flex-wrap: wrap; gap: 8px 20px; padding: 16px 20px; }
    .ug-topbar nav { display: flex; flex-wrap: wrap; gap: 2px 16px; }
    .ug-topbar nav a { margin-left: 0; font-size: 12px; }
    .ug-hero { grid-template-columns: 1fr; gap: 36px; padding: 56px 0 48px; }
    .ug-readouts { grid-template-columns: 1fr; }
    .ug-ro { border-right: none; border-bottom: 1px solid #3a382e; }
    .ug-frow { grid-template-columns: 32px 1fr; }
    .ug-frow p { grid-column: 2; }
  }
`;
function composeNight(m) {
  /* terminal lines: figure lines, then feature titles, then section headings - never an empty card */
  const logSrc = m.figureLines.length ? m.figureLines
    : m.features.length ? m.features.slice(0, 3).map(f => f.title + ' - ready')
    : m.headings.slice(0, 3).map(h => h + ' - ready');
  const logs = logSrc.map(l => `<span class="ln">${escHtml(l)}</span>`).join('');
  const heroText = `<div>
        <div class="ug-prompt"><b>$</b> ${escHtml(m.logo.toLowerCase().replace(/\s+/g, '-'))} --launch</div>
        <h1>${escHtml(m.headline)}</h1>
        ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
        <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i, i ? 'alt' : '')).join('')}</div>
      </div>`;
  const roSec = m.stats.length ? `<section class="ug-readouts ug-r">${m.stats.map(s => `<div class="ug-ro"><span class="lbl">${escHtml(s.lbl)}</span><span class="num">${escHtml(s.num)}</span><span class="bar"><i></i></span></div>`).join('')}</section>` : '';
  const featSec = `<section class="ug-features">
      <div class="ug-sechead">${escHtml(m.headings[0] || 'capabilities')}</div>
      ${m.features.map((f, i) => `<article class="ug-frow ug-r">${iconSVG(featureIcon(f, i), 20)}<h3>${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>`;
  return `
  <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
  <main class="ug-wrap">
    <section class="ug-hero">
      ${m.variant
        ? `<div class="ug-term ug-r"><div class="ug-termbar"><i></i><i></i><i></i></div><div class="ug-logs">${logs}</div></div>` + heroText
        : heroText + `<div class="ug-term ug-r"><div class="ug-termbar"><i></i><i></i><i></i></div><div class="ug-logs">${logs}</div></div>`}
    </section>
    ${m.variant ? featSec + roSec : roSec + featSec}
  </main>
  <footer class="ug-footer"><span>${escHtml(m.logo)} - recomposed, not reskinned</span><span><b>$</b> exit 0</span></footer>`;
}

/* ---------------- composed layouts, wave 2: swiss / blueprint / botanical / zine / construct ---------------- */

const COMPOSE_SWISS_CSS = `
  html { background: #ffffff; }
  body { font-family: 'Archivo', sans-serif; color: #111111; background: #ffffff; }
  .ug-page { max-width: 1360px; margin: 0 auto; padding: 0 40px; }
  .ug-topbar { display: flex; justify-content: space-between; align-items: baseline; padding: 28px 0 20px; border-bottom: 2px solid #111111; }
  .ug-logo { font-weight: 800; font-size: 22px; letter-spacing: -0.02em; text-transform: uppercase; }
  .ug-topbar nav a { color: #111111; font-family: 'IBM Plex Mono', monospace; font-size: 13px; margin-left: 24px; text-decoration: none; }
  .ug-topbar nav a:hover { color: #e2001a; }
  .ug-hero { display: grid; grid-template-columns: 2fr 1fr; gap: 64px; padding: 72px 0 64px; }
  .ug-index { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #e2001a; margin-bottom: 24px; }
  .ug-hero h1 { font-size: clamp(56px, 7.6vw, 116px); font-weight: 800; text-transform: uppercase; letter-spacing: -0.03em; line-height: 0.94; margin: 0 0 32px; }
  .ug-hero .ug-sub { font-size: 18px; line-height: 1.6; max-width: 30em; margin: 0 0 40px; }
  .ug-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
  .ug-ctas a { font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .06em; padding: 16px 24px; border: 2px solid #111111; color: #111111; text-decoration: none; transition: background .18s, color .18s; }
  .ug-ctas a:first-child { background: #e2001a; border-color: #e2001a; color: #ffffff; }
  .ug-ctas a:hover { background: #111111; border-color: #111111; color: #ffffff; }
  .ug-side { position: relative; }
  .ug-side::before { content: ''; position: absolute; top: 0; right: 0; width: 64px; height: 64px; background: #e2001a; }
  .ug-media { margin-top: 96px; }
  .ug-media img { width: 100%; display: block; filter: grayscale(1) contrast(1.05); }
  .ug-media .cap { font-family: 'IBM Plex Mono', monospace; font-size: 12px; background: #e2001a; color: #ffffff; display: inline-block; padding: 4px 8px; margin-top: 0; }
  .ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 2px solid #111111; border-bottom: 2px solid #111111; }
  .ug-stat { padding: 32px 24px; border-left: 1px solid #dddddd; }
  .ug-stat:first-child { border-left: 0; padding-left: 0; }
  .ug-stat .num { font-size: clamp(44px, 4.6vw, 68px); font-weight: 800; letter-spacing: -0.03em; display: block; line-height: 1; }
  .ug-stat .lbl { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .06em; display: block; margin-top: 12px; }
  .ug-features { padding: 64px 0; }
  .ug-sechead { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 40px; }
  .ug-sechead h2 { font-size: clamp(28px, 3vw, 40px); font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em; margin: 0; }
  .ug-sechead .tag { font-size: 12px; color: #e2001a; }
  .ug-frow { display: grid; grid-template-columns: 96px 1fr 1.2fr; gap: 32px; padding: 28px 0; border-top: 1px solid #dddddd; align-items: baseline; }
  .ug-frow .idx { font-family: 'IBM Plex Mono', monospace; font-size: 14px; transition: color .18s; }
  .ug-frow:hover .idx { color: #e2001a; }
  .ug-frow h3 { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em; margin: 0; }
  .ug-frow h3 .ug-ic { margin-right: 12px; vertical-align: -2px; }
  .ug-frow p { font-size: 16px; line-height: 1.6; margin: 0; }
  .ug-footer { border-top: 2px solid #111111; padding: 56px 0 40px; text-align: left; }
  .ug-wordmark { font-size: clamp(56px, 9vw, 140px); font-weight: 800; text-transform: uppercase; letter-spacing: -0.04em; line-height: .9; }
  .ug-footer .ug-colophon { font-size: 12px; margin-top: 20px; }
  @media (max-width: 900px) {
    .ug-hero { grid-template-columns: 1fr; gap: 40px; padding: 48px 0 40px; }
    .ug-stats { grid-template-columns: 1fr; }
    .ug-stat { border-left: 0; padding-left: 0; border-top: 1px solid #dddddd; }
    .ug-frow { grid-template-columns: 1fr; gap: 12px; }
  }
`;

const COMPOSE_BLUEPRINT_CSS = `
  html { background: #0d2b45; }
  body { font-family: 'Space Grotesk', sans-serif; color: #eaf4fb; background: #0d2b45 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M48 0H0v48' fill='none' stroke='%232a5578' stroke-width='1' opacity='.35'/%3E%3C/svg%3E"); }
  .ug-page { max-width: 1240px; margin: 0 auto; padding: 0 32px; }
  .ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0 20px; border-bottom: 1px solid #2a5578; font-family: 'IBM Plex Mono', monospace; }
  .ug-logo { font-weight: 600; font-size: 16px; letter-spacing: .06em; color: #4fc3f7; }
  .ug-logo::before, .ug-logo::after { content: '+'; color: #2a5578; margin: 0 8px; }
  .ug-topbar nav a { color: #eaf4fb; font-size: 12px; margin-left: 24px; text-decoration: none; opacity: .8; }
  .ug-topbar nav a:hover { color: #4fc3f7; opacity: 1; }
  .ug-hero { padding: 80px 0 64px; }
  .ug-dwg { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #4fc3f7; letter-spacing: .06em; margin-bottom: 24px; }
  .ug-hero h1 { font-size: clamp(44px, 6vw, 88px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.02; margin: 0 0 20px; max-width: 12em; }
  .ug-dim { display: block; margin: 0 0 32px; }
  .ug-hero .ug-sub { font-family: 'IBM Plex Mono', monospace; font-size: 16px; line-height: 1.7; color: #eaf4fb; opacity: .85; max-width: 40em; margin: 0 0 40px; }
  .ug-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
  .ug-ctas a { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .06em; padding: 16px 24px; border: 1px solid #4fc3f7; color: #4fc3f7; text-decoration: none; transition: background .18s, color .18s; }
  .ug-ctas a:first-child { background: #4fc3f7; color: #0d2b45; }
  .ug-ctas a:hover { background: #eaf4fb; border-color: #eaf4fb; color: #0d2b45; }
  .ug-media { margin: 0 0 64px; border: 1px solid #2a5578; padding: 8px; position: relative; }
  .ug-media::before { content: 'FIG-A'; position: absolute; top: -9px; left: 16px; background: #0d2b45; padding: 0 8px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #4fc3f7; letter-spacing: .14em; }
  .ug-media img { width: 100%; display: block; filter: grayscale(1) brightness(.92) contrast(1.05); }
  .ug-stats { border: 1px solid #2a5578; margin: 0 0 64px; }
  .ug-srow { display: grid; grid-template-columns: 1fr auto auto; gap: 32px; padding: 20px 24px; border-top: 1px dashed #2a5578; font-family: 'IBM Plex Mono', monospace; align-items: baseline; }
  .ug-srow:first-child { border-top: 0; }
  .ug-srow .lbl { font-size: 12px; letter-spacing: .06em; opacity: .75; }
  .ug-srow .num { font-size: 28px; font-weight: 600; color: #4fc3f7; }
  .ug-srow .tol { font-size: 12px; opacity: .5; }
  .ug-features { padding: 0 0 64px; }
  .ug-sechead { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #4fc3f7; letter-spacing: .06em; margin-bottom: 32px; }
  .ug-frow { display: grid; grid-template-columns: 120px 1fr 1.2fr; gap: 28px; padding: 24px 0; border-top: 1px dashed #2a5578; align-items: baseline; }
  .ug-frow .idx { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #4fc3f7; }
  .ug-frow h3 { font-size: 20px; font-weight: 700; margin: 0; }
  .ug-frow h3 .ug-ic { margin-right: 12px; color: #4fc3f7; }
  .ug-frow p { font-family: 'IBM Plex Mono', monospace; font-size: 16px; line-height: 1.65; margin: 0; opacity: .85; }
  .ug-footer { border-top: 1px solid #2a5578; padding: 40px 0 32px; font-family: 'IBM Plex Mono', monospace; display: flex; justify-content: space-between; align-items: baseline; }
  .ug-wordmark { font-size: clamp(28px, 3.4vw, 44px); font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
  .ug-footer .ug-colophon { font-size: 12px; opacity: .6; letter-spacing: .06em; }
  @media (max-width: 900px) {
    .ug-frow, .ug-srow { grid-template-columns: 1fr; gap: 12px; }
  }
`;

const COMPOSE_BOTANICAL_CSS = `
  html { background: #f4f1e5; }
  body { font-family: 'Newsreader', serif; color: #1e3a2a; background: #f4f1e5; }
  .ug-page { max-width: 1160px; margin: 0 auto; padding: 0 32px; }
  .ug-masthead { display: flex; justify-content: space-between; align-items: baseline; padding: 28px 0 24px; border-bottom: 1px solid #c9c4ad; }
  .ug-logo { font-family: 'Fraunces', serif; font-style: italic; font-weight: 500; font-size: 26px; }
  .ug-masthead nav a { color: #1e3a2a; font-size: 15px; font-style: italic; margin-left: 28px; text-decoration: none; border-bottom: 1px solid transparent; }
  .ug-masthead nav a:hover { border-color: #4a7c59; color: #4a7c59; }
  .ug-hero { padding: 88px 0 64px; max-width: 800px; }
  .ug-kicker { font-size: 14px; letter-spacing: .06em; color: #4a7c59; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; }
  .ug-hero h1 { font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(44px, 5.6vw, 76px); line-height: 1.04; letter-spacing: -0.01em; margin: 0 0 28px; }
  .ug-hero h1 em { color: #4a7c59; }
  .ug-hero .ug-sub { font-size: 19px; line-height: 1.65; font-style: italic; opacity: .85; margin: 0 0 40px; max-width: 28em; }
  .ug-ctas { display: flex; gap: 36px; flex-wrap: wrap; }
  .ug-ctas a { color: #1e3a2a; text-decoration: none; font-size: 16px; padding-bottom: 4px; border-bottom: 1px solid #1e3a2a; transition: color .2s, border-color .2s; }
  .ug-ctas a:first-child { font-weight: 500; color: #4a7c59; border-color: #4a7c59; }
  .ug-ctas a:hover { color: #4a7c59; border-color: #4a7c59; }
  .ug-plate { margin: 0 0 64px; }
  .ug-plate img { width: 100%; height: 340px; object-fit: cover; display: block; filter: saturate(.85) contrast(1.02); }
  .ug-plate figcaption { font-size: 14px; font-style: italic; opacity: .7; padding: 12px 0 0; display: flex; justify-content: space-between; }
  .ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 0 0 72px; }
  .ug-stat { background: #fbf9f1; border: 1px solid #c9c4ad; padding: 32px 28px; }
  .ug-stat .num { font-family: 'Fraunces', serif; font-size: clamp(40px, 4vw, 56px); font-weight: 500; color: #4a7c59; display: block; line-height: 1; }
  .ug-stat .lbl { font-size: 14px; letter-spacing: .06em; display: block; margin-top: 12px; opacity: .7; }
  .ug-features { padding: 0 0 72px; }
  .ug-sechead { display: flex; align-items: center; gap: 24px; margin-bottom: 48px; }
  .ug-sechead h2 { font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(30px, 3.4vw, 44px); margin: 0; }
  .ug-sechead .rule { flex: 1; height: 1px; background: #c9c4ad; }
  .ug-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px 64px; }
  .ug-feature { border-top: 1px solid #c9c4ad; padding-top: 24px; }
  .ug-feature h3 { font-family: 'Fraunces', serif; font-weight: 500; font-size: 24px; margin: 0 0 12px; display: flex; align-items: center; }
  .ug-feature h3 .ug-ic { margin-right: 12px; color: #4a7c59; }
  .ug-feature p { font-size: 16px; line-height: 1.65; margin: 0; opacity: .85; }
  .ug-footer { border-top: 1px solid #c9c4ad; padding: 56px 0 48px; text-align: center; }
  .ug-wordmark { font-family: 'Fraunces', serif; font-style: italic; font-weight: 500; font-size: clamp(48px, 7vw, 104px); line-height: 1; }
  .ug-footer .ug-colophon { font-size: 14px; font-style: italic; opacity: .65; margin-top: 16px; }
  @media (max-width: 900px) {
    .ug-stats, .ug-fgrid { grid-template-columns: 1fr; }
  }
`;

const COMPOSE_ZINE_CSS = `
  html { background: #ffffff; }
  body { font-family: 'Space Grotesk', sans-serif; color: #000000; background: #ffffff; }
  .ug-page { max-width: 1240px; margin: 0 auto; padding: 0 32px; overflow: hidden; }
  .ug-topbar { background: #000000; color: #ffffff; margin: 0 -32px; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; transform: rotate(-0.6deg); }
  .ug-logo { font-weight: 700; font-size: 20px; text-transform: uppercase; letter-spacing: .04em; }
  .ug-topbar nav a { color: #ffffff; font-family: 'IBM Plex Mono', monospace; font-size: 12px; text-transform: uppercase; margin-left: 20px; text-decoration: none; }
  .ug-topbar nav a:hover { background: #ffffff; color: #000000; }
  .ug-hero { padding: 72px 0 56px; position: relative; }
  .ug-sticker { position: absolute; top: 40px; right: 24px; font-size: 12px; text-transform: uppercase; border: 2px solid #000000; padding: 8px 16px; transform: rotate(4deg); background: #ffffff; box-shadow: 4px 4px 0 #000000; }
  .ug-hero h1 { font-size: clamp(44px, 6.4vw, 96px); font-weight: 700; text-transform: uppercase; line-height: 1.04; letter-spacing: -0.02em; margin: 0 0 32px; max-width: 11em; }
  .ug-hero h1 .cut { background: #000000; color: #ffffff; padding: 0 12px; display: inline-block; transform: rotate(-1.2deg); }
  .ug-hero .ug-sub { font-family: 'IBM Plex Mono', monospace; font-size: 16px; line-height: 1.65; max-width: 34em; margin: 0 0 40px; }
  .ug-ctas { display: flex; gap: 20px; flex-wrap: wrap; }
  .ug-ctas a { background: #000000; color: #ffffff; font-family: 'IBM Plex Mono', monospace; font-size: 12px; text-transform: uppercase; padding: 16px 24px; text-decoration: none; box-shadow: 4px 4px 0 #000000; border: 2px solid #000000; transition: transform .15s, box-shadow .15s; }
  .ug-ctas a.alt { background: #ffffff; color: #000000; }
  .ug-ctas a:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #000000; }
  .ug-media { margin: 0 0 56px; position: relative; transform: rotate(-1deg); }
  .ug-media img { width: 100%; display: block; filter: grayscale(1) contrast(1.15); border: 2px solid #000000; }
  .ug-media::before, .ug-media::after { content: ''; position: absolute; width: 96px; height: 28px; background: rgba(0,0,0,.12); border: 1px solid rgba(0,0,0,.25); top: -14px; }
  .ug-media::before { left: 32px; transform: rotate(-4deg); }
  .ug-media::after { right: 32px; transform: rotate(3deg); }
  .ug-dots { height: 56px; margin: 0 -32px 0; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='4' cy='4' r='2' fill='%23000000'/%3E%3C/svg%3E"); }
  .ug-band { background: #000000; color: #ffffff; margin: 0 -32px; padding: 48px 32px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; transform: rotate(0.5deg); }
  .ug-band .num { font-family: 'IBM Plex Mono', monospace; font-size: clamp(40px, 5vw, 64px); font-weight: 600; display: block; line-height: 1; }
  .ug-band .lbl { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .06em; display: block; margin-top: 12px; opacity: .7; }
  .ug-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 64px 0; }
  .ug-cell { border: 2px solid #000000; padding: 28px 24px; box-shadow: 6px 6px 0 #000000; background: #ffffff; transition: transform .15s, box-shadow .15s; }
  .ug-cell:nth-child(odd) { transform: rotate(-0.8deg); }
  .ug-cell:nth-child(even) { transform: rotate(0.7deg); }
  .ug-cell:hover { transform: translate(3px, 3px) rotate(0); box-shadow: 2px 2px 0 #000000; }
  .ug-cell .fno { font-family: 'IBM Plex Mono', monospace; font-size: 12px; display: block; margin-bottom: 16px; }
  .ug-cell h3 { font-size: 20px; font-weight: 700; text-transform: uppercase; margin: 0 0 12px; }
  .ug-cell .ug-ic { display: block; margin-bottom: 16px; }
  .ug-cell p { font-size: 16px; line-height: 1.6; margin: 0; }
  .ug-footer { border-top: 2px solid #000000; padding: 48px 0 40px; text-align: center; }
  .ug-wordmark { font-size: clamp(52px, 8.4vw, 128px); font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em; line-height: .95; color: #ffffff; -webkit-text-stroke: 2px #000000; }
  .ug-footer .ug-colophon { font-size: 12px; letter-spacing: .06em; margin-top: 20px; }
  @media (max-width: 900px) {
    .ug-grid, .ug-band { grid-template-columns: 1fr; }
  }
`;

const COMPOSE_CONSTRUCT_CSS = `
  html { background: #efe9dc; }
  body { font-family: 'Archivo', sans-serif; color: #1c1a16; background: #efe9dc; }
  .ug-page { max-width: 1280px; margin: 0 auto; padding: 0 32px; overflow: hidden; }
  .ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0 20px; border-bottom: 2px solid #1c1a16; }
  .ug-logo { font-weight: 900; font-size: 20px; text-transform: uppercase; letter-spacing: .02em; display: flex; align-items: center; gap: 12px; }
  .ug-logo::before { content: ''; width: 20px; height: 20px; background: #e8490f; }
  .ug-topbar nav a { color: #1c1a16; font-family: 'IBM Plex Mono', monospace; font-size: 12px; text-transform: uppercase; margin-left: 24px; text-decoration: none; }
  .ug-topbar nav a:hover { color: #e8490f; }
  .ug-hero { position: relative; padding: 88px 0 72px; }
  .ug-hero::after { content: ''; position: absolute; top: 32px; right: -60px; width: 340px; height: 340px; background: #e8490f; clip-path: polygon(100% 0, 0 100%, 100% 100%); opacity: .92; z-index: -1; }
  .ug-kicker { font-size: 13px; letter-spacing: .06em; margin-bottom: 28px; color: #e8490f; }
  .ug-hero h1 { font-size: clamp(48px, 6.8vw, 104px); font-weight: 900; text-transform: uppercase; line-height: 0.94; letter-spacing: -0.02em; word-spacing: .1em; margin: 0 0 36px; max-width: 11em; }
  .ug-hero h1 em { font-style: normal; color: #e8490f; }
  .ug-hero .ug-sub { font-size: 17px; line-height: 1.6; max-width: 28em; margin: 0 0 44px; }
  .ug-ctas { display: flex; gap: 20px; flex-wrap: wrap; }
  .ug-ctas a { font-family: 'IBM Plex Mono', monospace; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; padding: 16px 28px; text-decoration: none; transform: skewX(-6deg); transition: background .18s, color .18s; background: #e8490f; color: #f7f3e8; }
  .ug-ctas a.alt { background: #1c1a16; color: #efe9dc; }
  .ug-ctas a:hover { background: #1c1a16; color: #e8490f; }
  .ug-media { margin: 0 0 64px; clip-path: polygon(0 8%, 100% 0, 100% 92%, 0 100%); }
  .ug-media img { width: 100%; height: 360px; object-fit: cover; display: block; filter: grayscale(.4) contrast(1.08); }
  .ug-band { background: #e8490f; color: #f7f3e8; margin: 0 -32px; padding: 44px 32px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; transform: skewY(-1.2deg); }
  .ug-band > div { transform: skewY(1.2deg); }
  .ug-band .num { font-weight: 900; font-size: clamp(44px, 5.4vw, 76px); display: block; line-height: .95; letter-spacing: -0.02em; }
  .ug-band .lbl { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .06em; display: block; margin-top: 12px; }
  .ug-features { padding: 80px 0 64px; }
  .ug-sechead { display: flex; align-items: baseline; gap: 24px; margin-bottom: 40px; }
  .ug-sechead h2 { font-weight: 900; text-transform: uppercase; font-size: clamp(30px, 3.6vw, 48px); letter-spacing: -0.02em; margin: 0; max-width: 16em; }
  .ug-sechead .bar { flex: 1; height: 8px; background: #e8490f; }
  .ug-frow { display: grid; grid-template-columns: 80px 1fr 1.2fr; gap: 28px; padding: 24px 0; border-top: 2px solid #1c1a16; align-items: baseline; }
  .ug-frow .idx { font-family: 'IBM Plex Mono', monospace; font-size: 14px; color: #e8490f; font-weight: 500; }
  .ug-frow h3 { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; margin: 0; }
  .ug-frow h3 .ug-ic { margin-right: 12px; color: #e8490f; }
  .ug-frow p { font-size: 16px; line-height: 1.6; margin: 0; }
  .ug-footer { border-top: 2px solid #1c1a16; padding: 48px 0 40px; }
  .ug-wordmark { font-weight: 900; text-transform: uppercase; font-size: clamp(48px, 8vw, 120px); letter-spacing: -0.03em; line-height: .9; }
  .ug-wordmark em { font-style: normal; color: #e8490f; }
  .ug-footer .ug-colophon { font-size: 12px; letter-spacing: .06em; margin-top: 20px; }
  @media (max-width: 900px) {
    .ug-band { grid-template-columns: 1fr; }
    .ug-frow { grid-template-columns: 1fr; gap: 12px; }
    .ug-hero::after { display: none; }
  }
`;

/* generated art: a designed abstract composition in the direction's own palette, no stock photos */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function genArt(logo, dir) {
  const sw = (dir.swatches && dir.swatches.length >= 3 ? dir.swatches : ['#f4efe6', '#1c1a16', '#e4572e']).map(c => String(c).replace('#', '%23'));
  const rnd = mulberry(hashStr((logo || 'ug') + ':' + dir.id));
  const W = 1200, H = 800;
  const parts = [`%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'%3E`, `%3Crect width='${W}' height='${H}' fill='${sw[0]}'/%3E`];
  const kinds = ['circle', 'ring', 'bar', 'triangle', 'dots', 'arc', 'quarter'];
  const n = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const k = kinds[Math.floor(rnd() * kinds.length)];
    const col = sw[1 + Math.floor(rnd() * (sw.length - 1))];
    const x = Math.round(rnd() * W), y = Math.round(rnd() * H);
    const s = Math.round(60 + rnd() * 260);
    if (k === 'circle') parts.push(`%3Ccircle cx='${x}' cy='${y}' r='${Math.round(s / 2)}' fill='${col}'/%3E`);
    else if (k === 'ring') parts.push(`%3Ccircle cx='${x}' cy='${y}' r='${Math.round(s / 2)}' fill='none' stroke='${col}' stroke-width='${Math.max(8, Math.round(s / 12))}'/%3E`);
    else if (k === 'bar') parts.push(`%3Crect x='${x - Math.round(s / 2)}' y='${y - Math.round(s / 8)}' width='${s}' height='${Math.round(s / 4)}' fill='${col}'/%3E`);
    else if (k === 'triangle') parts.push(`%3Cpath d='M${x} ${y - Math.round(s / 2)} L${x + Math.round(s / 2)} ${y + Math.round(s / 2)} L${x - Math.round(s / 2)} ${y + Math.round(s / 2)} Z' fill='${col}'/%3E`);
    else if (k === 'dots') { const g = Math.max(28, Math.round(s / 6)); for (let dx = 0; dx < 5; dx++) for (let dy = 0; dy < 4; dy++) parts.push(`%3Ccircle cx='${x + dx * g}' cy='${y + dy * g}' r='${Math.max(3, Math.round(g / 5))}' fill='${col}'/%3E`); }
    else if (k === 'arc') parts.push(`%3Cpath d='M${x - Math.round(s / 2)} ${y} A${Math.round(s / 2)} ${Math.round(s / 2)} 0 0 1 ${x + Math.round(s / 2)} ${y}' fill='none' stroke='${col}' stroke-width='${Math.max(8, Math.round(s / 10))}'/%3E`);
    else parts.push(`%3Cpath d='M${x} ${y} L${x + s} ${y} A${s} ${s} 0 0 1 ${x} ${y + s} Z' fill='${col}'/%3E`);
  }
  parts.push('%3C/svg%3E');
  return 'data:image/svg+xml,' + parts.join('');
}

function mediaSlot(m, caption) {
  const src = m.imgs.length ? m.imgs[0].src : (m.art || genArt(m.logo, { id: 'base', swatches: null }));
  const alt = m.imgs.length ? m.imgs[0].alt : 'abstract artwork in the page palette';
  return { src, alt, caption: caption || m.figureLines[0] || '' };
}

function composeSwiss(m) {
  const media = mediaSlot(m);
  const heroText = `<div>
        <div class="ug-index">01 &mdash; ${escHtml(m.logo)}</div>
        <h1>${escHtml(m.headline)}</h1>
        ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
        <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
      </div>`;
  const sideFig = `<div class="ug-side">
        <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy">${media.caption ? `<span class="cap">${escHtml(media.caption)}</span>` : ''}</figure>
      </div>`;
  const statsSec = m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : '';
  const featSec = `<section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'Index')}</h2><span class="tag">02 &mdash; Index</span></div>
      ${m.features.map((f, i) => `<article class="ug-frow ug-r"><span class="idx">${String(i + 1).padStart(2, '0')}</span><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>`;
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      ${m.variant ? sideFig + heroText : heroText + sideFig}
    </section>
    ${m.variant ? featSec + statsSec : statsSec + featSec}
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">Set in Archivo and IBM Plex Mono. Recomposed, not reskinned.</div></footer>
  </main>`;
}

function composeBlueprint(m) {
  const media = mediaSlot(m, 'SCALE 1:1');
  const dim = `<svg class="ug-dim" width="240" height="14" viewBox="0 0 240 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 7h238M1 2v10M239 2v10M120 4v6" stroke="#4fc3f7" stroke-width="1"/></svg>`;
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <div class="ug-dwg">Dwg no. 001 &mdash; ${escHtml(m.logo)} / general arrangement</div>
      <h1>${escHtml(m.headline)}</h1>
      ${dim}
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy"></figure>
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-srow"><span class="lbl">${escHtml(s.lbl)}</span><span class="num">${escHtml(s.num)}</span><span class="tol">TOL &plusmn;0.02</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead">${escHtml(m.headings[0] || 'Parts list')} &mdash; item schedule</div>
      ${m.features.map((f, i) => `<article class="ug-frow ug-r"><span class="idx">ITEM ${String(i + 1).padStart(2, '0')}</span><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>
    <footer class="ug-footer"><span class="ug-wordmark">${escHtml(m.logo)}</span><span class="ug-colophon">Sheet 1 of 1 &mdash; recomposed, not reskinned</span></footer>
  </main>`;
}

function composeBotanical(m) {
  const media = mediaSlot(m, 'Plate I');
  const leaf = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a7c59" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M12 21c-5-3-7-7-7-11a7 7 0 0 1 14 0c0 4-2 8-7 11z"/><path d="M12 21V9"/></svg>`;
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -2).join(' ')) + ' <em>' + escHtml(words.slice(-2).join(' ')) + '</em>' : escHtml(m.headline);
  return `
  <main class="ug-page">
    <header class="ug-masthead"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <div class="ug-kicker">${leaf}<span>The ${escHtml(m.logo)} field notes</span></div>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    <figure class="ug-plate ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy"><figcaption><span>${escHtml(media.caption)}</span><span>${escHtml(m.figureLines[0] || m.logo)}</span></figcaption></figure>
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'In the garden')}</h2><span class="rule"></span></div>
      <div class="ug-fgrid">${m.features.map((f, i) => `<article class="ug-feature ug-r"><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}</div>
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">Set in Fraunces and Newsreader. Recomposed, not reskinned.</div></footer>
  </main>`;
}

function composeZine(m) {
  const media = mediaSlot(m);
  const words = m.headline.split(' ');
  const cutAt = Math.max(1, Math.floor(words.length / 2));
  const hl = escHtml(words.slice(0, cutAt).join(' ')) + ' <span class="cut">' + escHtml(words.slice(cutAt).join(' ')) + '</span>';
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <span class="ug-sticker">No. 1 &mdash; out now</span>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i, i ? 'alt' : '')).join('')}</div>
    </section>
    <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy"></figure>
    <div class="ug-dots" aria-hidden="true"></div>
    ${m.stats.length ? `<section class="ug-band ug-r">${m.stats.map(s => `<div><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-grid ug-r">
      ${m.features.map((f, i) => `<article class="ug-cell">${iconSVG(featureIcon(f, i), 26)}<span class="fno">pg. ${i + 1}</span><h3>${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">Recomposed, not reskinned</div></footer>
  </main>`;
}

function composeConstruct(m) {
  const media = mediaSlot(m);
  const words = m.headline.split(' ');
  const hl = words.length > 1 ? '<em>' + escHtml(words[0]) + '</em> ' + escHtml(words.slice(1).join(' ')) : escHtml(m.headline);
  const wmWords = m.logo.split(' ');
  const wm = wmWords.length > 1 ? escHtml(wmWords[0]) + '<em>' + escHtml(wmWords.slice(1).join(' ')) + '</em>' : escHtml(m.logo);
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <div class="ug-kicker">${escHtml(m.logo)} &mdash; Works bulletin</div>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i, i ? 'alt' : '')).join('')}</div>
    </section>
    <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy"></figure>
    ${m.stats.length ? `<section class="ug-band ug-r">${m.stats.map(s => `<div><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'The Plan')}</h2><span class="bar"></span></div>
      ${m.features.map((f, i) => `<article class="ug-frow ug-r"><span class="idx">${String(i + 1).padStart(2, '0')}/</span><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${wm}</div><div class="ug-colophon">Recomposed, not reskinned</div></footer>
  </main>`;
}

const COMPOSE = {
  editorial: { css: COMPOSE_EDITORIAL_CSS, body: composeEditorial },
  brutalist: { css: COMPOSE_BRUTALIST_CSS, body: composeBrutalist },
  night: { css: COMPOSE_NIGHT_CSS, body: composeNight },
  swiss: { css: COMPOSE_SWISS_CSS, body: composeSwiss },
  blueprint: { css: COMPOSE_BLUEPRINT_CSS, body: composeBlueprint },
  botanical: { css: COMPOSE_BOTANICAL_CSS, body: composeBotanical },
  zine: { css: COMPOSE_ZINE_CSS, body: composeZine },
  construct: { css: COMPOSE_CONSTRUCT_CSS, body: composeConstruct },
};
export function hasCompose(dirId) { return !!COMPOSE[typeof dirId === 'string' ? dirId : (dirId && dirId.id)]; }

/* ---------------- subject-aware copy ----------------
   The page's own topic words drive rewrites - never stock replacement phrases */
const SUBJ_STOP = new Set(('the,a,an,and,or,of,to,in,for,with,on,at,by,from,your,you,our,it,its,is,are,be,that,this,as,into,about,over,after,before,all,any,more,most,other,some,such,not,only,own,same,than,too,very,can,will,just,now,new,make,made,get,how,what,when,where,why,who,which,have,has,out,off,here,there,them,they,their,us,we,my,me,one,two,way,use,using,best,top,every,team,teams,people,user,users,business,company,companies,world,thing,things,something,work,works,stuff').split(','));
export function subjectOf(m) {
  const bag = {};
  const add = (str, w) => {
    if (!str) return;
    for (const raw of String(str).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)) {
      if (raw.length < 4 || SUBJ_STOP.has(raw) || /^\d+$/.test(raw)) continue;
      const e = bag[raw] || (bag[raw] = { n: 0, w: 0 });
      e.n++; e.w += w;
    }
  };
  add(m.headline, 4); add(m.sub, 2);
  if (m.headings) add(m.headings.slice(0, 3).join(' '), 2);
  if (m.features) for (const f of m.features.slice(0, 4)) { add(f.title, 3); add(f.text, 1); }
  const ranked = Object.entries(bag).sort((a, b) => (b[1].n * 2 + b[1].w) - (a[1].n * 2 + a[1].w) || b[0].length - a[0].length);
  if (!ranked.length) return null;
  return { word: ranked[0][0], second: ranked.length > 1 ? ranked[1][0] : '' };
}
const STOCK_HERO_RE = /welcome to the future|the future is (here|now)|the future of .{0,40} is here|reimagined|redefined?|next big thing|build (something|things) (amazing|great|beautiful)|like never before|to the next level|world of possibilities|possibilities are endless|sky'?s the limit/i;
function heroFromSubject(m, subj) {
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const tpls = [
    `${cap(subj.word)} without the noise`,
    `${cap(subj.word)}, done right`,
    `Less noise, more ${subj.word}`,
    `${cap(subj.word)} that earns its place`,
    subj.second ? `${cap(subj.word)} and ${subj.second}, nothing extra` : `${cap(subj.word)}, nothing extra`,
  ];
  return tpls[hashStr((m.logo || 'u') + subj.word) % tpls.length];
}

export function recompose(html, dirId, opts = {}) {
  const dir = (typeof dirId === 'object' && dirId) || REGISTRY.get(dirId) || REGISTRY.get('editorial');
  const tpl = COMPOSE[dir.id];
  if (!tpl) {
    const r = restyle(html, dirId, opts);
    r.fixes.push('(no composed layout for this direction yet - reskin applied)');
    return r;
  }
  const m = extract(html);
  if (!m.headline) return restyle(html, dirId, opts);
  m.art = genArt(m.logo, dir);
  m.variant = hashStr((m.logo || 'u') + '|variant') % 2;
  const subj = subjectOf(m);
  m.subject = subj;
  if (subj && STOCK_HERO_RE.test(m.headline || '')) {
    const before = m.headline;
    m.headline = heroFromSubject(m, subj);
    m.fixesCopyNote = before;
  }
  let fx = resolveFx(dir, html, opts);
  if (fx && fx !== 'i-subtle') {
    /* scramble rewrites h1 textContent, which would destroy the kinetic word masks and accent markup - composed headlines use kinetic + hyper instead */
    fx = fx.split(/\s+/).filter(p => p !== 'scramble').join(' ');
    for (const extra of ['cursor', 'magnetic']) if (!fx.split(/\s+/).includes(extra)) fx += ' ' + extra;
  }
  const hyper = fx !== null;
  const fixes = [
    ...(m.fixesCopyNote ? [`Rewrote the stock hero headline ("${m.fixesCopyNote.slice(0, 40)}...") around the page's own subject ("${m.subject.word}")`] : []),
    `Extracted the page's content (${m.features.length} features, ${m.stats.length} stats, ${m.ctas.length} CTAs, ${m.figureLines.length} figure lines)`,
    `Rebuilt it into a composed ${dir.name} layout - new structure, not a reskin`,
    'Added the motion layer: scroll reveals, kinetic type, counters' + (fx ? ' + fx: ' + fx.replace('i-subtle', 'subtle') : ''),
    ...(hyper ? ['Hyper motion: curtain load sequence, inertial scroll, velocity-skew type, pinned-hero storytelling, word-by-word heading reveals, cursor-reactive WebGL hero shader, layered parallax, scrub-driven art and wordmark'] : []),
  ];
  const favBg = String((dir.swatches || [])[2] || '#111111').replace('#', '%23');
  const favFg = String((dir.swatches || [])[0] || '#ffffff').replace('#', '%23');
  const favicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='${favBg}'/%3E%3Ctext x='32' y='44' font-size='36' text-anchor='middle' font-family='monospace' font-weight='bold' fill='${favFg}'%3E${encodeURIComponent((m.logo || 'U').trim().charAt(0).toUpperCase())}%3C/text%3E%3C/svg%3E`;
  const artFallbackJs = `<script>window.__UGART=${JSON.stringify(m.art)};window.addEventListener('error',function(e){if(e.target&&e.target.tagName==='IMG'&&window.__UGART&&e.target.src!==window.__UGART){e.target.src=window.__UGART;}},true);</script>`;
  const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escHtml(m.title || m.logo)}</title><link rel="icon" href="${favicon}"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="${dir.fonts}" rel="stylesheet"><style>${MOTION_CSS}${FX_CSS}${tpl.css}${hyper ? HYPER_CSS : ''}${SCENE_CSS}${FLIP_CSS}</style><script>window.__UGMOTION=${JSON.stringify(fx)};window.__UGHYPER=${hyper ? '1' : '0'};window.__UGDELAY=${hyper ? 950 : 0};</script>${artFallbackJs}</head><body>${injectScene(tpl.body(m), dir.name + ' / Object 01', SCENE_SHAPES[hashStr(dir.id + ':' + (m.logo || '') + '|' + (m.headline || '')) % SCENE_SHAPES.length])}<script>${MOTION_JS}</script>${hyper ? `<script>${HYPER_JS}</script><script>${GL_JS}</script>` : ''}<script>${SCENE_JS}</script><script>${FLIP_JS}</script></body></html>`;
  return { html: doc, fixes, notes: [], mode: 'recompose' };
}

/* ---------------- hyper motion layer (composed docs only) ----------------
   Peak-level motion: curtain load sequence, inertial smooth scroll, velocity
   skew on big type, layered hero parallax, clip reveals, SVG art draw,
   scrub-driven wordmark, terminal scanline. rAF-only loops, transform/opacity
   only, reduced-motion and small screens fall back to the plain composed page. */

/* dark/light flip: inverts the page, re-inverts media so photos and canvases stay true */
const FLIP_CSS = `
.ug-flip { position: fixed; right: 12px; bottom: 68px; z-index: 99997; padding: 8px 12px; border: 1.5px solid currentColor; background: transparent; color: inherit; font: 600 12px/1 system-ui, sans-serif; letter-spacing: .04em; cursor: pointer; opacity: .55; }
.ug-flip:hover { opacity: 1; }
html[data-ugflip=on] body { filter: invert(1) hue-rotate(180deg); }
html[data-ugflip=on] body img, html[data-ugflip=on] body video, html[data-ugflip=on] body canvas { filter: invert(1) hue-rotate(180deg); }
`;
const FLIP_JS = `(function(){var b=document.createElement('button');b.className='ug-flip';b.type='button';b.textContent='flip lights';b.addEventListener('click',function(){var h=document.documentElement;var on=h.getAttribute('data-ugflip')==='on';if(on){h.removeAttribute('data-ugflip');b.textContent='flip lights';}else{h.setAttribute('data-ugflip','on');b.textContent='flip back';}});document.body.appendChild(b);})();`;

const HYPER_CSS = `
html[data-ughyper=on] body, html[data-ughyper=on] a, html[data-ughyper=on] button { cursor: none; }
.ug-hcurtain { position: fixed; inset: 0; z-index: 100000; pointer-events: none; }
.ug-hcurtain > div { position: absolute; inset: 0; }
html[data-ughyper=on] .ug-masthead, html[data-ughyper=on] .ug-topbar,
html[data-ughyper=on] .ug-kicker, html[data-ughyper=on] .ug-prompt,
html[data-ughyper=on] .ug-standfirst, html[data-ughyper=on] .ug-sub,
html[data-ughyper=on] .ug-ctas a, html[data-ughyper=on] .ug-sticker {
  opacity: 1; transform: none; transition: opacity .8s ease, transform .8s cubic-bezier(.22,1,.36,1);
}
html[data-ughyper=on]:not(.ug-done) .ug-masthead, html[data-ughyper=on]:not(.ug-done) .ug-topbar { opacity: 0; transform: translateY(-16px); transition-delay: 0s; }
html[data-ughyper=on]:not(.ug-done) .ug-kicker, html[data-ughyper=on]:not(.ug-done) .ug-prompt { opacity: 0; transform: translateY(20px); }
html[data-ughyper=on]:not(.ug-done) .ug-standfirst, html[data-ughyper=on]:not(.ug-done) .ug-sub { opacity: 0; transform: translateY(24px); }
html[data-ughyper=on]:not(.ug-done) .ug-ctas a { opacity: 0; transform: translateY(20px); }
html[data-ughyper=on]:not(.ug-done) .ug-sticker { opacity: 0; }
html[data-ughyper=on] .ug-kicker, html[data-ughyper=on] .ug-prompt { transition-delay: .62s; }
html[data-ughyper=on] .ug-standfirst, html[data-ughyper=on] .ug-sub { transition-delay: .78s; }
html[data-ughyper=on] .ug-ctas a:nth-child(1) { transition-delay: .9s; }
html[data-ughyper=on] .ug-ctas a:nth-child(2) { transition-delay: 1s; }
html[data-ughyper=on] .ug-ctas a:nth-child(3) { transition-delay: 1.1s; }
html[data-ughyper=on] .ug-sticker { transition: opacity .5s ease 1.15s; }
html[data-ughyper=on] .ug-figure, html[data-ughyper=on] .ug-term { clip-path: inset(0 0 0 0); }
html[data-ughyper=on]:not(.ug-done) .ug-figure, html[data-ughyper=on]:not(.ug-done) .ug-term { clip-path: inset(0 100% 0 0); }
html[data-ughyper=on] .ug-wordmark { display: block; overflow: hidden; }
html[data-ughyper=on] .ug-wordmark .wch { display: inline-block; transform: translateY(115%); transition: transform .9s cubic-bezier(.22,1,.36,1); }
html[data-ughyper=on] .ug-wordmark.ug-wm-on .wch { transform: translateY(0); }
.ug-scan { position: absolute; left: 0; right: 0; height: 32px; pointer-events: none; }
`;

const HYPER_JS = String.raw`
(function () {
  if (!window.__UGHYPER) return;
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM) return;
  var MOBILE = window.innerWidth < 860;
  var root = document.documentElement;
  root.setAttribute('data-ughyper', 'on');
  function col(sel, prop) { var el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : ''; }
  var bg = col('body', 'backgroundColor') || 'rgb(16, 16, 16)';
  var fg = col('h1', 'color') || 'rgb(238, 238, 238)';
  var body = document.body;

  /* curtain: two-tone wipe */
  var curtain = document.createElement('div'); curtain.className = 'ug-hcurtain';
  var c1 = document.createElement('div'); c1.style.background = fg;
  var c2 = document.createElement('div'); c2.style.background = bg;
  curtain.appendChild(c1); curtain.appendChild(c2);

  /* keep fixed UI chrome outside the smooth-scroll transform context */
  var chrome = [];
  ['ug-progress', 'ug-theme', 'ug-cursor', 'ug-cursor-dot'].forEach(function (id) {
    var el = document.getElementById(id); if (el) chrome.push(el);
  });

  /* wrap page for inertial scroll (desktop only - phones keep native scroll and get the lite layer) */
  var wrap;
  if (!MOBILE) {
    wrap = document.createElement('div');
    while (body.firstChild) wrap.appendChild(body.firstChild);
    body.appendChild(wrap);
    chrome.forEach(function (el) { body.appendChild(el); });
    wrap.style.position = 'fixed'; wrap.style.top = '0'; wrap.style.left = '0'; wrap.style.right = '0';
    wrap.style.willChange = 'transform';
    var setHeight = function () { body.style.height = wrap.getBoundingClientRect().height + 'px'; };
    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('load', setHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setHeight(); });
    setTimeout(setHeight, 1200); setTimeout(setHeight, 3000);
  } else { wrap = body; }
  body.appendChild(curtain);

  /* scene handles */
  var h1 = wrap.querySelector('h1');
  var hero = wrap.querySelector('.ug-hero');
  var fig = wrap.querySelector('.ug-figure, .ug-term');
  if (fig) fig.classList.remove('ug-r');
  var wm = wrap.querySelector('.ug-wordmark');
  var wmChars = [];
  if (wm) {
    var txt = wm.textContent; wm.textContent = '';
    for (var ci = 0; ci < txt.length; ci++) {
      var sp = document.createElement('span'); sp.className = 'wch';
      sp.textContent = txt[ci]; sp.style.transitionDelay = (ci * 0.035) + 's';
      wm.appendChild(sp); wmChars.push(sp);
    }
  }
  var arcs = [];
  wrap.querySelectorAll('.ug-art circle[stroke]').forEach(function (c) {
    var r = parseFloat(c.getAttribute('r')); if (!r) return;
    var C = 2 * Math.PI * r;
    c.style.strokeDasharray = String(C); c.style.strokeDashoffset = String(C);
    arcs.push({ c: c, C: C });
  });
  var sticker = wrap.querySelector('.ug-sticker'); var rot = 6;

  /* scroll storytelling 1: pinned hero - hero holds while the next section slides over it */
  var pinNext = null;
  if (hero) {
    hero.style.position = 'relative'; hero.style.zIndex = '0';
    pinNext = hero.nextElementSibling;
    if (pinNext) { pinNext.style.position = 'relative'; pinNext.style.zIndex = '1'; pinNext.style.background = bg; }
  }

  /* scroll storytelling 2: word-by-word scrub reveal on section headings */
  var scrubHeads = [];
  wrap.querySelectorAll('.ug-sechead h2').forEach(function (h2) {
    var words = h2.textContent.trim().split(/\s+/);
    h2.textContent = '';
    var spans = words.map(function (w) {
      var sp = document.createElement('span');
      sp.textContent = w; sp.style.opacity = '0.14'; sp.style.display = 'inline-block';
      sp.style.transition = 'opacity .35s ease, transform .35s ease'; sp.style.transform = 'translateY(6px)';
      h2.appendChild(sp); h2.appendChild(document.createTextNode(' '));
      return sp;
    });
    scrubHeads.push({ el: h2, spans: spans, done: 0 });
  });
  var term = wrap.querySelector('.ug-term');
  var scan = null;
  if (term) {
    term.style.position = 'relative'; term.style.overflow = 'hidden';
    scan = document.createElement('div'); scan.className = 'ug-scan';
    scan.style.background = col('.ug-term .ln', 'color') || fg; scan.style.opacity = '0.06';
    term.appendChild(scan);
  }
  var logs = [];
  wrap.querySelectorAll('.ug-logs .ln').forEach(function (ln, i) {
    ln.style.opacity = '0'; ln.style.transform = 'translateY(8px)';
    ln.style.transition = 'opacity .4s ease ' + (1.0 + i * 0.28) + 's, transform .4s ease ' + (1.0 + i * 0.28) + 's';
    logs.push(ln);
  });

  var t0 = performance.now();
  var cur = 0, prev = 0, vel = 0;
  var doneFlag = false;
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function frame(now) {
    var lt = (now - t0) / 1000;
    /* curtain wipe */
    if (curtain.parentNode) {
      var p1 = Math.min(Math.max((lt - 0.15) / 0.85, 0), 1);
      var p2 = Math.min(Math.max(lt / 0.85, 0), 1);
      c1.style.transform = 'translateY(' + (-easeOut(p1) * 100) + '%)';
      c2.style.transform = 'translateY(' + (-easeOut(p2) * 100) + '%)';
      if (!doneFlag && lt > 0.4) { doneFlag = true; root.classList.add('ug-done'); logs.forEach(function (ln) { ln.style.opacity = ''; ln.style.transform = ''; }); }
      if (p1 >= 1 && p2 >= 1) curtain.remove();
    }
    /* arc draw over first 2s */
    if (arcs.length && lt < 2.4) {
      var ap = easeOut(Math.min(Math.max((lt - 0.7) / 1.4, 0), 1));
      arcs.forEach(function (a, i) { a.c.style.strokeDashoffset = String(a.C * (1 - Math.min(ap * 1.25 - i * 0.08, 1))); });
    }
    /* inertial scroll (desktop only) */
    if (!MOBILE) {
      var target = window.scrollY || window.pageYOffset || 0;
      cur += (target - cur) * 0.085;
      if (Math.abs(target - cur) < 0.05) cur = target;
      vel += ((cur - prev) - vel) * 0.15; prev = cur;
      wrap.style.transform = 'translate3d(0,' + (-cur).toFixed(2) + 'px,0)';
    }
    var vh = window.innerHeight;
    /* velocity skew on big type (desktop only) */
    var sk = MOBILE ? 0 : Math.max(-6, Math.min(6, vel * 0.45));
    if (h1) {
      var hr = hero ? hero.getBoundingClientRect() : { top: 0, height: 1 };
      var hp = Math.min(Math.max(-hr.top / (hr.height || 1), 0), 1);
      h1.style.transform = 'translate3d(0,' + (hp * -22).toFixed(1) + 'px,0) skewY(' + sk.toFixed(2) + 'deg)';
    }
    /* hero figure counter-parallax */
    if (fig && hero) {
      var fr = hero.getBoundingClientRect();
      var fp = Math.min(Math.max(-fr.top / (fr.height || 1), 0), 1);
      fig.style.transform = 'translate3d(0,' + (fp * 56).toFixed(1) + 'px,0)';
    }
    /* wordmark scrub + reveal */
    if (wm) {
      var wr = wm.getBoundingClientRect();
      if (wr.top < vh * 0.92) wm.classList.add('ug-wm-on');
      var wp = Math.min(Math.max((vh - wr.top) / (vh + wr.height), 0), 1);
      wm.style.transform = 'translate3d(' + ((0.5 - wp) * 14).toFixed(2) + '%,0,0) skewY(' + (sk * 0.5).toFixed(2) + 'deg)';
    }
    /* pinned hero + fade as it is covered */
    if (!MOBILE && hero && pinNext) {
      var hh = hero.offsetHeight || 1;
      var pinMax = hh * 0.55;
      var pinY = Math.min(cur, pinMax);
      hero.style.transform = 'translate3d(0,' + pinY.toFixed(1) + 'px,0)';
      var cov = pinY / pinMax;
      hero.style.opacity = String(1 - cov * 0.55);
    }
    /* word-by-word scrub */
    for (var si = 0; si < scrubHeads.length; si++) {
      var sh = scrubHeads[si];
      var srect = sh.el.getBoundingClientRect();
      var prog = Math.min(Math.max((vh * 0.9 - srect.top) / (vh * 0.4), 0), 1);
      var want = Math.round(prog * sh.spans.length);
      while (sh.done < want) { var wsp = sh.spans[sh.done++]; wsp.style.opacity = '1'; wsp.style.transform = 'none'; }
    }
    /* sticker spin */
    if (sticker) { rot += 0.12; sticker.style.transform = 'rotate(' + rot.toFixed(2) + 'deg)'; }
    /* terminal scanline */
    if (scan) { scan.style.top = ((lt * 9) % 110 - 5) + '%'; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
`;

/* ---------------- WebGL hero layer (composed docs only) ----------------
   Cursor-reactive shader plane behind hero content: animated fbm field in the
   direction's own palette, warped by the pointer. Vanilla WebGL, no deps. */

const GL_JS = String.raw`
(function () {
  if (!window.__UGHYPER) return;
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM || window.innerWidth < 860) return;
  var hero = document.querySelector('.ug-hero');
  if (!hero) return;
  var canvas = document.createElement('canvas');
  canvas.className = 'ug-gl'; canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl', { antialias: false, alpha: true, powerPreference: 'low-power' });
  if (!gl) return;
  hero.style.position = 'relative';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  hero.insertBefore(canvas, hero.firstChild);
  Array.prototype.forEach.call(hero.children, function (c) {
    if (c === canvas) return;
    if (getComputedStyle(c).position === 'static') { c.style.position = 'relative'; if (!c.style.zIndex) c.style.zIndex = '1'; }
  });
  function rgb(sel, prop, fb) {
    var el = document.querySelector(sel);
    var s = el ? getComputedStyle(el)[prop] : '';
    var m = s && s.match(/[\d.]+/g);
    return m ? [parseFloat(m[0]) / 255, parseFloat(m[1]) / 255, parseFloat(m[2]) / 255] : fb;
  }
  var accent = rgb('.ug-ctas a', 'backgroundColor', [0.7, 0.3, 0.1]);
  if (accent[0] + accent[1] + accent[2] < 0.02) accent = rgb('h1', 'color', [0.7, 0.3, 0.1]);
  var ink = rgb('h1', 'color', [0.1, 0.1, 0.1]);
  var V = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }';
  var F = [
    'precision mediump float;',
    'uniform vec2 u_res; uniform float u_t; uniform vec2 u_m; uniform vec3 u_a; uniform vec3 u_i;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
    'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }',
    'float fbm(vec2 p){ float v=0., a=.5; for(int k=0;k<5;k++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy/u_res.xy; uv.x *= u_res.x/u_res.y;',
    '  vec2 m = (u_m - .5) * .8;',
    '  float warp = fbm(uv*3.1 + u_t*.05 + m);',
    '  float n = fbm(uv*2.3 + vec2(u_t*.07, -u_t*.045) + m*1.6 + warp*.9);',
    '  vec3 col = mix(u_a, u_i, smoothstep(.3,.95,n));',
    '  float edge = smoothstep(1.05,.35, distance(uv/u_res.xy*u_res.xy, uv)*0.+length((gl_FragCoord.xy/u_res.xy)-.5)*1.15);',
    '  gl_FragColor = vec4(col, n * .34 * edge);',
    '}'
  ].join('\n');
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, V)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, F));
  gl.linkProgram(prog); gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(prog, 'u_res'), uT = gl.getUniformLocation(prog, 'u_t'),
      uM = gl.getUniformLocation(prog, 'u_m'), uA = gl.getUniformLocation(prog, 'u_a'), uI = gl.getUniformLocation(prog, 'u_i');
  gl.uniform3fv(uA, accent); gl.uniform3fv(uI, ink);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  var mx = .5, my = .5, smx = .5, smy = .5;
  window.addEventListener('pointermove', function (e) { mx = e.clientX / window.innerWidth; my = 1 - e.clientY / window.innerHeight; }, { passive: true });
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(2, hero.clientWidth * dpr); canvas.height = Math.max(2, hero.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  size(); window.addEventListener('resize', size);
  var t0 = performance.now();
  function frame(now) {
    var r = hero.getBoundingClientRect();
    if (r.bottom > -80 && r.top < window.innerHeight + 80) {
      smx += (mx - smx) * .06; smy += (my - smy) * .06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform2f(uM, smx, smy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
`;

/* ---------------- sample vibecoded page ---------------- */

export const SAMPLE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>FlowPilot - Supercharge your workflow</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  body { margin:0; font-family:'Inter',system-ui,sans-serif; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; }
  nav { display:flex; justify-content:space-between; align-items:center; padding:20px 40px; max-width:1160px; margin:0 auto; }
  .logo { font-weight:800; font-size:22px; }
  .btn { background:linear-gradient(90deg,#8b5cf6,#d946ef); color:#fff; border:none; padding:13px 28px; border-radius:999px; font-weight:600; box-shadow:0 8px 40px rgba(139,92,246,.55); cursor:pointer; transition:all .3s; }
  .btn:hover { transform:scale(1.06); }
  .hero { text-align:center; padding:80px 20px 60px; }
  .hero h1 { font-size:54px; font-weight:800; background:linear-gradient(90deg,#f0abfc,#a5b4fc); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; margin:0 0 18px; animation:float 3s ease-in-out infinite; }
  @keyframes float { 50% { transform:translateY(-8px); } }
  .hero p { font-size:19px; opacity:.9; max-width:620px; margin:0 auto 30px; }
  .hero-visual { max-width:640px; margin:44px auto 0; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); border-radius:20px; padding:22px; box-shadow:0 20px 60px rgba(118,75,162,.45); }
  .mock-row { display:flex; align-items:center; gap:12px; padding:13px 16px; background:rgba(255,255,255,.07); border-radius:12px; margin-bottom:11px; font-size:14px; }
  .mock-dot { width:10px; height:10px; border-radius:999px; background:#a5b4fc; }
  .mock-bar { height:8px; border-radius:999px; background:linear-gradient(90deg,#8b5cf6,#d946ef); margin-top:6px; }
  .stats { display:flex; justify-content:center; gap:60px; padding:40px 24px; }
  .stat { text-align:center; }
  .stat .num { display:block; font-size:44px; font-weight:800; background:linear-gradient(90deg,#f0abfc,#a5b4fc); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .stat .lbl { font-size:13px; opacity:.65; letter-spacing: .06em; }
  .sec-h { text-align:center; font-size:38px; font-weight:800; background:linear-gradient(90deg,#a5b4fc,#f0abfc); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; margin:60px 24px 30px; }
  .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; padding:30px 60px 80px; max-width:1160px; margin:0 auto; }
  .card { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:16px; padding:30px; box-shadow:0 10px 50px rgba(118,75,162,.35); }
  .card h3 { margin:12px 0 8px; } .card p { opacity:.85; font-size:15px; }
  .icon { font-size:34px; }
  .badge { display:inline-block; background:rgba(240,171,252,.25); border:1px solid rgba(240,171,252,.5); padding:5px 14px; border-radius:999px; font-size:12px; margin-bottom:22px; letter-spacing: .06em; }
</style></head>
<body>
  <nav><div class="logo">🚀 FlowPilot</div><button class="btn">Get Started</button></nav>
  <div class="hero">
    <span class="badge">New ✨ AI-Powered</span>
    <h1>Supercharge your workflow with AI</h1>
    <p>Unlock seamless productivity and take your team to the next level with our cutting-edge, next-generation platform. ✨</p>
    <button class="btn">Start Free Trial</button>
    <button class="btn" style="background:rgba(255,255,255,.12);margin-left:12px">Learn More</button>
    <div class="hero-visual">
      <div class="mock-row"><span class="mock-dot"></span><span>Weekly report ready - 3 insights found</span></div>
      <div class="mock-row"><span class="mock-dot"></span><span>Automation ran: invoicing (42 tasks)</span></div>
      <div class="mock-row"><span class="mock-dot"></span><span>Team velocity <b>+12%</b></span></div>
      <div class="mock-bar" style="width:72%"></div>
      <div class="mock-bar" style="width:54%;opacity:.6"></div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><span class="num">12,400+</span><span class="lbl">teams onboard</span></div>
    <div class="stat"><span class="num">98%</span><span class="lbl">would recommend</span></div>
    <div class="stat"><span class="num">3.2x</span><span class="lbl">faster shipping</span></div>
  </div>
  <h2 class="sec-h">Everything you need to dominate your market</h2>
  <div class="cards">
    <div class="card"><div class="icon">⚡</div><h3>Lightning Fast</h3><p>Boost your output with robust, world-class automation that empowers your team.</p></div>
    <div class="card"><div class="icon">🔒</div><h3>Secure by Design</h3><p>Best-in-class security that is effortless to set up and seamlessly scales.</p></div>
    <div class="card"><div class="icon">💡</div><h3>Smart Insights</h3><p>Delve into game-changing analytics and elevate every decision you make.</p></div>
  </div>
</body></html>`;

/* ---------------- v4: direction registry + theme factory ---------------- */

/* Build a full direction stylesheet from tokens. Community directions use this. */
export function themeCSS(t) {
  return `
    * { box-shadow: none !important; text-shadow: none !important; }
    body { background: ${t.bg} !important; color: ${t.ink} !important; font-family: ${t.body} !important; line-height: 1.55 !important; }
    h1, h2, h3, h4 { font-family: ${t.head} !important; font-weight: ${t.headWeight || 700} !important; color: ${t.ink} !important; background: none !important; -webkit-text-fill-color: ${t.ink} !important; line-height: 1.05 !important; letter-spacing: ${t.tracking || '-0.02em'} !important; margin: 0 0 16px !important; text-transform: ${t.caps || 'none'} !important; }
    h1 { font-size: clamp(38px, 5.6vw, 68px) !important; }
    h2 { font-size: clamp(26px, 3.4vw, 38px) !important; margin-top: 64px !important; }
    p { margin: 0 0 14px !important; max-width: 64ch; }
    section, header, main, footer, div, nav, p, li, span { background-image: none !important; }
    [class*=card], [class*=Card] { background: ${t.surface} !important; border: ${t.borderW || '1.5px'} solid ${t.line} !important; border-radius: ${t.radius || '0'} !important; padding: 24px !important; }
    [class*=card]:hover { border-color: ${t.accent} !important; }
    .ug-ic { vertical-align: -3px; }
    button, [class*=btn], [class*=Btn], a[class*=button], input[type=submit] { background: ${t.btnBg || t.ink} !important; color: ${t.btnInk || t.bg} !important; border: ${t.borderW || '1.5px'} solid ${t.btnBg || t.ink} !important; border-radius: ${t.radius || '0'} !important; padding: 12px 24px !important; font-family: ${t.btnFont || t.body} !important; font-weight: 600 !important; font-size: 13px !important; }
    button:hover, [class*=btn]:hover { background: ${t.accent} !important; border-color: ${t.accent} !important; color: ${t.btnHover || '#fff'} !important; }
    nav, header { border-bottom: ${t.borderW || '1.5px'} solid ${t.line} !important; }
    a { color: ${t.accent} !important; }
    img { border-radius: ${t.radius || '0'} !important; }
    input, textarea, select { background: ${t.surface} !important; border: ${t.borderW || '1.5px'} solid ${t.line} !important; border-radius: ${t.radius || '0'} !important; color: ${t.ink} !important; padding: 8px 12px !important; }
    [class*=hero-visual], [class*=mockup], [class*=preview] { background: ${t.surface} !important; border: ${t.borderW || '1.5px'} solid ${t.line} !important; border-radius: ${t.radius || '0'} !important; padding: 24px !important; }
    [class*=mock-row] { background: transparent !important; border-bottom: 1px solid ${t.line} !important; border-radius: 0 !important; margin-bottom: 0 !important; }
    [class*=mock-bar] { background: ${t.accent} !important; }
    [class*=mock-dot] { background: ${t.accent} !important; }
    ::selection { background: ${t.accent}; color: ${t.bg}; }
  `;
}

/* community starter directions, built on the factory */
const COMMUNITY = {
  blueprint: {
    name: 'Blueprint', hint: 'engineering paper, cyan on deep blue',
    motion: 'marquee split progress navfx',
    mcss: `
      .ug-r { transform: translateY(14px); transition-duration: .55s; transition-timing-function: cubic-bezier(.3,.9,.3,1); }
      .ug-marqwrap { border-top: 1px dashed #7fd4ff; border-bottom: 1px dashed #7fd4ff; padding: 8px 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .06em; color: #7fd4ff; background: rgba(127,212,255,.06); }
    `, author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;700&display=swap',
    swatches: ['#0d2b45', '#4fc3f7', '#ffffff'],
    css: themeCSS({ bg: '#0d2b45', ink: '#eaf4fb', head: "'Space Grotesk',sans-serif", body: "'IBM Plex Mono',monospace", surface: '#123651', line: '#2a5578', accent: '#4fc3f7', btnBg: '#4fc3f7', btnInk: '#0d2b45', btnHover: '#0d2b45', radius: '3px' }),
  },
  botanical: {
    name: 'Botanical', hint: 'forest ink, cream, one leaf green',
    motion: 'story split progress navfx theme',
    mcss: `
      .ug-r { transform: translateY(20px) rotate(.8deg); transition-duration: .95s; transition-timing-function: cubic-bezier(.22,1,.36,1); }
      [class*=card]:hover, [class*=Card]:hover { border-color: #3e7c4f !important; }
    
      html[data-ug-theme=dark] body { background: #16211a !important; color: #e9e4d2 !important; }
      html[data-ug-theme=dark] [class*=card], html[data-ug-theme=dark] [class*=Card], html[data-ug-theme=dark] [class*=hero-visual], html[data-ug-theme=dark] [class*=mock] { background: #1e2c22 !important; border-color: #3a5240 !important; color: #e9e4d2 !important; }
      html[data-ug-theme=dark] h1, html[data-ug-theme=dark] h2, html[data-ug-theme=dark] h3 { color: #f4efe0 !important; }
      html[data-ug-theme=dark] p, html[data-ug-theme=dark] li, html[data-ug-theme=dark] span { color: #c4c9b8 !important; }
`, author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap',
    swatches: ['#f4f1e5', '#1e3a2a', '#4a7c59'],
    css: themeCSS({ bg: '#f4f1e5', ink: '#1e3a2a', head: "'Fraunces',serif", body: "'Newsreader',serif", surface: '#fbf9f1', line: '#c9c4ad', accent: '#4a7c59', btnBg: '#1e3a2a', btnInk: '#f4f1e5', btnHover: '#4a7c59', radius: '10px', headWeight: 600 }),
  },
  zine: {
    name: 'Mono Zine', hint: 'photocopied punk, black and white only',
    motion: 'marquee cursor tilt scramble progress navfx',
    mcss: `
      .ug-r { transform: translateY(16px) rotate(-1.6deg); transition-duration: .5s; transition-timing-function: cubic-bezier(.2,1.4,.4,1); }
      .ug-marqwrap { border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 8px 0; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; letter-spacing: .06em; background: #111; color: #fff; }
      #ug-cursor, #ug-cursor-dot { color: #111; mix-blend-mode: difference; }
    `, author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=IBM+Plex+Mono:wght@400;600&display=swap',
    swatches: ['#ffffff', '#000000', '#000000'],
    css: themeCSS({ bg: '#ffffff', ink: '#000000', head: "'IBM Plex Mono',monospace", body: "'Space Grotesk',sans-serif", surface: '#ffffff', line: '#000000', accent: '#000000', btnBg: '#000000', btnInk: '#ffffff', btnHover: '#ffffff', radius: '0', borderW: '2.5px', caps: 'uppercase', tracking: '-0.01em' }),
  },
  construct: {
    name: 'Construct', hint: 'soviet poster, safety orange on bone',
    motion: 'story scramble progress navfx',
    mcss: `
      .ug-r { clip-path: inset(0 100% 0 0); transform: none; transition: clip-path .7s cubic-bezier(.7,0,.2,1); transition-delay: calc(var(--ug-i, 0) * 90ms); }
      .ug-r.ug-on { clip-path: inset(0 0 0 0); }
    `, author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;900&family=IBM+Plex+Mono:wght@400;500&display=swap',
    swatches: ['#efe9dc', '#1c1a16', '#e8490f'],
    css: themeCSS({ bg: '#efe9dc', ink: '#1c1a16', head: "'Archivo',sans-serif", body: "'Archivo',sans-serif", surface: '#f7f3e8', line: '#1c1a16', accent: '#e8490f', btnBg: '#e8490f', btnInk: '#ffffff', btnHover: '#1c1a16', radius: '0', borderW: '2px', headWeight: 900, caps: 'uppercase', tracking: '-0.03em' }),
  },
};

/* registry: built-ins + community + user-imported */
const REGISTRY = new Map();
for (const [id, d] of Object.entries(DIRS)) REGISTRY.set(id, { id, ...d, builtin: true });
for (const [id, d] of Object.entries(COMMUNITY)) REGISTRY.set(id, { id, ...d });

export function registerDirection(def) {
  if (!def || typeof def !== 'object') throw new Error('direction must be an object');
  if (!/^[a-z0-9-]{2,40}$/.test(def.id || '')) throw new Error('direction needs an id like "my-direction"');
  if (!def.name || !def.css) throw new Error('direction needs at least name and css');
  const clean = {
    id: def.id, name: String(def.name), hint: String(def.hint || ''), author: String(def.author || 'community'),
    fonts: String(def.fonts || ''), css: String(def.css),
    swatches: Array.isArray(def.swatches) ? def.swatches.slice(0, 4).map(String) : [],
  };
  REGISTRY.set(clean.id, clean);
  return clean;
}
export function getDirection(id) { return REGISTRY.get(id); }
export function listDirections() { return [...REGISTRY.values()].map(d => ({ id: d.id, name: d.name, hint: d.hint, author: d.author || '', builtin: !!d.builtin, swatches: d.swatches || [] })); }

/* ---------------- v5: verified fix loop ---------------- */

/* Re-score the output and report the measured delta, honestly.
 * Some findings are expected to remain (real CTAs, real cards) - they are
 * reported, not hidden. */
export function verify(beforeHtml, afterHtml) {
  const before = detect(beforeHtml);
  const after = detect(afterHtml);
  const kept = after.findings.filter(f => ['stock-copy', 'generic-hero', 'card-grid', 'caps', 'invented-proof'].includes(f.id));
  const stillBad = after.findings.filter(f => !['stock-copy', 'generic-hero', 'card-grid', 'caps', 'invented-proof'].includes(f.id));
  return {
    before: before.score,
    after: after.score,
    delta: before.score - after.score,
    improved: after.score < before.score,
    remaining: after.findings,
    kept,      // findings that are usually legitimate content (CTAs, real cards)
    stillBad,  // findings that should have been fixed but were not
  };
}

/* ---------------- v10: real 3D scene, scroll-driven (composed docs) ----------------
   A true 3D object (torus knot, lit, perspective-projected) rendered in vanilla
   WebGL. Pinned full-viewport section; the object's rotation is driven by scroll
   progress through the section, with a slow idle spin on top. No libraries. */

const SCENE_CSS = `
.ug-scene { position: relative; height: 240vh; }
.ug-scene-stick { position: sticky; top: 0; height: 100vh; overflow: hidden; }
.ug-scene-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.ug-scene-cap { position: absolute; left: 4vw; right: 4vw; bottom: 5vh; display: flex; justify-content: space-between; gap: 2em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; letter-spacing: .06em; opacity: .55; pointer-events: none; }
.ug-scene-x { position: absolute; top: 5vh; right: 4vw; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; letter-spacing: .06em; opacity: .55; pointer-events: none; }
@media (max-width: 859px) { .ug-scene { height: 180vh; } }
`;

const SCENE_SHAPES = ['knot', 'torus', 'sphere', 'mobius', 'shell'];
function sceneSection(label, shape) {
  return `<section class="ug-scene"><div class="ug-scene-stick"><canvas class="ug-scene-gl" data-shape="${escHtml(shape || 'knot')}"></canvas><div class="ug-scene-x">${escHtml(label || 'Object 01')}</div><div class="ug-scene-cap"><span>Rendered live in WebGL</span><span>Scroll rotates the object</span></div></div></section>`;
}

function injectScene(bodyHtml, label, shape) {
  const i = bodyHtml.lastIndexOf('<footer');
  const s = sceneSection(label, shape);
  return i === -1 ? bodyHtml + s : bodyHtml.slice(0, i) + s + bodyHtml.slice(i);
}

const SCENE_JS = String.raw`
(function () {
  var sec = document.querySelector('.ug-scene');
  if (!sec) return;
  var stick = sec.querySelector('.ug-scene-stick');
  var canvas = sec.querySelector('.ug-scene-gl');
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = canvas.getContext('webgl', { antialias: true, alpha: true, powerPreference: 'low-power' });
  if (!gl) { sec.style.display = 'none'; return; }

  function rgb(sel, prop, fb) {
    var el = document.querySelector(sel);
    var s = el ? getComputedStyle(el)[prop] : '';
    var m = s && s.match(/[\d.]+/g);
    return m ? [parseFloat(m[0]) / 255, parseFloat(m[1]) / 255, parseFloat(m[2]) / 255] : fb;
  }
  var fg = rgb('h1', 'color', [0.9, 0.9, 0.88]);
  var acc = rgb('.ug-ctas a', 'backgroundColor', [0.78, 0.32, 0.08]);
  if (acc[0] + acc[1] + acc[2] < 0.02) acc = rgb('.ug-ctas a', 'color', [0.78, 0.32, 0.08]);

  /* per-direction geometry: parametric surface grids, normals by finite differences */
  var SHAPE_FNS = {
    knot: function (u, v) {
      var t = u * Math.PI * 2;
      var r = (2 + Math.cos(3 * t)) * 0.52;
      var c = [r * Math.cos(2 * t), r * Math.sin(2 * t), Math.sin(3 * t) * 0.62];
      var t2 = t + 0.01;
      var r2 = (2 + Math.cos(3 * t2)) * 0.52;
      var c2 = [r2 * Math.cos(2 * t2), r2 * Math.sin(2 * t2), Math.sin(3 * t2) * 0.62];
      var tx = c2[0] - c[0], ty = c2[1] - c[1], tz = c2[2] - c[2];
      var tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      var ux = -ty, uy = tx, uz = 0;
      var ul = Math.hypot(ux, uy, uz); if (ul < 0.01) { ux = 0; uy = 0; uz = 1; ul = 1; }
      ux /= ul; uy /= ul; uz /= ul;
      var bx = ty * uz - tz * uy, by = tz * ux - tx * uz, bz = tx * uy - ty * ux;
      var a = v * Math.PI * 2, T = 0.42;
      return [c[0] + (ux * Math.cos(a) + bx * Math.sin(a)) * T, c[1] + (uy * Math.cos(a) + by * Math.sin(a)) * T, c[2] + (uz * Math.cos(a) + bz * Math.sin(a)) * T];
    },
    torus: function (u, v) {
      var t = u * Math.PI * 2, s = v * Math.PI * 2;
      var r = 1.02 + 0.44 * Math.cos(s);
      return [r * Math.cos(t), 0.44 * Math.sin(s), r * Math.sin(t)];
    },
    sphere: function (u, v) {
      var th = u * Math.PI * 2, ph = v * Math.PI;
      return [1.15 * Math.sin(ph) * Math.cos(th), 1.15 * Math.cos(ph), 1.15 * Math.sin(ph) * Math.sin(th)];
    },
    mobius: function (u, v) {
      var t = u * Math.PI * 2, w = (v - 0.5) * 0.8;
      var r = 1.12 + w * Math.cos(t / 2);
      return [r * Math.cos(t), w * Math.sin(t / 2) * 1.4, r * Math.sin(t)];
    },
    shell: function (u, v) {
      var th = u * Math.PI * 2, ph = v * Math.PI;
      var r = 1.05 + 0.14 * Math.sin(6 * th) * Math.sin(5 * ph);
      return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
    }
  };
  var shape = (canvas.getAttribute('data-shape') || 'knot');
  var fn = SHAPE_FNS[shape] || SHAPE_FNS.knot;
  var U = shape === 'knot' ? 168 : 96, V = shape === 'knot' ? 22 : (shape === 'mobius' ? 12 : 48);
  var WRAPV = shape === 'knot' || shape === 'torus';
  var nv = U * V, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint16Array(U * V * 6);
  var k = 0, ii = 0;
  for (var iu = 0; iu < U; iu++) {
    for (var iv = 0; iv < V; iv++) {
      var u0 = iu / U, v0 = iv / V;
      var p = fn(u0, v0), pu = fn(u0 + 0.004, v0), pv = fn(u0, v0 + 0.004);
      var tx = pu[0] - p[0], ty = pu[1] - p[1], tz = pu[2] - p[2];
      var ux = pv[0] - p[0], uy = pv[1] - p[1], uz = pv[2] - p[2];
      var nx = ty * uz - tz * uy, ny = tz * ux - tx * uz, nz = tx * uy - ty * ux;
      var nl = Math.hypot(nx, ny, nz) || 1;
      pos[k] = p[0]; nor[k++] = nx / nl;
      pos[k] = p[1]; nor[k++] = ny / nl;
      pos[k] = p[2]; nor[k++] = nz / nl;
      if (WRAPV || iv + 1 < V) {
        var a = iu * V + iv, b = ((iu + 1) % U) * V + iv, c = ((iu + 1) % U) * V + ((iv + 1) % V), d = iu * V + ((iv + 1) % V);
        idx[ii++] = a; idx[ii++] = b; idx[ii++] = c;
        idx[ii++] = a; idx[ii++] = c; idx[ii++] = d;
      }
    }
  }
  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER,
    'attribute vec3 aPos;attribute vec3 aNor;uniform float uRotY;uniform float uRotX;uniform float uAspect;' +
    'varying vec3 vN;varying vec3 vW;' +
    'void main(){' +
    'float cy=cos(uRotY),sy=sin(uRotY),cx=cos(uRotX),sx=sin(uRotX);' +
    'vec3 p=aPos;' +
    'p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);' +
    'p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);' +
    'vec3 n=aNor;' +
    'n=vec3(n.x*cy+n.z*sy,n.y,-n.x*sy+n.z*cy);' +
    'n=vec3(n.x,n.y*cx-n.z*sx,n.y*sx+n.z*cx);' +
    'vN=normalize(n);' +
    'float z=p.z+4.4;' +
    'vW=vec3(p.x,p.y,z);' +
    'float f=1.35;' +
    'gl_Position=vec4(p.x*f/uAspect,p.y*f,z*0.14,z);}'));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,
    'precision mediump float;varying vec3 vN;varying vec3 vW;uniform vec3 uFg;uniform vec3 uAcc;' +
    'void main(){' +
    'vec3 n=normalize(vN);' +
    'vec3 L=normalize(vec3(0.45,0.75,0.55));' +
    'float d=max(dot(n,L),0.0);' +
    'vec3 V=normalize(vec3(0.0,0.0,1.0));' +
    'vec3 H=normalize(L+V);' +
    'float sp=pow(max(dot(n,H),0.0),26.0);' +
    'float rim=pow(1.0-abs(n.z),2.2);' +
    'vec3 base=mix(uAcc,uFg,0.10);' +
    'vec3 col=base*(0.38+0.62*d)+uAcc*(rim*0.9)+vec3(1.0)*sp*0.45;' +
    'gl_FragColor=vec4(col,1.0);}'));
  gl.linkProgram(prog); gl.useProgram(prog);
  function buf(data, loc) {
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    var l = gl.getAttribLocation(prog, loc);
    gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0);
  }
  buf(pos, 'aPos'); buf(nor, 'aNor');
  var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
  var uRotY = gl.getUniformLocation(prog, 'uRotY'), uRotX = gl.getUniformLocation(prog, 'uRotX'),
      uAspect = gl.getUniformLocation(prog, 'uAspect'), uFg = gl.getUniformLocation(prog, 'uFg'), uAcc = gl.getUniformLocation(prog, 'uAcc');
  gl.uniform3fv(uFg, fg); gl.uniform3fv(uAcc, acc);
  gl.clearColor(0, 0, 0, 0);

  var hyper = document.documentElement.getAttribute('data-ughyper') === 'on';
  var t0 = performance.now();
  function draw(rotY) {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    var cr = canvas.getBoundingClientRect();
    var w = Math.max(cr.width, 8), h = Math.max(cr.height, 8);
    if (canvas.width !== (w * dpr | 0) || canvas.height !== (h * dpr | 0)) {
      canvas.width = w * dpr | 0; canvas.height = h * dpr | 0;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(uRotY, rotY);
    gl.uniform1f(uRotX, 0.5 + Math.sin(rotY * 0.5) * 0.25);
    gl.uniform1f(uAspect, w / Math.max(h, 1));
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }
  function prog01() {
    var r = sec.getBoundingClientRect();
    var total = Math.max(r.height - window.innerHeight, 1);
    return Math.min(Math.max(-r.top / total, 0), 1);
  }
  if (RM) { draw(prog01() * Math.PI * 2); window.addEventListener('scroll', function () { draw(prog01() * Math.PI * 2); }, { passive: true }); return; }
  var sm = 0;
  function frame(now) {
    var t = (now - t0) / 1000;
    var r = sec.getBoundingClientRect();
    var vh = window.innerHeight;
    if (hyper) {
      var total = Math.max(r.height - vh, 1);
      var pinY = Math.min(Math.max(-r.top, 0), total);
      stick.style.transform = 'translate3d(0,' + pinY.toFixed(1) + 'px,0)';
    }
    var vis = r.bottom > -40 && r.top < vh + 40;
    if (vis) {
      var p = prog01();
      sm += ((p * Math.PI * 2 + t * 0.25) - sm) * 0.12;
      draw(sm);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
`;

/* ---------------- v10b: directions 8 -> 16 ----------------
   Eight more composed directions. Textures use inline SVG data-URIs (no CSS
   gradients), blurs stay small, tracking declarations keep letter-spacing
   before text-transform, and each direction keeps a tight hex palette. */

const COMPOSE_NOIR_CSS = `
body { background: #121212; color: #f4f1ea; font-family: 'IBM Plex Mono', monospace; }
.ug-page { max-width: 1240px; margin: 0 auto; padding: 0 4vw; }
.ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 1px solid #3a3a3a; font-size: 12px; }
.ug-topbar nav a { color: #f4f1ea; text-decoration: none; margin-left: 24px; opacity: .75; }
.ug-topbar nav a:hover { opacity: 1; border-bottom: 1px solid #f4f1ea; }
.ug-logo { font-weight: 600; letter-spacing: .14em; }
.ug-hero { position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 64px 0 72px 44px; }
.ug-sceneno { position: absolute; top: 10vh; left: 0; writing-mode: vertical-rl; font-size: 12px; letter-spacing: .06em; color: #8f8f8f; }
.ug-kicker { font-size: 12px; color: #8f8f8f; margin-bottom: 24px; }
.ug-hero h1 { font-family: 'Archivo Narrow', sans-serif; font-weight: 700; font-size: clamp(64px, 11vw, 168px); line-height: .88; letter-spacing: -0.01em; margin: 0; max-width: 12ch; }
.ug-hero h1 em { font-style: normal; color: #8f8f8f; }
.ug-sub { max-width: 46ch; font-size: 15px; line-height: 1.75; color: #b9b6ad; margin: 32px 0; }
.ug-ctas { display: flex; gap: 14px; flex-wrap: wrap; }
.ug-ctas a { font-size: 12px; letter-spacing: .14em; text-decoration: none; padding: 16px 28px; border: 1px solid #f4f1ea; color: #f4f1ea; }
.ug-ctas a:first-child { background: #f4f1ea; color: #121212; }
.ug-ctas a:hover { background: #8f8f8f; border-color: #8f8f8f; color: #121212; }
.ug-media { margin: 0 0 80px; position: relative; }
.ug-media img { width: 100%; display: block; filter: grayscale(1) contrast(1.15); }
.ug-media::after { content: ''; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Crect width='18' height='9' fill='%23121212' fill-opacity='0.55'/%3E%3C/svg%3E"); }
.ug-media .cap { position: absolute; bottom: 14px; left: 14px; font-size: 12px; letter-spacing: .12em; color: #f4f1ea; background: #121212; padding: 4px 10px; }
.ug-stats { display: flex; gap: 0; border-top: 1px solid #3a3a3a; border-bottom: 1px solid #3a3a3a; margin-bottom: 96px; }
.ug-stat { flex: 1; padding: 28px 20px; border-right: 1px solid #3a3a3a; }
.ug-stat:last-child { border-right: 0; }
.ug-stat .num { display: block; font-family: 'Archivo Narrow', sans-serif; font-size: 44px; font-weight: 700; }
.ug-stat .num::before { content: 'REEL '; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #8f8f8f; display: block; letter-spacing: .2em; }
.ug-stat .lbl { font-size: 12px; color: #8f8f8f; }
.ug-sechead { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 40px; }
.ug-sechead h2 { font-family: 'Archivo Narrow', sans-serif; font-size: clamp(34px, 4.6vw, 64px); font-weight: 700; margin: 0; }
.ug-sechead .tag { font-size: 12px; color: #8f8f8f; letter-spacing: .06em; }
.ug-frow { display: grid; grid-template-columns: 90px 1fr 1.2fr; gap: 24px; padding: 28px 0; border-top: 1px solid #3a3a3a; align-items: baseline; }
.ug-frow .idx { color: #8f8f8f; font-size: 12px; letter-spacing: .06em; }
.ug-frow h3 { font-family: 'Archivo Narrow', sans-serif; font-size: 26px; font-weight: 700; margin: 0; display: flex; gap: 12px; align-items: center; }
.ug-frow h3 svg { stroke: #f4f1ea; flex: none; }
.ug-frow p { margin: 0; font-size: 13px; line-height: 1.7; color: #b9b6ad; }
.ug-features { margin-bottom: 112px; }
.ug-footer { border-top: 1px solid #3a3a3a; padding: 64px 0 48px; text-align: center; }
.ug-wordmark { font-family: 'Archivo Narrow', sans-serif; font-weight: 700; font-size: clamp(60px, 12vw, 190px); line-height: .9; letter-spacing: .02em; color: #f4f1ea; }
.ug-colophon { font-size: 12px; color: #8f8f8f; margin-top: 24px; letter-spacing: .14em; }
@media (max-width: 859px) { .ug-frow { grid-template-columns: 1fr; gap: 8px; } .ug-stats { flex-direction: column; } .ug-stat { border-right: 0; border-bottom: 1px solid #3a3a3a; } }
`;

function composeNoir(m) {
  const media = mediaSlot(m, m.figureLines[0] || 'STILL FRAME');
  const mediaFig = `<figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy"><span class="cap">${escHtml(media.caption)}</span></figure>`;
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -1).join(' ')) + ' <em>' + escHtml(words.slice(-1)[0]) + '</em>' : escHtml(m.headline);
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <span class="ug-sceneno">Scene 01 &mdash; ${escHtml(m.logo)}</span>
      <div class="ug-kicker">A picture in black and white</div>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    ${m.variant ? '' : mediaFig}
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'The picture')}</h2><span class="tag">Scene 02</span></div>
      ${m.features.map((f, i) => `<article class="ug-frow ug-r"><span class="idx">Reel ${String(i + 1).padStart(2, '0')}</span><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>
    ${m.variant ? mediaFig : ''}
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">THE END &mdash; recomposed, not reskinned</div></footer>
  </main>`;
}

const COMPOSE_MEMPHIS_CSS = `
body { background: #fdf3e3; color: #1f1d3a; font-family: 'Space Grotesk', sans-serif; }
.ug-page { max-width: 1180px; margin: 0 auto; padding: 0 4vw; overflow: hidden; }
.ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; font-size: 16px; }
.ug-logo { font-family: 'Archivo Black', sans-serif; font-size: 20px; }
.ug-topbar nav a { color: #1f1d3a; text-decoration: none; margin-left: 20px; font-weight: 500; }
.ug-topbar nav a:hover { color: #e4572e; }
.ug-hero { position: relative; display: flex; flex-direction: column; justify-content: flex-start; padding: 48px 0; }
.ug-shape { position: absolute; pointer-events: none; }
.ug-shape.s1 { width: 130px; height: 130px; border-radius: 100%; background: #f2b33d; top: 6%; right: 8%; }
.ug-shape.s2 { width: 0; height: 0; border-left: 70px solid transparent; border-right: 70px solid transparent; border-bottom: 120px solid #2e5eaa; bottom: 12%; right: 22%; }
.ug-shape.s3 { width: 90px; height: 90px; background: #e4572e; transform: rotate(14deg); top: 20%; left: -30px; }
.ug-kicker { display: inline-block; background: #2e5eaa; color: #fdf3e3; font-weight: 700; font-size: 12px; padding: 8px 18px; border-radius: 18px; transform: rotate(-2deg); width: fit-content; margin-bottom: 24px; }
.ug-hero h1 { font-family: 'Archivo Black', sans-serif; font-size: clamp(52px, 8.4vw, 128px); line-height: .94; margin: 0; max-width: 11ch; position: relative; z-index: 1; }
.ug-hero h1 em { font-style: normal; color: #e4572e; }
.ug-sub { max-width: 44ch; font-size: 16px; line-height: 1.7; margin: 28px 0; }
.ug-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
.ug-ctas a { font-weight: 700; font-size: 16px; text-decoration: none; padding: 16px 30px; border-radius: 18px; border: 3px solid #1f1d3a; color: #1f1d3a; background: #fdf3e3; box-shadow: 6px 6px 0 #f2b33d; }
.ug-ctas a:first-child { background: #e4572e; color: #fdf3e3; box-shadow: 6px 6px 0 #1f1d3a; }
.ug-ctas a:hover { box-shadow: 2px 2px 0 #1f1d3a; }
.ug-media { margin: 32px 0 80px; }
.ug-media img { width: 100%; display: block; border: 3px solid #1f1d3a; border-radius: 24px; box-shadow: 10px 10px 0 #2e5eaa; }
.ug-media .cap { display: block; margin-top: 16px; font-size: 12px; font-weight: 500; }
.ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-bottom: 96px; }
.ug-stat { border: 3px solid #1f1d3a; border-radius: 20px; padding: 28px; background: #fdf3e3; }
.ug-stat:nth-child(3n+1) { box-shadow: 8px 8px 0 #e4572e; }
.ug-stat:nth-child(3n+2) { box-shadow: 8px 8px 0 #f2b33d; }
.ug-stat:nth-child(3n+3) { box-shadow: 8px 8px 0 #2e5eaa; }
.ug-stat .num { display: block; font-family: 'Archivo Black', sans-serif; font-size: 46px; }
.ug-stat .lbl { font-size: 16px; font-weight: 500; }
.ug-sechead { margin-bottom: 40px; }
.ug-sechead h2 { font-family: 'Archivo Black', sans-serif; font-size: clamp(38px, 5.4vw, 76px); margin: 0; }
.ug-sechead svg { display: block; margin-top: 8px; }
.ug-fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; margin-bottom: 112px; }
.ug-ftile { border: 3px solid #1f1d3a; border-radius: 20px; padding: 28px; background: #fdf3e3; box-shadow: 8px 8px 0 #f2b33d; }
.ug-ftile:nth-child(3n+2) { box-shadow: 8px 8px 0 #e4572e; }
.ug-ftile:nth-child(3n) { box-shadow: 8px 8px 0 #2e5eaa; }
.ug-ftile h3 { font-family: 'Archivo Black', sans-serif; font-size: 20px; margin: 0 0 10px; display: flex; gap: 10px; align-items: center; }
.ug-ftile h3 svg { stroke: #e4572e; flex: none; }
.ug-ftile p { margin: 0; font-size: 16px; line-height: 1.65; }
.ug-footer { text-align: center; padding: 64px 0 56px; }
.ug-wordmark { font-family: 'Archivo Black', sans-serif; font-size: clamp(56px, 11vw, 170px); line-height: .9; color: #e4572e; text-shadow: 5px 5px 0 #f2b33d, 10px 10px 0 #2e5eaa; }
.ug-colophon { font-size: 12px; margin-top: 32px; font-weight: 500; }
@media (max-width: 859px) { .ug-stats { grid-template-columns: 1fr; } .ug-shape.s3 { display: none; } }
`;

function composeMemphis(m) {
  const media = mediaSlot(m, m.figureLines[0] || '');
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -2).join(' ')) + ' <em>' + escHtml(words.slice(-2).join(' ')) + '</em>' : escHtml(m.headline);
  const squiggle = `<svg width="150" height="16" viewBox="0 0 150 16" fill="none" aria-hidden="true"><path d="M2 8c8-8 16-8 24 0s16 8 24 0 16-8 24 0 16 8 24 0 16-8 24 0 16 8 24 0" stroke="#e4572e" stroke-width="4"/></svg>`;
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <span class="ug-shape s1"></span><span class="ug-shape s2"></span><span class="ug-shape s3"></span>
      <span class="ug-kicker">${escHtml(m.logo)} says hi</span>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy">${media.caption ? `<span class="cap">${escHtml(media.caption)}</span>` : ''}</figure>
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'The fun stuff')}</h2>${squiggle}</div>
      <div class="ug-fgrid">
      ${m.features.map((f, i) => `<article class="ug-ftile ug-r"><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
      </div>
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">Recomposed, not reskinned &mdash; with shapes on purpose</div></footer>
  </main>`;
}

const COMPOSE_LETTERPRESS_CSS = `
body { background: #f1ead9; color: #38332a; font-family: 'Newsreader', Georgia, serif; }
.ug-page { max-width: 1080px; margin: 0 auto; padding: 0 4vw; }
.ug-masthead { display: flex; justify-content: space-between; align-items: center; padding: 28px 0 20px; border-bottom: 2px solid #38332a; box-shadow: 0 1px 0 #fff; }
.ug-logo { font-family: 'Fraunces', serif; font-weight: 700; font-size: 22px; text-shadow: 0 1px 0 #fff; }
.ug-masthead nav a { color: #38332a; text-decoration: none; margin-left: 24px; font-size: 15px; }
.ug-masthead nav a:hover { color: #8c5a2b; }
.ug-hero { display: flex; flex-direction: column; justify-content: flex-start; padding: 56px 0; }
.ug-kicker { font-size: 13px; color: #8c5a2b; margin-bottom: 24px; }
.ug-hero h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: clamp(48px, 7.4vw, 116px); line-height: 1.02; margin: 0; max-width: 14ch; color: #38332a; text-shadow: 0 2px 0 #fff, 0 -1px 0 rgba(56,51,42,.35); }
.ug-hero h1 em { font-style: italic; color: #8c5a2b; }
.ug-sub { max-width: 52ch; font-size: 19px; line-height: 1.8; margin: 32px 0; }
.ug-sub::first-letter { font-family: 'Fraunces', serif; font-size: 3.1em; float: left; line-height: .82; padding: 4px 12px 0 0; color: #8c5a2b; }
.ug-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
.ug-ctas a { font-family: 'Courier Prime', monospace; font-size: 14px; text-decoration: none; padding: 16px 28px; border: 2px solid #38332a; color: #38332a; box-shadow: 0 2px 0 #fff, inset 0 1px 0 #fff; }
.ug-ctas a:first-child { background: #8c5a2b; border-color: #8c5a2b; color: #f1ead9; }
.ug-ctas a:hover { background: #38332a; color: #f1ead9; border-color: #38332a; }
.ug-media { margin: 32px 0 88px; border: 1px solid #cfc6ad; padding: 16px; background: #f8f4e9; box-shadow: 0 1px 0 #fff, 0 4px 14px rgba(56,51,42,.14); }
.ug-media img { width: 100%; display: block; filter: sepia(.24) contrast(1.02); }
.ug-media .cap { display: block; padding-top: 12px; font-family: 'Courier Prime', monospace; font-size: 12px; color: #8c5a2b; }
.ug-stats { display: flex; justify-content: center; gap: 5vw; flex-wrap: wrap; margin-bottom: 104px; }
.ug-stat { width: 170px; height: 170px; border: 2px solid #8c5a2b; border-radius: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; transform: rotate(-5deg); box-shadow: inset 0 0 0 5px #f1ead9, inset 0 0 0 7px #8c5a2b; }
.ug-stat:nth-child(2n) { transform: rotate(4deg); }
.ug-stat .num { display: block; font-family: 'Fraunces', serif; font-weight: 700; font-size: 34px; color: #8c5a2b; }
.ug-stat .lbl { font-family: 'Courier Prime', monospace; font-size: 10.5px; padding: 0 18px; }
.ug-sechead { text-align: center; margin-bottom: 48px; }
.ug-sechead h2 { font-family: 'Fraunces', serif; font-weight: 600; font-size: clamp(34px, 4.8vw, 62px); margin: 0; text-shadow: 0 2px 0 #fff; }
.ug-sechead .rule { width: 90px; margin: 16px auto 0; border-top: 2px solid #38332a; box-shadow: 0 1px 0 #fff; }
.ug-frow { padding: 32px 0; border-top: 1px solid #cfc6ad; box-shadow: 0 1px 0 #fff; display: grid; grid-template-columns: 70px 1fr; gap: 26px; }
.ug-frow .fig { font-family: 'Courier Prime', monospace; font-size: 12px; color: #8c5a2b; padding-top: 8px; }
.ug-frow h3 { font-family: 'Fraunces', serif; font-weight: 700; font-size: 26px; margin: 0 0 8px; }
.ug-frow h3 svg { display: none; }
.ug-frow p { margin: 0; font-size: 16px; line-height: 1.75; max-width: 58ch; }
.ug-features { margin-bottom: 104px; }
.ug-footer { text-align: center; border-top: 2px solid #38332a; box-shadow: 0 1px 0 #fff; padding: 64px 0 56px; }
.ug-wordmark { font-family: 'Fraunces', serif; font-weight: 700; font-size: clamp(52px, 10vw, 150px); line-height: .95; text-shadow: 0 3px 0 #fff, 0 -1px 0 rgba(56,51,42,.3); }
.ug-colophon { font-size: 12px; color: #8c5a2b; margin-top: 24px; }
@media (max-width: 859px) { .ug-frow { grid-template-columns: 1fr; gap: 6px; } }
`;

function composeLetterpress(m) {
  const media = mediaSlot(m, m.figureLines[0] || 'First impression');
  const mediaFig = `<figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy"><span class="cap">${escHtml(media.caption)}</span></figure>`;
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -2).join(' ')) + ' <em>' + escHtml(words.slice(-2).join(' ')) + '</em>' : escHtml(m.headline);
  return `
  <main class="ug-page">
    <header class="ug-masthead"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <div class="ug-kicker">Est. on paper &mdash; ${escHtml(m.logo)}</div>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    ${m.variant ? '' : mediaFig}
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'From the press')}</h2><div class="rule"></div></div>
      ${m.features.map((f, i) => `<article class="ug-frow ug-r"><span class="fig">fig. ${i + 1}</span><div><h3>${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></div></article>`).join('')}
    </section>
    ${m.variant ? mediaFig : ''}
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">Printed in one pass &mdash; recomposed, not reskinned</div></footer>
  </main>`;
}

const COMPOSE_NEON_CSS = `
body { background: #0a0e1a; color: #e6f6ff; font-family: 'Space Grotesk', sans-serif; }
.ug-page { max-width: 1240px; margin: 0 auto; padding: 0 4vw; }
.ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 1px solid #1e2b45; font-size: 12px; letter-spacing: .02em; }
.ug-logo { font-weight: 700; color: #39ff88; text-shadow: 0 0 8px rgba(57,255,136,.6); }
.ug-topbar nav a { color: #e6f6ff; text-decoration: none; margin-left: 24px; opacity: .7; }
.ug-topbar nav a:hover { opacity: 1; color: #39ff88; }
.ug-hero { position: relative; display: flex; flex-direction: column; justify-content: flex-start; padding: 64px 0; overflow: hidden; }
.ug-horizon { position: absolute; left: -10%; right: -10%; bottom: -4%; height: 46%; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cpath d='M0 89h90M0 44h90M44 0v90M89 0v90' stroke='%2339ff88' stroke-opacity='0.16'/%3E%3C/svg%3E"); transform: perspective(300px) rotateX(52deg); transform-origin: bottom; }
.ug-kicker { font-size: 12px; color: #ff3df2; text-shadow: 0 0 8px rgba(255,61,242,.55); margin-bottom: 24px; position: relative; z-index: 1; }
.ug-hero h1 { font-weight: 700; font-size: clamp(52px, 8.6vw, 132px); line-height: .96; margin: 0; max-width: 13ch; color: #e6f6ff; text-shadow: 0 0 10px rgba(57,255,136,.35), 0 0 42px rgba(57,255,136,.16); position: relative; z-index: 1; }
.ug-hero h1 em { font-style: normal; color: #39ff88; text-shadow: 0 0 12px rgba(57,255,136,.75); }
.ug-sub { max-width: 48ch; font-size: 16.5px; line-height: 1.75; color: #9fb8cc; margin: 28px 0; position: relative; z-index: 1; }
.ug-ctas { display: flex; gap: 16px; flex-wrap: wrap; position: relative; z-index: 1; }
.ug-ctas a { font-family: 'IBM Plex Mono', monospace; font-size: 13px; text-decoration: none; padding: 16px 28px; border: 1px solid #39ff88; color: #39ff88; background: rgba(57,255,136,.06); }
.ug-ctas a:first-child { background: #39ff88; color: #0a0e1a; box-shadow: 0 0 18px rgba(57,255,136,.45); }
.ug-ctas a:hover { box-shadow: 0 0 24px rgba(57,255,136,.6); }
.ug-media { margin: 32px 0 88px; border: 1px solid #1e2b45; }
.ug-media img { width: 100%; display: block; filter: hue-rotate(120deg) saturate(.8) brightness(.85); }
.ug-media .cap { display: block; padding: 8px 12px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #39ff88; border-top: 1px solid #1e2b45; }
.ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 96px; }
.ug-stat { border: 1px solid #1e2b45; padding: 24px; background: #0d1220; }
.ug-stat .num { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 40px; color: #39ff88; text-shadow: 0 0 10px rgba(57,255,136,.55); }
.ug-stat .lbl { font-size: 13px; color: #9fb8cc; }
.ug-sechead { margin-bottom: 40px; }
.ug-sechead h2 { font-size: clamp(34px, 4.8vw, 66px); font-weight: 700; margin: 0; max-width: 14em; text-shadow: 0 0 12px rgba(57,255,136,.3); }
.ug-sechead .tag { font-size: 12px; color: #ff3df2; }
.ug-fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 112px; }
.ug-ftile { border: 1px solid #1e2b45; background: #0d1220; padding: 28px; }
.ug-ftile:hover { border-color: #39ff88; box-shadow: 0 0 16px rgba(57,255,136,.25); }
.ug-ftile h3 { font-size: 19px; margin: 0 0 10px; display: flex; gap: 10px; align-items: center; color: #e6f6ff; }
.ug-ftile h3 svg { stroke: #39ff88; flex: none; }
.ug-ftile p { margin: 0; font-size: 14px; line-height: 1.65; color: #9fb8cc; }
.ug-footer { border-top: 1px solid #1e2b45; padding: 64px 0 56px; text-align: center; }
.ug-wordmark { font-weight: 700; font-size: clamp(54px, 11vw, 170px); line-height: .9; color: #39ff88; text-shadow: 0 0 14px rgba(57,255,136,.7), 0 0 60px rgba(57,255,136,.3); }
.ug-colophon { font-size: 12px; color: #9fb8cc; margin-top: 24px; }
@media (max-width: 859px) { .ug-stats { grid-template-columns: 1fr; } .ug-horizon { transform: none; } }
`;

function composeNeon(m) {
  const media = mediaSlot(m, m.figureLines[0] || 'SIGNAL');
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -2).join(' ')) + ' <em>' + escHtml(words.slice(-2).join(' ')) + '</em>' : escHtml(m.headline);
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <div class="ug-horizon" aria-hidden="true"></div>
      <div class="ug-kicker">&gt; ${escHtml(m.logo)} :: online</div>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy">${media.caption ? `<span class="cap">${escHtml(media.caption)}</span>` : ''}</figure>
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'Systems')}</h2><span class="tag">// module list</span></div>
      <div class="ug-fgrid">
      ${m.features.map((f, i) => `<article class="ug-ftile ug-r"><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
      </div>
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">end of transmission &mdash; recomposed, not reskinned</div></footer>
  </main>`;
}

const COMPOSE_BAUHAUS_CSS = `
body { background: #f6f3ec; color: #191919; font-family: 'Archivo', sans-serif; }
.ug-page { max-width: 1280px; margin: 0 auto; padding: 0 4vw; }
.ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 4px solid #191919; }
.ug-logo { font-weight: 900; font-size: 20px; }
.ug-topbar nav a { color: #191919; text-decoration: none; margin-left: 24px; font-weight: 600; font-size: 14px; }
.ug-topbar nav a:hover { color: #d0342c; }
.ug-hero { position: relative; display: flex; flex-direction: column; justify-content: flex-start; padding: 56px 0; }
.ug-geo { position: absolute; pointer-events: none; }
.ug-geo.g1 { width: 210px; height: 210px; border-radius: 100%; background: #d0342c; top: 4%; right: 10%; }
.ug-geo.g2 { width: 180px; height: 160px; background: #2050a8; clip-path: polygon(50% 0, 100% 100%, 0 100%); bottom: 8%; right: 30%; }
.ug-geo.g3 { width: 260px; height: 46px; background: #e8a812; top: 22%; right: -40px; }
.ug-kicker { font-weight: 600; font-size: 14px; margin-bottom: 24px; }
.ug-kicker b { color: #d0342c; }
.ug-hero h1 { font-weight: 900; font-size: clamp(60px, 9.6vw, 148px); line-height: .92; letter-spacing: -0.035em; margin: 0; max-width: 10ch; position: relative; z-index: 1; }
.ug-hero h1 em { font-style: normal; color: #2050a8; }
.ug-sub { max-width: 42ch; font-size: 17px; line-height: 1.65; margin: 28px 0; font-weight: 500; }
.ug-ctas { display: flex; gap: 0; flex-wrap: wrap; }
.ug-ctas a { font-weight: 800; font-size: 14px; text-decoration: none; padding: 20px 32px; border: 4px solid #191919; color: #191919; margin-right: -4px; background: #f6f3ec; }
.ug-ctas a:first-child { background: #d0342c; color: #f6f3ec; }
.ug-ctas a:hover { background: #e8a812; color: #191919; }
.ug-media { margin: 40px 0 88px; }
.ug-media img { width: 100%; display: block; border: 4px solid #191919; }
.ug-media .cap { display: block; padding: 12px 0 0; font-weight: 600; font-size: 13px; }
.ug-media .cap::before { content: ''; display: inline-block; width: 14px; height: 14px; border-radius: 100%; background: #d0342c; margin-right: 12px; }
.ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border: 4px solid #191919; margin-bottom: 96px; }
.ug-stat { padding: 32px 28px; border-right: 4px solid #191919; }
.ug-stat:last-child { border-right: 0; }
.ug-stat:nth-child(3n+1) { background: #d0342c; color: #f6f3ec; }
.ug-stat:nth-child(3n+2) { background: #e8a812; color: #191919; }
.ug-stat:nth-child(3n+3) { background: #2050a8; color: #f6f3ec; }
.ug-stat .num { display: block; font-weight: 900; font-size: 52px; letter-spacing: -0.03em; }
.ug-stat .lbl { font-size: 14px; font-weight: 600; }
.ug-sechead { display: flex; align-items: center; gap: 22px; margin-bottom: 40px; }
.ug-sechead h2 { font-weight: 900; font-size: clamp(38px, 5.4vw, 80px); margin: 0; letter-spacing: -0.03em; }
.ug-sechead .sq { width: 34px; height: 34px; background: #e8a812; flex: none; }
.ug-frow { display: grid; grid-template-columns: 110px 1fr 1.3fr; gap: 26px; padding: 32px 0; border-top: 4px solid #191919; align-items: baseline; }
.ug-frow .idx { font-weight: 900; font-size: 30px; color: #d0342c; letter-spacing: -0.02em; }
.ug-frow h3 { font-weight: 800; font-size: 24px; margin: 0; }
.ug-frow h3 svg { display: none; }
.ug-frow p { margin: 0; font-size: 15px; line-height: 1.65; }
.ug-features { margin-bottom: 104px; }
.ug-footer { border-top: 4px solid #191919; padding: 64px 0 56px; }
.ug-wordmark { font-weight: 900; font-size: clamp(60px, 12vw, 190px); line-height: .88; letter-spacing: -0.04em; }
.ug-wordmark .wch:nth-child(3n+1) { color: #d0342c; }
.ug-wordmark .wch:nth-child(3n+2) { color: #2050a8; }
.ug-wordmark .wch:nth-child(3n) { color: #191919; }
.ug-colophon { font-weight: 600; font-size: 13px; margin-top: 24px; }
@media (max-width: 859px) { .ug-frow { grid-template-columns: 1fr; gap: 8px; } .ug-stats { grid-template-columns: 1fr; } .ug-stat { border-right: 0; border-bottom: 4px solid #191919; } .ug-geo.g2, .ug-geo.g3 { display: none; } }
`;

function composeBauhaus(m) {
  const media = mediaSlot(m, m.figureLines[0] || 'Fig. A');
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -1).join(' ')) + ' <em>' + escHtml(words.slice(-1)[0]) + '</em>' : escHtml(m.headline);
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <span class="ug-geo g1"></span><span class="ug-geo g2"></span><span class="ug-geo g3"></span>
      <div class="ug-kicker"><b>&#9679;</b> form follows function</div>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy"><span class="cap">${escHtml(media.caption)}</span></figure>
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><span class="sq"></span><h2>${escHtml(m.headings[0] || 'The system')}</h2></div>
      ${m.features.map((f, i) => `<article class="ug-frow ug-r"><span class="idx">${String(i + 1).padStart(2, '0')}</span><h3>${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">circle / triangle / square &mdash; recomposed, not reskinned</div></footer>
  </main>`;
}

const COMPOSE_RISO_CSS = `
body { background: #f8f3e6; color: #2b50c8; font-family: 'Archivo', sans-serif; }
.ug-page { max-width: 1160px; margin: 0 auto; padding: 0 4vw; }
.ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 2px solid #2b50c8; }
.ug-logo { font-weight: 900; font-size: 20px; color: #f1507e; text-shadow: 2px 2px 0 #2b50c8; }
.ug-topbar nav a { color: #2b50c8; text-decoration: none; margin-left: 24px; font-weight: 600; font-size: 16px; }
.ug-topbar nav a:hover { color: #f1507e; }
.ug-hero { display: flex; flex-direction: column; justify-content: flex-start; padding: 56px 0; }
.ug-kicker { display: inline-block; font-weight: 800; font-size: 12px; background: #f1507e; color: #f8f3e6; padding: 8px 16px; transform: rotate(-1.5deg); width: fit-content; margin-bottom: 24px; }
.ug-hero h1 { font-weight: 900; font-size: clamp(54px, 8.8vw, 134px); line-height: .94; letter-spacing: -0.02em; margin: 0; max-width: 11ch; color: #2b50c8; text-shadow: 4px 4px 0 #f1507e; }
.ug-hero h1 em { font-style: normal; color: #f1507e; text-shadow: 4px 4px 0 #2b50c8; }
.ug-sub { max-width: 46ch; font-size: 16px; line-height: 1.7; margin: 28px 0; font-weight: 500; }
.ug-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
.ug-ctas a { font-weight: 800; font-size: 16px; text-decoration: none; padding: 16px 30px; border: 3px solid #2b50c8; color: #2b50c8; box-shadow: 5px 5px 0 #f1507e; background: #f8f3e6; }
.ug-ctas a:first-child { background: #2b50c8; color: #f8f3e6; }
.ug-ctas a:hover { box-shadow: 1px 1px 0 #f1507e; }
.ug-media { margin: 32px 0 88px; background: #f1507e; padding: 0; border: 3px solid #2b50c8; }
.ug-media img { width: 100%; display: block; filter: grayscale(1) contrast(1.15); mix-blend-mode: multiply; opacity: .92; }
.ug-media .cap { display: block; padding: 8px 12px; font-weight: 700; font-size: 12px; color: #f8f3e6; }
.ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 96px; }
.ug-stat { text-align: center; padding: 32px 20px; border: 3px solid #2b50c8; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Ccircle cx='3' cy='3' r='1.6' fill='%232b50c8' fill-opacity='0.22'/%3E%3C/svg%3E"); }
.ug-stat .num { display: block; font-weight: 900; font-size: 50px; color: #f1507e; text-shadow: 3px 3px 0 #2b50c8; letter-spacing: -0.02em; }
.ug-stat .lbl { font-size: 12px; font-weight: 600; }
.ug-sechead { margin-bottom: 40px; }
.ug-sechead h2 { font-weight: 900; font-size: clamp(38px, 5.2vw, 76px); margin: 0; color: #2b50c8; text-shadow: 3px 3px 0 #f1507e; letter-spacing: -0.02em; }
.ug-sechead .tag { display: inline-block; font-weight: 700; font-size: 12px; background: #2b50c8; color: #f8f3e6; padding: 4px 12px; margin-top: 12px; }
.ug-fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 22px; margin-bottom: 112px; }
.ug-ftile { border: 3px solid #2b50c8; padding: 28px; background: #f8f3e6; box-shadow: 6px 6px 0 #2b50c8; }
.ug-ftile h3 { font-weight: 900; font-size: 20px; margin: 0 0 10px; color: #f1507e; text-shadow: 2px 2px 0 #2b50c8; }
.ug-ftile h3 svg { display: none; }
.ug-ftile p { margin: 0; font-size: 16px; line-height: 1.65; font-weight: 500; }
.ug-footer { border-top: 2px solid #2b50c8; padding: 64px 0 56px; text-align: center; }
.ug-wordmark { font-weight: 900; font-size: clamp(58px, 11.4vw, 175px); line-height: .9; color: #f1507e; text-shadow: 5px 5px 0 #2b50c8; letter-spacing: -0.02em; }
.ug-colophon { font-weight: 600; font-size: 12px; margin-top: 32px; }
@media (max-width: 859px) { .ug-stats { grid-template-columns: 1fr; } }
`;

function composeRiso(m) {
  const media = mediaSlot(m, m.figureLines[0] || '2-color print');
  const mediaFig = `<figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy">${media.caption ? `<span class="cap">${escHtml(media.caption)}</span>` : ''}</figure>`;
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -2).join(' ')) + ' <em>' + escHtml(words.slice(-2).join(' ')) + '</em>' : escHtml(m.headline);
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <span class="ug-kicker">fresh off the drum</span>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    ${m.variant ? '' : mediaFig}
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'In two colors')}</h2><span class="tag">misregistration is the charm</span></div>
      <div class="ug-fgrid">
      ${m.features.map((f, i) => `<article class="ug-ftile ug-r"><h3>${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
      </div>
    </section>
    ${m.variant ? mediaFig : ''}
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">pink and blue, slightly off &mdash; recomposed, not reskinned</div></footer>
  </main>`;
}

const COMPOSE_ARCADE_CSS = `
body { background: #100e1c; color: #f4ecff; font-family: 'IBM Plex Mono', monospace; }
.ug-page { max-width: 1120px; margin: 0 auto; padding: 0 4vw; position: relative; }
.ug-page::after { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9999; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='1' fill='%23000000' fill-opacity='0.22'/%3E%3C/svg%3E"); }
.ug-gl { display: none; /* the CRT scanlines are the texture here; the fbm wash would muddy them */ }
.ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 4px solid #f4ecff; font-size: 12px; }
.ug-logo { font-weight: 700; color: #ffd23f; text-shadow: 0 3px 0 #b58900; }
.ug-topbar nav a { color: #f4ecff; text-decoration: none; margin-left: 20px; }
.ug-topbar nav a:hover { color: #ffd23f; }
.ug-hero { display: flex; flex-direction: column; justify-content: flex-start; padding: 56px 0; }
.ug-kicker { font-size: 12px; color: #39d3ff; margin-bottom: 24px; }
.ug-kicker::before { content: '\u25BA\u00A0'; }
.ug-hero h1 { font-weight: 700; font-size: clamp(40px, 6.6vw, 96px); line-height: 1.06; margin: 0; max-width: 16ch; text-shadow: 0 5px 0 #000; }
.ug-hero h1 em { font-style: normal; color: #ffd23f; }
.ug-sub { max-width: 46ch; font-size: 16px; line-height: 1.8; color: #b9aee0; margin: 28px 0; }
.ug-ctas { display: flex; gap: 18px; flex-wrap: wrap; }
.ug-ctas a { font-weight: 700; font-size: 12px; text-decoration: none; padding: 16px 28px; border: 4px solid #f4ecff; color: #f4ecff; box-shadow: 5px 5px 0 #000; background: #100e1c; }
.ug-ctas a:first-child { background: #ffd23f; border-color: #ffd23f; color: #100e1c; }
.ug-ctas a:hover { box-shadow: 1px 1px 0 #000; }
.ug-media { margin: 32px 0 88px; border: 4px solid #f4ecff; box-shadow: 8px 8px 0 #000; }
.ug-media img { width: 100%; display: block; filter: contrast(1.1) saturate(1.3); image-rendering: pixelated; }
.ug-media .cap { display: block; padding: 8px 12px; font-size: 12px; background: #f4ecff; color: #100e1c; font-weight: 700; }
.ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 96px; }
.ug-stat { border: 4px solid #39d3ff; padding: 24px; text-align: center; box-shadow: 5px 5px 0 #000; background: #100e1c; }
.ug-stat .num { display: block; font-weight: 700; font-size: 34px; color: #ffd23f; text-shadow: 0 3px 0 #b58900; }
.ug-stat .num::before { content: 'SC '; color: #39d3ff; font-size: 16px; vertical-align: middle; }
.ug-stat .lbl { font-size: 12px; color: #b9aee0; }
.ug-sechead { margin-bottom: 40px; }
.ug-sechead h2 { font-weight: 700; font-size: clamp(28px, 4.4vw, 58px); margin: 0; text-shadow: 0 4px 0 #000; }
.ug-sechead h2::before { content: '\u25BA\u00A0'; color: #ffd23f; }
.ug-sechead .tag { display: block; font-size: 12px; color: #39d3ff; margin-top: 12px; }
.ug-fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 20px; margin-bottom: 112px; }
.ug-ftile { border: 4px solid #f4ecff; padding: 24px; box-shadow: 6px 6px 0 #000; background: #100e1c; }
.ug-ftile h3 { font-size: 16px; margin: 0 0 12px; color: #ffd23f; }
.ug-ftile h3 svg { display: none; }
.ug-ftile h3::before { content: '\u25BA\u00A0'; color: #39d3ff; }
.ug-ftile p { margin: 0; font-size: 12px; line-height: 1.7; color: #b9aee0; }
.ug-footer { border-top: 4px solid #f4ecff; padding: 64px 0 56px; text-align: center; }
.ug-wordmark { font-weight: 700; font-size: clamp(46px, 9.6vw, 140px); line-height: .95; color: #ffd23f; text-shadow: 0 6px 0 #b58900, 0 12px 0 #000; }
.ug-colophon { font-size: 12px; color: #b9aee0; margin-top: 32px; }
@media (max-width: 859px) { .ug-stats { grid-template-columns: 1fr; } }
`;

function composeArcade(m) {
  const media = mediaSlot(m, m.figureLines[0] || 'INSERT COIN');
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -2).join(' ')) + ' <em>' + escHtml(words.slice(-2).join(' ')) + '</em>' : escHtml(m.headline);
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <div class="ug-kicker">PLAYER 1 READY</div>
      <h1>${hl}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy">${media.caption ? `<span class="cap">${escHtml(media.caption)}</span>` : ''}</figure>
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'Power-ups')}</h2><span class="tag">stage select</span></div>
      <div class="ug-fgrid">
      ${m.features.map((f, i) => `<article class="ug-ftile ug-r"><h3>${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
      </div>
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">game over? &mdash; recomposed, not reskinned</div></footer>
  </main>`;
}

const COMPOSE_MONO_CSS = `
body { background: #f7f5ee; color: #232320; font-family: 'Courier Prime', 'Courier New', monospace; }
.ug-page { max-width: 780px; margin: 0 auto; padding: 0 5vw; }
.ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 1px solid #232320; font-size: 12px; }
.ug-logo { font-weight: 700; }
.ug-topbar nav a { color: #232320; margin-left: 20px; }
.ug-topbar nav a:hover { color: #8f1f1f; }
.ug-hero { display: flex; flex-direction: column; justify-content: flex-start; padding: 64px 0; }
.ug-kicker { font-size: 12px; color: #8f1f1f; margin-bottom: 32px; }
.ug-kicker::before { content: '>>>'; margin-right: 12px; }
.ug-hero h1 { font-weight: 700; font-size: clamp(34px, 5.6vw, 62px); line-height: 1.14; margin: 0; }
.ug-hero h1::after { content: '\u258C'; color: #8f1f1f; font-weight: 400; }
.ug-sub { font-size: 16px; line-height: 1.85; margin: 32px 0; }
.ug-sub u, .ug-proof { text-decoration: underline wavy #8f1f1f 1.5px; }
.ug-ctas { display: flex; gap: 24px; flex-wrap: wrap; }
.ug-ctas a { font-size: 16px; color: #232320; text-decoration: underline; text-underline-offset: 4px; }
.ug-ctas a:first-child { font-weight: 700; color: #8f1f1f; }
.ug-ctas a:hover { background: #232320; color: #f7f5ee; text-decoration: none; }
.ug-media { margin: 32px 0 88px; }
.ug-media img { width: 100%; display: block; filter: grayscale(1) contrast(1.05); border: 1px solid #232320; }
.ug-media .cap { display: block; padding-top: 12px; font-size: 12px; color: #8f1f1f; }
.ug-media .cap::before { content: 'fig. attached -- '; color: #232320; }
.ug-stats { margin-bottom: 96px; border-top: 1px solid #232320; }
.ug-srow { display: flex; justify-content: space-between; gap: 18px; padding: 16px 0; border-bottom: 1px solid #232320; font-size: 16px; }
.ug-srow .fig { color: #8f1f1f; flex: none; }
.ug-srow .lbl { flex: 1; }
.ug-srow .num { font-weight: 700; }
.ug-sechead { margin: 0 0 32px; }
.ug-sechead h2 { font-weight: 700; font-size: 26px; margin: 0; }
.ug-sechead h2::before { content: '== '; color: #8f1f1f; }
.ug-sechead .tag { font-size: 12px; color: #8f1f1f; }
.ug-frow { padding: 24px 0 24px 3ch; border-bottom: 1px dashed #232320; }
.ug-frow h3 { font-weight: 700; font-size: 16px; margin: 0 0 8px; }
.ug-frow h3 svg { display: none; }
.ug-frow h3::before { content: attr(data-n) '. '; color: #8f1f1f; }
.ug-frow p { margin: 0; font-size: 16px; line-height: 1.8; }
.ug-features { margin-bottom: 104px; }
.ug-footer { text-align: center; padding: 72px 0 56px; }
.ug-endmark { font-size: 16px; letter-spacing: .5em; margin-bottom: 48px; }
.ug-wordmark { font-weight: 700; font-size: clamp(40px, 8vw, 92px); line-height: 1; }
.ug-colophon { font-size: 12px; color: #8f1f1f; margin-top: 24px; }
`;

function composeMono(m) {
  const media = mediaSlot(m, m.figureLines[0] || 'see attached');
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <div class="ug-kicker"> draft 3, final, FINAL2</div>
      <h1>${escHtml(m.headline)}</h1>
      ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
      <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
    </section>
    <figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" loading="lazy"><span class="cap">${escHtml(media.caption)}</span></figure>
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map((s, i) => `<div class="ug-srow"><span class="fig">fig. ${i + 1}</span><span class="lbl">${escHtml(s.lbl)}</span><span class="num">${escHtml(s.num)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'Notes')}</h2><span class="tag">as typed, mistakes and all</span></div>
      ${m.features.map((f, i) => `<article class="ug-frow ug-r"><h3 data-n="${i + 1}">${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
    </section>
    <footer class="ug-footer"><div class="ug-endmark">- 30 -</div><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">filed &mdash; recomposed, not reskinned</div></footer>
  </main>`;
}

/* register the eight new directions + composed templates */
const COMMUNITY2 = {
  noir: {
    name: 'Noir', hint: 'black and white film, hard light, reel counters',
    motion: 'progress story split parallax', author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@400;700&family=IBM+Plex+Mono:wght@400;600&display=swap',
    swatches: ['#121212', '#f4f1ea', '#8f8f8f'],
    css: themeCSS({ bg: '#121212', ink: '#f4f1ea', head: "'Archivo Narrow',sans-serif", body: "'IBM Plex Mono',monospace", surface: '#1c1c1c', line: '#3a3a3a', accent: '#f4f1ea', btnBg: '#f4f1ea', btnInk: '#121212', btnHover: '#8f8f8f', radius: '0', borderW: '1px', headWeight: 700, caps: 'none' }),
  },
  memphis: {
    name: 'Memphis', hint: '80s playground, shapes, thick borders, offset shadows',
    motion: 'progress story tilt marquee', author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&display=swap',
    swatches: ['#fdf3e3', '#e4572e', '#2e5eaa'],
    css: themeCSS({ bg: '#fdf3e3', ink: '#1f1d3a', head: "'Archivo Black',sans-serif", body: "'Space Grotesk',sans-serif", surface: '#fdf3e3', line: '#1f1d3a', accent: '#e4572e', btnBg: '#e4572e', btnInk: '#fdf3e3', btnHover: '#2e5eaa', radius: '18px', borderW: '3px', headWeight: 400 }),
  },
  letterpress: {
    name: 'Letterpress', hint: 'warm paper, embossed serif, rubber-stamp stats',
    motion: 'progress story split', author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Newsreader:opsz@6..72&family=Courier+Prime:wght@400;700&display=swap',
    swatches: ['#f1ead9', '#38332a', '#8c5a2b'],
    css: themeCSS({ bg: '#f1ead9', ink: '#38332a', head: "'Fraunces',serif", body: "'Newsreader',serif", surface: '#f8f4e9', line: '#cfc6ad', accent: '#8c5a2b', btnBg: '#8c5a2b', btnInk: '#f1ead9', btnHover: '#38332a', radius: '0', borderW: '2px', headWeight: 600 }),
  },
  neon: {
    name: 'Neon Grid', hint: 'night grid, glowing tube type, LED stats',
    motion: 'progress story scramble cursor', author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600&display=swap',
    swatches: ['#0a0e1a', '#39ff88', '#ff3df2'],
    css: themeCSS({ bg: '#0a0e1a', ink: '#e6f6ff', head: "'Space Grotesk',sans-serif", body: "'Space Grotesk',sans-serif", surface: '#0d1220', line: '#1e2b45', accent: '#39ff88', btnBg: '#39ff88', btnInk: '#0a0e1a', btnHover: '#1e2b45', radius: '2px', borderW: '1px', headWeight: 700 }),
  },
  bauhaus: {
    name: 'Bauhaus', hint: 'circle triangle square, primaries, heavy rules',
    motion: 'progress story split parallax', author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&display=swap',
    swatches: ['#f6f3ec', '#d0342c', '#2050a8'],
    css: themeCSS({ bg: '#f6f3ec', ink: '#191919', head: "'Archivo',sans-serif", body: "'Archivo',sans-serif", surface: '#f6f3ec', line: '#191919', accent: '#d0342c', btnBg: '#d0342c', btnInk: '#f6f3ec', btnHover: '#e8a812', radius: '0', borderW: '4px', headWeight: 900, caps: 'lowercase' }),
  },
  riso: {
    name: 'Riso Print', hint: 'two-color overprint, halftone, misregistered type',
    motion: 'progress story marquee', author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&display=swap',
    swatches: ['#f8f3e6', '#f1507e', '#2b50c8'],
    css: themeCSS({ bg: '#f8f3e6', ink: '#2b50c8', head: "'Archivo',sans-serif", body: "'Archivo',sans-serif", surface: '#f8f3e6', line: '#2b50c8', accent: '#f1507e', btnBg: '#2b50c8', btnInk: '#f8f3e6', btnHover: '#f1507e', radius: '0', borderW: '3px', headWeight: 900 }),
  },
  arcade: {
    name: 'Arcade', hint: 'CRT scanlines, chunky borders, score counters',
    motion: 'progress story scramble cursor', author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap',
    swatches: ['#100e1c', '#ffd23f', '#39d3ff'],
    css: themeCSS({ bg: '#100e1c', ink: '#f4ecff', head: "'IBM Plex Mono',monospace", body: "'IBM Plex Mono',monospace", surface: '#100e1c', line: '#f4ecff', accent: '#ffd23f', btnBg: '#ffd23f', btnInk: '#100e1c', btnHover: '#39d3ff', radius: '0', borderW: '4px', headWeight: 700 }),
  },
  mono: {
    name: 'Manuscript', hint: 'typewriter draft, proofreader red, chapter rules',
    motion: 'progress story split', author: 'ungeneric',
    fonts: 'https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap',
    swatches: ['#f7f5ee', '#232320', '#8f1f1f'],
    css: themeCSS({ bg: '#f7f5ee', ink: '#232320', head: "'Courier Prime',monospace", body: "'Courier Prime',monospace", surface: '#f7f5ee', line: '#232320', accent: '#8f1f1f', btnBg: '#232320', btnInk: '#f7f5ee', btnHover: '#8f1f1f', radius: '0', borderW: '1px', headWeight: 700 }),
  },
};
for (const [id, d] of Object.entries(COMMUNITY2)) REGISTRY.set(id, { id, ...d });
Object.assign(COMPOSE, {
  noir: { css: COMPOSE_NOIR_CSS, body: composeNoir },
  memphis: { css: COMPOSE_MEMPHIS_CSS, body: composeMemphis },
  letterpress: { css: COMPOSE_LETTERPRESS_CSS, body: composeLetterpress },
  neon: { css: COMPOSE_NEON_CSS, body: composeNeon },
  bauhaus: { css: COMPOSE_BAUHAUS_CSS, body: composeBauhaus },
  riso: { css: COMPOSE_RISO_CSS, body: composeRiso },
  arcade: { css: COMPOSE_ARCADE_CSS, body: composeArcade },
  mono: { css: COMPOSE_MONO_CSS, body: composeMono },
});

/* ---------------- v11: style-from-reference ----------------
   The app analyzes an uploaded screenshot (palette, light/dark, airiness) and
   hands tokens to setReferenceStyle(), which builds a one-off composed
   direction in that palette and mood. Honest scope: it copies palette and
   mood, not the reference's layout or fonts. */

let REF_TOKENS = null;

function buildRefCSS(t) {
  return `
body { background: ${t.bg}; color: ${t.ink}; font-family: ${t.body}; }
.ug-page { max-width: 1200px; margin: 0 auto; padding: 0 4vw; }
.ug-topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 1.5px solid ${t.line}; }
.ug-logo { font-family: ${t.head}; font-weight: ${t.headWeight}; font-size: 20px; }
.ug-topbar nav a { color: ${t.ink}; text-decoration: none; margin-left: 24px; font-size: 14px; }
.ug-topbar nav a:hover { color: ${t.accent}; }
.ug-hero { display: grid; grid-template-columns: 1.15fr .85fr; gap: 5vw; align-items: center; padding: 48px 0; }
.ug-kicker { font-size: 13px; color: ${t.accent}; margin-bottom: 24px; font-weight: 600; }
.ug-hero h1 { font-family: ${t.head}; font-weight: ${t.headWeight}; font-size: clamp(44px, 6.6vw, 96px); line-height: 1; letter-spacing: -0.02em; margin: 0; }
.ug-hero h1 em { font-style: normal; color: ${t.accent}; }
.ug-sub { max-width: 46ch; font-size: 17px; line-height: 1.7; margin: 24px 0; }
.ug-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
.ug-ctas a { font-weight: 600; font-size: 14px; text-decoration: none; padding: 16px 28px; border: 1.5px solid ${t.line}; border-radius: ${t.radius}; color: ${t.ink}; }
.ug-ctas a:first-child { background: ${t.accent}; border-color: ${t.accent}; color: ${t.btnInk}; }
.ug-ctas a:hover { background: ${t.ink}; border-color: ${t.ink}; color: ${t.bg}; }
.ug-side { position: relative; }
.ug-side::before { content: ''; position: absolute; inset: -18px 18px 18px -18px; border: 1.5px solid ${t.accent}; border-radius: ${t.radius}; z-index: 0; }
.ug-media { position: relative; z-index: 1; margin: 0; min-height: 280px; background: ${t.surface}; border-radius: ${t.radius}; display: flex; align-items: center; justify-content: center; }
.ug-media img { width: 100%; display: block; border-radius: ${t.radius}; position: relative; z-index: 1; }
.ug-media .cap { display: block; padding-top: 12px; font-size: 12.5px; color: ${t.accent}; }
.ug-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 32px 0; border-top: 1.5px solid ${t.line}; border-bottom: 1.5px solid ${t.line}; margin-bottom: 96px; }
.ug-stat .num { display: block; font-family: ${t.head}; font-weight: ${t.headWeight}; font-size: 48px; letter-spacing: -0.02em; color: ${t.accent}; }
.ug-stat .lbl { font-size: 13.5px; }
.ug-sechead { margin-bottom: 40px; }
.ug-sechead h2 { font-family: ${t.head}; font-weight: ${t.headWeight}; font-size: clamp(32px, 4.6vw, 64px); margin: 0; letter-spacing: -0.02em; }
.ug-sechead .tag { font-size: 13px; color: ${t.accent}; }
.ug-fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 112px; }
.ug-ftile { border: 1.5px solid ${t.line}; border-radius: ${t.radius}; padding: 28px; background: ${t.surface}; }
.ug-ftile:hover { border-color: ${t.accent}; }
.ug-ftile h3 { font-family: ${t.head}; font-weight: ${t.headWeight}; font-size: 20px; margin: 0 0 10px; display: flex; gap: 10px; align-items: center; }
.ug-ftile h3 svg { stroke: ${t.accent}; flex: none; }
.ug-ftile p { margin: 0; font-size: 14.5px; line-height: 1.65; }
.ug-footer { border-top: 1.5px solid ${t.line}; padding: 64px 0 56px; text-align: center; }
.ug-wordmark { font-family: ${t.head}; font-weight: ${t.headWeight}; font-size: clamp(52px, 10vw, 160px); line-height: .92; letter-spacing: -0.02em; }
.ug-colophon { font-size: 12.5px; margin-top: 24px; color: ${t.accent}; }
@media (max-width: 859px) { .ug-hero { grid-template-columns: 1fr; min-height: 0; gap: 32px; } .ug-stats { grid-template-columns: 1fr; } }
`;
}

function composeReference(m) {
  const media = mediaSlot(m, m.figureLines[0] || '');
  const words = m.headline.split(' ');
  const hl = words.length > 2 ? escHtml(words.slice(0, -2).join(' ')) + ' <em>' + escHtml(words.slice(-2).join(' ')) + '</em>' : escHtml(m.headline);
  return `
  <main class="ug-page">
    <header class="ug-topbar"><span class="ug-logo">${escHtml(m.logo)}</span><nav>${m.links.map(l => `<a href="${escHtml(l.href)}">${escHtml(l.text)}</a>`).join('')}</nav></header>
    <section class="ug-hero">
      <div>
        <div class="ug-kicker">${escHtml(m.logo)}</div>
        <h1>${hl}</h1>
        ${m.sub ? `<p class="ug-sub">${escHtml(m.sub)}</p>` : ''}
        <div class="ug-ctas">${m.ctas.map((c, i) => ctaEl(m, c, i)).join('')}</div>
      </div>
      <div class="ug-side"><figure class="ug-media ug-r"><img src="${escHtml(media.src)}" alt="${escHtml(media.alt)}" onerror="this.style.display='none'">${media.caption ? `<span class="cap">${escHtml(media.caption)}</span>` : ''}</figure></div>
    </section>
    ${m.stats.length ? `<section class="ug-stats ug-r">${m.stats.map(s => `<div class="ug-stat"><span class="num">${escHtml(s.num)}</span><span class="lbl">${escHtml(s.lbl)}</span></div>`).join('')}</section>` : ''}
    <section class="ug-features">
      <div class="ug-sechead"><h2>${escHtml(m.headings[0] || 'Details')}</h2><span class="tag">in your reference palette</span></div>
      <div class="ug-fgrid">
      ${m.features.map((f, i) => `<article class="ug-ftile ug-r"><h3>${iconSVG(featureIcon(f, i), 20)}${escHtml(f.title)}</h3><p>${escHtml(f.text)}</p></article>`).join('')}
      </div>
    </section>
    <footer class="ug-footer"><div class="ug-wordmark">${escHtml(m.logo)}</div><div class="ug-colophon">styled from your reference - palette and mood, not a pixel copy</div></footer>
  </main>`;
}

const REF_FONTS = {
  serif: { link: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Newsreader:opsz@6..72&display=swap', head: "'Fraunces',serif", body: "'Newsreader',serif", weight: 600 },
  sans: { link: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap', head: "'Space Grotesk',sans-serif", body: "'Space Grotesk',sans-serif", weight: 700 },
  mono: { link: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap', head: "'IBM Plex Mono',monospace", body: "'IBM Plex Mono',monospace", weight: 700 },
};

export function setReferenceStyle(tokens) {
  const f = REF_FONTS[tokens.font] || REF_FONTS.sans;
  REF_TOKENS = { ...tokens, head: f.head, body: f.body, headWeight: f.weight };
  COMPOSE.reference = { css: buildRefCSS(REF_TOKENS), body: composeReference };
  REGISTRY.set('reference', {
    id: 'reference', name: 'From your reference', hint: 'palette and mood read from your screenshot', author: 'you',
    fonts: f.link, swatches: [tokens.bg, tokens.ink, tokens.accent],
    css: themeCSS({ bg: tokens.bg, ink: tokens.ink, head: f.head, body: f.body, surface: tokens.surface, line: tokens.line, accent: tokens.accent, btnBg: tokens.accent, btnInk: tokens.btnInk, btnHover: tokens.ink, radius: tokens.radius, headWeight: f.weight }),
  });
  return REF_TOKENS;
}
