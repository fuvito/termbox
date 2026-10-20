#!/usr/bin/env node
// Generates icon16.png, icon48.png, icon128.png in public/
// Uses only Node.js built-ins — no extra dependencies.

import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public')

// ── Minimal PNG encoder ───────────────────────────────────────────────────────

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

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length, 0)
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])), 0)
  return Buffer.concat([len, t, d, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = ihdr[11] = ihdr[12] = 0

  const stride = size * 4
  const raw = Buffer.allocUnsafe(size * (1 + stride))
  for (let y = 0; y < size; y++) {
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

// ── Drawing helpers ───────────────────────────────────────────────────────────

function createImage(size) {
  const buf = Buffer.alloc(size * size * 4, 0)

  function setPixel(x, y, r, g, b, a = 255) {
    const xi = Math.round(x), yi = Math.round(y)
    if (xi < 0 || xi >= size || yi < 0 || yi >= size) return
    const i = (yi * size + xi) * 4
    const sA = a / 255, dA = buf[i + 3] / 255
    const oA = sA + dA * (1 - sA)
    if (oA < 0.001) return
    buf[i]     = Math.round((r * sA + buf[i]     * dA * (1 - sA)) / oA)
    buf[i + 1] = Math.round((g * sA + buf[i + 1] * dA * (1 - sA)) / oA)
    buf[i + 2] = Math.round((b * sA + buf[i + 2] * dA * (1 - sA)) / oA)
    buf[i + 3] = Math.round(oA * 255)
  }

  // Anti-aliased rounded rectangle
  function fillRoundRect(x, y, w, h, radius, r, g, b, a = 255) {
    for (let py = y; py <= y + h; py++) {
      for (let px = x; px <= x + w; px++) {
        const lx = px - x, ly = py - y
        if (lx < 0 || lx > w || ly < 0 || ly > h) continue

        let dx = 0, dy = 0, inCorner = false
        if      (lx < radius && ly < radius)         { dx = radius - lx; dy = radius - ly; inCorner = true }
        else if (lx > w - radius && ly < radius)     { dx = lx - (w - radius); dy = radius - ly; inCorner = true }
        else if (lx < radius && ly > h - radius)     { dx = radius - lx; dy = ly - (h - radius); inCorner = true }
        else if (lx > w - radius && ly > h - radius) { dx = lx - (w - radius); dy = ly - (h - radius); inCorner = true }

        let alpha = a
        if (inCorner) {
          const dist = Math.hypot(dx, dy)
          if (dist > radius + 0.5) continue
          if (dist > radius - 0.5) alpha = Math.round(a * (radius + 0.5 - dist))
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

  return { buf, fillRoundRect, fillRect }
}

// ── Icon design ───────────────────────────────────────────────────────────────
// BRAND blue background, white bold "T" centered

const BRAND = [59, 75, 200]   // #3B4BC8
const WHITE = [255, 255, 255]

function drawIcon(size) {
  const img = createImage(size)
  const { buf, fillRoundRect, fillRect } = img
  const s = size

  // Background — rounded square
  const radius = Math.round(s * 0.20)
  fillRoundRect(0, 0, s - 1, s - 1, radius, ...BRAND)

  // Subtle inner highlight along top edge (gives a slight 3-D feel at larger sizes)
  if (s >= 48) {
    fillRoundRect(0, 0, s - 1, Math.round(s * 0.45), radius, 90, 105, 220, 35)
  }

  // White "T"
  //  • Horizontal bar spans ~72% of the width, ~15% tall, starting at ~26% from top
  //  • Vertical stroke is ~22% of width, centred, from bar-bottom to ~82% of height
  const barTop  = Math.round(s * 0.26)
  const barH    = Math.max(2, Math.round(s * 0.15))
  const barX    = Math.round(s * 0.14)
  const barW    = Math.round(s * 0.72)

  const strokeW = Math.max(2, Math.round(s * 0.22))
  const strokeX = Math.round((s - strokeW) / 2)
  const strokeTop = barTop + barH
  const strokeBot = Math.round(s * 0.82)

  fillRect(barX, barTop, barW, barH,           ...WHITE)
  fillRect(strokeX, strokeTop, strokeW, strokeBot - strokeTop, ...WHITE)

  return buf
}

// ── Generate files ────────────────────────────────────────────────────────────

for (const size of [16, 48, 128]) {
  const pixels = drawIcon(size)
  const png    = encodePng(size, pixels)
  const path   = resolve(publicDir, `icon${size}.png`)
  writeFileSync(path, png)
  console.log(`✓  public/icon${size}.png  (${png.length} B)`)
}
