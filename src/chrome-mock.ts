// Activates only outside a real Chrome extension context (e.g. `npm run serve`).
// Backs chrome.storage.local with localStorage so the popup works in a browser tab.
/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any

if (!g.chrome?.storage) {
  const PFX = '__termbox_'

  g.chrome = {
    storage: {
      local: {
        get(key: string, cb: (r: Record<string, unknown>) => void) {
          try {
            const raw = localStorage.getItem(PFX + key)
            cb({ [key]: raw !== null ? JSON.parse(raw) : undefined })
          } catch { cb({}) }
        },
        set(items: Record<string, unknown>, cb: () => void) {
          for (const [k, v] of Object.entries(items)) {
            try { localStorage.setItem(PFX + k, JSON.stringify(v)) } catch {}
          }
          cb()
        },
        remove(key: string, cb: () => void) {
          try { localStorage.removeItem(PFX + key) } catch {}
          cb()
        },
      },
    },
    runtime: { onInstalled: { addListener() {} } },
  }
}
