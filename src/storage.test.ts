import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { TermEntry } from './types'
import {
  getSecureTerms,
  setSecureTerms,
  deleteEncryptedBlob,
  getSessionDek,
  setSessionDek,
  clearSessionDek,
} from './storage'
import { generateDekHex } from './crypto'

// ─── chrome mock ──────────────────────────────────────────────────────────────
// Stub chrome before any module-level code in storage.ts runs.

function makeArea() {
  const store: Record<string, unknown> = {}
  return {
    get(key: string, cb: (r: Record<string, unknown>) => void) { cb({ [key]: store[key] }) },
    set(items: Record<string, unknown>, cb: () => void) { Object.assign(store, items); cb() },
    remove(key: string, cb: () => void) { delete store[key]; cb() },
  }
}

// Install a chrome stub at module scope so storage.ts can reference it at import time.
vi.stubGlobal('chrome', { storage: { local: makeArea(), session: makeArea() } })

beforeEach(() => {
  // Fresh stores per test
  vi.stubGlobal('chrome', { storage: { local: makeArea(), session: makeArea() } })
})

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTerms(n: number): TermEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `src_${i}`,
    term: `Term ${i}`,
    fullForm: null,
    definition: `Definition ${i}`,
    domain: null,
    sourceReference: null,
    aliases: [],
    sourceId: 'src',
  }))
}

// ─── setSecureTerms / getSecureTerms ──────────────────────────────────────────

describe('setSecureTerms / getSecureTerms', () => {
  it('round-trips an array of TermEntry objects', async () => {
    const dek = generateDekHex()
    const terms = makeTerms(3)
    await setSecureTerms('src', terms, dek)
    expect(await getSecureTerms('src', dek)).toEqual(terms)
  })

  it('round-trips an empty array', async () => {
    const dek = generateDekHex()
    await setSecureTerms('src', [], dek)
    expect(await getSecureTerms('src', dek)).toEqual([])
  })

  it('returns [] when no blob is stored', async () => {
    expect(await getSecureTerms('nonexistent', generateDekHex())).toEqual([])
  })

  it('throws when decrypted with the wrong DEK', async () => {
    const dek = generateDekHex()
    const wrongDek = generateDekHex()
    await setSecureTerms('src', makeTerms(1), dek)
    await expect(getSecureTerms('src', wrongDek)).rejects.toThrow()
  })

  it('preserves all TermEntry fields through the encrypt/decrypt cycle', async () => {
    const dek = generateDekHex()
    const terms: TermEntry[] = [{
      id: 'src_0',
      term: 'PCR',
      fullForm: 'Polymerase Chain Reaction',
      definition: 'A technique to amplify DNA',
      domain: 'Molecular Biology',
      sourceReference: 'Lab Manual §3',
      aliases: ['qPCR', 'rt-PCR'],
      sourceId: 'src',
    }]
    await setSecureTerms('src', terms, dek)
    expect(await getSecureTerms('src', dek)).toEqual(terms)
  })

  it('overwrites previously stored terms', async () => {
    const dek = generateDekHex()
    await setSecureTerms('src', makeTerms(5), dek)
    const updated = makeTerms(2)
    await setSecureTerms('src', updated, dek)
    expect(await getSecureTerms('src', dek)).toEqual(updated)
  })

  it('isolates blobs by sourceId', async () => {
    const dek = generateDekHex()
    const a = makeTerms(1)
    const b = makeTerms(2)
    await setSecureTerms('source-a', a, dek)
    await setSecureTerms('source-b', b, dek)
    expect(await getSecureTerms('source-a', dek)).toEqual(a)
    expect(await getSecureTerms('source-b', dek)).toEqual(b)
  })
})

// ─── deleteEncryptedBlob ──────────────────────────────────────────────────────

describe('deleteEncryptedBlob', () => {
  it('causes getSecureTerms to return [] after deletion', async () => {
    const dek = generateDekHex()
    await setSecureTerms('src', makeTerms(3), dek)
    await deleteEncryptedBlob('src')
    expect(await getSecureTerms('src', dek)).toEqual([])
  })

  it('does not throw when the blob does not exist', async () => {
    await expect(deleteEncryptedBlob('nonexistent')).resolves.toBeUndefined()
  })
})

// ─── getSessionDek / setSessionDek / clearSessionDek ─────────────────────────

describe('session DEK storage', () => {
  it('returns null when no DEK is stored', async () => {
    expect(await getSessionDek('src')).toBeNull()
  })

  it('stores and retrieves a DEK', async () => {
    const dek = generateDekHex()
    await setSessionDek('src', dek)
    expect(await getSessionDek('src')).toBe(dek)
  })

  it('returns null after clearing', async () => {
    const dek = generateDekHex()
    await setSessionDek('src', dek)
    await clearSessionDek('src')
    expect(await getSessionDek('src')).toBeNull()
  })

  it('isolates DEKs by sourceId', async () => {
    const dek1 = generateDekHex()
    const dek2 = generateDekHex()
    await setSessionDek('src-a', dek1)
    await setSessionDek('src-b', dek2)
    expect(await getSessionDek('src-a')).toBe(dek1)
    expect(await getSessionDek('src-b')).toBe(dek2)
  })

  it('clearSessionDek only removes the specified source', async () => {
    const dek1 = generateDekHex()
    const dek2 = generateDekHex()
    await setSessionDek('src-a', dek1)
    await setSessionDek('src-b', dek2)
    await clearSessionDek('src-a')
    expect(await getSessionDek('src-a')).toBeNull()
    expect(await getSessionDek('src-b')).toBe(dek2)
  })
})
