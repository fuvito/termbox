import { describe, it, expect } from 'vitest'
import { rankTerms } from './search'
import type { TermEntry } from './types'

function entry(term: string, overrides: Partial<Omit<TermEntry, 'term' | 'id'>> = {}): TermEntry {
  return {
    id: term,
    term,
    fullForm: null,
    definition: `Definition of ${term}`,
    domain: null,
    sourceReference: null,
    aliases: [],
    sourceId: 'src',
    ...overrides,
  }
}

// ─── rankTerms — term mode ────────────────────────────────────────────────────

describe('rankTerms (term mode)', () => {
  it('returns no results for a query shorter than 2 characters', () => {
    expect(rankTerms([entry('API')], 'a').results).toHaveLength(0)
  })

  it('returns no results for an empty query', () => {
    expect(rankTerms([entry('API')], '').results).toHaveLength(0)
  })

  it('returns no results when nothing matches', () => {
    expect(rankTerms([entry('API'), entry('DNA')], 'xyz').results).toHaveLength(0)
  })

  it('matches an exact term and sets matchType to "exact"', () => {
    const { results } = rankTerms([entry('API')], 'api')
    expect(results).toHaveLength(1)
    expect(results[0]!.matchType).toBe('exact')
  })

  it('is case-insensitive', () => {
    expect(rankTerms([entry('DNA')], 'DNA').results[0]!.matchType).toBe('exact')
    expect(rankTerms([entry('DNA')], 'dna').results[0]!.matchType).toBe('exact')
    expect(rankTerms([entry('DNA')], 'Dna').results[0]!.matchType).toBe('exact')
  })

  it('trims whitespace from the query before matching', () => {
    expect(rankTerms([entry('API')], '  api  ').results[0]!.term).toBe('API')
  })

  it('matches a term prefix and sets matchType to "prefix"', () => {
    const { results } = rankTerms([entry('CRISPR')], 'cri')
    expect(results[0]!.matchType).toBe('prefix')
  })

  it('matches a term substring', () => {
    const { results } = rankTerms([entry('CRISPR')], 'spr')
    expect(results).toHaveLength(1)
  })

  it('matches an alias prefix and sets matchType to "alias"', () => {
    const { results } = rankTerms([entry('PCR', { aliases: ['polymerase chain reaction'] })], 'poly')
    expect(results[0]!.matchType).toBe('alias')
  })

  it('matches an alias substring and sets matchType to "alias"', () => {
    const { results } = rankTerms([entry('PCR', { aliases: ['polymerase chain reaction'] })], 'chain')
    expect(results[0]!.matchType).toBe('alias')
  })

  it('ranks: exact → prefix → alias prefix → substring → alias substring', () => {
    const terms = [
      entry('rna'),                                           // exact
      entry('rnasome'),                                       // prefix
      entry('xrp', { aliases: ['rna based protein'] }),      // alias prefix (term has no 'rna')
      entry('messenger rna'),                                 // substring
      entry('xyz', { aliases: ['something with rna here'] }), // alias substring
    ]
    const { results } = rankTerms(terms, 'rna')
    expect(results.map(r => r.term)).toEqual([
      'rna',
      'rnasome',
      'xrp',
      'messenger rna',
      'xyz',
    ])
  })

  it('sets hasMore: true when total matches exceed the limit', () => {
    const terms = Array.from({ length: 12 }, (_, i) => entry(`term${i}`))
    const { hasMore, results } = rankTerms(terms, 'te', 'term', 10)
    expect(hasMore).toBe(true)
    expect(results).toHaveLength(10)
  })

  it('sets hasMore: false when total matches fit within the limit', () => {
    const { hasMore } = rankTerms([entry('test'), entry('testing')], 'test', 'term', 10)
    expect(hasMore).toBe(false)
  })
})

// ─── rankTerms — definition mode ─────────────────────────────────────────────

describe('rankTerms (definition mode)', () => {
  it('matches when the definition contains the query', () => {
    const { results } = rankTerms(
      [entry('API', { definition: 'A programming interface standard' })],
      'programming',
      'definition',
    )
    expect(results).toHaveLength(1)
  })

  it('does not match against the term name', () => {
    const { results } = rankTerms(
      [entry('API', { definition: 'An interface specification' })],
      'api',
      'definition',
    )
    expect(results).toHaveLength(0)
  })

  it('ranks definition starts-with before definition contains', () => {
    const terms = [
      entry('A', { definition: 'The process involves learning and adaptation' }),
      entry('B', { definition: 'Learning is a fundamental process' }),
    ]
    const { results } = rankTerms(terms, 'learning', 'definition')
    expect(results[0]!.term).toBe('B')  // starts with 'learning'
    expect(results[1]!.term).toBe('A')  // contains 'learning'
  })

  it('is case-insensitive in definition search', () => {
    const { results } = rankTerms(
      [entry('ML', { definition: 'Machine Learning is a subset of AI' })],
      'MACHINE',
      'definition',
    )
    expect(results).toHaveLength(1)
  })
})
