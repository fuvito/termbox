# TermBox — Publishing Guide

How to build, manually install, and submit TermBox to each browser store.
For day-to-day pre-submission checklists see the per-store files linked below.

---

## Manual installation (without a store)

### Chrome

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open `chrome://extensions` and enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` folder.
4. The TermBox icon appears in the toolbar.

To update after a code change: run `npm run build` again, then click the refresh icon on the extension card in `chrome://extensions`.

### Firefox

1. Build the Firefox package:
   ```bash
   npm run package:firefox
   ```
   This produces `termbox-firefox.zip`.
2. Open `about:debugging` → **This Firefox**.
3. Click **Load Temporary Add-on…** and select `termbox-firefox.zip`.
4. The TermBox icon appears in the toolbar.

> Temporary add-ons are removed when Firefox is closed. For a persistent install, submit to AMO or load an [unsigned extension](https://wiki.mozilla.org/Add-ons/Extension_Signing) in Firefox Developer Edition / Nightly.

### Edge

Edge is Chromium-based — the Chrome steps work unchanged:

1. Build: `npm run build`
2. Open `edge://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.

### Safari (future)

Safari requires an Xcode project wrapper — see the [Safari section](#safari-future) below.

---

## Chrome Web Store

### Build

```bash
npm run package
```

Runs all quality gates (`lint`, `typecheck`, `test:coverage`, `test:e2e`) then builds and zips.
Produces **`termbox.zip`** — upload this to the CWS dashboard.

### Pre-submission checklist

[docs/CWS-CHECKLIST.md](CWS-CHECKLIST.md) — work through every section before hitting Submit.

### Store listing fields

| Field | Value |
|---|---|
| **Name** (45 chars) | `TermBox — Glossary & Acronym Lookup` |
| **Short description** (132 chars) | `Build your own glossary or acronym finder from any CSV. Instant offline lookup from the toolbar. No account needed.` |
| **Category** | Productivity |
| **Language** | English |
| **Privacy policy URL** | `https://github.com/fuvito/termbox/blob/main/PRIVACY.md` |

### Single purpose statement
```
TermBox lets users load CSV files as searchable glossaries and look up terms, acronyms, and definitions from the browser toolbar.
```

### Permission justifications

| Permission | Justification |
|---|---|
| `storage` | Persists glossary sources, term data, and user preferences (dark mode, font size, popup size) locally on the user's device via `chrome.storage.local`. No data ever leaves the device. |
| `optional_host_permissions: <all_urls>` | Reserved for a future URL-loading feature. Not used at runtime in the current version — no permission is ever requested or granted. Declared so the capability can be enabled in a future update without a manifest change. |

### Remote code

**Answer: No.**

All JavaScript is bundled at build time by Vite. Nothing is fetched and executed at runtime. CSV content is treated as plain text data — parsed locally and never evaluated as code. No `eval()`, `new Function()`, or dynamically injected `<script>` tags.

### Detailed description (paste into CWS description field)

```
TermBox turns any CSV file into a fast, searchable glossary — available instantly from your browser toolbar.

Perfect for:
• Acronym lookup and abbreviation expansion
• Technical glossaries (medical, legal, engineering, AI/ML, finance)
• Team or company-specific terminology
• Any domain jargon you need close at hand

HOW IT WORKS
1. Prepare a CSV with a "term" and "definition" column (plus optional full_form, aliases, domain)
2. Load it into TermBox from a local file
3. Search instantly — no internet connection needed

KEY FEATURES
✓ Build your own custom glossary — bring any CSV or JSON source pack
✓ Create a glossary from scratch — no CSV needed, add terms directly in the app
✓ Edit and delete individual terms — right-click any result to modify or remove it
✓ Browse all terms A–Z — flip to a full alphabetical list with one tap
✓ PIN protection — encrypt any source with AES-256-GCM; unlock once per session
✓ Acronym expander — add a full_form column to expand abbreviations
✓ Aliases — one entry can match multiple names (e.g. "PCR", "qPCR", "rt-PCR")
✓ Multiple glossaries — load several sources and search across all of them
✓ Search by term name or search inside definitions
✓ Smart ranking: exact match → prefix → alias → substring
✓ Export any glossary back to CSV or JSON
✓ 12 built-in languages — English, German, Spanish, French, Japanese, Korean, Portuguese, Kinyarwanda, Kiswahili, Turkish, Vietnamese, Chinese (Simplified)
✓ Install custom language packs from a JSON file
✓ Author credits — CSV and JSON glossaries can embed author name and URL
✓ Fully offline after first load — no server, no account, no subscription
✓ Dark mode, adjustable font size, resizable popup
✓ Open source — MIT licence, code on GitHub

PRIVACY
Stores data only on your device using Chrome's local storage.
No analytics, no tracking, no external connections.
```

---

## Firefox (AMO)

### Build

```bash
npm run package:firefox
```

Builds `dist/` then injects `browser_specific_settings.gecko` into `manifest.json` inside the zip without modifying `dist/`.
Produces **`termbox-firefox.zip`** — upload this to addons.mozilla.org.

The script also transforms the manifest for Firefox compatibility:
- Replaces `background.service_worker` with `background.scripts` — Firefox < 128 doesn't support service workers in MV3; background scripts work from Firefox 109+
- Removes `optional_host_permissions` — unsupported before Firefox 128 and not used at runtime

The resulting gecko block:
```json
"browser_specific_settings": {
  "gecko": {
    "id": "termbox@fuvito",
    "strict_min_version": "115.0"
  }
}
```
Minimum 115 because `chrome.storage.session` (used for PIN session DEKs) landed in Firefox 115.

### Pre-submission checklist

[docs/AMO-CHECKLIST.md](AMO-CHECKLIST.md) — covers smoke testing, AMO account setup, source code upload, notes to reviewer, and store listing fields.

### Store listing fields

| Field | Value |
|---|---|
| **Name** (45 chars) | `TermBox — Glossary & Acronym Lookup` |
| **Summary** (250 chars) | `Build your own glossary or acronym finder from any CSV. Instant offline lookup from the toolbar. No account needed. Supports 12 languages, PIN protection, and JSON source packs.` |
| **Category** | Productivity |
| **License** | MIT License |
| **Privacy policy URL** | `https://github.com/fuvito/termbox/blob/main/PRIVACY.md` |

**Description:** same plain-text block as the Chrome description above.

### Notes to reviewer (paste into AMO submission form)

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

### Review timeline

AMO review is manual (human reviewers). Expect 1–4 weeks for new extensions, a few days for updates once trusted.

---

## Edge

Zero additional work — Edge is Chromium-based and accepts Chrome extensions directly from the Chrome Web Store. Users can also install `termbox.zip` as an unpacked extension via `edge://extensions`.

If a dedicated Edge Add-ons listing is desired in the future, the Chrome package (`termbox.zip`) can be submitted to the [Microsoft Edge Add-ons store](https://partner.microsoft.com/dashboard) without any code changes.

---

## Safari (future)

Safari requires an Xcode project wrapper generated from the extension build:

```bash
npm run build
xcrun safari-web-extension-converter dist/ --project-location . --app-name TermBox
```

This produces an Xcode project. Open it, set your Apple Developer team, build, and submit to the Mac App Store. Requires an Apple Developer account ($99/year).

No code changes are needed — the `chrome.*` namespace is fully supported in Safari 14+. The only manifest change needed is adding the Safari-specific `browser_specific_settings` block if required.

See [Apple's documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions) for the full submission process.
