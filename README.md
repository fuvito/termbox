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

## Sample glossaries

The `samples/` folder contains ready-to-use CSV files you can load straight into TermBox.

### `biotest-diagnostics.csv`

A 67-term glossary for the in vitro diagnostics (IVD) and medical device industry, covering:

| Domain | Example terms |
|---|---|
| Molecular Biology | PCR, qPCR, ddPCR, DNA, RNA |
| Genomics | NGS, WGS, SNP |
| Immunology | ELISA, CLIA, LFA, IgG, IgM |
| Clinical Chemistry | CRP, HbA1c, troponin, LDL |
| Oncology | ctDNA, TMB, PD-L1, PSA |
| Neurology | MS, Amyloid Beta, Tau, APOE |
| Medical Imaging | MRI, CT, PET |
| Analytical / Statistics | LOD, LOQ, CV, Sensitivity, Specificity, PPV, NPV, ROC, AUC |
| Regulatory | IVD, IVDR, MDR, CE, FDA, EMA, IFU, UDI, GLP, ICH |
| Quality | SOP, CAPA, GMP, QMS, DHF, NCR, OOS |

To use it, open TermBox → **≡** → **Add from file** → select `samples/biotest-diagnostics.csv`.

---

## Installation (Chrome)

### From the Chrome Web Store _(coming soon)_

Search for **TermBox** in the [Chrome Web Store](https://chrome.google.com/webstore) and click **Add to Chrome**.

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

Then open [http://localhost:5173/popup.html](http://localhost:5173/popup.html).

> The dev server auto-opens this URL in your default browser when started.

`chrome.storage.local` is automatically replaced with a `localStorage`-backed mock, so adding sources and searching works exactly as it would in the real extension.

---

## Scripts

| Command | Description |
|---|---|
| `npm run serve` | Start Vite dev server — test in browser without installing as extension |
| `npm run dev` | Watch-build to `dist/` — reload unpacked extension in Chrome as you edit |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript type check (no emit) |
| `npm run icons` | Regenerate `public/icon16/48/128.png` from the Node.js generator script |

### Packaging for the Chrome Web Store

After `npm run build`, zip the contents of the `dist/` folder (not the folder itself):

```bash
# macOS / Linux
cd dist && zip -r ../termbox.zip . && cd ..

# Windows (PowerShell)
Compress-Archive -Path dist\* -DestinationPath termbox.zip -Force
```

Upload `termbox.zip` at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

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

- **React 19** — UI
- **TypeScript 7** — language
- **Vite 8** — bundler
- **chrome.storage.local** — persistence
- **Inline styles** — no CSS framework
- **No external runtime dependencies** beyond React

---

## Privacy

TermBox stores data only on your device. No analytics, no tracking, no external servers.
See [PRIVACY.md](PRIVACY.md) for the full policy.

---

## License

MIT — © [Fuat Yazar](https://github.com/fuvito)
