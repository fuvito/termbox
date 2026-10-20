# TermBox — Technical Design

## Architecture

Single Chrome MV3 extension (v1). No backend. No authentication. No external services (except explicit user-provided CSV URLs).

Safari and Firefox support is planned for later versions. To keep that feasible without rework: use `chrome.*` APIs only (both Safari 14+ and Firefox 109+ support the `chrome` namespace as an alias for `browser`), avoid any Chrome-only APIs, and keep `manifest.json` in standard WebExtensions format so it needs minimal changes per browser.

```
termbox/
  public/
    manifest.json
    icon16.png, icon48.png, icon128.png
  popup.html
  src/
    popup.tsx       — React entry point, all UI
    background.ts   — minimal service worker (required by MV3)
    types.ts        — shared TypeScript types
    search.ts       — rankTerms() local search algorithm
    csv.ts          — CSV parser
    storage.ts      — chrome.storage.local read/write helpers
  package.json
  tsconfig.json
  vite.config.ts
```

No monorepo. All code lives in one flat package. No shared workspace packages.

## Tech stack

| Concern       | Choice                              |
|---------------|-------------------------------------|
| Framework     | React 18                            |
| Language      | TypeScript 5.x                      |
| Bundler       | Vite 5 + @vitejs/plugin-react       |
| Extension API | Chrome MV3 (`@types/chrome`)        |
| Styling       | Inline styles (same as TermUp)      |
| Storage       | `chrome.storage.local`              |
| Dependencies  | React, React DOM only (no Supabase, no workspace packages) |

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "TermBox",
  "version": "0.1.0",
  "description": "Instant glossary search from any CSV file.",
  "permissions": ["storage"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "popup.html",
    "default_title": "TermBox"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

`host_permissions: ["<all_urls>"]` is needed so the popup can fetch CSV files from any URL the user provides. This is the minimal permission set; no tabs, no activeTab, no scripting.

## Data model

### TermEntry (stored in chrome.storage.local)

```typescript
interface TermEntry {
  id: string          // deterministic: `${sourceId}_${rowIndex}`
  term: string
  fullForm: string | null
  definition: string
  domain: string | null
  sourceReference: string | null
  aliases: string[]   // parsed from semicolon-separated aliases column
  sourceId: string    // which GlossarySource this came from
}
```

### GlossarySource

```typescript
interface GlossarySource {
  id: string          // uuid generated on create
  name: string        // user-provided or auto-detected from filename/URL
  type: 'file' | 'url'
  url: string | null  // only for type === 'url'
  termCount: number
  lastLoaded: string  // ISO 8601 datetime
  autoRefresh: boolean // re-fetch on popup open (URL sources only)
}
```

### Storage keys

```
termbox_sources          → GlossarySource[]
termbox_terms_{sourceId} → TermEntry[]
termbox_prefs            → { dark, fontSize, activeSourceId, size }
```

Using separate keys per source means updating one source doesn't require re-serializing all terms. Each source's terms stored as a flat array.

## CSV format

```
term,full_form,definition,domain,source_reference,aliases
```

- Column header names are case-insensitive and order-independent
- `term` and `definition` are required; all others optional
- `aliases` column: semicolon-separated values (`qPCR;rt-PCR`)
- UTF-8 encoding
- Quoted fields with commas inside are supported (standard RFC 4180)

### CSV parser (src/csv.ts)

Write a minimal parser rather than adding Papa Parse as a dependency:

```typescript
export function parseCsv(text: string): Record<string, string>[] {
  // Split lines, handle \r\n
  // Parse header row → column names (lowercased, trimmed)
  // For each data row: parse fields respecting quoted strings
  // Return array of objects keyed by header name
}

export function csvToTermEntries(
  csv: Record<string, string>[],
  sourceId: string,
): TermEntry[] {
  return csv
    .filter(row => row['term']?.trim() && row['definition']?.trim())
    .map((row, i) => ({
      id: `${sourceId}_${i}`,
      term: row['term']!.trim(),
      fullForm: row['full_form']?.trim() || null,
      definition: row['definition']!.trim(),
      domain: row['domain']?.trim() || null,
      sourceReference: row['source_reference']?.trim() || null,
      aliases: (row['aliases'] ?? '').split(';').map(a => a.trim()).filter(Boolean),
      sourceId,
    }))
}
```

## Search algorithm (src/search.ts)

Direct copy of `rankTerms()` from `C:\dev\termup\packages\domain\src\search.ts`. The function signature and logic are identical — adapt only the import types since `TermSearchResult` is replaced by `TermEntry` (add `matchType` field at search time).

Ranking tiers (term mode):
1. `exact` — term === query (case-insensitive)
2. `prefix` — term starts with query
3. `aliasPrefix` — any alias starts with query
4. `substring` — term contains query
5. `aliasSubstring` — any alias contains query

Definition mode: starts-with bucket first, then contains.

Minimum query length: 2 characters.

## UI design

### Theme

Copy exactly from TermUp `apps/extension/src/popup.tsx`:

```typescript
const BRAND = '#3B4BC8'

const LIGHT: Theme = {
  bg: '#f9fafb', surface: '#fff', border: '#e5e7eb',
  text: '#111827', secondary: '#374151', muted: '#9ca3af', primary: '#2563eb',
  inputBorder: '#d1d5db', error: '#dc2626', tag: '#eff6ff', tagText: '#2563eb',
}
const DARK: Theme = {
  bg: '#111827', surface: '#1f2937', border: '#374151',
  text: '#f9fafb', secondary: '#d1d5db', muted: '#6b7280', primary: '#60a5fa',
  inputBorder: '#4b5563', error: '#f87171', tag: '#1e3a5f', tagText: '#93c5fd',
}
```

### SearchView

Nearly identical to TermUp SearchView. Key differences:
- No auth, no sign-out button
- Header right side: `A−` `A+` `☾/☀` `≡` (settings icon)
- When no sources loaded: show "Load a CSV to get started" with a button that opens SourcesView
- When sources loaded but none selected: allow "All sources" merged search
- `glossary` state comes from `chrome.storage.local` (loaded on mount), not from API sync

### SourcesView

Replaces the auth screens. Accessible via `≡` icon in header.

Layout:
- Header: back arrow + "Glossary Sources" title
- List of loaded sources (name, term count, last loaded, refresh button, delete button)
- "Add from file" button (opens file picker)
- "Add from URL" button (opens URL input inline)
- Source item shows: name, `N terms`, `loaded X ago`, refresh icon (URL only), trash icon

### Navigation (app screens)

```typescript
type Screen = 'search' | 'sources' | 'add_url'
```

No routing library — simple `useState<Screen>`.

### Resize behavior

Copy exactly from TermUp: custom drag handles on right edge, bottom edge, and bottom-right corner. Persist size in `localStorage` via `useStoredPref`.

### useStoredPref hook

Copy exactly from TermUp `apps/extension/src/popup.tsx`:

```typescript
function useStoredPref<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) return JSON.parse(stored) as T
    } catch {}
    return defaultValue
  })
  const set = useCallback((v: T) => {
    setValue(v)
    try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
  }, [key])
  return [value, set]
}
```

## Loading CSV from file

```typescript
function loadFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target!.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file, 'utf-8')
  })
}
```

Auto-detect source name from `file.name` (strip `.csv` extension).

## Loading CSV from URL

```typescript
async function loadFromUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}
```

Fetch runs in the popup context. Requires `host_permissions: ["<all_urls>"]`. If the server doesn't send CORS headers, the request will fail — show a helpful error: "The server at this URL doesn't allow cross-origin access. Try hosting the CSV on GitHub (raw.githubusercontent.com), Gist, or a CORS-enabled server."

## vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": false,
    "types": ["vite/client", "chrome"]
  },
  "include": ["src", "popup.html"]
}
```

## package.json

```json
{
  "name": "termbox",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.275",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

## Key decisions

| Decision | Choice | Reason |
|---|---|---|
| No Papa Parse | Custom CSV parser | Zero extra deps; CSV format is simple |
| `host_permissions: <all_urls>` | Yes | Needed for arbitrary user-provided URLs; users can audit source |
| Multiple sources | Yes | Single source is limiting; merged search across all sources is more useful |
| No auto-refresh on open | Off by default | Avoid surprising network requests; user can toggle per source |
| Inline styles | Yes | Same as TermUp; no Tailwind needed for a small extension |
| No content script | No | No page injection needed; purely a popup tool |
| `chrome.*` namespace only | Yes | Safari 14+ and Firefox 109+ both alias `chrome` → `browser`; avoids a polyfill dep and keeps Safari/Firefox porting to manifest-only changes |
