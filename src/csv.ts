import type { TermEntry } from './types'

// Minimal RFC 4180-compliant CSV parser. No external dependencies.
export function parseCsv(text: string): Record<string, string>[] {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    if (inQuotes) {
      if (ch === '"' && normalized[i + 1] === '"') {
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

  if (rows.length < 2) return []

  const headers = rows[0].map(h => h.trim().toLowerCase())

  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })
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
