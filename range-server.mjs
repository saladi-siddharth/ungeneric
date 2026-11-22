import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = '/home/sandbox/ungeneric';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.mp4': 'video/mp4', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.wasm': 'application/wasm' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/fetch') {
    /* local helper: fetch a page's HTML so the app can audit a live URL. SSRF-hardened:
       http/https only, DNS-resolved IP checked against private/loopback/reserved ranges
       before the request and on every redirect hop, <= 4 redirects, 1.5 MB cap, 10s timeout. */
    const fail = (code, msg) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: msg })); };
    const target = u.searchParams.get('url') || '';
    let t;
    try { t = new URL(/^https?:\/\//i.test(target) ? target : 'https://' + target); } catch { fail(400, 'not a URL'); return; }
    const blockedV4 = (ip) => {
      const p = ip.split('.').map(Number);
      if (p.length !== 4 || p.some(n => !(n >= 0 && n <= 255))) return true;
      return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224
        || (p[0] === 100 && p[1] >= 64 && p[1] <= 127)
        || (p[0] === 169 && p[1] === 254)
        || (p[0] === 172 && p[1] >= 16 && p[1] <= 31)
        || (p[0] === 192 && p[1] === 168)
        || (p[0] === 198 && (p[1] === 18 || p[1] === 19))
        || (p[0] === 192 && p[1] === 0 && p[2] === 2)
        || (p[0] === 203 && p[1] === 0 && p[2] === 113)
        || (p[0] === 198 && p[1] === 51 && p[2] === 100)
        || (p[0] === 192 && p[1] === 88 && p[2] === 99);
    };
    const blockedIP = (ip) => {
      if (ip.includes('.')) return blockedV4(ip);
      const v6 = ip.toLowerCase();
      if (v6 === '::1' || v6 === '::') return true;
      if (v6.startsWith('::ffff:')) return blockedV4(v6.slice(7));
      return /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
    };
    const check = async (url) => {
      if (!/^https?:$/.test(url.protocol)) return 'http(s) only';
      const { lookup } = await import('node:dns/promises');
      let addrs;
      try { addrs = await lookup(url.hostname, { all: true, verbatim: true }); } catch { return 'DNS failed'; }
      if (!addrs.length || addrs.some(a => blockedIP(a.address))) return 'that address is not reachable from here';
      return null;
    };
    try {
      let cur = t, r = null;
      for (let hop = 0; hop <= 4; hop++) {
        const why = await check(cur);
        if (why) { fail(403, why); return; }
        r = await fetch(cur, { redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36', 'accept': 'text/html,application/xhtml+xml' } });
        if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
          let nx;
          try { nx = new URL(r.headers.get('location'), cur); } catch { fail(502, 'bad redirect'); return; }
          cur = nx; continue;
        }
        break;
      }
      if (!r) { fail(502, 'no response'); return; }
      const ct = r.headers.get('content-type') || '';
      if (!/text\/html|application\/xhtml/i.test(ct)) { fail(415, 'not an HTML page'); return; }
      const reader = r.body.getReader();
      const chunks = []; let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > 1500000) { await reader.cancel(); break; }
        chunks.push(value);
      }
      let html = Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8');
      /* make relative assets (css, images, fonts) resolve against the real origin,
         so the Before pane renders the page as it actually looks */
      const base = '<base href="' + String(cur) + '">';
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + base);
      else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => m + '<head>' + base + '</head>');
      else html = base + html;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, status: r.status, url: String(cur), html }));
    } catch (e) { fail(502, String(e && e.message || e)); }
    return;
  }
  const p = path.join(root, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  const size = fs.statSync(p).size;
  const type = mime[path.extname(p)] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    let start = +m[1], end = m[2] ? +m[2] : size - 1;
    if (start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
    end = Math.min(end, size - 1);
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': type });
    fs.createReadStream(p, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Content-Type': type });
    fs.createReadStream(p).pipe(res);
  }
}).listen(8794, '127.0.0.1', () => console.log('range server up'));
