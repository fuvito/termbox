import type { TermEntry, GlossarySource, SecureSourceMeta } from './types'
import { importDekHex, encryptStr, decryptStr } from './crypto'

const SOURCES_KEY = 'termbox_sources'
const termsKey = (sourceId: string) => `termbox_terms_${sourceId}`
const encTermsKey = (sourceId: string) => `termbox_enc_terms_${sourceId}`
const secMetaKey = (sourceId: string) => `termbox_sec_meta_${sourceId}`
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

// chrome.storage.session — persists across popup open/close, cleared on browser restart
// Accessed lazily so tests can stub chrome after module load.
function getSession() {
  return (chrome.storage as unknown as { session: typeof chrome.storage.local }).session
}

function sessionGet<T>(key: string): Promise<T | undefined> {
  return new Promise(resolve => getSession().get(key, result => resolve(result[key] as T | undefined)))
}

function sessionSet(key: string, value: unknown): Promise<void> {
  return new Promise(resolve => getSession().set({ [key]: value }, resolve))
}

function sessionRemove(key: string): Promise<void> {
  return new Promise(resolve => getSession().remove(key, resolve))
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

// ── Secure source meta ────────────────────────────────────────────────────────

export async function getSecureMeta(sourceId: string): Promise<SecureSourceMeta | null> {
  return (await storageGet<SecureSourceMeta>(secMetaKey(sourceId))) ?? null
}

export async function setSecureMeta(meta: SecureSourceMeta): Promise<void> {
  await storageSet(secMetaKey(meta.sourceId), meta)
}

export async function deleteSecureMeta(sourceId: string): Promise<void> {
  await storageRemove(secMetaKey(sourceId))
}

// ── Encrypted terms ───────────────────────────────────────────────────────────

export async function getSecureTerms(sourceId: string, dekHex: string): Promise<TermEntry[]> {
  const blob = await storageGet<{ iv: string; ct: string }>(encTermsKey(sourceId))
  if (!blob) return []
  const dek = await importDekHex(dekHex)
  const json = await decryptStr(dek, blob.iv, blob.ct)
  return JSON.parse(json) as TermEntry[]
}

export async function setSecureTerms(sourceId: string, terms: TermEntry[], dekHex: string): Promise<void> {
  const dek = await importDekHex(dekHex)
  const blob = await encryptStr(dek, JSON.stringify(terms))
  await storageSet(encTermsKey(sourceId), blob)
}

export async function deleteEncryptedBlob(sourceId: string): Promise<void> {
  await storageRemove(encTermsKey(sourceId))
}

// ── Session DEK (cleared when browser closes) ─────────────────────────────────

export async function getSessionDek(sourceId: string): Promise<string | null> {
  return (await sessionGet<string>(`termbox_dek_${sourceId}`)) ?? null
}

export async function setSessionDek(sourceId: string, dekHex: string): Promise<void> {
  await sessionSet(`termbox_dek_${sourceId}`, dekHex)
}

export async function clearSessionDek(sourceId: string): Promise<void> {
  await sessionRemove(`termbox_dek_${sourceId}`)
}

// Loads terms for the active source, or merges all sources if activeId === 'all'.
// Falls back to the first source if activeId is null.
async function termsForSource(s: GlossarySource): Promise<TermEntry[]> {
  if (s.secured) {
    const dek = await getSessionDek(s.id)
    if (!dek) return []
    return getSecureTerms(s.id, dek)
  }
  return getTerms(s.id)
}

export async function loadGlossary(
  sources: GlossarySource[],
  activeId: string | 'all' | null,
): Promise<TermEntry[]> {
  if (sources.length === 0) return []
  if (activeId === 'all') {
    const all = await Promise.all(sources.map(termsForSource))
    return all.flat()
  }
  const src = sources.find(s => s.id === activeId) ?? sources[0]
  if (!src) return []
  return termsForSource(src)
}
