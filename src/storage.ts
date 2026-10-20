import type { TermEntry, GlossarySource } from './types'

const SOURCES_KEY = 'termbox_sources'
const termsKey = (sourceId: string) => `termbox_terms_${sourceId}`
const PREFS_KEY = 'termbox_prefs'

function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise(resolve => {
    chrome.storage.local.get(key, result => resolve(result[key] as T | undefined))
  })
}

function storageSet(key: string, value: unknown): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve))
}

function storageRemove(key: string): Promise<void> {
  return new Promise(resolve => chrome.storage.local.remove(key, resolve))
}

export async function getSources(): Promise<GlossarySource[]> {
  return (await storageGet<GlossarySource[]>(SOURCES_KEY)) ?? []
}

export async function setSources(sources: GlossarySource[]): Promise<void> {
  await storageSet(SOURCES_KEY, sources)
}

export async function getTerms(sourceId: string): Promise<TermEntry[]> {
  return (await storageGet<TermEntry[]>(termsKey(sourceId))) ?? []
}

export async function setTerms(sourceId: string, terms: TermEntry[]): Promise<void> {
  await storageSet(termsKey(sourceId), terms)
}

export async function deleteTerms(sourceId: string): Promise<void> {
  await storageRemove(termsKey(sourceId))
}

export async function getActiveSourceId(): Promise<string | 'all' | null> {
  const prefs = await storageGet<{ activeSourceId?: string | 'all' | null }>(PREFS_KEY)
  return prefs?.activeSourceId ?? null
}

export async function setActiveSourceId(id: string | 'all' | null): Promise<void> {
  const prefs = (await storageGet<Record<string, unknown>>(PREFS_KEY)) ?? {}
  await storageSet(PREFS_KEY, { ...prefs, activeSourceId: id })
}

// Loads terms for the active source, or merges all sources if activeId === 'all'.
// Falls back to the first source if activeId is null.
export async function loadGlossary(
  sources: GlossarySource[],
  activeId: string | 'all' | null,
): Promise<TermEntry[]> {
  if (sources.length === 0) return []
  if (activeId === 'all') {
    const all = await Promise.all(sources.map(s => getTerms(s.id)))
    return all.flat()
  }
  const sourceId = activeId ?? sources[0]?.id
  if (!sourceId) return []
  return getTerms(sourceId)
}
