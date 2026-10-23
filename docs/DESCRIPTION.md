# TermBox — Open-Source Glossary Extension

## What it is

A free, open-source browser extension that turns any CSV file into a searchable glossary, available instantly from the browser toolbar. No accounts, no backend, no subscription.

Initial release targets Chrome and Edge. Safari and Firefox support are planned for later versions.

Anyone — a system administrator, a documentation team, an onboarding manager — loads a CSV file once, and immediately gets a fast, offline-capable term lookup tool pinned to their browser.

## Target users

- **System administrators** who maintain internal terminology or acronym lists
- **Technical writers / documentation teams** who need quick reference while writing
- **Companies and organizations** who want to distribute a searchable glossary to their team without running infrastructure
- **Individuals** who want a personal terminology reference
- **Open-source communities** who publish a glossary alongside their project

## How distribution works

- Published free on the Chrome Web Store (and as a GitHub release ZIP for manual install)
- Source code on GitHub under MIT license
- Teams distribute their glossary as a CSV file (hosted on GitHub, a company intranet, SharePoint, Dropbox, etc.)
- Users load the CSV once; the extension caches it locally and searches offline thereafter

## Key features

- Load glossary from a **local CSV file**
- **Create a glossary from scratch** — no CSV required; add terms directly in the app
- **Edit and delete individual terms** — right-click any search result to modify or remove it
- **Browse all terms A–Z** — full alphabetical list with sticky letter headers
- **PIN protection** — encrypt any source with AES-256-GCM; unlock once per browser session
- **Multiple named sources** — switch between glossaries or search across all at once
- **Fully offline** after first load — searches are instant, local
- **Search by term** or **search by definition** via a pill segment toggle
- Smart result ranking: exact → prefix → alias → substring
- **Export to CSV** — download any loaded glossary back to a file
- Acronym expansion via `full_form` column; aliases via semicolon-separated `aliases` column
- Dark mode, font size controls, resizable popup
- No auth, no tracking, no external requests

## CSV format

```csv
term,full_form,definition,domain,source_reference,aliases
PCR,Polymerase Chain Reaction,A technique used to amplify DNA,Molecular Biology,,qPCR;rt-PCR
API,Application Programming Interface,A set of rules for software communication,Software,,
```

Columns: `term` (required), `full_form`, `definition` (required), `domain`, `source_reference`, `aliases` (semicolon-separated).

## Browser support

| Browser | Status |
|---|---|
| Chrome | v1 — initial release |
| Edge | v1 — works without changes (Chromium-based) |
| Firefox | Planned — minor manifest adjustments needed |
| Safari | Planned — requires Xcode wrapper and App Store submission |

## Project name

**TermBox** — published to Chrome Web Store under this name.
