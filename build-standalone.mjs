/* build-standalone.mjs - inline engine + app + fonts into one file that works from file:// */
import { readFileSync, writeFileSync } from 'node:fs';

let html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

/* fonts -> data URIs */
let css = readFileSync(new URL('./fonts/fonts.css', import.meta.url), 'utf8');
css = css.replace(/url\('fonts\/([^']+)'\)/g, (m, name) => {
  const b64 = readFileSync(new URL('./fonts/' + name, import.meta.url)).toString('base64');
  return `url(data:font/woff2;base64,${b64})`;
});
html = html.replace('<link rel="stylesheet" href="fonts/fonts.css">', () => `<style>${css}</style>`);

/* bundle engine + app into one module script */
const engine = readFileSync(new URL('./engine.js', import.meta.url), 'utf8')
  .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
  .replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|class))/gm, '');
let app = readFileSync(new URL('./app.js', import.meta.url), 'utf8')
  .replace(/^import\s*\{[^}]*\}\s*from\s*'\.\/engine\.js';?\s*$/m, '');

/* no helper server in a bare file: the fetch button explains instead of failing */
const fetchCall = `    const r = await fetch('/fetch?url=' + encodeURIComponent(u));
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || ('HTTP ' + r.status));`;
if (!app.includes(fetchCall)) throw new Error('fetch block not found - app.js changed, update the patch');
app = app.replace(fetchCall, `    throw new Error('this standalone file has no helper server - view-source the page and paste its HTML instead');`);

html = html.replace('<span class="verchip">v0.1 · local</span>', '<span class="verchip">v0.1 · standalone</span>');
/* a literal </script> inside a JS string would end the inline script element early */
const bundle = (engine + '\n' + app).replace(/<\/script>/g, '<\\/script>');
html = html.replace('<script type="module" src="app.js"></script>', () => `<script type="module">\n${bundle}\n</script>`);

writeFileSync('/downloads/ungeneric-standalone.html', html);
console.log('wrote /downloads/ungeneric-standalone.html', (html.length / 1024).toFixed(0) + 'KB');
