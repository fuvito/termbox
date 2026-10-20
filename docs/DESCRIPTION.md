# TermBox — Open-Source Glossary Extension

## What it is

A free, open-source browser extension that turns any CSV file into a searchable glossary, available instantly from the browser toolbar. No accounts, no backend, no subscription.

Initial release targets Chrome. Safari and Firefox support are planned for later versions.

Anyone — a system administrator, a documentation team, an onboarding manager — pastes a CSV file path or URL, and immediately gets a fast, offline-capable term lookup tool pinned to their browser.

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
- CSV owner publishes updates; users refresh with one click

## Key features

- Load glossary from a **local CSV file** or a **remote URL**
- Multiple named sources (switch between glossaries)
- **Fully offline** after first load — searches are instant, local
- Auto-refresh from URL (manual or on popup open)
- **Search by term** or **search by definition**
- Exact → prefix → alias → substring ranking (same as TermUp)
- Dark mode, font size controls, resizable popup
- No auth, no tracking, no external requests (except explicit CSV URL fetches)

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

Working title: **TermBox**. Final name to be decided before publishing to Chrome Web Store.
