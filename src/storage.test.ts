import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { TermEntry, GlossarySource, SecureSourceMeta } from './types'
import {
  getSources, setSources,
  getTerms, setTerms, deleteTerms,
  getActiveSourceId, setActiveSourceId,
  getSecureMeta, setSecureMeta, deleteSecureMeta,
  getSecureTerms,
  setSecureTerms,
  deleteEncryptedBlob,
  getSessionDek,
  setSessionDek,
  clearSessionDek,
  loadGlossary,
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

// ─── getSources / setSources ──────────────────────────────────────────────────

describe('getSources / setSources', () => {
  it('returns [] when nothing is stored', async () => {
    expect(await getSources()).toEqual([])
  })

  it('round-trips an array of sources', async () => {
    const sources: GlossarySource[] = [
      { id: 'src1', name: 'Test', type: 'file', url: null, termCount: 5, lastLoaded: '2026-01-01', autoRefresh: false, secured: false, author: null, authorUrl: null },
    ]
    await setSources(sources)
    expect(await getSources()).toEqual(sources)
  })

  it('overwrites on second call', async () => {
    const a: GlossarySource[] = [{ id: 'a', name: 'A', type: 'file', url: null, termCount: 0, lastLoaded: '', autoRefresh: false, secured: false, author: null, authorUrl: null }]
    const b: GlossarySource[] = [{ id: 'b', name: 'B', type: 'file', url: null, termCount: 0, lastLoaded: '', autoRefresh: false, secured: false, author: null, authorUrl: null }]
    await setSources(a)
    await setSources(b)
    expect(await getSources()).toEqual(b)
  })
})

// ─── getTerms / setTerms / deleteTerms ────────────────────────────────────────

describe('getTerms / setTerms / deleteTerms', () => {
  it('returns [] when no terms stored', async () => {
    expect(await getTerms('nonexistent')).toEqual([])
  })

  it('round-trips terms', async () => {
    const terms = makeTerms(3)
    await setTerms('src', terms)
    expect(await getTerms('src')).toEqual(terms)
  })

  it('deleteTerms causes getTerms to return []', async () => {
    await setTerms('src', makeTerms(2))
    await deleteTerms('src')
    expect(await getTerms('src')).toEqual([])
  })
})

// ─── getActiveSourceId / setActiveSourceId ────────────────────────────────────

describe('getActiveSourceId / setActiveSourceId', () => {
  it('returns null when nothing stored', async () => {
    expect(await getActiveSourceId()).toBeNull()
  })

  it('stores and retrieves a source ID', async () => {
    await setActiveSourceId('src1')
    expect(await getActiveSourceId()).toBe('src1')
  })

  it('stores and retrieves the special "all" value', async () => {
    await setActiveSourceId('all')
    expect(await getActiveSourceId()).toBe('all')
  })

  it('stores null', async () => {
    await setActiveSourceId('src1')
    await setActiveSourceId(null)
    expect(await getActiveSourceId()).toBeNull()
  })
})

// ─── getSecureMeta / setSecureMeta / deleteSecureMeta ─────────────────────────

describe('secure meta storage', () => {
  const meta: SecureSourceMeta = {
    sourceId: 'src',
    pinSalt: 'aabbcc',
    pinEncDek: { iv: '00', ct: 'ff' },
    recoverySalt: 'ddeeff',
    recoveryEncDek: { iv: '11', ct: 'ee' },
    recoveryKeyHash: 'abcdef',
  }

  it('returns null when nothing stored', async () => {
    expect(await getSecureMeta('src')).toBeNull()
  })

  it('round-trips meta', async () => {
    await setSecureMeta(meta)
    expect(await getSecureMeta('src')).toEqual(meta)
  })

  it('deleteSecureMeta causes getSecureMeta to return null', async () => {
    await setSecureMeta(meta)
    await deleteSecureMeta('src')
    expect(await getSecureMeta('src')).toBeNull()
  })
})

// ─── loadGlossary ─────────────────────────────────────────────────────────────

describe('loadGlossary', () => {
  const makeSource = (id: string, secured = false): GlossarySource => ({
    id, name: id, type: 'file', url: null, termCount: 1, lastLoaded: '', autoRefresh: false, secured, author: null, authorUrl: null,
  })

  it('returns [] for empty sources array', async () => {
    expect(await loadGlossary([], null)).toEqual([])
  })

  it('loads terms for the active source', async () => {
    const terms = makeTerms(2)
    await setTerms('src1', terms)
    expect(await loadGlossary([makeSource('src1')], 'src1')).toEqual(terms)
  })

  it('falls back to first source when activeId is null', async () => {
    const terms = makeTerms(1)
    await setTerms('src1', terms)
    expect(await loadGlossary([makeSource('src1')], null)).toEqual(terms)
  })

  it('merges all sources when activeId is "all"', async () => {
    const a = makeTerms(1)
    const b = makeTerms(2)
    await setTerms('a', a)
    await setTerms('b', b)
    const result = await loadGlossary([makeSource('a'), makeSource('b')], 'all')
    expect(result).toHaveLength(3)
  })

  it('returns [] for a secured source with no session DEK', async () => {
    const terms = makeTerms(2)
    await setTerms('sec', terms)
    expect(await loadGlossary([makeSource('sec', true)], 'sec')).toEqual([])
  })

  it('returns decrypted terms for a secured source with a valid session DEK', async () => {
    const dek = generateDekHex()
    const terms = makeTerms(2)
    await setSecureTerms('sec', terms, dek)
    await setSessionDek('sec', dek)
    expect(await loadGlossary([makeSource('sec', true)], 'sec')).toEqual(terms)
  })
})
