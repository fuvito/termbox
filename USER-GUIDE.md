# TermBox — User Guide

TermBox is a browser extension that turns any CSV file into a fast, searchable glossary — available instantly from your Chrome toolbar.

---

## Table of Contents

1. [Opening TermBox](#1-opening-termbox)
2. [Searching for a term](#2-searching-for-a-term)
3. [Loading a glossary from a CSV file](#3-loading-a-glossary-from-a-csv-file)
4. [Creating a glossary from scratch](#4-creating-a-glossary-from-scratch)
5. [Adding terms manually](#5-adding-terms-manually)
6. [Managing multiple sources](#6-managing-multiple-sources)
7. [Exporting a glossary to CSV](#7-exporting-a-glossary-to-csv)
8. [CSV file format](#8-csv-file-format)
9. [Sample glossaries](#9-sample-glossaries)
10. [Display settings](#10-display-settings)
11. [Tips and shortcuts](#11-tips-and-shortcuts)

---

## 1. Opening TermBox

Click the **TermBox icon** in your Chrome toolbar to open the popup. If you don't see the icon, click the puzzle piece (Extensions) icon in Chrome and pin TermBox.

TermBox comes with two built-in glossaries pre-loaded: **Biotest Diagnostics** and **AI / ML**. You can start searching immediately after installation.

---

## 2. Searching for a term

1. Type at least **2 characters** into the search box
2. Press **Enter** or click the blue search button
3. Click any result to **copy the definition to your clipboard** — a yellow highlight confirms the copy

**Search modes** — use the radio buttons below the search box:
- **Search by Term** — matches the term name and its aliases
- **Search by Definition** — searches inside definition text

**Result ranking** (best match first):
- Exact match
- Prefix match (term starts with your query)
- Alias prefix match
- Substring match
- Alias substring match

---

## 3. Loading a glossary from a CSV file

1. Open TermBox and click **≡** (top-right) to open Glossary Sources
2. Click **+ Add from file**
3. Select a `.csv` file from your computer
4. The glossary is parsed and saved locally — it will be available offline from now on

> **Tip:** See [section 8](#8-csv-file-format) for the expected column format, and [section 9](#9-sample-glossaries) for ready-made files you can download and load.

---

## 4. Creating a glossary from scratch

You don't need a CSV file to get started — you can build a glossary directly inside TermBox.

1. Open **≡ → Glossary Sources**
2. Click **+ New glossary**
3. Type a name (e.g. "My Project Terms") and press **Enter** or click **Create**
4. An empty glossary is created and set as the active source
5. Use the **+** button on the source row to start adding terms (see section 5)

---

## 5. Adding terms manually

1. In Glossary Sources, click the **+** button on any source row
2. Fill in the form at the bottom of the panel:
   - **Term** *(required)* — the word or acronym
   - **Full form** *(optional)* — the expanded form of an acronym (e.g. "Application Programming Interface" for "API")
   - **Definition** *(required)* — the explanation
3. Click **Add term** to save — the form stays open so you can keep adding
4. Click **Done** or press **Escape** when finished

---

## 6. Managing multiple sources

You can load as many glossaries as you like and switch between them.

- **Switch active source** — open **≡** and select a source using the radio buttons
- **Search all sources at once** — if you have more than one source, select **All sources** at the top of the list
- **Delete a source** — click **✕** on the source row (this removes it and its terms from local storage)

When searching across multiple sources, each result shows a small badge with the source name.

---

## 7. Exporting a glossary to CSV

1. Open **≡ → Glossary Sources**
2. Click the **↓** button on a source row
3. A CSV file is downloaded to your computer

The exported file uses the standard TermBox column format (`term, full_form, definition, domain, source_reference, aliases`) and can be re-imported or shared with others.

---

## 8. CSV file format

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

## 9. Sample glossaries

The following ready-made CSV files are available to download and load into TermBox:

| File | Description |
|---|---|
| [biotest-diagnostics.csv](https://github.com/fuvito/termbox/blob/main/samples/biotest-diagnostics.csv) | 67-term IVD / medical device glossary |
| [biotest-diagnostics-expanded.csv](https://github.com/fuvito/termbox/blob/main/samples/biotest-diagnostics-expanded.csv) | Expanded IVD / medical device glossary |
| [biotest-diagnostics-acronyms-expanded.csv](https://github.com/fuvito/termbox/blob/main/samples/biotest-diagnostics-acronyms-expanded.csv) | IVD / medical device acronyms with expanded forms |
| [ai-ml.csv](https://github.com/fuvito/termbox/blob/main/samples/ai-ml.csv) | 82-term AI and machine learning glossary |
| [ai-ml-expanded.csv](https://github.com/fuvito/termbox/blob/main/samples/ai-ml-expanded.csv) | Expanded AI / ML glossary |

Download any file and load it via **≡ → Add from file**.

---

## 10. Display settings

All settings are in the popup header bar:

| Button | Action |
|---|---|
| **A−** | Decrease font size |
| **A+** | Increase font size |
| **☾ / ☀** | Toggle dark / light mode |
| **≡** | Open Glossary Sources |
| **ⓘ** | Open About / legal links |

The popup can be **resized** by dragging any edge or corner.

All display preferences are saved automatically and persist across sessions.

---

## 11. Tips and shortcuts

- **Keyboard:** Press **Enter** in the search box to search; press **Escape** in any form to cancel
- **Copy on click:** Click any search result to instantly copy its definition to the clipboard
- **Resize:** Drag the bottom, left, or right edge of the popup to resize it — the size is remembered
- **Offline:** Once a glossary is loaded, TermBox works with no internet connection
- **Font size:** If text feels too small or large, use **A−** / **A+** in the header

---

## Disclaimer

TermBox is not a secure storage solution. Do not use it to store passwords, credentials, or any sensitive information. See [Terms & Conditions](https://github.com/fuvito/termbox/blob/main/TERMS.md) for full details.
