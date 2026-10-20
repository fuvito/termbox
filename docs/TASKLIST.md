# TermBox — Task List

## Phase 1: Project scaffold

- [ ] Create new repo / project directory (flat, not monorepo)
- [ ] `package.json` — React 18, Vite, TypeScript, @types/chrome
- [ ] `tsconfig.json` — same settings as TermUp extension
- [ ] `vite.config.ts` — dual entry (popup + background)
- [ ] `public/manifest.json` — MV3, storage + host_permissions
- [ ] `popup.html` — minimal shell
- [ ] `src/background.ts` — minimal service worker

## Phase 2: Core logic (no UI)

- [ ] `src/types.ts` — TermEntry, GlossarySource, StoredPrefs types
- [ ] `src/search.ts` — copy and adapt `rankTerms()` from TermUp
- [ ] `src/csv.ts` — CSV parser (handles quoted fields, semicolon alias splitting)
- [ ] `src/storage.ts` — CRUD for sources and term caches in chrome.storage.local

## Phase 3: Search UI

- [ ] Theme system (LIGHT/DARK constants, Theme type) — copy from TermUp popup.tsx
- [ ] `useStoredPref` hook — copy from TermUp popup.tsx
- [ ] `SearchView` component — adapt from TermUp SearchView (remove auth, use local glossary)
- [ ] Empty state when no glossary loaded ("Load a CSV to get started")
- [ ] Resize handles (bottom edge, right edge, corner) — copy from TermUp
- [ ] Font size and dark mode controls in header

## Phase 4: Source management UI

- [ ] `SourcesView` component — list loaded sources, active source selector
- [ ] Add source: file upload (FileReader API)
- [ ] Add source: URL input with fetch + parse
- [ ] Delete source
- [ ] Refresh source from URL (re-fetch and re-parse)
- [ ] Source selector: "All sources" merged search or single source
- [ ] Navigation between SearchView and SourcesView (header icon)

## Phase 5: CSV URL fetching

- [ ] Fetch URL from popup (needs `host_permissions: ["<all_urls>"]`)
- [ ] Show term count and last-loaded date per source
- [ ] Handle fetch errors (CORS, 404, timeout) with friendly messages
- [ ] Optional: auto-refresh on popup open (toggle per source)

## Phase 6: Polish

- [ ] First-run experience (no sources loaded)
- [ ] Loading states during CSV parse
- [ ] Source name auto-detected from filename or URL
- [ ] Persist last active source
- [ ] Show which source a result came from (when searching across all)

## Phase 7: Publish (Chrome)

- [ ] Write `README.md` with install instructions, CSV format docs, screenshots
- [ ] Create Chrome Web Store assets (icon 128px, screenshots)
- [ ] Submit to Chrome Web Store
- [ ] GitHub release with ZIP for manual install

## Phase 8: Additional browsers (future)

> Not in scope for v1. Design decisions in Phase 1–2 should keep this feasible.

- [ ] Firefox: add `browser_specific_settings` to manifest, test `browser.*` namespace
- [ ] Safari: run `safari-web-extension-converter` against the built `dist/`, wrap in Xcode project, submit to Mac App Store
- [ ] Edge: verify on Chrome Web Store (Edge supports Chrome extensions natively — likely zero work)
