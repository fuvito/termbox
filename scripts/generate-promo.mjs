// Generates docs/screenshots/promo-tile-440x280.png from HTML via Playwright.
// 24-bit RGB PNG (no alpha), Chrome Web Store Small Promo Tile format.
// Usage: npm run promo   (starts dev server automatically if needed)

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
const OUT   = path.join(ROOT, 'docs', 'screenshots', 'promo-tile-440x280.png')
const W = 440, H = 280

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
  let pos = 8
  let w = 0, h = 0, colorType = 6
  const idats = []
  while (pos < buf.length - 12) {
    const len  = buf.readUInt32BE(pos)
    const type = buf.slice(pos + 4, pos + 8).toString('ascii')
    const data = buf.slice(pos + 8, pos + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9] }
    else if (type === 'IDAT') idats.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  const bpp = colorType === 6 ? 4 : 3
  const stride = w * bpp
  const raw = inflateSync(Buffer.concat(idats))
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
        case 4: { const pa = Math.abs(b-c), pb = Math.abs(a-c), pc = Math.abs(a+b-2*c); out[x] = (v + (pa<=pb&&pa<=pc?a:pb<=pc?b:c)) & 0xFF; break }
      }
    }
  }
  return { w, h, bpp, pixels }
}

function encode24(w, h, rgb) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = ihdr[11] = ihdr[12] = 0
  const stride = w * 3
  const raw = Buffer.allocUnsafe(h * (1 + stride))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + stride)] = 0
    rgb.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function toRgb(pixels, w, h) {
  const rgb = Buffer.alloc(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = pixels[i * 4]; rgb[i * 3 + 1] = pixels[i * 4 + 1]; rgb[i * 3 + 2] = pixels[i * 4 + 2]
  }
  return rgb
}

// ─── Promo tile HTML ──────────────────────────────────────────────────────────

const HTML = /* html */`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 440px; height: 280px;
    background: #3B4BC8;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 44px;
    overflow: hidden;
    position: relative;
    font-family: 'Segoe UI Variable Display','Segoe UI',system-ui,-apple-system,sans-serif;
  }

  /* Decorative circles */
  .c1 {
    position: absolute; right: -60px; top: -120px;
    width: 320px; height: 320px; border-radius: 50%;
    background: rgba(255,255,255,0.055); pointer-events: none;
  }
  .c2 {
    position: absolute; right: 80px; bottom: -140px;
    width: 260px; height: 260px; border-radius: 50%;
    background: rgba(255,255,255,0.035); pointer-events: none;
  }
  .c3 {
    position: absolute; left: -60px; bottom: -80px;
    width: 200px; height: 200px; border-radius: 50%;
    background: rgba(255,255,255,0.03); pointer-events: none;
  }

  .logo { width: 52px; height: 52px; margin-bottom: 16px; display: block; }

  h1 {
    font-size: 48px; font-weight: 800;
    color: #fff; letter-spacing: -2px; line-height: 1;
    margin-bottom: 7px;
  }

  .tagline {
    font-size: 17px; font-weight: 400;
    color: rgba(255,255,255,0.82);
    margin-bottom: 18px; letter-spacing: -0.1px;
  }

  .feats {
    display: flex; flex-wrap: wrap; gap: 0;
    font-size: 12px; color: rgba(255,255,255,0.58);
    align-items: center; line-height: 1.8;
  }
  .dot { margin: 0 7px; color: rgba(255,255,255,0.28); }
</style>
</head>
<body>
  <div class="c1"></div>
  <div class="c2"></div>
  <div class="c3"></div>

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

  <div class="feats">
    <span>CSV &amp; JSON glossaries</span><span class="dot">·</span>
    <span>Browse A–Z</span><span class="dot">·</span>
    <span>PIN&nbsp;protection</span>
    <span class="dot">·</span>
    <span>12&nbsp;languages</span><span class="dot">·</span>
    <span>Fully offline</span><span class="dot">·</span>
    <span>Free</span>
  </div>
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

  await page.route('http://localhost:5173/promo-gen.html', route =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: HTML })
  )
  await page.goto('http://localhost:5173/promo-gen.html', { waitUntil: 'networkidle' })
  await sleep(200)

  const pngBuf = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })

  await ctx.close()
  await browser.close()
  if (server) server.kill()

  const { w, h, bpp, pixels } = decodePng(pngBuf)
  const rgb = bpp === 4 ? toRgb(pixels, w, h) : pixels
  const out = encode24(w, h, rgb)
  writeFileSync(OUT, out)

  console.log(`✓  promo-tile-440x280.png  (${(out.length / 1024).toFixed(0)} kB, 24-bit RGB, no alpha)`)
}

main().catch(err => { console.error(err); process.exit(1) })
