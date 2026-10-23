#!/usr/bin/env node
// Replaces the "TB" badge in promo-tile-440x280.png with the T-in-a-box icon.
// Uses only Node.js built-ins — no extra dependencies.

import { inflateSync, deflateSync } from 'zlib'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const dir = dirname(fileURLToPath(import.meta.url))
const tileFile = resolve(dir, '../docs/screenshots/promo-tile-440x280.png')

// ── CRC32 ─────────────────────────────────────────────────────────────────────

const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[i] = c >>> 0
}
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)) >>> 0
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ── PNG chunk builder ─────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length, 0)
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])), 0)
  return Buffer.concat([len, t, d, crc])
}

// ── PNG encoder ───────────────────────────────────────────────────────────────

function encodePng(width, height, rgba) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = ihdr[11] = ihdr[12] = 0
  const stride = width * 4
  const raw = Buffer.allocUnsafe(height * (1 + stride))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── PNG decoder ───────────────────────────────────────────────────────────────

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  return (pa <= pb && pa <= pc) ? a : (pb <= pc) ? b : c
}

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504E47) throw new Error('Not a PNG')
  let offset = 8
  const chunks = []
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const data = buf.slice(offset + 8, offset + 8 + length)
    chunks.push({ type, data })
    offset += 12 + length
  }

  const ih = chunks.find(c => c.type === 'IHDR').data
  const width = ih.readUInt32BE(0), height = ih.readUInt32BE(4)
  const colorType = ih[9]
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : (() => { throw new Error(`Color type ${colorType}`) })()
  if (ih[8] !== 8) throw new Error('Only 8-bit PNGs supported')

  const compressed = Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data))
  const filtered = inflateSync(compressed)

  const rgba = Buffer.alloc(width * height * 4, 255)
  const stride = width * ch
  let fOff = 0
  const prev = Buffer.alloc(stride, 0)

  for (let y = 0; y < height; y++) {
    const ft = filtered[fOff++]
    const row = Buffer.alloc(stride)
    for (let x = 0; x < stride; x++) {
      const raw = filtered[fOff++]
      const a = x >= ch ? row[x - ch] : 0
      const b = prev[x]
      const c = x >= ch ? prev[x - ch] : 0
      switch (ft) {
        case 0: row[x] = raw; break
        case 1: row[x] = (raw + a) & 0xFF; break
        case 2: row[x] = (raw + b) & 0xFF; break
        case 3: row[x] = (raw + Math.floor((a + b) / 2)) & 0xFF; break
        case 4: row[x] = (raw + paeth(a, b, c)) & 0xFF; break
      }
    }
    row.copy(prev)
    for (let x = 0; x < width; x++) {
      const si = x * ch, di = (y * width + x) * 4
      rgba[di] = row[si]; rgba[di + 1] = row[si + 1]; rgba[di + 2] = row[si + 2]
      rgba[di + 3] = ch === 4 ? row[si + 3] : 255
    }
  }
  return { width, height, rgba }
}

// ── T-in-a-box badge ──────────────────────────────────────────────────────────

const BRAND = [59, 75, 200]
const WHITE = [255, 255, 255]

function drawBadge(rgba, imgW, imgH, destX, destY, size) {
  function setPixel(lx, ly, r, g, b, a = 255) {
    const xi = lx + destX, yi = ly + destY
    if (xi < 0 || xi >= imgW || yi < 0 || yi >= imgH) return
    const sA = a / 255
    const idx = (yi * imgW + xi) * 4
    const dA = rgba[idx + 3] / 255
    const oA = sA + dA * (1 - sA)
    if (oA < 0.001) return
    rgba[idx]     = Math.round((r * sA + rgba[idx]     * dA * (1 - sA)) / oA)
    rgba[idx + 1] = Math.round((g * sA + rgba[idx + 1] * dA * (1 - sA)) / oA)
    rgba[idx + 2] = Math.round((b * sA + rgba[idx + 2] * dA * (1 - sA)) / oA)
    rgba[idx + 3] = Math.round(oA * 255)
  }

  function fillRoundRect(x, y, w, h, radius, r, g, b, a = 255) {
    for (let py = y; py <= y + h; py++) {
      for (let px = x; px <= x + w; px++) {
        const lx = px - x, ly = py - y
        let dx = 0, dy = 0, corner = false
        if      (lx < radius && ly < radius)         { dx = radius - lx; dy = radius - ly; corner = true }
        else if (lx > w - radius && ly < radius)     { dx = lx - (w - radius); dy = radius - ly; corner = true }
        else if (lx < radius && ly > h - radius)     { dx = radius - lx; dy = ly - (h - radius); corner = true }
        else if (lx > w - radius && ly > h - radius) { dx = lx - (w - radius); dy = ly - (h - radius); corner = true }
        let alpha = a
        if (corner) {
          const d = Math.hypot(dx, dy)
          if (d > radius + 0.5) continue
          if (d > radius - 0.5) alpha = Math.round(a * (radius + 0.5 - d))
        }
        setPixel(px, py, r, g, b, alpha)
      }
    }
  }

  function fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + w; px++)
        setPixel(px, py, r, g, b, a)
  }

  const s = size

  // Rounded background
  const bgR = Math.round(s * 0.20)
  fillRoundRect(0, 0, s - 1, s - 1, bgR, ...BRAND)

  // Subtle inner highlight along top edge
  fillRoundRect(0, 0, s - 1, Math.round(s * 0.45), bgR, 90, 105, 220, 35)

  // White box outline
  const inset = Math.max(2, Math.round(s * 0.10))
  const sw    = Math.max(1, Math.round(s * 0.05))
  const bx = inset, by = inset
  const bw = s - 1 - 2 * inset, bh = s - 1 - 2 * inset
  fillRect(bx,              by,                bw + 1, sw,     ...WHITE)
  fillRect(bx,              by + bh - sw + 1,  bw + 1, sw,     ...WHITE)
  fillRect(bx,              by,                sw,     bh + 1, ...WHITE)
  fillRect(bx + bw - sw + 1, by,              sw,     bh + 1, ...WHITE)

  // White T inside the box interior
  const ix = bx + sw + 1, iy = by + sw + 1
  const iw = bw - 2 * sw - 2, ih = bh - 2 * sw - 2
  const barTop  = iy + Math.round(ih * 0.18)
  const barH    = Math.max(1, Math.round(ih * 0.18))
  const barX    = ix + Math.round(iw * 0.10)
  const barW    = Math.round(iw * 0.80)
  const stemW   = Math.max(1, Math.round(iw * 0.24))
  const stemX   = ix + Math.round((iw - stemW) / 2)
  const stemTop = barTop + barH
  const stemBot = iy + Math.round(ih * 0.86)
  fillRect(barX,  barTop,  barW,            barH,            ...WHITE)
  fillRect(stemX, stemTop, stemW,           stemBot - stemTop, ...WHITE)
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { width, height, rgba } = decodePng(readFileSync(tileFile))
console.log(`Decoded: ${width}×${height}`)

// Badge bounds measured from original PNG pixel data:
// background color rgb(101,114,212) spans x=32–84, y=28–80 → 53×53 px
const BADGE_X = 32, BADGE_Y = 28, BADGE_SIZE = 53
drawBadge(rgba, width, height, BADGE_X, BADGE_Y, BADGE_SIZE)

const png = encodePng(width, height, rgba)
writeFileSync(tileFile, png)
console.log(`✓  promo-tile-440x280.png  (${png.length} B)`)
