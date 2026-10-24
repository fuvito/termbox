// Produces termbox-firefox.zip — same as termbox.zip but with Firefox-specific
// browser_specific_settings injected into manifest.json at zip time.
// The dist/ folder is NOT modified.
import { createWriteStream, readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')
const outFile = join(root, 'termbox-firefox.zip')

const GECKO = {
  browser_specific_settings: {
    gecko: {
      id: 'termbox@fuvito',
      strict_min_version: '140.0',
      data_collection_permissions: {
        required: ['none'],
        optional: [],
      },
    },
    gecko_android: {
      strict_min_version: '142.0',
    },
  },
}

function walkDir(dir, base = dir) {
  const entries = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) entries.push(...walkDir(full, base))
    else entries.push({ full, rel: relative(base, full).replaceAll('\\', '/') })
  }
  return entries
}

function writeZip(files, output, overrides = {}) {
  const entries = [], bufs = []
  let offset = 0

  for (const { full, rel } of files) {
    const raw = readFileSync(full)
    const data = overrides[rel] ? Buffer.from(overrides[rel]) : raw
    const nameBytes = Buffer.from(rel, 'utf8')
    const local = Buffer.alloc(30 + nameBytes.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc32(data), 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    nameBytes.copy(local, 30)
    bufs.push(local, data)
    entries.push({ rel, nameBytes, size: data.length, crc: crc32(data), offset })
    offset += local.length + data.length
  }

  const cdStart = offset
  for (const e of entries) {
    const cd = Buffer.alloc(46 + e.nameBytes.length)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6)
    cd.writeUInt16LE(0, 8); cd.writeUInt16LE(0, 10)
    cd.writeUInt16LE(0, 12); cd.writeUInt16LE(0, 14)
    cd.writeUInt32LE(e.crc, 16); cd.writeUInt32LE(e.size, 20); cd.writeUInt32LE(e.size, 24)
    cd.writeUInt16LE(e.nameBytes.length, 28); cd.writeUInt16LE(0, 30)
    cd.writeUInt16LE(0, 32); cd.writeUInt16LE(0, 34)
    cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38)
    cd.writeUInt32LE(e.offset, 42)
    e.nameBytes.copy(cd, 46)
    bufs.push(cd)
    offset += cd.length
  }

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(offset - cdStart, 12); eocd.writeUInt32LE(cdStart, 16); eocd.writeUInt16LE(0, 20)
  bufs.push(eocd)

  const ws = createWriteStream(output)
  for (const b of bufs) ws.write(b)
  ws.end()
}

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Patch manifest.json for Firefox:
// - Inject browser_specific_settings.gecko
// - Replace background.service_worker with background.scripts (service_worker requires Firefox 128+;
//   scripts works from Firefox 109 and covers our strict_min_version 115 target)
// - Drop optional_host_permissions (unsupported before Firefox 128; not used at runtime)
// - Drop minimum_chrome_version (Chrome-only field; causes AMO validation warning)
// - Add data_collection_permissions (required by AMO; empty arrays = no data collected)
const manifest = JSON.parse(readFileSync(join(distDir, 'manifest.json'), 'utf8'))
const { optional_host_permissions: _dropped, minimum_chrome_version: _chrome, ...base } = manifest
const firefoxManifest = JSON.stringify({
  ...base,
  background: {
    scripts: [manifest.background.service_worker],
    type: 'module',
  },
  ...GECKO,
}, null, 2)

const files = walkDir(distDir)
writeZip(files, outFile, { 'manifest.json': firefoxManifest })
console.log(`Packaged ${files.length} files → termbox-firefox.zip  (gecko id: termbox@fuvito, min Firefox 140 / Android 142)`)
