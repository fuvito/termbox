# TermBox — Privacy Policy

_Last updated: 2026-10-19_

## Summary

TermBox does not collect, transmit, or share any personal data. Everything stays on your device.

---

## Data storage

TermBox stores the following data **locally on your device only**, using `chrome.storage.local`:

| Data | Where | Purpose |
|---|---|---|
| Glossary terms parsed from your CSV files | Your device | Power the search feature |
| Source metadata (name, URL, term count, last loaded) | Your device | Display and manage your glossary list |
| Active source selection | Your device | Remember which glossary you last used |
| UI preferences (dark mode, font size, popup size) | Your device (`localStorage`) | Persist your display settings |

None of this data ever leaves your device.

## Network requests

TermBox makes network requests **only when you explicitly ask it to** — specifically, when you use the "Add from URL" or "Refresh" feature to load a CSV file from a URL you provide. No other network requests are made.

TermBox does **not**:
- Send analytics or telemetry
- Contact any TermBox or third-party server
- Track usage or behavior
- Embed any ad or tracking SDK

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Save glossary data and preferences locally on your device |
| `host_permissions: <all_urls>` | Allow fetching CSV files from any URL you explicitly provide in the "Add from URL" field. No background requests are made — this permission is only exercised when you initiate a URL load. |

## Changes

If this policy changes, the updated version will be committed to this repository with a new date above.

## Contact

Questions? Open an issue at <https://github.com/fuvito/termbox/issues>.
