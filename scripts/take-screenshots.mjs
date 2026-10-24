// Usage: npm run screenshots
// Requires the dev server to be running on :5173, or it will start one automatically.
import { chromium } from '@playwright/test'
import { spawn } from 'child_process'
import { setTimeout as sleep } from 'timers/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import net from 'net'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT  = path.join(__dir, '..')
const OUT   = path.join(ROOT, 'docs', 'screenshots')
const POPUP = 'http://localhost:5173/popup.html'
const W = 1280, H = 800

// ─── Seed data ────────────────────────────────────────────────────────────────

const S1 = 'scr-bio', S2 = 'scr-ai'
const AGO_1H = new Date(Date.now() - 70  * 60 * 1000).toISOString()
const AGO_2H = new Date(Date.now() - 140 * 60 * 1000).toISOString()

function e(sid, i, term, fullForm, def, domain, aliases = []) {
  return { id: `${sid}_${i}`, term, fullForm: fullForm || null, definition: def,
    domain, sourceReference: null, aliases, sourceId: sid, secured: false }
}

const BIO_SRC = { id: S1, name: 'Biotest Diagnostics', type: 'file', url: null,
  termCount: 67, lastLoaded: AGO_1H, autoRefresh: false, secured: false,
  author: 'Dr. A. Fischer', authorUrl: null }
const AI_SRC  = { id: S2, name: 'AI / ML', type: 'file', url: null,
  termCount: 82, lastLoaded: AGO_2H, autoRefresh: false, secured: false,
  author: null, authorUrl: null }

const BIO = [
  e(S1,  0, 'PCR',   'Polymerase Chain Reaction',
    'A molecular biology technique that amplifies a specific segment of DNA, enabling the detection of pathogens and genetic variants from a tiny sample.',
    'Molecular Biology', ['qPCR', 'rt-PCR']),
  e(S1,  1, 'qPCR',  'Quantitative Polymerase Chain Reaction',
    'Measures the quantity of a target DNA or RNA in real time using fluorescent reporters, providing both detection and quantification in a single assay.',
    'Molecular Biology', ['Real-time PCR']),
  e(S1,  2, 'ddPCR', 'Droplet Digital PCR',
    'Partitions a sample into thousands of droplets to enable absolute quantification of nucleic acids without a standard curve.',
    'Molecular Biology', []),
  e(S1,  3, 'ELISA', 'Enzyme-Linked Immunosorbent Assay',
    'A plate-based immunoassay that detects and quantifies peptides, proteins, antibodies, and hormones using enzyme-labelled antibodies and a substrate that produces a measurable colour change.',
    'Immunology', []),
  e(S1,  4, 'NGS',   'Next-Generation Sequencing',
    'A massively parallel sequencing technology that determines the nucleotide sequence of millions of DNA fragments simultaneously, enabling whole-genome or targeted sequencing at scale.',
    'Genomics', ['Massively parallel sequencing']),
  e(S1,  5, 'IVD',   'In Vitro Diagnostic',
    'A medical device intended to examine samples taken from the human body — such as blood or tissue — to diagnose disease, monitor health, or determine susceptibility to conditions.',
    'Regulatory', []),
  e(S1,  6, 'LFA',   'Lateral Flow Assay',
    'A paper-based diagnostic device that detects analytes without laboratory equipment. The basis of rapid antigen and antibody tests including home COVID-19 tests.',
    'Immunology', ['Lateral flow test', 'Rapid test']),
  e(S1,  7, 'HbA1c', 'Glycated Haemoglobin',
    'Haemoglobin chemically bound to glucose, reflecting average blood glucose over the past 2–3 months. The primary long-term marker for monitoring diabetes management.',
    'Clinical Chemistry', ['Glycated haemoglobin']),
  e(S1,  8, 'SNP',   'Single Nucleotide Polymorphism',
    'A variation at a single DNA base position among individuals. SNPs can influence disease susceptibility, drug metabolism, and diagnostic accuracy.',
    'Genomics', []),
  e(S1,  9, 'CAPA',  'Corrective and Preventive Action',
    'A quality management process that investigates root causes of non-conformances and implements actions to correct the issue and prevent future recurrence.',
    'Quality', []),
  e(S1, 10, 'LOD',   'Limit of Detection',
    'The lowest concentration of an analyte that can be reliably distinguished from zero at a given confidence level, typically 95% or 99%.',
    'Analytical', []),
  e(S1, 11, 'CRP',   'C-Reactive Protein',
    'An acute-phase protein produced by the liver in response to inflammation, infection, or tissue injury. Elevated serum CRP is used as an inflammation marker.',
    'Clinical Chemistry', []),
  e(S1, 12, 'IFU',   'Instructions for Use',
    'The document accompanying a medical device or IVD reagent that describes how to use the product safely and achieve reliable results.',
    'Regulatory', []),
  e(S1, 13, 'SOP',   'Standard Operating Procedure',
    'A documented set of step-by-step instructions that ensures a process is performed consistently and in compliance with regulatory requirements.',
    'Quality', []),
  e(S1, 14, 'WGS',   'Whole Genome Sequencing',
    'Determines the complete DNA sequence of an organism\'s genome, enabling comprehensive variant detection without prior knowledge of target regions.',
    'Genomics', []),
  e(S1, 15, 'RNA',   null,
    'Ribonucleic acid — a single-stranded nucleic acid transcribed from DNA. Key forms include mRNA (messenger), tRNA (transfer), and rRNA (ribosomal).',
    'Molecular Biology', []),
  e(S1, 16, 'DNA',   null,
    'Deoxyribonucleic acid — the double-stranded molecule that encodes the genetic instructions of all living organisms and many viruses.',
    'Molecular Biology', []),
]

const AI = [
  e(S2,  0, 'Attention',          null,
    'A mechanism that lets a neural network weigh the relevance of different input tokens when producing each output token, enabling the model to capture long-range dependencies.',
    'LLMs', ['Self-attention']),
  e(S2,  1, 'Context Window',     null,
    'The maximum number of tokens an LLM can process in a single inference call — encompassing both the prompt and the generated response.',
    'LLMs', []),
  e(S2,  2, 'Embedding',          null,
    'A dense numerical vector representation of text, images, or other data in a high-dimensional space where semantically similar items are geometrically closer.',
    'Foundations', []),
  e(S2,  3, 'Fine-tuning',        null,
    'Training a pre-trained model on a smaller, task-specific dataset to adapt its behaviour for a particular domain, format, or use case.',
    'Training', ['SFT']),
  e(S2,  4, 'Hallucination',      null,
    'When an LLM produces plausible-sounding but factually incorrect or fabricated information. A key reliability concern in production AI applications.',
    'AI Safety', []),
  e(S2,  5, 'LLM',                'Large Language Model',
    'A neural network trained on vast amounts of text data, capable of generating, summarising, translating, and reasoning over natural language at scale.',
    'LLMs', []),
  e(S2,  6, 'MCP',                'Model Context Protocol',
    'An open protocol for connecting AI models to external tools and data sources via a standardised interface, enabling agentic workflows without bespoke integrations.',
    'AI Agents', []),
  e(S2,  7, 'Prompt Engineering', null,
    'The practice of crafting effective inputs to guide LLM behaviour, including techniques such as few-shot examples, chain-of-thought reasoning, and system instructions.',
    'Prompting', []),
  e(S2,  8, 'RAG',                'Retrieval-Augmented Generation',
    'Augments LLM responses by retrieving relevant documents from an external knowledge base and conditioning the model\'s output on that context at inference time.',
    'AI Agents', []),
  e(S2,  9, 'RLHF',               'Reinforcement Learning from Human Feedback',
    'A fine-tuning approach in which human raters score model outputs, a reward model is trained on those scores, and the LLM is further tuned to maximise the reward signal.',
    'Training', []),
  e(S2, 10, 'Token',              null,
    'The basic unit of text processed by an LLM — roughly 3–4 characters or 0.75 words in English. Context length, cost, and generation speed are all measured in tokens.',
    'LLMs', []),
  e(S2, 11, 'Transformer',        null,
    'A neural network architecture introduced in "Attention is All You Need" (2017) that uses self-attention instead of recurrence. The foundation of virtually all modern LLMs.',
    'LLMs', []),
  e(S2, 12, 'Vector Database',    null,
    'A database optimised for storing and querying high-dimensional embedding vectors, enabling fast semantic similarity search. Central to RAG and semantic search pipelines.',
    'AI Agents', []),
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function portOpen(port) {
  return new Promise(resolve => {
    const s = net.createConnection(port, '127.0.0.1')
    s.once('connect', () => { s.destroy(); resolve(true) })
    s.once('error', () => resolve(false))
  })
}

async function shot(browser, filename, { dark = false, locale = null, seed, interact }) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await ctx.newPage()

  await page.addInitScript(({ src, trm, aid, dark: d, locale: loc }) => {
    const P = '__termbox_'
    localStorage.setItem(P + 'termbox_sources', JSON.stringify(src))
    for (const [sid, terms] of Object.entries(trm)) {
      localStorage.setItem(P + `termbox_terms_${sid}`, JSON.stringify(terms))
    }
    localStorage.setItem(P + 'termbox_prefs', JSON.stringify({ activeSourceId: aid }))
    if (d) localStorage.setItem('pref_dark', 'true')
    if (loc) localStorage.setItem('pref_locale', JSON.stringify(loc))
  }, { ...seed, dark, locale })

  await page.goto(POPUP, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#root > *')   // React mounted
  await sleep(400)                           // storage reads + first render settle

  if (interact) await interact(page)
  await sleep(250)                           // animation settle

  const bg = dark
    ? 'linear-gradient(150deg, #0a0f1e 0%, #151d35 60%, #0d1425 100%)'
    : 'linear-gradient(150deg, #d4daf5 0%, #edf0fb 50%, #e2e7f6 100%)'
  const shadow = dark
    ? '0 20px 80px rgba(59,75,200,0.45), 0 4px 20px rgba(0,0,0,0.5)'
    : '0 20px 80px rgba(59,75,200,0.22), 0 4px 16px rgba(0,0,0,0.12)'

  // Step 1: centre the popup so we can measure its natural height
  await page.addStyleTag({ content: `
    html {
      min-height: 100vh !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      background: ${bg} !important;
    }
    body {
      margin: 0 !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      flex-shrink: 0 !important;
    }
  ` })
  await sleep(100)

  // Step 2: scale so the popup fills 90 % of the canvas height
  const popupH = await page.evaluate(() => document.body.getBoundingClientRect().height)
  const scale  = (H * 0.9) / popupH

  await page.addStyleTag({ content: `
    body {
      transform: scale(${scale.toFixed(4)}) !important;
      transform-origin: center center !important;
      box-shadow: ${shadow} !important;
    }
  ` })
  await sleep(150)

  await page.screenshot({ path: path.join(OUT, filename) })
  process.stdout.write(`  ✓ ${filename}\n`)
  await ctx.close()
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let server = null
  if (!(await portOpen(5173))) {
    process.stdout.write('Starting dev server')
    server = spawn('npm', ['run', 'serve'], { cwd: ROOT, shell: true, stdio: 'pipe' })
    for (let i = 0; i < 40; i++) {
      await sleep(500)
      if (await portOpen(5173)) break
      if (i % 4 === 0) process.stdout.write('.')
    }
    await sleep(800)
    process.stdout.write(' ready.\n')
  } else {
    console.log('Dev server already running on :5173.')
  }

  const browser = await chromium.launch()
  console.log('Taking screenshots…')

  try {
    // 1 — Search view (light, "pcr" query → 3 PCR-family results from Biotest Diagnostics)
    await shot(browser, 'sample_search.png', {
      seed: { src: [BIO_SRC, AI_SRC], trm: { [S1]: BIO, [S2]: AI }, aid: S1 },
      interact: async (page) => {
        await page.getByPlaceholder('Search terms…').fill('pcr')
        await page.keyboard.press('Enter')
        await page.waitForSelector('ul li')
      },
    })

    // 2 — Sources view (light, two sources loaded)
    await shot(browser, 'glossary_sources.png', {
      seed: { src: [BIO_SRC, AI_SRC], trm: { [S1]: BIO, [S2]: AI }, aid: S1 },
      interact: async (page) => {
        await page.getByTitle('Manage sources').click()
        await page.waitForSelector('text=Glossary Sources')
      },
    })

    // 3 — Browse view (dark, AI / ML terms, Attention expanded)
    await shot(browser, 'full_screen_image.png', {
      dark: true,
      seed: { src: [AI_SRC], trm: { [S2]: AI }, aid: S2 },
      interact: async (page) => {
        await page.getByTitle('Browse all terms A–Z').click()
        await page.waitForSelector('text=Browse')
        const attentionBtn = page.locator('button', {
          has: page.locator('strong', { hasText: /^Attention$/ }),
        })
        await attentionBtn.click()
        await sleep(120)
      },
    })

    // 4 — Dark mode search (AI/ML, "llm" query)
    await shot(browser, 'dark_search.png', {
      dark: true,
      seed: { src: [BIO_SRC, AI_SRC], trm: { [S1]: BIO, [S2]: AI }, aid: S2 },
      interact: async (page) => {
        await page.getByPlaceholder('Search terms…').fill('llm')
        await page.keyboard.press('Enter')
        await page.waitForSelector('ul li')
      },
    })

    // 5 — Chinese locale: search view with query
    await shot(browser, 'language_zh.png', {
      locale: 'zh',
      seed: { src: [BIO_SRC, AI_SRC], trm: { [S1]: BIO, [S2]: AI }, aid: S1 },
      interact: async (page) => {
        await page.getByPlaceholder('搜索词条…').fill('pcr')
        await page.keyboard.press('Enter')
        await page.waitForSelector('ul li')
      },
    })

    // 6 — Japanese locale: browse view
    await shot(browser, 'language_ja.png', {
      locale: 'ja',
      seed: { src: [AI_SRC], trm: { [S2]: AI }, aid: S2 },
      interact: async (page) => {
        await page.getByTitle('すべての用語をA–Z順で表示').click()
        await page.waitForSelector('strong')
      },
    })

    // 7 — Language switcher modal open
    await shot(browser, 'language_switcher.png', {
      seed: { src: [BIO_SRC, AI_SRC], trm: { [S1]: BIO, [S2]: AI }, aid: S1 },
      interact: async (page) => {
        await page.getByTitle('Language').click()
        await page.waitForSelector('text=Language')
        await sleep(100)
      },
    })

    // 8 — About view scrolled to Credits section (BIO_SRC has author)
    await shot(browser, 'about_credits.png', {
      seed: { src: [BIO_SRC, AI_SRC], trm: { [S1]: BIO, [S2]: AI }, aid: S1 },
      interact: async (page) => {
        await page.getByTitle('About TermBox').click()
        await page.waitForSelector('text=Credits')
        // Scroll the about panel to the bottom to reveal Credits
        await page.evaluate(() => {
          const scrollable = document.querySelector('[style*="overflow-y: auto"], [style*="overflow-y:auto"]')
          if (scrollable) scrollable.scrollTop = scrollable.scrollHeight
        })
        await sleep(150)
      },
    })

  } finally {
    await browser.close()
    if (server) server.kill()
  }

  console.log(`Done. Screenshots saved to docs/screenshots/`)
}

main().catch(err => { console.error(err); process.exit(1) })
