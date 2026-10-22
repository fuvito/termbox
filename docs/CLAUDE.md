# TermBox — Instructions for Claude

## What this project is

A standalone Chrome MV3 extension (v1) that lets anyone load a CSV glossary (from a local file or a URL) and search it instantly from the browser toolbar. No backend, no auth, no accounts. Open-source and free.

Safari and Firefox support is planned after v1. Write the code with that in mind: use `chrome.*` APIs only (both Safari 14+ and Firefox 109+ support the `chrome` namespace as an alias), avoid any Chrome-specific APIs, and keep `manifest.json` in standard WebExtensions format. The only file that will need changes per browser is `manifest.json`.

This project does NOT live inside the TermUp monorepo. It is a separate flat project with no workspace dependencies. Create it in a new directory (e.g. `C:\dev\termbox` or wherever the user specifies).

Read `DESCRIPTION.md`, `TASKLIST.md`, and `TECHNICAL_DESIGN.md` in this same folder before starting. Those files contain the full spec.

---

## Source code to reuse from TermUp

The TermUp project lives at `C:\dev\termup`. The following pieces should be **copied and adapted** (not imported) into the new project.

### 1. Theme system — copy verbatim

From `C:\dev\termup\apps\extension\src\popup.tsx` lines 18–37:

```typescript
type Theme = {
  bg: string; surface: string; border: string
  text: string; secondary: string; muted: string; primary: string
  inputBorder: string; error: string; tag: string; tagText: string
}

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

### 2. useStoredPref hook — copy verbatim

From `C:\dev\termup\apps\extension\src\popup.tsx` lines 47–63:

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

### 3. rankTerms function — adapt from search.ts

Reference: `C:\dev\termup\packages\domain\src\search.ts`

Adapt the function to use the local `TermEntry` type instead of `TermSearchResult`. The logic is identical. The input array items will have `matchType` set at search time (input matchType is ignored since it's overwritten).

```typescript
// src/search.ts
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
```

### 4. Resize handles — copy from SearchView

From `C:\dev\termup\apps\extension\src\popup.tsx` lines 483–505 (the `makeResizer` function and the three handle divs). The size state uses `useStoredPref<{w,h}>('pref_size', { w: 360, h: defaultH })`. Also copy the `useEffect` that syncs `document.body.style.width = size.w + 'px'`.

### 5. Result list rendering

From `C:\dev\termup\apps\extension\src\popup.tsx` lines 614–658. The result item structure (term bold, fullForm secondary, domain tag, definition) is identical. Adapt field names from `TermSearchResult` to `TermEntry` (they're the same fields).

### 6. Header with controls

The header from SearchView (lines 521–535): blue BRAND background, "TermBox" title, A− A+ dark-mode toggle. Replace the sign-out button with a `≡` settings icon button that navigates to SourcesView.

### 7. Search panel

From SearchView lines 537–581: input + blue search button + radio buttons for Term/Definition mode. Copy exactly.

---

## Types to define (src/types.ts)

```typescript
export interface TermEntry {
  id: string            // `${sourceId}_${rowIndex}`
  term: string
  fullForm: string | null
  definition: string
  domain: string | null
  sourceReference: string | null
  aliases: string[]
  sourceId: string
}

export interface GlossarySource {
  id: string            // crypto.randomUUID()
  name: string
  type: 'file' | 'url'
  url: string | null
  termCount: number
  lastLoaded: string    // ISO 8601
  autoRefresh: boolean
}
```

---

## Storage helpers (src/storage.ts)

```typescript
const SOURCES_KEY = 'termbox_sources'
const termsKey = (sourceId: string) => `termbox_terms_${sourceId}`
const PREFS_KEY = 'termbox_prefs'

// Sources
export async function getSources(): Promise<GlossarySource[]>
export async function setSources(sources: GlossarySource[]): Promise<void>

// Terms per source
export async function getTerms(sourceId: string): Promise<TermEntry[]>
export async function setTerms(sourceId: string, terms: TermEntry[]): Promise<void>
export async function deleteTerms(sourceId: string): Promise<void>

// Active source preference
export async function getActiveSourceId(): Promise<string | 'all' | null>
export async function setActiveSourceId(id: string | 'all' | null): Promise<void>

// Load all terms (merged, or just one source)
export async function loadGlossary(
  sources: GlossarySource[],
  activeId: string | 'all' | null,
): Promise<TermEntry[]>
```

`loadGlossary` loads terms for the active source, or merges all sources if `activeId === 'all'`.

---

## CSV parser (src/csv.ts)

Write a minimal RFC 4180-compliant parser. No external dependencies.

```typescript
export function parseCsv(text: string): Record<string, string>[]
export function csvToTermEntries(rows: Record<string, string>[], sourceId: string): TermEntry[]
```

Column names are lowercased and trimmed. Aliases split by `;`. Skip rows where `term` or `definition` is empty.

Auto-detect source name from filename: strip `.csv` extension, title-case.

---

## App screens and navigation

```typescript
type Screen = 'search' | 'sources'

function App() {
  const [screen, setScreen] = useState<Screen>('search')
  // ...
}
```

SearchView receives `onOpenSources: () => void` prop (triggered by `≡` button).
SourcesView receives `onBack: () => void` prop.

---

## SearchView behavior changes vs TermUp

1. No auth — no sign-in screens, no token handling
2. On mount: load `glossary` from `chrome.storage.local` synchronously (no network)
3. After load: if `autoRefresh === true` for any URL source, re-fetch those in background
4. If no sources exist: show empty state with "Load a CSV to get started" + button
5. The `≡` icon in header goes to SourcesView instead of sign-out
6. Search is synchronous — `rankTerms(glossary, query, mode)` — no loading spinner needed
7. When searching across multiple sources, each result has a small source-name badge

---

## SourcesView

- Header: `←` back + "Glossary Sources" title (in BRAND blue)
- Source list item: source name, `N terms`, `loaded X ago`, refresh icon (URL only), delete icon
- "All sources" toggle at top (if multiple sources exist)
- Two add buttons at bottom: "Add from file" and "Add from URL"
- File picker: `<input type="file" accept=".csv">` hidden, triggered by button click
- URL input: shows inline text field + "Load" button when "Add from URL" is clicked

---

## Manifest (public/manifest.json)

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

---

## Build and test

```bash
npm install
npm run build
# Load dist/ folder as unpacked extension in chrome://extensions
npm run dev    # watch mode for development
npm run typecheck
```

---

## Future browser support (not in v1 scope)

Safari and Firefox are planned after Chrome v1 ships. Write code now so that porting later requires only manifest changes:

- Use `chrome.*` namespace throughout — both Safari 14+ (WebKit) and Firefox 109+ accept `chrome` as an alias for `browser`. No polyfill needed.
- Do not use any Chrome-only APIs (e.g. `chrome.action.setBadgeText` without a fallback).
- Keep `manifest.json` in standard WebExtensions format. Per-browser additions needed later:
  - **Firefox**: add `"browser_specific_settings": { "gecko": { "id": "termbox@<domain>", "strict_min_version": "109.0" } }`
  - **Safari**: run `xcrun safari-web-extension-converter dist/ --project-location . --app-name TermBox` to generate an Xcode project, then submit to Mac App Store (requires Apple Developer account)
  - **Edge**: zero work — it is Chromium-based and accepts Chrome extensions from the Chrome Web Store

## What NOT to do

- Do not create a monorepo or add workspace packages
- Do not add Supabase or any auth
- Do not add a backend or any server-side code
- Do not add Tailwind or any CSS framework
- Do not import from `@termup/*` packages — copy the code inline
- Do not use `next lint` or any Next.js tooling
- Do not add Papa Parse or other CSV parsing libraries — write the parser inline

---

## Changelog Rules

- Keep `CHANGELOG.md` (in the project root, next to `PRIVACY.md` and `TERMS.md`) up to date with every release.
- Add a new `## [x.y.z] — YYYY-MM-DD` section at the top whenever the version is bumped.
- Only include major or user-facing changes: new features, behaviour changes, removals, and bug fixes. Do not log internal refactors or documentation-only edits unless they affect users.

---

## Git Commit Rules

- Do not append "Co-Authored-By" or any other AI attribution trailers to git commit messages. Keep commit messages clean and strictly human-authored in format.

---

## Final notes

- Project name is "TermBox" (working title). Ask the user if they want to change it before publishing.
- The icon (16/48/128px) needs to be created. Use a simple placeholder or ask the user.
- The CSV column `aliases` uses `;` as separator (not `,`) to avoid conflicts with CSV comma delimiter.
- View log: the extension does NOT log views (no backend to send to). Remove that code from the result click handler.
