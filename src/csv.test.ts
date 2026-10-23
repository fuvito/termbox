import { describe, it, expect } from 'vitest'
import { parseCsv, csvToTermEntries, termEntriesToCsv } from './csv'
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
