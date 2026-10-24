import type { TermEntry } from './types'

export interface CsvMeta {
  author: string | null
  url: string | null
}

// Minimal RFC 4180-compliant CSV parser. No external dependencies.
// Lines starting with # at the top of the file are treated as metadata comments
// in the form "# key: value" and stripped before parsing.
export function parseCsv(text: string): Record<string, string>[]
export function parseCsv(text: string, extractMeta: true): { rows: Record<string, string>[]; meta: CsvMeta }
export function parseCsv(text: string, extractMeta?: true): Record<string, string>[] | { rows: Record<string, string>[]; meta: CsvMeta } {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const meta: CsvMeta = { author: null, url: null }
  const lines = normalized.split('\n')
  let dataStart = 0
  for (const line of lines) {
    if (!line.startsWith('#')) break
    const m = line.slice(1).match(/^\s*(\w+)\s*:\s*(.+)$/)
    if (m) {
      const key = m[1].toLowerCase()
      const val = m[2].trim()
      if (key === 'author') meta.author = val
      else if (key === 'url') meta.url = val
    }
    dataStart++
  }
  const dataText = lines.slice(dataStart).join('\n')

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < dataText.length; i++) {
    const ch = dataText[i]
    if (inQuotes) {
      if (ch === '"' && dataText[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += ch
    }
  }

  // Handle last field/row (no trailing newline)
  row.push(field)
  if (row.some(f => f.trim())) rows.push(row)

  if (rows.length < 2) return extractMeta ? { rows: [], meta } : []

  const headers = rows[0].map(h => h.trim().toLowerCase())

  const result = rows.slice(1).map(r => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = r[i] ?? '' })
    return obj
  })

  return extractMeta ? { rows: result, meta } : result
}

export function termEntriesToCsv(terms: TermEntry[]): string {
  const headers = ['term', 'full_form', 'definition', 'domain', 'source_reference', 'aliases']
  const csvEscape = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
  const rows = terms.map(t =>
    [t.term, t.fullForm ?? '', t.definition, t.domain ?? '', t.sourceReference ?? '', t.aliases.join(';')]
      .map(csvEscape).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

export function csvToTermEntries(rows: Record<string, string>[], sourceId: string): TermEntry[] {
  return rows
    .filter(row => row.term?.trim() && row.definition?.trim())
    .map((row, i) => ({
      id: `${sourceId}_${i}`,
      term: row.term?.trim(),
      fullForm: row.full_form?.trim() || null,
      definition: row.definition?.trim(),
      domain: row.domain?.trim() || null,
      sourceReference: row.source_reference?.trim() || null,
      aliases: (row.aliases ?? '').split(';').map(a => a.trim()).filter(Boolean),
      sourceId,
    }))
}

export interface SourcePackJson {
  _name?: string
  _author?: string
  _url?: string
  terms: Array<{
    term: string
    full_form?: string
    definition: string
    domain?: string
    source_reference?: string
    aliases?: string | string[]
  }>
}

export function parseSourcePackJson(text: string): { terms: TermEntry[]; meta: CsvMeta; name: string | null } {
  const parsed = JSON.parse(text) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JSON: expected an object')
  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.terms)) throw new Error('Invalid JSON: missing "terms" array')
  const name = typeof obj._name === 'string' ? obj._name : null
  const meta: CsvMeta = {
    author: typeof obj._author === 'string' ? obj._author : null,
    url: typeof obj._url === 'string' ? obj._url : null,
  }
  const terms = (obj.terms as SourcePackJson['terms'])
    .filter(r => r.term?.trim() && r.definition?.trim())
    .map((r, i) => ({
      id: `json_${i}`,
      term: r.term.trim(),
      fullForm: r.full_form?.trim() || null,
      definition: r.definition.trim(),
      domain: r.domain?.trim() || null,
      sourceReference: r.source_reference?.trim() || null,
      aliases: Array.isArray(r.aliases)
        ? r.aliases.map(a => a.trim()).filter(Boolean)
        : typeof r.aliases === 'string'
          ? r.aliases.split(';').map(a => a.trim()).filter(Boolean)
          : [],
      sourceId: '',
    }))
  return { terms, meta, name }
}
