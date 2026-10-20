import type { TermEntry } from './types'

export type SearchResult = TermEntry & { matchType: 'exact' | 'prefix' | 'alias' }

export function rankTerms(
  terms: TermEntry[],
  query: string,
  mode: 'term' | 'definition' = 'term',
  limit = 10,
): { results: SearchResult[]; hasMore: boolean } {
  const normalized = query.trim().toLowerCase()
  if (normalized.length < 2) return { results: [], hasMore: false }

  let all: SearchResult[]

  if (mode === 'definition') {
    const starts: SearchResult[] = []
    const contains: SearchResult[] = []
    for (const t of terms) {
      const def = t.definition.toLowerCase()
      if (def.startsWith(normalized)) starts.push({ ...t, matchType: 'prefix' })
      else if (def.includes(normalized)) contains.push({ ...t, matchType: 'prefix' })
    }
    all = [...starts, ...contains]
  } else {
    const exact: SearchResult[] = []
    const prefix: SearchResult[] = []
    const aliasPrefix: SearchResult[] = []
    const substring: SearchResult[] = []
    const aliasSubstring: SearchResult[] = []

    for (const t of terms) {
      const termLower = t.term.toLowerCase()
      const aliasesLower = t.aliases.map(a => a.toLowerCase())

      if (termLower === normalized) {
        exact.push({ ...t, matchType: 'exact' })
      } else if (termLower.startsWith(normalized)) {
        prefix.push({ ...t, matchType: 'prefix' })
      } else if (aliasesLower.some(a => a.startsWith(normalized))) {
        aliasPrefix.push({ ...t, matchType: 'alias' })
      } else if (termLower.includes(normalized)) {
        substring.push({ ...t, matchType: 'prefix' })
      } else if (aliasesLower.some(a => a.includes(normalized))) {
        aliasSubstring.push({ ...t, matchType: 'alias' })
      }
    }

    all = [...exact, ...prefix, ...aliasPrefix, ...substring, ...aliasSubstring]
  }

  return { results: all.slice(0, limit), hasMore: all.length > limit }
}
