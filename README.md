# TermBox

A free, open-source browser extension that turns any CSV file into a searchable glossary, available instantly from the browser toolbar.

No accounts. No backend. No subscription. Works fully offline after the first load.

---

## Features

- Load a glossary from a **local CSV file** or a **remote URL**
- **Multiple named sources** — switch between glossaries or search across all at once
- **Fully offline** after first load — instant local search
- **Search by term** or **search by definition**
- Smart result ranking: exact → prefix → alias → substring
- Dark mode, font size controls, resizable popup
- Auto-refresh from URL (per source toggle)
- No tracking, no external requests (except explicit CSV URL fetches you initiate)

## Browser support

| Browser | Status |
|---|---|
| Chrome | v1 — initial release |
| Edge | v1 — works without changes (Chromium-based) |
| Firefox | Planned |
| Safari | Planned |

---

## CSV format

```csv
term,full_form,definition,domain,source_reference,aliases
PCR,Polymerase Chain Reaction,A technique used to amplify DNA,Molecular Biology,,qPCR;rt-PCR
API,Application Programming Interface,A set of rules for software communication,Software,,
```

| Column | Required | Notes |
|---|---|---|
| `term` | Yes | The term or acronym |
| `full_form` | No | Expanded form of the term |
| `definition` | Yes | The definition |
| `domain` | No | Subject area tag |
| `source_reference` | No | Citation or reference |
| `aliases` | No | Semicolon-separated alternative names |

- Column header names are **case-insensitive** and **order-independent**
- Quoted fields with commas inside are supported (RFC 4180)
- Encoding: UTF-8

---

## Installation (Chrome)

### From source (manual)

1. Clone the repo and build:
   ```bash
   git clone https://github.com/fuvito/termbox.git
   cd termbox
   npm install
   npm run build
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `dist/` folder
5. The TermBox icon appears in your toolbar — click it to open

To update after a `git pull`, run `npm run build` again and click the refresh icon on the extension card in `chrome://extensions`.

---

## Running locally (browser dev server)

You can develop and test the popup in a regular browser tab — no extension install needed.

```bash
npm install
npm run serve
```

Then open [http://localhost:5173](http://localhost:5173).

`chrome.storage.local` is automatically replaced with a `localStorage`-backed mock, so adding sources and searching works exactly as it would in the real extension.

---

## Scripts

| Command | Description |
|---|---|
| `npm run serve` | Start Vite dev server — test in browser without installing as extension |
| `npm run dev` | Watch-build to `dist/` — reload unpacked extension in Chrome as you edit |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript type check (no emit) |

---

## Project structure

```
termbox/
  public/
    manifest.json       Chrome MV3 manifest
  src/
    popup.tsx           React UI — SearchView, SourcesView, App
    background.ts       Minimal MV3 service worker
    types.ts            TermEntry, GlossarySource interfaces
    search.ts           rankTerms() search algorithm
    csv.ts              RFC 4180 CSV parser
    storage.ts          chrome.storage.local helpers
    chrome-mock.ts      localStorage mock for dev server
  popup.html            Extension popup shell
  vite.config.ts        Dual entry (popup + background)
  tsconfig.json
  package.json
```

---

## Tech stack

- **React 18** — UI
- **TypeScript 5** — language
- **Vite 5** — bundler
- **chrome.storage.local** — persistence
- **Inline styles** — no CSS framework
- **No external runtime dependencies** beyond React

---

## License

MIT
