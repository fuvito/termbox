import { describe, expect, it } from 'vitest'
import { csvToTermEntries, parseCsv, parseSourcePackJson, termEntriesToCsv, termEntriesToSourcePackJson } from './csv'
import type { TermEntry } from './types'

// ─── parseCsv ─────────────────────────────────────────────────────────────────

describe('parseCsv', () => {
  it('parses a basic CSV', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([{ a: '1', b: '2' }])
  })

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([{ a: '1', b: '2' }])
  })

  it('handles CR-only line endings', () => {
    expect(parseCsv('a,b\r1,2')).toEqual([{ a: '1', b: '2' }])
  })

  it('handles a quoted field containing a comma', () => {
    expect(parseCsv('a,b\n"1,2",3')).toEqual([{ a: '1,2', b: '3' }])
  })

  it('handles escaped double-quotes inside a quoted field', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([{ a: 'say "hi"' }])
  })

  it('handles a multi-line quoted field', () => {
    expect(parseCsv('a,b\n"line1\nline2",c')).toEqual([{ a: 'line1\nline2', b: 'c' }])
  })

  it('handles empty fields', () => {
    expect(parseCsv('a,b,c\n1,,3')).toEqual([{ a: '1', b: '', c: '3' }])
  })

  it('pads missing trailing fields with empty string', () => {
    expect(parseCsv('a,b,c\n1,2')).toEqual([{ a: '1', b: '2', c: '' }])
  })

  it('lowercases and trims header names', () => {
    const result = parseCsv(' Term , Full_Form \nAPI,Application')
    expect(Object.keys(result[0]!)).toEqual(['term', 'full_form'])
  })

  it('returns [] for an empty string', () => {
    expect(parseCsv('')).toEqual([])
  })

  it('returns [] for header-only input', () => {
    expect(parseCsv('a,b,c')).toEqual([])
  })

  it('ignores a trailing empty line', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([{ a: '1', b: '2' }])
  })

  it('parses multiple data rows', () => {
    expect(parseCsv('a,b\n1,2\n3,4')).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ])
  })

  it('strips a UTF-8 BOM from the first header (Excel export fix)', () => {
    // ﻿ is the BOM character Excel prepends to CSV exports
    const result = parseCsv('﻿term,definition\nAPI,A programming interface')
    expect(result[0]!.term).toBe('API')
  })
})

// ─── parseCsv with extractMeta ────────────────────────────────────────────────

describe('parseCsv(text, true)', () => {
  it('returns empty meta when no comment lines are present', () => {
    const { rows, meta } = parseCsv('term,definition\nAPI,desc', true)
    expect(rows).toHaveLength(1)
    expect(meta).toEqual({ author: null, url: null })
  })

  it('extracts author from a # author: comment line', () => {
    const { meta } = parseCsv('# author: Jane Doe\nterm,definition\nAPI,desc', true)
    expect(meta.author).toBe('Jane Doe')
  })

  it('extracts url from a # url: comment line', () => {
    const { meta } = parseCsv('# url: https://example.com\nterm,definition\nAPI,desc', true)
    expect(meta.url).toBe('https://example.com')
  })

  it('extracts both author and url', () => {
    const { meta } = parseCsv('# author: Alice\n# url: https://alice.dev\nterm,definition\nAPI,desc', true)
    expect(meta.author).toBe('Alice')
    expect(meta.url).toBe('https://alice.dev')
  })

  it('stops reading comments at first non-comment line', () => {
    const { rows, meta } = parseCsv('# author: Alice\nterm,definition\n# not a comment row,value\nAPI,desc', true)
    expect(meta.author).toBe('Alice')
    expect(rows).toHaveLength(2) // "# not a comment row" becomes a data row after header
  })

  it('returns empty rows and empty meta for empty input', () => {
    const { rows, meta } = parseCsv('', true)
    expect(rows).toEqual([])
    expect(meta).toEqual({ author: null, url: null })
  })

  it('returns empty rows but populated meta for comments-only input', () => {
    const { rows, meta } = parseCsv('# author: Bob', true)
    expect(rows).toEqual([])
    expect(meta.author).toBe('Bob')
  })

  it('ignores unrecognised comment keys', () => {
    const { meta } = parseCsv('# license: MIT\nterm,definition\nAPI,desc', true)
    expect(meta.author).toBeNull()
    expect(meta.url).toBeNull()
  })
})

// ─── csvToTermEntries ─────────────────────────────────────────────────────────

describe('csvToTermEntries', () => {
  const SID = 'src1'

  it('converts a row to a TermEntry', () => {
    const rows = [{ term: 'API', definition: 'A programming interface', full_form: 'Application Programming Interface', domain: 'Software', source_reference: 'RFC', aliases: '' }]
    const [entry] = csvToTermEntries(rows, SID)
    expect(entry!.term).toBe('API')
    expect(entry!.definition).toBe('A programming interface')
    expect(entry!.fullForm).toBe('Application Programming Interface')
    expect(entry!.domain).toBe('Software')
    expect(entry!.sourceReference).toBe('RFC')
    expect(entry!.sourceId).toBe(SID)
  })

  it('filters out rows with no term', () => {
    expect(csvToTermEntries([{ term: '', definition: 'Something' }], SID)).toHaveLength(0)
  })

  it('filters out rows with a whitespace-only term', () => {
    expect(csvToTermEntries([{ term: '   ', definition: 'Something' }], SID)).toHaveLength(0)
  })

  it('filters out rows with no definition', () => {
    expect(csvToTermEntries([{ term: 'API', definition: '' }], SID)).toHaveLength(0)
  })

  it('splits aliases on semicolons and trims each', () => {
    const rows = [{ term: 'PCR', definition: 'desc', aliases: 'real-time PCR ; rt-PCR ; qPCR' }]
    expect(csvToTermEntries(rows, SID)[0]!.aliases).toEqual(['real-time PCR', 'rt-PCR', 'qPCR'])
  })

  it('returns an empty aliases array when the field is blank', () => {
    const rows = [{ term: 'API', definition: 'desc', aliases: '' }]
    expect(csvToTermEntries(rows, SID)[0]!.aliases).toEqual([])
  })

  it('returns null for optional fields that are absent', () => {
    const entry = csvToTermEntries([{ term: 'API', definition: 'desc' }], SID)[0]!
    expect(entry.fullForm).toBeNull()
    expect(entry.domain).toBeNull()
    expect(entry.sourceReference).toBeNull()
  })

  it('generates IDs from sourceId and filtered row index', () => {
    const rows = [
      { term: 'A', definition: 'first' },
      { term: '', definition: 'skipped' },   // filtered out
      { term: 'B', definition: 'second' },
    ]
    const entries = csvToTermEntries(rows, SID)
    expect(entries[0]!.id).toBe('src1_0')
    expect(entries[1]!.id).toBe('src1_1')   // index in filtered array, not original
  })

  it('trims leading/trailing whitespace from term and definition', () => {
    const rows = [{ term: '  DNA  ', definition: '  Genetic material  ' }]
    const entry = csvToTermEntries(rows, SID)[0]!
    expect(entry.term).toBe('DNA')
    expect(entry.definition).toBe('Genetic material')
  })
})

// ─── termEntriesToCsv ─────────────────────────────────────────────────────────

describe('termEntriesToCsv', () => {
  const base: TermEntry = {
    id: 'src_0', term: 'API', fullForm: 'Application Programming Interface',
    definition: 'A set of rules for software communication', domain: 'Software',
    sourceReference: 'RFC 1234', aliases: ['REST API', 'Web API'], sourceId: 'src',
  }

  it('produces a CSV with a header row', () => {
    const csv = termEntriesToCsv([base])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('term,full_form,definition,domain,source_reference,aliases')
  })

  it('produces one data row per entry', () => {
    const csv = termEntriesToCsv([base, { ...base, id: 'src_1', term: 'PCR' }])
    expect(csv.split('\n')).toHaveLength(3) // header + 2 rows
  })

  it('returns header-only for an empty array', () => {
    const csv = termEntriesToCsv([])
    expect(csv).toBe('term,full_form,definition,domain,source_reference,aliases')
  })

  it('quotes fields containing commas', () => {
    const entry: TermEntry = { ...base, term: 'A, B', fullForm: null, domain: null, sourceReference: null, aliases: [] }
    const csv = termEntriesToCsv([entry])
    expect(csv.split('\n')[1]).toMatch(/^"A, B"/)
  })

  it('quotes fields containing double-quotes and doubles them', () => {
    const entry: TermEntry = { ...base, definition: 'He said "hello"', fullForm: null, domain: null, sourceReference: null, aliases: [] }
    const csv = termEntriesToCsv([entry])
    expect(csv).toContain('"He said ""hello"""')
  })

  it('quotes fields containing newlines', () => {
    const entry: TermEntry = { ...base, definition: 'line1\nline2', fullForm: null, domain: null, sourceReference: null, aliases: [] }
    const csv = termEntriesToCsv([entry])
    expect(csv).toContain('"line1\nline2"')
  })

  it('round-trips through parseCsv / csvToTermEntries', () => {
    const csv = termEntriesToCsv([base])
    const rows = parseCsv(csv)
    const [result] = csvToTermEntries(rows, 'src')
    expect(result!.term).toBe(base.term)
    expect(result!.fullForm).toBe(base.fullForm)
    expect(result!.definition).toBe(base.definition)
    expect(result!.domain).toBe(base.domain)
    expect(result!.sourceReference).toBe(base.sourceReference)
    expect(result!.aliases).toEqual(base.aliases)
  })

  it('uses semicolons to join aliases', () => {
    const csv = termEntriesToCsv([base])
    expect(csv).toContain('REST API;Web API')
  })

  it('outputs empty string for null optional fields', () => {
    const entry: TermEntry = { ...base, fullForm: null, domain: null, sourceReference: null, aliases: [] }
    const [, row] = termEntriesToCsv([entry]).split('\n')
    const fields = row!.split(',')
    expect(fields[1]).toBe('') // full_form
    expect(fields[3]).toBe('') // domain
    expect(fields[4]).toBe('') // source_reference
  })
})

// ─── termEntriesToSourcePackJson ──────────────────────────────────────────────

describe('termEntriesToSourcePackJson', () => {
  const entry: TermEntry = {
    id: 'src_0', term: 'API', fullForm: 'Application Programming Interface',
    definition: 'A set of rules for software communication', domain: 'Software',
    sourceReference: 'RFC 1234', aliases: ['REST API'], sourceId: 'src',
  }

  it('produces valid JSON with _name and terms array', () => {
    const json = termEntriesToSourcePackJson([entry], { name: 'My Glossary', author: null, authorUrl: null })
    const obj = JSON.parse(json)
    expect(obj._name).toBe('My Glossary')
    expect(Array.isArray(obj.terms)).toBe(true)
    expect(obj.terms).toHaveLength(1)
  })

  it('includes _author when provided', () => {
    const json = termEntriesToSourcePackJson([entry], { name: 'G', author: 'Alice', authorUrl: null })
    expect(JSON.parse(json)._author).toBe('Alice')
  })

  it('omits _author when null', () => {
    const json = termEntriesToSourcePackJson([entry], { name: 'G', author: null, authorUrl: null })
    expect(JSON.parse(json)._author).toBeUndefined()
  })

  it('includes _url when provided', () => {
    const json = termEntriesToSourcePackJson([entry], { name: 'G', author: null, authorUrl: 'https://example.com' })
    expect(JSON.parse(json)._url).toBe('https://example.com')
  })

  it('omits optional term fields when null/empty', () => {
    const minimal: TermEntry = { ...entry, fullForm: null, domain: null, sourceReference: null, aliases: [] }
    const obj = JSON.parse(termEntriesToSourcePackJson([minimal], { name: 'G', author: null, authorUrl: null }))
    const t = obj.terms[0]
    expect(t.full_form).toBeUndefined()
    expect(t.domain).toBeUndefined()
    expect(t.source_reference).toBeUndefined()
    expect(t.aliases).toBeUndefined()
  })

  it('produces an empty terms array for no entries', () => {
    const obj = JSON.parse(termEntriesToSourcePackJson([], { name: 'G', author: null, authorUrl: null }))
    expect(obj.terms).toEqual([])
  })

  it('round-trips through parseSourcePackJson', () => {
    const json = termEntriesToSourcePackJson([entry], { name: 'Round-trip', author: 'Bob', authorUrl: 'https://bob.dev' })
    const { terms, meta, name } = parseSourcePackJson(json)
    expect(name).toBe('Round-trip')
    expect(meta.author).toBe('Bob')
    expect(meta.url).toBe('https://bob.dev')
    expect(terms[0]!.term).toBe('API')
    expect(terms[0]!.fullForm).toBe('Application Programming Interface')
    expect(terms[0]!.aliases).toEqual(['REST API'])
  })
})

// ─── parseSourcePackJson ──────────────────────────────────────────────────────

describe('parseSourcePackJson', () => {
  const pack = JSON.stringify({
    _name: 'Test Pack',
    _author: 'Alice',
    _url: 'https://alice.dev',
    terms: [
      { term: 'API', definition: 'A programming interface', full_form: 'App. Prog. Interface', domain: 'Software', source_reference: 'RFC', aliases: ['REST API', 'Web API'] },
      { term: 'DNA', definition: 'Genetic molecule' },
    ],
  })

  it('parses name, author, and url', () => {
    const { name, meta } = parseSourcePackJson(pack)
    expect(name).toBe('Test Pack')
    expect(meta.author).toBe('Alice')
    expect(meta.url).toBe('https://alice.dev')
  })

  it('parses all term fields', () => {
    const { terms } = parseSourcePackJson(pack)
    const api = terms[0]!
    expect(api.term).toBe('API')
    expect(api.definition).toBe('A programming interface')
    expect(api.fullForm).toBe('App. Prog. Interface')
    expect(api.domain).toBe('Software')
    expect(api.sourceReference).toBe('RFC')
    expect(api.aliases).toEqual(['REST API', 'Web API'])
  })

  it('handles missing optional fields as null/empty', () => {
    const { terms } = parseSourcePackJson(pack)
    const dna = terms[1]!
    expect(dna.fullForm).toBeNull()
    expect(dna.domain).toBeNull()
    expect(dna.sourceReference).toBeNull()
    expect(dna.aliases).toEqual([])
  })

  it('accepts aliases as a semicolon-separated string', () => {
    const p = JSON.stringify({ terms: [{ term: 'X', definition: 'Y', aliases: 'a;b;c' }] })
    const { terms } = parseSourcePackJson(p)
    expect(terms[0]!.aliases).toEqual(['a', 'b', 'c'])
  })

  it('filters out rows missing term or definition', () => {
    const p = JSON.stringify({ terms: [
      { term: '', definition: 'Something' },
      { term: 'X', definition: '' },
      { term: 'Y', definition: 'Valid' },
    ] })
    const { terms } = parseSourcePackJson(p)
    expect(terms).toHaveLength(1)
    expect(terms[0]!.term).toBe('Y')
  })

  it('returns null name and empty meta when fields are absent', () => {
    const { name, meta } = parseSourcePackJson(JSON.stringify({ terms: [] }))
    expect(name).toBeNull()
    expect(meta).toEqual({ author: null, url: null })
  })

  it('throws on invalid JSON', () => {
    expect(() => parseSourcePackJson('not json')).toThrow()
  })

  it('throws when the root value is an array', () => {
    expect(() => parseSourcePackJson('[]')).toThrow('Invalid JSON: expected an object')
  })

  it('throws when terms is not an array', () => {
    expect(() => parseSourcePackJson(JSON.stringify({ terms: 'oops' }))).toThrow('Invalid JSON: missing "terms" array')
  })
})
