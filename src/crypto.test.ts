import { describe, expect, it } from 'vitest'
import {
  decryptStr,
  deriveKeyFromPin,
  deriveKeyFromRecoveryKey,
  encryptStr,
  generateDekHex,
  generateRecoveryKey,
  generateSaltHex,
  hashStr,
} from './crypto'

// ─── generators ───────────────────────────────────────────────────────────────

describe('generateSaltHex', () => {
  it('returns a 32-character hex string (16 bytes)', () => {
    expect(generateSaltHex()).toMatch(/^[0-9a-f]{32}$/)
  })

  it('produces different values on successive calls', () => {
    expect(generateSaltHex()).not.toBe(generateSaltHex())
  })
})

describe('generateRecoveryKey', () => {
  it('matches the xxxx-xxxx-…-xxxx format (8 groups of 4 hex chars)', () => {
    expect(generateRecoveryKey()).toMatch(/^([0-9a-f]{4}-){7}[0-9a-f]{4}$/)
  })

  it('produces different values on successive calls', () => {
    expect(generateRecoveryKey()).not.toBe(generateRecoveryKey())
  })
})

describe('generateDekHex', () => {
  it('returns a 64-character hex string (32 bytes / 256 bits)', () => {
    expect(generateDekHex()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different values on successive calls', () => {
    expect(generateDekHex()).not.toBe(generateDekHex())
  })
})

// ─── encrypt / decrypt round-trip ─────────────────────────────────────────────

describe('encryptStr / decryptStr', () => {
  it('round-trips plaintext using a PIN-derived key', async () => {
    const salt = generateSaltHex()
    const key = await deriveKeyFromPin('1234', salt)
    const { iv, ct } = await encryptStr(key, 'hello world')
    expect(await decryptStr(key, iv, ct)).toBe('hello world')
  })

  it('round-trips plaintext using a recovery-key-derived key', async () => {
    const salt = generateSaltHex()
    const rk = generateRecoveryKey()
    const key = await deriveKeyFromRecoveryKey(rk, salt)
    const { iv, ct } = await encryptStr(key, 'secret glossary')
    expect(await decryptStr(key, iv, ct)).toBe('secret glossary')
  })

  it('round-trips an empty string', async () => {
    const key = await deriveKeyFromPin('0000', generateSaltHex())
    const { iv, ct } = await encryptStr(key, '')
    expect(await decryptStr(key, iv, ct)).toBe('')
  })

  it('round-trips a JSON blob', async () => {
    const payload = JSON.stringify([{ id: '1', term: 'API', definition: 'A contract' }])
    const key = await deriveKeyFromPin('abcd', generateSaltHex())
    const { iv, ct } = await encryptStr(key, payload)
    expect(await decryptStr(key, iv, ct)).toBe(payload)
  })

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const key = await deriveKeyFromPin('1234', generateSaltHex())
    const a = await encryptStr(key, 'same')
    const b = await encryptStr(key, 'same')
    expect(a.ct).not.toBe(b.ct)
    expect(a.iv).not.toBe(b.iv)
  })

  it('throws when decrypted with the wrong key', async () => {
    const salt = generateSaltHex()
    const rightKey = await deriveKeyFromPin('correct', salt)
    const wrongKey = await deriveKeyFromPin('wrong', salt)
    const { iv, ct } = await encryptStr(rightKey, 'secret')
    await expect(decryptStr(wrongKey, iv, ct)).rejects.toThrow()
  })

  it('throws when decrypted with a key from a different salt', async () => {
    const key1 = await deriveKeyFromPin('1234', generateSaltHex())
    const key2 = await deriveKeyFromPin('1234', generateSaltHex())
    const { iv, ct } = await encryptStr(key1, 'secret')
    await expect(decryptStr(key2, iv, ct)).rejects.toThrow()
  })
})

// ─── hashStr ──────────────────────────────────────────────────────────────────

describe('hashStr', () => {
  it('returns a 64-character hex string (SHA-256)', async () => {
    expect(await hashStr('anything')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', async () => {
    expect(await hashStr('hello')).toBe(await hashStr('hello'))
  })

  it('produces different hashes for different inputs', async () => {
    expect(await hashStr('abc')).not.toBe(await hashStr('abd'))
  })

  it('matches the known SHA-256 of "termbox"', async () => {
    // pre-computed: echo -n "termbox" | sha256sum
    expect(await hashStr('termbox')).toBe(
      'ffece359a1213a3a14ad949d8c73f7df1abf4216776ddf34be137f360b6dc19a',
    )
  })
})
