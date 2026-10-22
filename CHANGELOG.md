# TermBox — Changelog

All notable changes to this project are documented here.

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
| PIN / password lock with client-side encryption | Encrypt stored glossary data using AES-256-GCM (Web Crypto API) so only the user can access it after entering a PIN. Protects against casual snooping; not a substitute for a dedicated password manager. |
| Firefox support | Manifest and API adjustments for Firefox 109+ |
| Safari support | Xcode wrapper via `safari-web-extension-converter` |
| Edit / delete individual terms | Modify or remove a single term from a manually created glossary without deleting the whole source |
