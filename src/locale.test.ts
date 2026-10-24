import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAllLocales,
  BUILTIN_LOCALES,
  getCustomLangCodes,
  getCustomStrings,
  makeT,
  normalizeLangCode,
  removeCustomPack,
  saveCustomPack,
} from './locale'

// ─── localStorage stub ────────────────────────────────────────────────────────

function makeLocalStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k in store) delete store[k] },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage())
})

// ─── normalizeLangCode ────────────────────────────────────────────────────────

describe('normalizeLangCode', () => {
  it('uppercases and pads short codes with #', () => {
    expect(normalizeLangCode('ab')).toBe('AB#')
  })

  it('truncates codes longer than 3 chars', () => {
    expect(normalizeLangCode('abcd')).toBe('ABC')
  })

  it('strips non-alphanumeric characters', () => {
    expect(normalizeLangCode('a-b!')).toBe('AB#')
  })

  it('returns ??? for empty or whitespace input', () => {
    expect(normalizeLangCode('')).toBe('???')
    expect(normalizeLangCode('   ')).toBe('???')
  })

  it('handles exactly 3 chars', () => {
    expect(normalizeLangCode('abc')).toBe('ABC')
  })
})

// ─── makeT ────────────────────────────────────────────────────────────────────

describe('makeT', () => {
  it('returns an English string for a known key', () => {
    const t = makeT('en')
    expect(t('about.title')).toBe('About')
  })

  it('substitutes {var} placeholders', () => {
    const t = makeT('en')
    expect(t('sources.allSourcesCount', { count: 5 })).toBe('(5 terms)')
  })

  it('substitutes multiple placeholders', () => {
    const t = makeT('en')
    expect(t('about.version', { v: '1.0.5' })).toBe('Version 1.0.5')
  })

  it('falls back to EN when the key is missing in the requested locale', () => {
    // Stub a custom locale that is missing a key present in EN
    saveCustomPack('TST', { 'about.title': 'Hakkında' })
    const t = makeT('TST')
    expect(t('search.placeholder')).toBe('Search terms…') // falls back to EN
  })

  it('returns the key itself when absent from both locale and EN', () => {
    const t = makeT('en')
    expect(t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('translates using a builtin locale (zh)', () => {
    const t = makeT('zh')
    expect(t('about.title')).toBe('关于')
  })

  it('leaves unresolved placeholders as-is', () => {
    const t = makeT('en')
    expect(t('about.version', {})).toBe('Version {v}')
  })
})

// ─── custom pack storage ──────────────────────────────────────────────────────

describe('saveCustomPack / getCustomStrings / getCustomLangCodes', () => {
  it('stores and retrieves a custom pack', () => {
    saveCustomPack('XYZ', { 'about.title': 'Om' })
    expect(getCustomStrings('XYZ')).toEqual({ 'about.title': 'Om' })
  })

  it('registers the code in getCustomLangCodes', () => {
    saveCustomPack('XYZ', {})
    expect(getCustomLangCodes()).toContain('XYZ')
  })

  it('does not duplicate codes on repeated saves', () => {
    saveCustomPack('XYZ', { a: '1' })
    saveCustomPack('XYZ', { a: '2' })
    expect(getCustomLangCodes().filter(c => c === 'XYZ')).toHaveLength(1)
  })

  it('returns null for an unknown code', () => {
    expect(getCustomStrings('ZZZ')).toBeNull()
  })
})

describe('removeCustomPack', () => {
  it('removes the pack and deregisters the code', () => {
    saveCustomPack('XYZ', { 'about.title': 'Om' })
    removeCustomPack('XYZ')
    expect(getCustomStrings('XYZ')).toBeNull()
    expect(getCustomLangCodes()).not.toContain('XYZ')
  })
})

// ─── getAllLocales ─────────────────────────────────────────────────────────────

describe('getAllLocales', () => {
  it('returns all builtin locale codes', () => {
    const all = getAllLocales()
    for (const code of BUILTIN_LOCALES) expect(all).toContain(code)
  })

  it('includes custom packs after they are installed', () => {
    saveCustomPack('TST', {})
    expect(getAllLocales()).toContain('TST')
  })

  it('excludes custom packs after they are removed', () => {
    saveCustomPack('TST', {})
    removeCustomPack('TST')
    expect(getAllLocales()).not.toContain('TST')
  })
})
