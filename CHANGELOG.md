# TermBox — Changelog

All notable changes to this project are documented here.

---

## [1.0.5] — 2026-10-24

### Added
- **12 built-in languages** — English, German, Spanish, French, Japanese, Korean, Portuguese, Kinyarwanda, Kiswahili, Turkish, Vietnamese, Chinese (Simplified)
- **Language picker modal** — click the globe icon (🌐) in the header to switch language; replaces the old click-to-cycle button
- **Custom language pack loading** — install any language from a `.json` file; codes are normalized to 3 uppercase characters (padded with `#` if shorter)
- **Glossary source packs in JSON** — load a glossary source from a `.json` file (in addition to CSV); supports `_name`, `_author`, `_url` metadata fields
- **CSV author credits** — add `# author: Name` and `# url: https://…` comment lines at the top of a CSV file; the information is stored with the source and displayed in the About page
- **Author credits in About page** — a Credits section lists authors of loaded glossary sources and installed custom language packs
- Language packs support an `_author` field; installed custom pack authors are shown in the About page Credits section

### Changed
- About page is now scrollable when content exceeds the popup height
- Language button in header changed from cycle-click to modal picker

---

## [1.0.4] — 2026-10-23

### Added
- **Browse view** — A–Z alphabetical term list accessible from the header; sticky letter headers, click any term to copy its definition and expand aliases / source reference
- Inline delete confirmation for glossary sources — no accidental removals
- Duplicate source names are auto-disambiguated: loading the same CSV twice yields "Name" and "Name - 2", then "Name - 3", and so on

### Changed
- Icon redesigned: T inside a white box outline on the BRAND blue background — all three sizes (16 px, 48 px, 128 px) and the promo tile updated to match
- Popup root given 12 px rounded corners
- Search mode selector replaced by a pill segment toggle (Term / Definition)
- Header buttons reorganised with a visual separator between font/theme controls (A−, A+, ☾/☀) and navigation (Az, ≡, ⓘ)
- Source rows highlight on hover; clicking anywhere on the source name or term count now selects the source (previously required clicking the radio button precisely)
- Result rows in Search and Browse views animate background on hover
- About screen logo updated from "TB" text to the T-in-a-box SVG

---

## [1.0.3] — 2026-10-22

### Added
- PIN protection for any glossary source — terms are encrypted with AES-256-GCM (Web Crypto API)
- Recovery key shown once during PIN setup — use it to reset PIN if forgotten
- Unlocked state persists for the browser session; re-entry required only after browser restart
- Locked sources show a padlock screen in search; selecting, adding terms, downloading, or deleting requires the PIN

---

## [1.0.2] — 2026-10-22

### Added
- Create a glossary from scratch directly inside the extension (no CSV required)
- Add terms manually — term, full form, and definition via the Sources panel
- Copy definition to clipboard on click, with yellow highlight feedback
- Export any loaded glossary back to CSV (↓ button per source)
- Active source name shown as subtitle in the popup header
- Terms & Conditions document
- Disclaimer in About view with links to Privacy Policy and Terms & Conditions
- Edit and delete individual terms from search results via right-click context menu
- Delete confirmation dialog (no browser-native confirm)
- Restore last search query and mode when reopening the popup
- Clear search button (✕) to reset results

### Changed
- "Add from URL" button removed from Sources view (URL loading disabled for security)
- "New glossary" button moved next to "Add from file"

---

## [1.0.1] — 2026-10-21

### Added
- Biotest Diagnostics and AI/ML glossaries bundled and auto-loaded on first install
- Active source name displayed as subtitle in popup header
- CSV export — download any loaded glossary back to a CSV file
- Security notice shown when "Add from URL" is clicked

### Fixed
- Missing `getTerms` import causing CSV download to fail

---

## [1.0.0] — 2026-10-19

### Initial release
- Load glossaries from local CSV files
- Search by term or by definition
- Smart result ranking: exact → prefix → alias → substring
- Multiple named sources — search one or all at once
- Acronym expansion via `full_form` column
- Aliases support via semicolon-separated `aliases` column
- Dark mode, adjustable font size, resizable popup
- Fully offline after first load
- Chrome MV3 extension (Edge compatible out of the box)

---

## Future Releases

Planned features and improvements for upcoming versions. No timeline committed.

| Feature | Notes |
|---|---|
| Firefox support | Manifest and API adjustments for Firefox 109+ |
| Safari support | Xcode wrapper via `safari-web-extension-converter` |
