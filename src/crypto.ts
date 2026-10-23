const PBKDF2_ITER = 100_000

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2)
  const arr = new Uint8Array(buf)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return arr
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export function generateSaltHex(): string {
  return bytesToHex(randomBytes(16))
}

// 128-bit recovery key formatted as xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
export function generateRecoveryKey(): string {
  const hex = bytesToHex(randomBytes(16))
  return (hex.match(/.{4}/g) as string[]).join('-')
}

// 256-bit random data encryption key
export function generateDekHex(): string {
  return bytesToHex(randomBytes(32))
}

async function deriveKey(secret: string, saltHex: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITER, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const deriveKeyFromPin = (pin: string, saltHex: string): Promise<CryptoKey> => deriveKey(pin, saltHex)
export const deriveKeyFromRecoveryKey = (rk: string, saltHex: string): Promise<CryptoKey> => deriveKey(rk, saltHex)

export async function importDekHex(dekHex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', hexToBytes(dekHex), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptStr(key: CryptoKey, plaintext: string): Promise<{ iv: string; ct: string }> {
  const iv = randomBytes(12)
  const enc = new TextEncoder().encode(plaintext)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc)
  return { iv: bytesToHex(iv), ct: bytesToHex(new Uint8Array(cipher)) }
}

export async function decryptStr(key: CryptoKey, iv: string, ct: string): Promise<string> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hexToBytes(iv) }, key, hexToBytes(ct))
  return new TextDecoder().decode(plain)
}

export async function hashStr(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(hash))
}
