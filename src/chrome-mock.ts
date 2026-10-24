// Activates only outside a real Chrome extension context (e.g. `npm run serve`).
// Backs chrome.storage.local with localStorage and chrome.storage.session with
// an in-memory object so the popup works in a browser tab.
import type { GlossarySource } from './types'

// biome-ignore lint/suspicious/noExplicitAny: globalThis needs any to attach chrome mock
const g = globalThis as any

let _devInitResolve: () => void = () => {}
export const devInitReady = new Promise<void>(r => { _devInitResolve = r })

if (!g.chrome?.storage) {
  const PFX = '__termbox_'
  const sessionStore: Record<string, unknown> = {}

  // ?reset wipes all stored data so the next load behaves like a fresh install
  if (new URLSearchParams(location.search).has('reset')) {
    Object.keys(localStorage).filter(k => k.startsWith(PFX)).forEach(k => localStorage.removeItem(k))
    history.replaceState(null, '', location.pathname)
  }

  function makeLocalArea() {
    return {
      get(key: string, cb?: (r: Record<string, unknown>) => void) {
        let result: Record<string, unknown>
        try {
          const raw = localStorage.getItem(PFX + key)
          result = { [key]: raw !== null ? JSON.parse(raw) : undefined }
        } catch { result = {} }
        if (cb) cb(result)
        return Promise.resolve(result)
      },
      set(items: Record<string, unknown>, cb?: () => void) {
        for (const [k, v] of Object.entries(items)) {
          try { localStorage.setItem(PFX + k, JSON.stringify(v)) } catch {}
        }
        if (cb) cb()
        return Promise.resolve()
      },
      remove(key: string, cb?: () => void) {
        try { localStorage.removeItem(PFX + key) } catch {}
        if (cb) cb()
        return Promise.resolve()
      },
    }
  }

  function makeSessionArea() {
    return {
      get(key: string, cb?: (r: Record<string, unknown>) => void) {
        const result = { [key]: sessionStore[key] }
        if (cb) cb(result)
        return Promise.resolve(result)
      },
      set(items: Record<string, unknown>, cb?: () => void) {
        Object.assign(sessionStore, items)
        if (cb) cb()
        return Promise.resolve()
      },
      remove(key: string, cb?: () => void) {
        delete sessionStore[key]
        if (cb) cb()
        return Promise.resolve()
      },
    }
  }

  g.chrome = {
    storage: {
      local: makeLocalArea(),
      session: makeSessionArea(),
      onChanged: { addListener() {}, removeListener() {} },
    },
    runtime: {
      onInstalled: { addListener() {} },
      getURL(path: string) { return `/${path}` },
    },
    permissions: {
      request(_perms: object, cb: (granted: boolean) => void) { cb(true) },
      contains(_perms: object, cb: (result: boolean) => void) { cb(true) },
    },
  }

  // Mirrors background.ts onInstalled logic: load default glossaries on first visit.
  void (async () => {
    const { getSources, setActiveSourceId, setSources, setTerms } = await import('./storage')
    const existing = await getSources()
    if (existing.length > 0) { _devInitResolve(); return }

    const { csvToTermEntries, parseCsv } = await import('./csv')
    const defaults = [
      { file: 'artificial-intelligence-and-machine-learning.csv', name: 'AI / ML' },
      { file: 'biotest-diagnostics.csv', name: 'Biotest Diagnostics' },
      { file: 'cybersecurity.csv', name: 'Cybersecurity' },
      { file: 'finance-business-intelligence.csv', name: 'Finance & Business Intelligence' },
      { file: 'software-engineering-cloud-devops.csv', name: 'Software Engineering & DevOps' },
    ]
    const sources: GlossarySource[] = []
    for (const { file, name } of defaults) {
      try {
        const text = await (await fetch(g.chrome.runtime.getURL(file))).text()
        const id = crypto.randomUUID()
        const terms = csvToTermEntries(parseCsv(text), id)
        await setTerms(id, terms)
        sources.push({
          id, name, type: 'file', url: null,
          termCount: terms.length, lastLoaded: new Date().toISOString(),
          autoRefresh: false, secured: false, author: null, authorUrl: null,
        })
      } catch {}
    }
    if (sources.length > 0) {
      await setSources(sources)
      const aiMl = sources.find(s => s.name === 'AI / ML')
      if (aiMl) await setActiveSourceId(aiMl.id)
    }
    _devInitResolve()
  })()
} else {
  _devInitResolve()
}
