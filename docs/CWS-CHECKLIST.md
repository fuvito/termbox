# Chrome Web Store — Pre-Submission Checklist

Work through every section top to bottom before hitting **Submit for review**.

---

## 1. Build & Package

```bash
npm run build          # must complete with no errors
npm run package        # produces termbox.zip
```

- [ ] Build succeeds with no TypeScript or Vite errors
- [ ] `termbox.zip` created and up to date with the current source
- [ ] Zip is under 10 MB (CWS hard limit) — check with `ls -lh termbox.zip`

---

## 2. Quality Gates

```bash
npm run typecheck      # zero errors
npm run lint           # zero errors
npm run test           # all unit tests pass
npm run test:e2e       # all E2E tests pass
npm run test:coverage  # all thresholds ≥ 90%
```

- [ ] TypeScript: clean
- [ ] Biome lint: clean
- [ ] Unit tests: 143 passing, ≥ 98% coverage
- [ ] E2E tests: 40 passing

---

## 3. Manifest Sanity Check

Open `public/manifest.json` and verify:

- [ ] `"version"` matches the intended release (e.g. `"1.0.6"`)
- [ ] `"description"` is ≤ 132 characters
- [ ] Icons listed: `"16"`, `"48"`, `"128"` — all files present in `dist/`
- [ ] Permissions: only `"storage"` declared as required
- [ ] `optional_host_permissions`: `"<all_urls>"` (reserved for future URL loading — not used at runtime)
- [ ] No `"content_scripts"` with broad match patterns
- [ ] No remote URLs in `"content_security_policy"`

---

## 4. Manual Smoke Test

Load the **built** extension (not dev server) and walk through each flow:

```
# Load dist/ as unpacked extension
1. chrome://extensions → enable Developer mode → Load unpacked → select dist/
```

- [ ] Popup opens on first run with all 5 bundled glossaries loaded (AI / ML, Biotest Diagnostics, Cybersecurity, Software Engineering & DevOps, Finance & Business Intelligence)
- [ ] AI / ML is the active source by default
- [ ] Search returns correct results in both Term and Definition modes
- [ ] Browse A–Z opens and shows all terms with letter headers
- [ ] Add a term manually — appears immediately in search
- [ ] PIN setup, lock, unlock flow works end to end
- [ ] Download CSV — file downloads and is valid
- [ ] Download JSON — file downloads and is valid
- [ ] Import a CSV file — source appears with correct term count
- [ ] Import a JSON source pack — source appears with author attribution
- [ ] Language switcher — switching to Chinese/Japanese changes all UI strings
- [ ] Dark mode toggle persists after closing and reopening popup
- [ ] About page shows version number, links work, Credits section visible (when source has author)
- [ ] No console errors (`F12 → Console` while popup is open)

---

## 5. Store Assets

All files in `docs/screenshots/`:

| Asset | File | Size | Required |
|---|---|---|---|
| Icon | `dist/icon128.png` | 128×128 | ✅ Yes |
| Small promo tile | `docs/screenshots/promo-tile-440x280.png` | 440×280 | Recommended |
| Large promo tile | `docs/screenshots/large-promo-920x680.png` | 920×680 | Recommended |
| Marquee | `docs/screenshots/marquee-promo-1400x560.png` | 1400×560 | Optional |
| Screenshots | `docs/screenshots/*.png` (8 available) | 1280×800 | At least 1 required |

- [ ] All image files exist and open correctly
- [ ] Promo images are 24-bit RGB PNG (no alpha channel) — CWS requirement

Regenerate if UI has changed since last run:
```bash
npm run screenshots    # all 8 UI screenshots
npm run promo          # 440×280 small promo tile
npm run promo:large    # 920×680 large promo tile
npm run marquee        # 1400×560 marquee
```

---

## 6. CWS Dashboard Fields

Copy-paste from the sections below or from `README.md → Chrome Web Store Listing`.

### Name (45 chars max)
```
TermBox — Glossary & Acronym Lookup
```

### Short description (132 chars max)
```
Build your own glossary or acronym finder from any CSV. Instant offline lookup from the toolbar. No account needed.
```

### Category
`Productivity`

### Language
`English`

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

All JavaScript is bundled at build time by Vite. Nothing is fetched and executed at runtime. CSV and JSON content is parsed as plain text data — never evaluated as code. No `eval()`, `new Function()`, or dynamically injected `<script>` tags.

### Homepage URL _(optional)_
```
https://fuatyazar.com/termbox
```

### Privacy policy URL
```
https://github.com/fuvito/termbox/blob/main/PRIVACY.md
```

---

## 7. Detailed Description

Paste into the CWS **"Detailed description"** field (plain text, no markdown):

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

## 8. Submit

- [ ] All sections above are checked off
- [ ] Upload `termbox.zip` as the extension package
- [ ] Upload all store assets (screenshots, promo tiles)
- [ ] Fill in all dashboard fields from Section 6 above
- [ ] Click **Submit for review**

Review typically takes 1–3 business days for a new extension.
