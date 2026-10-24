# Firefox Add-ons (AMO) — Pre-Submission Checklist

The extension code is already Firefox-compatible — `chrome.*` is supported as an alias for `browser.*` since Firefox 109. The only difference from the Chrome build is a `browser_specific_settings` block injected into `manifest.json` at package time.

---

## 1. Build the Firefox Package

```bash
npm run package:firefox
```

This runs `npm run build` then `scripts/zip-firefox.mjs`, which:
- Zips the same `dist/` folder as the Chrome package
- Transforms `manifest.json` inside the zip (does **not** modify `dist/`):
  - Injects `browser_specific_settings.gecko`
  - Replaces `background.service_worker` with `background.scripts`
  - Removes `optional_host_permissions` (unsupported before Firefox 128)
  - Removes `minimum_chrome_version` (Chrome-only field)
  - Adds `data_collection_permissions: { required: [], optional: [] }` (required by AMO; declares no data is collected)
- Writes `termbox-firefox.zip`

The injected block:
```json
"browser_specific_settings": {
  "gecko": {
    "id": "termbox@fuvito",
    "strict_min_version": "115.0"
  }
}
```

Minimum 115 because `chrome.storage.session` (used for PIN session DEKs) landed in Firefox 115.

---

## 2. Smoke Test in Firefox

Load the **built** extension temporarily:

```
1. Open Firefox → about:debugging → This Firefox
2. Click "Load Temporary Add-on…"
3. Select termbox-firefox.zip  (Firefox accepts the zip directly)
```

Walk through these flows:

- [ ] Popup opens on first run with all 5 bundled glossaries loaded; AI / ML is the active source by default
- [ ] Search returns correct results (Term and Definition modes)
- [ ] Browse A–Z opens and shows all terms
- [ ] Add a term manually — appears in search immediately
- [ ] PIN setup, lock, unlock (this exercises `chrome.storage.session`)
- [ ] Download CSV and JSON
- [ ] Language switcher — switch to a non-English locale
- [ ] Dark mode persists after closing and reopening popup
- [ ] No console errors (`F12 → Console` while popup is open)

---

## 3. Create an AMO Developer Account

- Sign in or register at **addons.mozilla.org/developers**
- Free — no one-time fee unlike Chrome

---

## 4. Submit on AMO

Go to **Submit a New Add-on** and fill in:

### Distribution
Select **On this site (addons.mozilla.org)**

### Upload
Upload `termbox-firefox.zip`

### Source Code (required by AMO)
AMO reviewers manually audit extensions. You must provide the source so they can verify the build. Either:
- Upload a zip of the repo (`git archive HEAD -o termbox-src.zip`)
- Or provide the GitHub repo URL: `https://github.com/fuvito/termbox`

Include build instructions in the **Notes to Reviewer** field (see below).

### Notes to Reviewer
```
Build environment: Node.js 20+, npm

To reproduce the build:
  git clone https://github.com/fuvito/termbox
  cd termbox
  npm install
  npm run package:firefox
  # produces termbox-firefox.zip

The only difference from the Chrome package is browser_specific_settings injected
into manifest.json by scripts/zip-firefox.mjs at zip time. No source files are modified.

All logic runs locally. No remote code. No eval(). No external requests at runtime.
chrome.storage.session is used to hold PIN session DEKs in memory (not persisted to disk).
```

---

## 5. Store Listing Fields

### Name (up to 45 chars)
```
TermBox — Glossary & Acronym Lookup
```

### Summary (up to 250 chars)
```
Build your own glossary or acronym finder from any CSV. Instant offline lookup from the toolbar. No account needed. Supports 12 languages, PIN protection, and JSON source packs.
```

### Description
Same as the CWS detailed description in `docs/CWS-CHECKLIST.md` — paste the plain-text block from Section 7.

### Category
`Productivity`

### Privacy policy URL
```
https://github.com/fuvito/termbox/blob/main/PRIVACY.md
```

### License
`MIT License`

---

## 6. Store Assets

AMO screenshots can be the same files used for Chrome:

| Asset | File | Notes |
|---|---|---|
| Screenshots | `docs/screenshots/*.png` | At least 1 required; 1280×800 preferred |
| Icon | auto-extracted from manifest | No separate upload needed |

AMO does not use promo tiles — screenshots only.

---

## 7. Review Timeline

AMO review is **manual** (human reviewers). Expect:
- New extensions: 1–4 weeks
- Updates: a few days once trusted

After approval the extension gets a permanent AMO listing URL and users can install directly from Firefox's Add-ons Manager.
