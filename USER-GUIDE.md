# TermBox — User Guide

TermBox is a browser extension that turns any CSV file into a fast, searchable glossary — available instantly from your Chrome toolbar.

---

## Table of Contents

1. [Opening TermBox](#1-opening-termbox)
2. [Searching for a term](#2-searching-for-a-term)
3. [Browsing all terms A–Z](#3-browsing-all-terms-az)
4. [Loading a glossary from a CSV file](#4-loading-a-glossary-from-a-csv-file)
5. [Loading a glossary from a JSON file](#5-loading-a-glossary-from-a-json-file)
6. [Creating a glossary from scratch](#6-creating-a-glossary-from-scratch)
7. [Adding terms manually](#7-adding-terms-manually)
8. [Managing multiple sources](#8-managing-multiple-sources)
9. [PIN protection](#9-pin-protection)
10. [Exporting a glossary to CSV](#10-exporting-a-glossary-to-csv)
11. [CSV file format](#11-csv-file-format)
12. [JSON source pack format](#12-json-source-pack-format)
13. [Sample glossaries](#13-sample-glossaries)
14. [Language settings](#14-language-settings)
15. [Display settings](#15-display-settings)
16. [Tips and shortcuts](#16-tips-and-shortcuts)

---

## 1. Opening TermBox

Click the **TermBox icon** in your Chrome toolbar to open the popup. If you don't see the icon, click the puzzle piece (Extensions) icon in Chrome and pin TermBox.

TermBox comes with two built-in glossaries pre-loaded: **Biotest Diagnostics** and **AI / ML**. You can start searching immediately after installation.

---

## 2. Searching for a term

1. Type at least **2 characters** into the search box
2. Press **Enter** or click the blue search button
3. Click any result to **copy the definition to your clipboard** — a yellow highlight confirms the copy

**Search modes** — use the **Term / Definition** toggle below the search box:
- **Term** — matches the term name and its aliases
- **Definition** — searches inside definition text

**Result ranking** (best match first):
- Exact match
- Prefix match (term starts with your query)
- Alias prefix match
- Substring match
- Alias substring match

**Right-click any result** to edit or delete that term.

---

## 3. Browsing all terms A–Z

Click **Az** in the header to open the Browse view — a full alphabetical list of every term in the active glossary.

- Terms are grouped by first letter with sticky section headers
- Click any term to **copy its definition** and expand aliases and source reference
- Click the term again to collapse it
- Click **←** to return to the search view

> **Tip:** Browse is useful when you can't remember exactly what a term is called — scan the list to find it, then search for more detail.

---

## 4. Loading a glossary from a CSV file

1. Open TermBox and click **≡** (top-right) to open Glossary Sources
2. Click **+ Add from file**
3. Select a `.csv` file from your computer
4. The glossary is parsed and saved locally — it will be available offline from now on

If a glossary with the same name is already loaded, TermBox automatically appends a number to keep names unique (e.g. "Medical Terms", "Medical Terms - 2").

> **Tip:** See [section 11](#11-csv-file-format) for the expected column format, and [section 13](#13-sample-glossaries) for ready-made files you can download and load.

---

## 5. Loading a glossary from a JSON file

TermBox also accepts glossary source packs in `.json` format. The format mirrors the CSV columns but uses a structured object.

1. Open TermBox and click **≡** to open Glossary Sources
2. Click **+ Add from file**
3. Select a `.json` source pack file

See [section 12](#12-json-source-pack-format) for the full JSON format specification.

---

## 6. Creating a glossary from scratch

You don't need a CSV file to get started — you can build a glossary directly inside TermBox.

1. Open **≡ → Glossary Sources**
2. Click **+ New glossary**
3. Type a name (e.g. "My Project Terms") and press **Enter** or click **Create**
4. An empty glossary is created and set as the active source
5. Use the **+** button on the source row to start adding terms (see section 7)

---

## 7. Adding terms manually

1. In Glossary Sources, click the **+** button on any source row
2. Fill in the form at the bottom of the panel:
   - **Term** *(required)* — the word or acronym
   - **Full form** *(optional)* — the expanded form of an acronym (e.g. "Application Programming Interface" for "API")
   - **Definition** *(required)* — the explanation
3. Click **Add term** to save — the form stays open so you can keep adding
4. Click **Done** or press **Escape** when finished

---

## 8. Managing multiple sources

You can load as many glossaries as you like and switch between them.

- **Select a source** — open **≡** and click anywhere on a source row (the name, term count, or radio button)
- **Search all sources at once** — if you have more than one source, select **All sources** at the top of the list
- **Delete a source** — click **✕** on the source row, then confirm in the inline panel that appears

When searching across multiple sources, each result shows a small badge with the source name.

---

## 9. PIN protection

You can protect any glossary source with a PIN. When locked, the terms are encrypted with AES-256-GCM and cannot be read, searched, or exported without the correct PIN.

### Setting up a PIN

1. Open **≡ → Glossary Sources**
2. Click the **🔒** icon on the source row you want to protect
3. Enter a PIN (minimum 4 characters) and confirm it
4. Click **Next** — a **recovery key** is displayed
5. **Save the recovery key somewhere safe** — it is shown only once
6. Check "I've saved this recovery key" and click **Set up PIN protection**

The source is now locked. Its terms are encrypted and stored on your device.

### Unlocking a source

- Select the source in Glossary Sources — a PIN prompt appears
- Or open the search view — a locked source shows an "Enter PIN" screen
- Enter your PIN to unlock for the current browser session

Once unlocked, the source stays accessible until the browser is closed. You do not need to re-enter the PIN every time you open the popup.

### Locking and managing a protected source

Click the **🔓** icon on an unlocked source row to see these options:

| Action | Effect |
|---|---|
| **Lock now** | Immediately locks the source until the next PIN entry |
| **Remove PIN protection** | Decrypts the source permanently and removes the PIN |

### Forgotten PIN

If you forget your PIN, click **Forgot PIN?** on the PIN entry screen, then enter the recovery key you saved during setup. You will be prompted to choose a new PIN — your data is not lost.

> **Warning:** If you lose both your PIN and recovery key, the encrypted data cannot be recovered by anyone, including the author. Store the recovery key somewhere safe when it is shown.

---

## 9. Exporting a glossary to CSV

1. Open **≡ → Glossary Sources**
2. Click the **↓** button on a source row (a PIN prompt appears if the source is locked)
3. A CSV file is downloaded to your computer

The exported file uses the standard TermBox column format (`term, full_form, definition, domain, source_reference, aliases`) and can be re-imported or shared with others.

---

## 10. CSV file format

TermBox reads CSV files with the following columns:

| Column | Required | Description |
|---|---|---|
| `term` | Yes | The word or acronym |
| `full_form` | No | Expanded form (e.g. "Polymerase Chain Reaction") |
| `definition` | Yes | The definition or explanation |
| `domain` | No | Subject area tag (e.g. "Molecular Biology") |
| `source_reference` | No | Citation or reference |
| `aliases` | No | Semicolon-separated alternative names (e.g. `qPCR;rt-PCR`) |

**Notes:**
- Column header names are case-insensitive and order-independent
- Quoted fields with commas inside are supported (RFC 4180)
- Encoding must be UTF-8
- Rows where `term` or `definition` is empty are skipped

**Minimal example:**
```csv
term,definition
API,A set of rules that allows software applications to communicate
PCR,A technique used to amplify segments of DNA
```

**Full example:**
```csv
term,full_form,definition,domain,source_reference,aliases
PCR,Polymerase Chain Reaction,A technique used to amplify DNA,Molecular Biology,,qPCR;rt-PCR
API,Application Programming Interface,A set of rules for software communication,Software,,
```

---

## 11. CSV file format — author credits

You can embed author credit information at the top of a CSV file using `#`-prefixed comment lines before the header row:

```csv
# author: Jane Doe
# url: https://example.com/glossary
term,definition
API,Application Programming Interface
```

Supported keys (case-insensitive):

| Key | Description |
|---|---|
| `author` | Name of the glossary author or maintainer |
| `url` | Link to the original source or author page |

When a CSV with these credits is loaded, the author information is stored with the source and displayed in **ⓘ About → Credits**.

---

## 12. JSON source pack format

TermBox accepts glossary source packs as `.json` files with the following structure:

```json
{
  "_name": "My Glossary",
  "_author": "Jane Doe",
  "_url": "https://example.com/glossary",
  "terms": [
    {
      "term": "PCR",
      "full_form": "Polymerase Chain Reaction",
      "definition": "A technique used to amplify DNA.",
      "domain": "Molecular Biology",
      "source_reference": "NCBI",
      "aliases": ["qPCR", "rt-PCR"]
    }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `_name` | No | Source name (used as the glossary display name) |
| `_author` | No | Author credit (shown in About → Credits) |
| `_url` | No | Link to original source or author page |
| `terms` | Yes | Array of term objects |
| `terms[].term` | Yes | The word or acronym |
| `terms[].definition` | Yes | The definition |
| `terms[].full_form` | No | Expanded form of the term |
| `terms[].domain` | No | Subject area tag |
| `terms[].source_reference` | No | Citation or reference |
| `terms[].aliases` | No | Array or semicolon-separated string of alternative names |

---

## 13. Sample glossaries

The following ready-made CSV files are available to download and load into TermBox:

| File | Description |
|---|---|
| [biotest-diagnostics.csv](https://github.com/fuvito/termbox/blob/main/samples/biotest-diagnostics.csv) | IVD / medical device acronyms with expanded forms |
| [artificial-intelligence-and-machine-learning.csv](https://github.com/fuvito/termbox/blob/main/samples/artificial-intelligence-and-machine-learning.csv) | Expanded AI / ML glossary with richer definitions |
| [cybersecurity.csv](https://github.com/fuvito/termbox/blob/main/samples/cybersecurity.csv) | 674-term cybersecurity acronym glossary |
| [software-engineering-cloud-devops.csv](https://github.com/fuvito/termbox/blob/main/samples/software-engineering-cloud-devops.csv) | 528-term software engineering, cloud, and DevOps glossary |
| [finance-business-intelligence.csv](https://github.com/fuvito/termbox/blob/main/samples/finance-business-intelligence.csv) | 715-term finance and business intelligence glossary |

Download any file and load it via **≡ → Add from file**.

---

## 14. Language settings

TermBox ships with 12 built-in languages. To switch language:

1. Click the **🌐** (language) button in the header
2. Select your language from the list

### Installing a custom language pack

If your language is not in the list, you can install a language pack from a `.json` file:

1. Click **🌐** → **Install from file…**
2. Select a `.json` language pack file
3. Enter a 1–3 character code for the pack (e.g. `pl` for Polish) — shorter codes are padded with `#`
4. Click **Install**

**Language pack format:**

```json
{
  "_name": "PL",
  "_author": "Pack Author Name",
  "search.placeholder": "Szukaj terminów…",
  "about.title": "O programie",
  ...
}
```

The `_name` field is used to pre-fill the code input. The `_author` field is displayed in **ⓘ About → Credits**. All other keys are translation strings. Missing keys fall back to English.

To remove a custom language pack: click **🌐**, then click **✕** next to the pack and confirm.

---

## 15. Display settings

All settings are in the popup header bar:

| Button | Action |
|---|---|
| **A−** | Decrease font size |
| **A+** | Increase font size |
| **☾ / ☀** | Toggle dark / light mode |
| **Az** | Browse all terms A–Z |
| **≡** | Open Glossary Sources |
| **🌐** | Change language |
| **ⓘ** | Open About / legal links |

The popup can be **resized** by dragging any edge or corner.

All display preferences are saved automatically and persist across sessions.

---

## 16. Tips and shortcuts

- **Keyboard:** Press **Enter** in the search box to search; press **Escape** in any form to cancel
- **Copy on click:** Click any search result to instantly copy its definition to the clipboard
- **Edit / delete:** Right-click any search result to edit or delete that term
- **Browse:** Use the **Az** button when you can't find a term by search — scroll the full list to spot it
- **Restore search:** If you close the popup mid-search, the last query and results are restored when you reopen it — use ✕ to clear
- **Resize:** Drag the bottom, left, or right edge of the popup to resize it — the size is remembered
- **Offline:** Once a glossary is loaded, TermBox works with no internet connection
- **Font size:** If text feels too small or large, use **A−** / **A+** in the header
- **PIN session:** An unlocked source stays unlocked until the browser closes — you don't need to re-enter the PIN every time you open the popup
- **Language:** Switch language from **🌐** in the header — all UI text updates instantly

---

## Disclaimer

TermBox is not a substitute for a dedicated password manager or security tool. Do not use it to store passwords, credentials, API keys, or authentication tokens. While PIN-protected sources encrypt your glossary data using AES-256-GCM, this feature is designed to protect terminology content from casual access — not to provide the security guarantees of a purpose-built security application. See [Terms & Conditions](https://github.com/fuvito/termbox/blob/main/TERMS.md) for full details.
