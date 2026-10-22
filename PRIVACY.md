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

TermBox makes **no network requests** during normal use. All glossary data is loaded from local files on your device.

TermBox does **not**:
- Send analytics or telemetry
- Contact any TermBox or third-party server
- Track usage or behavior
- Embed any ad or tracking SDK

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Save glossary data and preferences locally on your device |
| `optional_host_permissions: <all_urls>` | Reserved for a future URL-loading feature. Not used at runtime in the current version — no permission is ever requested or granted at install time. |

## Changes

If this policy changes, the updated version will be committed to this repository with a new date above.

## Contact

Questions? Open an issue at <https://github.com/fuvito/termbox/issues>.
