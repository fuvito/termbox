# TermBox — Task List

## Phase 1: Project scaffold ✓

- [x] Create new repo / project directory (flat, not monorepo)
- [x] `package.json` — React 19, Vite, TypeScript, @types/chrome
- [x] `tsconfig.json`
- [x] `vite.config.ts` — dual entry (popup + background)
- [x] `public/manifest.json` — MV3, storage permission
- [x] `popup.html` — minimal shell
- [x] `src/background.ts` — minimal service worker

## Phase 2: Core logic ✓

- [x] `src/types.ts` — TermEntry, GlossarySource, SecureSourceMeta interfaces
- [x] `src/search.ts` — `rankTerms()` with exact / prefix / alias / substring ranking
- [x] `src/csv.ts` — RFC 4180 CSV parser, `parseCsv` + `csvToTermEntries`
- [x] `src/storage.ts` — CRUD helpers for sources and terms in chrome.storage.local
- [x] `src/crypto.ts` — AES-256-GCM encryption helpers (Web Crypto API)
- [x] `src/chrome-mock.ts` — localStorage + in-memory session mock for dev server

## Phase 3: Search UI ✓

- [x] Theme system (LIGHT/DARK constants, Theme type)
- [x] `useStoredPref` hook
- [x] `SearchView` component — query input, result list, source badge on multi-source results
- [x] Empty state when no glossary loaded ("Load a CSV to get started")
- [x] Resize handles (bottom, left, right edges + corner) with persisted size
- [x] Font size and dark mode controls in header
- [x] Pill segment toggle for Term / Definition search mode
- [x] Copy definition to clipboard on click, with yellow highlight feedback
- [x] Restore last search query and mode when reopening popup
- [x] Clear search button (✕) to reset results
- [x] Edit and delete individual terms via right-click context menu
- [x] Delete confirmation dialog (inline, no browser-native confirm)
- [x] Smart result ranking: exact → prefix → alias → substring
- [x] Hover highlight on result rows

## Phase 4: Source management UI ✓

- [x] `SourcesView` component — list loaded sources, active source selector
- [x] Add source: file upload (FileReader API)
- [x] Delete source with inline confirmation (no accidental removals)
- [x] Source selector: "All sources" merged search or single source
- [x] Navigation between SearchView and SourcesView (header icon)
- [x] Active source name shown as subtitle in popup header
- [x] Hover highlight on source rows
- [x] Entire source row clickable to select (not just the radio button)
- [x] Duplicate source names auto-disambiguated: "Name", "Name - 2", "Name - 3", …
- [x] Create a glossary from scratch (no CSV required)
- [x] Add terms manually — term, full form, definition via the Sources panel
- [x] Export any loaded glossary back to CSV (↓ button per source)
- [x] PIN protection with AES-256-GCM; recovery key; session-persistent unlock
- [x] Lock / remove PIN via the 🔓 icon on an unlocked source

## Phase 5: Browse view ✓

- [x] A–Z alphabetical term list accessible from the **Az** header button
- [x] Sticky letter section headers
- [x] Click any term to copy its definition and expand aliases / source reference
- [x] Hover highlight on term rows
- [x] ← back to Search view

## Phase 6: Polish ✓

- [x] First-run experience — Biotest Diagnostics and AI/ML glossaries bundled and auto-loaded
- [x] Source name auto-detected from filename (strip `.csv`, title-case)
- [x] Persist last active source
- [x] Show which source a result came from (source badge in multi-source search)
- [x] Icon redesigned: T inside a white box outline on BRAND blue (16 px, 48 px, 128 px)
- [x] Popup root given 12 px rounded corners
- [x] Header buttons grouped with separator between font/theme and navigation controls
- [x] About screen logo updated to T-in-a-box SVG

## Phase 7: Publish (Chrome) — in progress

- [x] `README.md` with install instructions, CSV format docs, screenshots, CWS listing copy
- [x] `USER-GUIDE.md` — full 13-section end-user guide
- [x] Chrome Web Store assets (icon 128 px, promo tile 440×280, screenshots)
- [x] `PRIVACY.md`, `TERMS.md`, `CHANGELOG.md`
- [x] Quality gates passing: lint, typecheck, 99 unit tests (≥ 90% coverage), 28 E2E tests
- [x] `termbox.zip` packaging script (`npm run package`)
- [x] CWS submission prep: single purpose statement, permission justifications, remote code answer
- [ ] CWS review approved and extension published
- [ ] GitHub release with ZIP for manual install

## Future Development

> No timeline committed. Ideas and planned work for post-v1 releases.

### Browser support

| Item | Notes |
|---|---|
| Firefox support | Add `browser_specific_settings` to manifest; test `browser.*` namespace; Firefox 109+ |
| Safari support | Run `safari-web-extension-converter` against `dist/`; wrap in Xcode project; submit to Mac App Store |

### Potential features

| Item | Notes |
|---|---|
| Load glossary from URL | Was deferred from v1 for security review. Needs CORS handling, fetch error UX, and `optional_host_permissions` already declared in manifest |
| Auto-refresh from URL | Re-fetch URL sources on popup open (toggle per source) |
| Import multiple CSV files at once | Batch file picker |
| Term count badge on toolbar icon | Show total loaded terms via `chrome.action.setBadgeText` |
| Keyboard navigation in results | Arrow keys to move focus, Enter to copy |
| Fuzzy / typo-tolerant search | Levenshtein distance fallback when no ranked results found |
| Drag-to-reorder sources | Change source priority in the Sources list |
| Sync across devices | Optional `chrome.storage.sync` for source metadata (not term data — too large) |
