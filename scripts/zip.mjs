import { createWriteStream, readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')
const outFile = join(root, 'termbox.zip')

function walkDir(dir, base = dir) {
  const entries = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      entries.push(...walkDir(full, base))
    } else {
      entries.push({ full, rel: relative(base, full).replaceAll('\\', '/') })
    }
  }
  return entries
}

// Minimal ZIP writer — no dependencies needed
function writeZip(files, output) {
  const entries = []
  const bufs = []
  let offset = 0

  for (const { full, rel } of files) {
    const data = readFileSync(full)
    const nameBytes = Buffer.from(rel, 'utf8')
    const local = Buffer.alloc(30 + nameBytes.length)
    local.writeUInt32LE(0x04034b50, 0)   // local file header sig
    local.writeUInt16LE(20, 4)           // version needed
    local.writeUInt16LE(0, 6)            // flags
    local.writeUInt16LE(0, 8)            // compression (stored)
    local.writeUInt16LE(0, 10)           // mod time
    local.writeUInt16LE(0, 12)           // mod date
    local.writeUInt32LE(crc32(data), 14) // crc-32
    local.writeUInt32LE(data.length, 18) // compressed size
    local.writeUInt32LE(data.length, 22) // uncompressed size
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)           // extra field length
    nameBytes.copy(local, 30)
    bufs.push(local, data)
    entries.push({ rel, nameBytes, size: data.length, crc: crc32(data), offset })
    offset += local.length + data.length
  }

  const cdStart = offset
  for (const e of entries) {
    const cd = Buffer.alloc(46 + e.nameBytes.length)
    cd.writeUInt32LE(0x02014b50, 0)       // central dir sig
    cd.writeUInt16LE(20, 4)              // version made by
    cd.writeUInt16LE(20, 6)              // version needed
    cd.writeUInt16LE(0, 8)              // flags
    cd.writeUInt16LE(0, 10)             // compression
    cd.writeUInt16LE(0, 12)             // mod time
    cd.writeUInt16LE(0, 14)             // mod date
    cd.writeUInt32LE(e.crc, 16)
    cd.writeUInt32LE(e.size, 20)
    cd.writeUInt32LE(e.size, 24)
    cd.writeUInt16LE(e.nameBytes.length, 28)
    cd.writeUInt16LE(0, 30)             // extra
    cd.writeUInt16LE(0, 32)             // comment
    cd.writeUInt16LE(0, 34)             // disk start
    cd.writeUInt16LE(0, 36)             // int attribs
    cd.writeUInt32LE(0, 38)             // ext attribs
    cd.writeUInt32LE(e.offset, 42)
    e.nameBytes.copy(cd, 46)
    bufs.push(cd)
    offset += cd.length
  }

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(offset - cdStart, 12)
  eocd.writeUInt32LE(cdStart, 16)
  eocd.writeUInt16LE(0, 20)
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

const BUNDLED_SAMPLES = [
  'ai-ml-expanded.csv',
  'biotest-diagnostics-acronyms-expanded.csv',
  'cybersecurity-acronyms.csv',
  'software-engineering-cloud-devops-expanded.csv',
  'finance-business-intelligence-acronyms.csv',
]

const files = walkDir(distDir)
for (const name of BUNDLED_SAMPLES) {
  files.push({ full: join(root, 'samples', name), rel: name })
}
writeZip(files, outFile)
console.log(`Packaged ${files.length} files → termbox.zip`)
