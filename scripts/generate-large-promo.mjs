// Generates docs/screenshots/large-promo-920x680.png from HTML via Playwright.
// 24-bit RGB PNG (no alpha), Chrome Web Store Large Promo Tile format.
// Usage: npm run promo:large   (starts dev server automatically if needed)

import { chromium } from '@playwright/test'
import { deflateSync, inflateSync } from 'zlib'
import { writeFileSync } from 'fs'
import { spawn } from 'child_process'
import { setTimeout as sleep } from 'timers/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import net from 'net'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT  = path.join(__dir, '..')
const OUT   = path.join(ROOT, 'docs', 'screenshots', 'large-promo-920x680.png')
const W = 920, H = 680

// ─── PNG utils ────────────────────────────────────────────────────────────────

const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[i] = c >>> 0
}
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = (CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8)) >>> 0
  return (c ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length, 0)
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])), 0)
  return Buffer.concat([len, t, d, crc])
}

function decodePng(buf) {
  let pos = 8; let w = 0, h = 0, colorType = 6; const idats = []
  while (pos < buf.length - 12) {
    const len = buf.readUInt32BE(pos); const type = buf.slice(pos+4, pos+8).toString('ascii')
    const data = buf.slice(pos+8, pos+8+len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9] }
    else if (type === 'IDAT') idats.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  const bpp = colorType === 6 ? 4 : 3, stride = w * bpp
  const raw = inflateSync(Buffer.concat(idats)), pixels = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const ft = raw[y*(1+stride)], row = raw.slice(y*(1+stride)+1, y*(1+stride)+1+stride)
    const prv = y > 0 ? pixels.slice((y-1)*stride, y*stride) : Buffer.alloc(stride)
    const out = pixels.slice(y*stride, (y+1)*stride)
    for (let x = 0; x < stride; x++) {
      const a = x>=bpp?out[x-bpp]:0, b=prv[x], c=x>=bpp?prv[x-bpp]:0, v=row[x]
      switch(ft){case 0:out[x]=v;break;case 1:out[x]=(v+a)&255;break;case 2:out[x]=(v+b)&255;break;
        case 3:out[x]=(v+Math.floor((a+b)/2))&255;break;
        case 4:{const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c);out[x]=(v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c))&255;break}}
    }
  }
  return { w, h, bpp, pixels }
}

function encode24(w, h, rgb) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2; ihdr[10]=ihdr[11]=ihdr[12]=0
  const stride = w*3, raw = Buffer.allocUnsafe(h*(1+stride))
  for (let y=0;y<h;y++){raw[y*(1+stride)]=0;rgb.copy(raw,y*(1+stride)+1,y*stride,(y+1)*stride)}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))])
}

function toRgb(pixels,w,h){
  const rgb=Buffer.alloc(w*h*3)
  for(let i=0;i<w*h;i++){rgb[i*3]=pixels[i*4];rgb[i*3+1]=pixels[i*4+1];rgb[i*3+2]=pixels[i*4+2]}
  return rgb
}

// ─── Large promo HTML (920×680) ───────────────────────────────────────────────

const HTML = /* html */`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 920px; height: 680px;
    background: #3B4BC8;
    display: flex;
    overflow: hidden;
    font-family: 'Segoe UI Variable Display','Segoe UI',system-ui,-apple-system,sans-serif;
    position: relative;
  }

  /* Background circles */
  .c1 { position:absolute; right:170px; top:-200px; width:580px; height:580px; border-radius:50%; background:rgba(255,255,255,0.055); pointer-events:none; }
  .c2 { position:absolute; right:0; bottom:-220px; width:480px; height:480px; border-radius:50%; background:rgba(255,255,255,0.035); pointer-events:none; }
  .c3 { position:absolute; left:-80px; top:-140px; width:360px; height:360px; border-radius:50%; background:rgba(255,255,255,0.03); pointer-events:none; }

  /* ── Left panel ── */
  .left {
    width: 400px;
    padding: 0 64px;
    display: flex; flex-direction: column; justify-content: center;
    position: relative; z-index: 1;
  }

  .logo { width: 80px; height: 80px; margin-bottom: 24px; display: block; }

  h1 { font-size: 68px; font-weight: 800; color: #fff; letter-spacing: -2.5px; line-height: 1; margin-bottom: 12px; }

  .tagline { font-size: 21px; font-weight: 400; color: rgba(255,255,255,0.82); margin-bottom: 36px; letter-spacing: -0.2px; }

  .features { display: flex; flex-direction: column; gap: 10px; }
  .feat {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; color: rgba(255,255,255,0.78);
  }
  .feat-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(255,255,255,0.45); flex-shrink: 0;
  }

  /* ── Right panel ── */
  .right {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    position: relative; z-index: 1;
    padding-right: 52px;
    gap: 14px;
  }

  /* ── Popup mocks ── */
  .popup {
    width: 244px;
    background: #f9fafb;
    border-radius: 11px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,0.38), 0 6px 20px rgba(0,0,0,0.18);
  }
  .popup-dark {
    background: #1f2937;
  }

  /* Header */
  .ph { background: #3B4BC8; padding: 8px 11px; display:flex; align-items:center; justify-content:space-between; }
  .ph-left { display:flex; flex-direction:column; }
  .ph-title { font-size: 13.5px; font-weight: 700; color: #fff; letter-spacing: -0.2px; }
  .ph-sub   { font-size: 8.5px; color: rgba(255,255,255,0.60); margin-top: 1px; }
  .ph-btns  { display: flex; gap: 3px; align-items: center; }
  .hb { background: rgba(255,255,255,0.14); border: none; border-radius: 3px; color: #fff; font-size: 9.5px; padding: 2px 4px; font-family: inherit; }
  .hb-sep { width: 1px; height: 11px; background: rgba(255,255,255,0.28); margin: 0 1px; }

  /* Body light */
  .pb { padding: 8px 9px 9px; }

  /* Search row */
  .sr { display:flex; gap:4px; margin-bottom:6px; }
  .si { flex:1; border:1px solid #d1d5db; border-radius:4px; padding:5.5px 7px; font-size:11.5px; font-family:inherit; color:#111827; background:#fff; }
  .sbtn { background:#3B4BC8; border:none; border-radius:4px; width:26px; color:#fff; font-size:11px; display:flex; align-items:center; justify-content:center; }

  /* Pill toggle */
  .pt { display:flex; background:#f9fafb; border:1px solid #e5e7eb; border-radius:5px; padding:2px; margin-bottom:7px; }
  .ptb { flex:1; padding:3.5px 0; font-size:10.5px; border:none; border-radius:3px; font-family:inherit; text-align:center; cursor:default; }
  .ptb-on  { background:#3B4BC8; color:#fff; font-weight:600; }
  .ptb-off { background:transparent; color:#374151; }

  /* Results */
  .res { padding:6px 7px; border-radius:5px; margin-bottom:3px; background:#fff; border:1px solid #f0f0f0; }
  .rh { display:flex; align-items:baseline; gap:4px; margin-bottom:2px; flex-wrap:wrap; }
  .rt  { font-size:11.5px; font-weight:700; color:#111827; }
  .rf  { font-size:9.5px; color:#374151; }
  .tag { font-size:8.5px; background:#eff6ff; color:#2563eb; border-radius:3px; padding:1px 4px; margin-left:auto; white-space:nowrap; flex-shrink:0; }
  .rd  { font-size:10px; color:#374151; line-height:1.42; }

  /* Dark results */
  .res-dk { padding:6px 7px; border-radius:5px; margin-bottom:3px; background:#374151; border:1px solid #4b5563; }
  .rt-dk  { font-size:11.5px; font-weight:700; color:#f9fafb; }
  .rf-dk  { font-size:9.5px; color:#d1d5db; }
  .tag-dk { font-size:8.5px; background:#1e3a5f; color:#93c5fd; border-radius:3px; padding:1px 4px; margin-left:auto; white-space:nowrap; flex-shrink:0; }
  .rd-dk  { font-size:10px; color:#d1d5db; line-height:1.42; }

  /* Dark search input */
  .si-dk { flex:1; border:1px solid #4b5563; border-radius:4px; padding:5.5px 7px; font-size:11.5px; font-family:inherit; color:#f9fafb; background:#374151; }
  .pt-dk { display:flex; background:#1f2937; border:1px solid #374151; border-radius:5px; padding:2px; margin-bottom:7px; }
  .ptb-off-dk { background:transparent; color:#d1d5db; }
</style>
</head>
<body>
  <div class="c1"></div>
  <div class="c2"></div>
  <div class="c3"></div>

  <!-- Left: branding -->
  <div class="left">
    <svg class="logo" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="88" height="88" rx="16" fill="#3B4BC8"/>
      <rect x="0" y="0" width="88" height="44" rx="16" fill="rgba(100,120,235,0.22)"/>
      <rect x="0" y="28" width="88" height="16" fill="rgba(100,120,235,0.22)"/>
      <rect x="12" y="12" width="64" height="64" fill="none" stroke="white" stroke-width="4.5"/>
      <rect x="20" y="29" width="48" height="11" fill="white"/>
      <rect x="37" y="40" width="14" height="29" fill="white"/>
    </svg>

    <h1>TermBox</h1>
    <p class="tagline">Glossary &amp; Acronym Lookup</p>

    <div class="features">
      <div class="feat"><div class="feat-dot"></div><span>Load any CSV or JSON glossary</span></div>
      <div class="feat"><div class="feat-dot"></div><span>Create a glossary from scratch</span></div>
      <div class="feat"><div class="feat-dot"></div><span>Browse &amp; search instantly, offline</span></div>
      <div class="feat"><div class="feat-dot"></div><span>PIN-protect sensitive glossaries</span></div>
      <div class="feat"><div class="feat-dot"></div><span>12 built-in languages</span></div>
      <div class="feat"><div class="feat-dot"></div><span>Free &amp; open-source</span></div>
    </div>
  </div>

  <!-- Right: two popup mocks (light + dark) -->
  <div class="right">

    <!-- Light popup — PCR search -->
    <div class="popup">
      <div class="ph">
        <div class="ph-left">
          <span class="ph-title">TermBox</span>
          <span class="ph-sub">Biotest Diagnostics</span>
        </div>
        <div class="ph-btns">
          <span class="hb">A−</span><span class="hb">A+</span><span class="hb">☾</span>
          <span class="hb-sep"></span>
          <span class="hb">Az</span><span class="hb">≡</span><span class="hb">ⓘ</span>
        </div>
      </div>
      <div class="pb">
        <div class="sr">
          <div class="si">pcr</div>
          <div class="sbtn">🔍</div>
        </div>
        <div class="pt">
          <div class="ptb ptb-on">Term</div>
          <div class="ptb ptb-off">Definition</div>
        </div>
        <div class="res">
          <div class="rh"><span class="rt">PCR</span><span class="rf">Polymerase Chain Reaction</span><span class="tag">Molecular Biology</span></div>
          <div class="rd">Amplifies a specific segment of DNA, enabling detection of pathogens from a tiny sample.</div>
        </div>
        <div class="res">
          <div class="rh"><span class="rt">qPCR</span><span class="rf">Quantitative PCR</span><span class="tag">Molecular Biology</span></div>
          <div class="rd">Measures DNA or RNA quantity in real time using fluorescent reporters.</div>
        </div>
        <div class="res">
          <div class="rh"><span class="rt">ddPCR</span><span class="rf">Droplet Digital PCR</span><span class="tag">Molecular Biology</span></div>
          <div class="rd">Absolute quantification of nucleic acids without a standard curve.</div>
        </div>
      </div>
    </div>

    <!-- Dark popup — AI/ML search -->
    <div class="popup popup-dark">
      <div class="ph">
        <div class="ph-left">
          <span class="ph-title">TermBox</span>
          <span class="ph-sub">AI / ML</span>
        </div>
        <div class="ph-btns">
          <span class="hb">A−</span><span class="hb">A+</span><span class="hb">☀</span>
          <span class="hb-sep"></span>
          <span class="hb">Az</span><span class="hb">≡</span><span class="hb">ⓘ</span>
        </div>
      </div>
      <div class="pb">
        <div class="sr">
          <div class="si-dk">transformer</div>
          <div class="sbtn">🔍</div>
        </div>
        <div class="pt pt-dk">
          <div class="ptb ptb-on">Term</div>
          <div class="ptb ptb-off-dk">Definition</div>
        </div>
        <div class="res-dk">
          <div class="rh"><span class="rt-dk">Transformer</span><span class="tag-dk">LLMs</span></div>
          <div class="rd-dk">Neural network architecture using self-attention. Foundation of virtually all modern LLMs.</div>
        </div>
        <div class="res-dk">
          <div class="rh"><span class="rt-dk">Attention</span><span class="tag-dk">LLMs</span></div>
          <div class="rd-dk">Mechanism that lets a network weigh the relevance of input tokens when producing each output.</div>
        </div>
        <div class="res-dk">
          <div class="rh"><span class="rt-dk">Fine-tuning</span><span class="tag-dk">Training</span></div>
          <div class="rd-dk">Training a pre-trained model on a smaller, task-specific dataset.</div>
        </div>
      </div>
    </div>

  </div><!-- /right -->
</body>
</html>`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function portOpen(port) {
  return new Promise(r => {
    const s = net.createConnection(port, '127.0.0.1')
    s.once('connect', () => { s.destroy(); r(true) })
    s.once('error', () => r(false))
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let server = null
  if (!(await portOpen(5173))) {
    process.stdout.write('Starting dev server')
    server = spawn('npm', ['run', 'serve'], { cwd: ROOT, shell: true, stdio: 'pipe' })
    for (let i = 0; i < 40; i++) {
      await sleep(500)
      if (await portOpen(5173)) break
      if (i % 4 === 0) process.stdout.write('.')
    }
    await sleep(800)
    process.stdout.write(' ready.\n')
  } else {
    console.log('Dev server already running on :5173.')
  }

  const browser = await chromium.launch()
  const ctx     = await browser.newContext({ viewport: { width: W, height: H } })
  const page    = await ctx.newPage()

  await page.route('http://localhost:5173/large-promo-gen.html', route =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: HTML })
  )
  await page.goto('http://localhost:5173/large-promo-gen.html', { waitUntil: 'networkidle' })
  await sleep(200)

  const pngBuf = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })

  await ctx.close()
  await browser.close()
  if (server) server.kill()

  const { w, h, bpp, pixels } = decodePng(pngBuf)
  const rgb = bpp === 4 ? toRgb(pixels, w, h) : pixels
  const out = encode24(w, h, rgb)
  writeFileSync(OUT, out)

  console.log(`✓  large-promo-920x680.png  (${(out.length / 1024).toFixed(0)} kB, 24-bit RGB, no alpha)`)
}

main().catch(err => { console.error(err); process.exit(1) })
