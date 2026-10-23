# TermBox — Privacy Policy

_Last updated: 2026-10-22_

## Summary

TermBox does not collect, transmit, or share any personal data. Everything stays on your device.

---

## Data storage

TermBox stores the following data **locally on your device only**, using `chrome.storage.local`:

| Data | Where | How stored |
|---|---|---|
| Glossary terms (plain sources) | Your device — `chrome.storage.local` | Plain JSON |
| Glossary terms (PIN-protected sources) | Your device — `chrome.storage.local` | AES-256-GCM encrypted blob; readable only with the correct PIN |
| Source metadata (name, term count, last loaded) | Your device — `chrome.storage.local` | Plain JSON |
| PIN security metadata (salt, encrypted DEK, recovery key hash) | Your device — `chrome.storage.local` | No plaintext PIN or key is ever stored |
| Session unlock key (cleared on browser close) | Your device — `chrome.storage.session` | Held in memory for the browser session only |
| Active source selection | Your device — `chrome.storage.local` | Plain JSON |
| UI preferences (dark mode, font size, popup size) | Your device — `localStorage` | Plain JSON |

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
