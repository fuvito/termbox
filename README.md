# TermBox — Glossary & Acronym Lookup

**Build your own glossary or acronym finder — from any CSV, in seconds.**

Load your terminology list once and search it instantly from the browser toolbar. TermBox is designed for anyone who works with domain-specific language: look up acronyms, expand abbreviations, browse technical terms, or reference any jargon you deal with daily.

No accounts. No backend. No subscription. Works fully offline.

> **Official source notice** — The only official, secure, and verified distribution of TermBox is the listing on the [Chrome Web Store](https://chrome.google.com/webstore). Installing this extension from any other source, store, or website is unauthorized, unverified, and entirely at your own risk.

| Search | Sources | Browse A–Z |
|---|---|---|
| ![Search view](docs/screenshots/sample_search.png) | ![Sources view](docs/screenshots/glossary_sources.png) | ![Browse view](docs/screenshots/full_screen_image.png) |

## Demo

[![Watch the intro video](https://img.youtube.com/vi/EF23GCdetM4/maxresdefault.jpg)](https://www.youtube.com/watch?v=EF23GCdetM4)

---

## Features

- **Build your own glossary** — bring any CSV or JSON and TermBox turns it into a searchable tool
- **Create a glossary from scratch** — use the in-app editor to build a glossary without a file
- **Add terms manually** — add term, full form, and definition directly from the Sources panel
- **Edit and delete terms** — right-click any search result to modify or remove it
- **Browse A–Z** — flip to a full alphabetical term list with sticky letter headers from the **Az** button
- **PIN protection** — encrypt any source with AES-256-GCM; unlock once per browser session
- **Acronym lookup** — expand abbreviations instantly; supports `full_form` and `aliases` columns
- Load from a **local CSV file** or **JSON source pack**
- **Multiple named sources** — switch between glossaries or search across all at once
- **Fully offline** after first load — instant local search, no server round-trips
- **Search by term** or **search by definition** via a pill segment toggle
- Smart result ranking: exact → prefix → alias → substring
- **Export to CSV** — download any loaded glossary back to a CSV file
- Restore last search on reopen — your previous results are always one click away
- **12 built-in languages** — language modal with custom language pack loading from `.json`
- **Author credits** — CSV and JSON sources can include author metadata; displayed in About
- Dark mode, font size controls, resizable popup
- No tracking, no external requests

## Browser support

| Browser | Status |
|---|---|
| Chrome | v1 — available on the Chrome Web Store |
| Edge | v1 — works without changes (Chromium-based) |
| Firefox | v1 — publish via `npm run package:firefox` |
| Safari | Planned |

---

## CSV format

```csv
# author: Jane Doe
# url: https://example.com/glossary
term,full_form,definition,domain,source_reference,aliases
PCR,Polymerase Chain Reaction,A technique used to amplify DNA,Molecular Biology,,qPCR;rt-PCR
API,Application Programming Interface,A set of rules for software communication,Software,,
```

| Column | Required | Notes |
|---|---|---|
| `term` | Yes | The term or acronym |
| `full_form` | No | Expanded form of the term |
| `definition` | Yes | The definition |
| `domain` | No | Subject area tag |
| `source_reference` | No | Citation or reference |
| `aliases` | No | Semicolon-separated alternative names |

**Author credits:** Add `# author: Name` and/or `# url: https://…` comment lines before the header row. These are stored with the source and shown in the About page Credits section.

- Column header names are **case-insensitive** and **order-independent**
- Quoted fields with commas inside are supported (RFC 4180)
- Encoding: UTF-8

## JSON source pack format

```json
{
  "_name": "My Glossary",
  "_author": "Jane Doe",
  "_url": "https://example.com/glossary",
  "terms": [
    { "term": "API", "definition": "Application Programming Interface" },
    { "term": "PCR", "full_form": "Polymerase Chain Reaction", "definition": "A DNA amplification technique", "aliases": ["qPCR", "rt-PCR"] }
  ]
}
```

See [`sample-packs/source-pack-template.json`](sample-packs/source-pack-template.json) for a full annotated example.

---

## Sample packs

The `sample-packs/` folder contains ready-to-use templates you can load or adapt:

| File | Type | Description |
|---|---|---|
| [`source-pack-template.json`](sample-packs/source-pack-template.json) | Source pack | Annotated JSON glossary template — edit and load to create your own |
| [`language-pack-template.json`](sample-packs/language-pack-template.json) | Language pack | Full English template for translating TermBox into a new language |
| [`rw.json`](sample-packs/rw.json) | Language pack | Kinyarwanda (rw) language pack — example of a completed translation |

### Creating and loading a source pack

1. Copy `sample-packs/source-pack-template.json` to your computer
2. Edit the `_name`, `_author`, `_url` fields and fill in your `terms` array
3. Open TermBox → **≡** → **+ Add from file** → select your `.json` file

### Creating and loading a language pack

1. Copy `sample-packs/language-pack-template.json` to your computer
2. Change `_name` to a 1–3 character code for your language (e.g. `pl` for Polish)
3. Add `_author` with your name (optional — displayed in the About page Credits)
4. Translate every string value (keep the keys and `{placeholder}` tokens unchanged)
5. Open TermBox → click **🌐** in the header → **Install from file…** → select your `.json` file
6. Enter or confirm the 3-character code and click **Install**

---

## Sample glossaries

The `samples/` folder contains ready-to-use CSV files you can load straight into TermBox.


| File | Description | Download |
|---|---|---|
| `biotest-diagnostics.csv` | IVD / medical device acronyms with expanded forms | [Download](https://github.com/fuvito/termbox/blob/main/samples/biotest-diagnostics.csv) |
| `artificial-intelligence-and-machine-learning.csv` | Expanded AI / ML glossary with richer definitions | [Download](https://github.com/fuvito/termbox/blob/main/samples/artificial-intelligence-and-machine-learning.csv) |
| `cybersecurity.csv` | 674-term cybersecurity acronym glossary | [Download](https://github.com/fuvito/termbox/blob/main/samples/cybersecurity.csv) |
| `software-engineering-cloud-devops.csv` | 528-term software engineering, cloud, and DevOps glossary | [Download](https://github.com/fuvito/termbox/blob/main/samples/software-engineering-cloud-devops.csv) |
| `finance-business-intelligence.csv` | 715-term finance and business intelligence glossary | [Download](https://github.com/fuvito/termbox/blob/main/samples/finance-business-intelligence.csv) |

### [`cybersecurity.csv`](https://github.com/fuvito/termbox/blob/main/samples/cybersecurity.csv)

A 674-term glossary covering the full cybersecurity acronym landscape:

| Domain | Example terms |
|---|---|
| Application & Information Security | CORS, CSRF, XSS, CSP, HSTS, OIDC, OAuth 2.0, SAML, SSO, MFA |
| Cryptography & PKI | AES, RSA, ECC, TLS, mTLS, HMAC, PKI, CA, CRL, OCSP |
| Network Security | VPN, IDS, IPS, SIEM, WAF, DDoS, BGP Hijack, NAT, DMZ |
| Cloud & Container Security | CSPM, CWPP, CNAPP, SSPM, CIEM, IAC Scanning |
| Threat Intelligence | IOC, TTP, APT, CVE, CVSS, CWE, MITRE ATT&CK |
| Governance & Compliance | GRC, SOC 2, ISO 27001, NIST CSF, PCI DSS, GDPR, HIPAA |
| Identity & Access | PAM, RBAC, ABAC, ZTA, ZTNA, FIDO2, WebAuthn |
| Incident Response | DFIR, EDR, XDR, MDR, SOC, SOAR, MTTR, MTTD |

### [`software-engineering-cloud-devops.csv`](https://github.com/fuvito/termbox/blob/main/samples/software-engineering-cloud-devops.csv)

A 528-term glossary spanning software engineering, cloud infrastructure, and DevOps:

| Domain | Example terms |
|---|---|
| Software Engineering | SOLID, DRY, TDD, BDD, DDD, CQRS, API, REST, gRPC, GraphQL |
| Cloud & Infrastructure | IaaS, PaaS, SaaS, VPC, CDN, S3, Lambda, EKS, GKE, AKS |
| DevOps & CI/CD | CI/CD, GitOps, IaC, Terraform, Ansible, Helm, Canary, Blue/Green |
| Observability | SLI, SLO, SLA, MTTR, MTTF, DORA Metrics, OpenTelemetry, Prometheus |
| Architecture | Microservices, Event-Driven, CQRS, Saga, Service Mesh, Sidecar |
| Web & Security | CORS, JWT, OIDC, OAuth, mTLS, WAF, A11Y, i18n, l10n |

### [`finance-business-intelligence.csv`](https://github.com/fuvito/termbox/blob/main/samples/finance-business-intelligence.csv)

A 715-term glossary covering finance, accounting, and business intelligence:

| Domain | Example terms |
|---|---|
| Accounting & Reporting | GAAP, IFRS, P&L, EBITDA, COGS, AR, AP, GL, BS, CFS |
| Banking & Capital Markets | FX, AUM, NAV, IRR, NPV, DCF, LTV, DTI, WACC, IPO |
| Tax, Payroll & Business Administration | VAT, GST, W-2, 1099, FICA, FUTA, EIN, ITIN |
| Financial Risk | VaR, CVaR, Basel III, DSCR, LCR, NSFR, PD, LGD, EAD |
| Business Intelligence & Analytics | KPI, OKR, NPS, CAC, CLV, MRR, ARR, Churn, Cohort, ARPU |
| Regulation & Compliance | AML, KYC, FATF, MiFID II, Dodd-Frank, SOX, FINRA |

To use any sample, open TermBox → **≡** → **Add from file** → select the downloaded CSV.

---

## Publishing

Store listing copy, permission justifications, packaging commands, and submission checklists for all browsers are in **[docs/PUBLISHING.md](docs/PUBLISHING.md)**.

Per-browser pre-submission checklists:
- Chrome Web Store: [docs/CWS-CHECKLIST.md](docs/CWS-CHECKLIST.md)
- Firefox AMO: [docs/AMO-CHECKLIST.md](docs/AMO-CHECKLIST.md)

---

## Installation (Chrome)

### From the Chrome Web Store _(coming soon)_

Search for **TermBox** in the [Chrome Web Store](https://chrome.google.com/webstore) and click **Add to Chrome**.

### From source (manual)

1. Clone the repo and build:
   ```bash
   git clone https://github.com/fuvito/termbox.git
   cd termbox
   npm install
   npm run build
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `dist/` folder
5. The TermBox icon appears in your toolbar — click it to open

To update after a `git pull`, run `npm run build` again and click the refresh icon on the extension card in `chrome://extensions`.

---

## Running locally (browser dev server)

You can develop and test the popup in a regular browser tab — no extension install needed.

```bash
npm install
npm run serve
```

Then open [http://localhost:5173/popup.html](http://localhost:5173/popup.html).

> The dev server auto-opens this URL in your default browser when started.

`chrome.storage.local` is automatically replaced with a `localStorage`-backed mock, so adding sources and searching works exactly as it would in the real extension.

---

## Scripts

| Command | Description |
|---|---|
| `npm run serve` | Start Vite dev server — test in browser without installing as extension |
| `npm run dev` | Watch-build to `dist/` — reload unpacked extension in Chrome as you edit |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript type check (no emit) |
| `npm run icons` | Regenerate `public/icon16/48/128.png` from the Node.js generator script |
| `npm run package` | Run all quality gates then build and zip for Chrome Web Store → `termbox.zip` |
| `npm run package:firefox` | Build and zip for Firefox AMO → `termbox-firefox.zip` |

### Packaging

```bash
npm run package           # Chrome → termbox.zip
npm run package:firefox   # Firefox → termbox-firefox.zip
```

Both commands run all quality gates (`lint`, `typecheck`, `test:coverage`, `test:e2e`) before building. The build aborts if any gate fails.

See [docs/PUBLISHING.md](docs/PUBLISHING.md) for store listing copy, submission checklists, and per-browser instructions.

---

## Project structure

```
termbox/
  public/
    manifest.json       Chrome MV3 manifest
  src/
    popup.tsx           React UI — SearchView, SourcesView, PinModal, App
    background.ts       Minimal MV3 service worker
    types.ts            TermEntry, GlossarySource, SecureSourceMeta interfaces
    search.ts           rankTerms() search algorithm
    csv.ts              RFC 4180 CSV parser
    crypto.ts           AES-256-GCM encryption helpers (Web Crypto API)
    storage.ts          chrome.storage.local / session helpers
    chrome-mock.ts      localStorage + in-memory session mock for dev server
  popup.html            Extension popup shell
  vite.config.ts        Dual entry (popup + background)
  tsconfig.json
  package.json
```

---

## Tech stack

- **React 19** — UI
- **TypeScript 7** — language
- **Vite 8** — bundler
- **chrome.storage.local** — persistence
- **Inline styles** — no CSS framework
- **No external runtime dependencies** beyond React

---

## Disclaimer

TermBox is designed for glossaries, acronym lists, and terminology only. It is **not** a substitute for a password manager or dedicated security tool. Do not use it to store passwords, credentials, API keys, or authentication tokens.

While PIN-protected sources encrypt glossary data using AES-256-GCM (Web Crypto API), this feature is designed to protect terminology content from casual access — not to provide the security guarantees of a purpose-built security application. The user assumes full responsibility for the content they load into the extension.

---

## Privacy

TermBox stores data only on your device. No analytics, no tracking, no external servers.
See [PRIVACY.md](PRIVACY.md) for the full policy.

---

## License

The source code is released under the **MIT License** — see [LICENSE](LICENSE) for the full text including the "as is" and limitation-of-liability clauses.

**Trademark notice** — The name **TermBox**, the extension icon, and all associated branding are reserved and are **not** covered by the MIT License. While you may use, modify, and redistribute the source code freely under MIT terms, you may not use the TermBox name, logo, or branding in derivative works or redistributions without explicit written permission from the author. This is to ensure users can always identify the authentic, maintained version of this extension.

© [Fuat Yazar](https://github.com/fuvito)
