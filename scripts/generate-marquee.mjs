// Generates docs/screenshots/marquee-promo-1400x560.png
// 24-bit RGB PNG (no alpha), Chrome Web Store Marquee format.
// Usage: npm run marquee   (starts dev server automatically if needed)

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
const OUT   = path.join(ROOT, 'docs', 'screenshots', 'marquee-promo-1400x560.png')
const W = 1400, H = 560

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

// Decode any PNG → { w, h, bpp, pixels: Buffer (raw RGBA or RGB rows, no filter bytes) }
function decodePng(buf) {
  let pos = 8
  let w = 0, h = 0, colorType = 6
  const idats = []
  while (pos < buf.length - 12) {
    const len  = buf.readUInt32BE(pos)
    const type = buf.slice(pos + 4, pos + 8).toString('ascii')
    const data = buf.slice(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]
    } else if (type === 'IDAT') {
      idats.push(data)
    } else if (type === 'IEND') break
    pos += 12 + len
  }
  const bpp    = colorType === 6 ? 4 : 3   // RGBA or RGB
  const stride = w * bpp
  const raw    = inflateSync(Buffer.concat(idats))
  const pixels = Buffer.alloc(h * stride)

  for (let y = 0; y < h; y++) {
    const ft  = raw[y * (1 + stride)]
    const row = raw.slice(y * (1 + stride) + 1, y * (1 + stride) + 1 + stride)
    const prv = y > 0 ? pixels.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride)
    const out = pixels.slice(y * stride, (y + 1) * stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0
      const b = prv[x], c = x >= bpp ? prv[x - bpp] : 0
      const v = row[x]
      switch (ft) {
        case 0: out[x] = v; break
        case 1: out[x] = (v + a) & 0xFF; break
        case 2: out[x] = (v + b) & 0xFF; break
        case 3: out[x] = (v + Math.floor((a + b) / 2)) & 0xFF; break
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c)
          out[x] = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xFF
          break
        }
      }
    }
  }
  return { w, h, bpp, pixels }
}

// Encode raw RGB pixels as 24-bit PNG (color type 2, no alpha)
function encode24(w, h, rgb) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = ihdr[11] = ihdr[12] = 0  // depth=8, type=RGB
  const stride = w * 3
  const raw = Buffer.allocUnsafe(h * (1 + stride))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + stride)] = 0   // filter: None
    rgb.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Strip alpha: RGBA → RGB
function toRgb(pixels, w, h) {
  const rgb = Buffer.alloc(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3]     = pixels[i * 4]
    rgb[i * 3 + 1] = pixels[i * 4 + 1]
    rgb[i * 3 + 2] = pixels[i * 4 + 2]
  }
  return rgb
}

// ─── Marquee HTML ─────────────────────────────────────────────────────────────

const HTML = /* html */`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width: 1400px; height: 560px;
    background: #3B4BC8;
    display: flex;
    overflow: hidden;
    font-family: 'Segoe UI Variable Display','Segoe UI',system-ui,-apple-system,sans-serif;
    position: relative;
  }

  /* Background decorative circles */
  .c1 {
    position:absolute; right:180px; top:-220px;
    width:600px; height:600px; border-radius:50%;
    background:rgba(255,255,255,0.055); pointer-events:none;
  }
  .c2 {
    position:absolute; right:20px; bottom:-240px;
    width:520px; height:520px; border-radius:50%;
    background:rgba(255,255,255,0.035); pointer-events:none;
  }
  .c3 {
    position:absolute; left:-100px; top:-160px;
    width:400px; height:400px; border-radius:50%;
    background:rgba(255,255,255,0.03); pointer-events:none;
  }

  /* ── Left panel ── */
  .left {
    width: 596px;
    padding: 0 76px;
    display: flex; flex-direction: column; justify-content: center;
    position: relative; z-index:1;
  }

  .logo { width:88px; height:88px; margin-bottom:26px; display:block; }

  h1 {
    font-size: 76px; font-weight: 800;
    color: #fff; letter-spacing: -3px; line-height: 1;
    margin-bottom: 13px;
  }

  .tagline {
    font-size: 24px; font-weight: 400;
    color: rgba(255,255,255,0.80);
    margin-bottom: 38px; letter-spacing: -0.2px;
  }

  .feats {
    display:flex; flex-wrap:wrap; gap:0;
    font-size:14.5px; color:rgba(255,255,255,0.62);
    align-items:center; line-height:1.7;
  }
  .dot { margin:0 9px; color:rgba(255,255,255,0.32); }

  /* ── Right panel ── */
  .right {
    flex:1;
    display:flex; align-items:center; justify-content:center;
    position:relative; z-index:1;
    padding-right: 64px;
  }

  /* ── Mock popup ── */
  .popup {
    width: 334px;
    background: #f9fafb;
    border-radius: 13px;
    overflow: hidden;
    box-shadow: 0 32px 88px rgba(0,0,0,0.40), 0 8px 28px rgba(0,0,0,0.22);
  }

  /* Header */
  .ph {
    background: #3B4BC8;
    padding: 9px 13px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .ph-left { display:flex; flex-direction:column; }
  .ph-title { font-size:15.5px; font-weight:700; color:#fff; letter-spacing:-0.3px; }
  .ph-sub   { font-size:9.5px; color:rgba(255,255,255,0.62); margin-top:1px; }
  .ph-btns  { display:flex; gap:4px; align-items:center; }
  .hb {
    background:rgba(255,255,255,0.14); border:none; border-radius:4px;
    color:#fff; font-size:10.5px; padding:3px 5px; font-family:inherit;
  }
  .hb-sep { width:1px; height:13px; background:rgba(255,255,255,0.28); margin:0 2px; }

  /* Body */
  .pb { padding:10px 11px 11px; }

  /* Search row */
  .sr { display:flex; gap:5px; margin-bottom:7px; }
  .si {
    flex:1; border:1px solid #d1d5db; border-radius:5px;
    padding:7px 9px; font-size:13px; font-family:inherit;
    color:#111827; background:#fff;
  }
  .sbtn {
    background:#3B4BC8; border:none; border-radius:5px;
    width:32px; color:#fff; font-size:13px; display:flex;
    align-items:center; justify-content:center;
  }
  .clr {
    background:none; border:none; color:#9ca3af; font-size:14px;
    display:flex; align-items:center; justify-content:center; width:22px;
    cursor:default;
  }

  /* Pill toggle */
  .pt {
    display:flex; background:#f9fafb; border:1px solid #e5e7eb;
    border-radius:6px; padding:2px; margin-bottom:9px;
  }
  .ptb {
    flex:1; padding:4px 0; font-size:12px; border:none; border-radius:4px;
    font-family:inherit; text-align:center; cursor:default;
  }
  .ptb-on  { background:#3B4BC8; color:#fff; font-weight:600; }
  .ptb-off { background:transparent; color:#374151; }

  /* Results */
  .res {
    padding:8px 9px; border-radius:6px; margin-bottom:4px;
    background:#fff; border:1px solid #f0f0f0;
    cursor:default;
  }
  .res:hover { background:#f9fafb; }
  .rh { display:flex; align-items:baseline; gap:5px; margin-bottom:3px; flex-wrap:wrap; }
  .rt  { font-size:13px; font-weight:700; color:#111827; }
  .rf  { font-size:11px; color:#374151; }
  .tag {
    font-size:10px; background:#eff6ff; color:#2563eb;
    border-radius:4px; padding:1px 5px; margin-left:auto; white-space:nowrap;
    flex-shrink:0;
  }
  .rd  { font-size:11.5px; color:#374151; line-height:1.45; }

  /* Partial last result (cut off at bottom) */
  .res-p {
    padding:8px 9px 6px; border-radius:6px;
    background:#fff; border:1px solid #f0f0f0;
  }
</style>
</head>
<body>
  <div class="c1"></div>
  <div class="c2"></div>
  <div class="c3"></div>

  <!-- Left: branding -->
  <div class="left">
    <svg class="logo" viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">
      <!-- rounded bg (same colour, just for sizing reference — logo sits on BRAND bg) -->
      <rect x="0" y="0" width="88" height="88" rx="16" fill="#3B4BC8"/>
      <!-- subtle top highlight -->
      <rect x="0" y="0" width="88" height="44" rx="16" fill="rgba(100,120,235,0.22)"/>
      <rect x="0" y="28" width="88" height="16" fill="rgba(100,120,235,0.22)"/>
      <!-- white box outline -->
      <rect x="12" y="12" width="64" height="64" fill="none" stroke="white" stroke-width="4.5"/>
      <!-- T bar -->
      <rect x="20" y="29" width="48" height="11" fill="white"/>
      <!-- T stem -->
      <rect x="37" y="40" width="14" height="29" fill="white"/>
    </svg>

    <h1>TermBox</h1>
    <p class="tagline">Glossary &amp; Acronym Lookup</p>

    <div class="feats">
      <span>Load any CSV</span><span class="dot">·</span>
      <span>Create from scratch</span><span class="dot">·</span>
      <span>Browse A–Z</span>
      <span class="dot">·</span>
      <span>PIN&nbsp;protection</span><span class="dot">·</span>
      <span>Fully offline</span><span class="dot">·</span>
      <span>Free</span>
    </div>
  </div>

  <!-- Right: popup mock -->
  <div class="right">
    <div class="popup">

      <!-- Header -->
      <div class="ph">
        <div class="ph-left">
          <span class="ph-title">TermBox</span>
          <span class="ph-sub">Biotest Diagnostics</span>
        </div>
        <div class="ph-btns">
          <span class="hb">A−</span>
          <span class="hb">A+</span>
          <span class="hb">☾</span>
          <span class="hb-sep"></span>
          <span class="hb">Az</span>
          <span class="hb">≡</span>
          <span class="hb">ⓘ</span>
        </div>
      </div>

      <!-- Body -->
      <div class="pb">

        <!-- Search -->
        <div class="sr">
          <div class="si">pcr</div>
          <div class="sbtn">&#x1F50D;</div>
          <div class="clr">✕</div>
        </div>

        <!-- Mode toggle -->
        <div class="pt">
          <div class="ptb ptb-on">Term</div>
          <div class="ptb ptb-off">Definition</div>
        </div>

        <!-- Result 1 -->
        <div class="res">
          <div class="rh">
            <span class="rt">PCR</span>
            <span class="rf">Polymerase Chain Reaction</span>
            <span class="tag">Molecular Biology</span>
          </div>
          <div class="rd">A molecular biology technique that amplifies a specific segment of DNA, enabling detection of pathogens from a tiny sample.</div>
        </div>

        <!-- Result 2 -->
        <div class="res">
          <div class="rh">
            <span class="rt">qPCR</span>
            <span class="rf">Quantitative PCR</span>
            <span class="tag">Molecular Biology</span>
          </div>
          <div class="rd">Measures the quantity of a target DNA or RNA in real time using fluorescent reporters.</div>
        </div>

        <!-- Result 3 (partial) -->
        <div class="res-p">
          <div class="rh">
            <span class="rt">ddPCR</span>
            <span class="rf">Droplet Digital PCR</span>
            <span class="tag">Molecular Biology</span>
          </div>
        </div>

      </div><!-- /pb -->
    </div><!-- /popup -->
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

  // Serve the marquee HTML from localhost:5173 so Inter (if referenced) resolves correctly
  await page.route('http://localhost:5173/marquee-gen.html', route =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: HTML })
  )
  await page.goto('http://localhost:5173/marquee-gen.html', { waitUntil: 'networkidle' })
  await sleep(200)

  // Screenshot → PNG buffer (RGBA 32-bit)
  const pngBuf = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })

  await ctx.close()
  await browser.close()
  if (server) server.kill()

  // Decode RGBA → strip alpha → encode as 24-bit RGB PNG
  const { w, h, bpp, pixels } = decodePng(pngBuf)
  const rgb = bpp === 4 ? toRgb(pixels, w, h) : pixels
  const out = encode24(w, h, rgb)
  writeFileSync(OUT, out)

  console.log(`✓  marquee-promo-1400x560.png  (${(out.length / 1024).toFixed(0)} kB, 24-bit RGB, no alpha)`)
}

main().catch(err => { console.error(err); process.exit(1) })
