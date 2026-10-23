# TermBox — Changelog

All notable changes to this project are documented here.

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
