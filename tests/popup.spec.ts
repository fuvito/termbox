import { test, expect, type Page } from '@playwright/test'

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const SID = 'test-src-1'
const SID2 = 'test-src-2'

const BASE_TERMS = [
  { id: `${SID}_0`, term: 'API', fullForm: 'Application Programming Interface', definition: 'A set of rules for software communication', domain: 'Software', sourceReference: null, aliases: [], sourceId: SID, secured: false },
  { id: `${SID}_1`, term: 'PCR', fullForm: 'Polymerase Chain Reaction', definition: 'A technique used to amplify DNA segments', domain: 'Biology', sourceReference: null, aliases: ['qPCR', 'rt-PCR'], sourceId: SID, secured: false },
  { id: `${SID}_2`, term: 'DNA', fullForm: null, definition: 'Deoxyribonucleic acid — the molecule carrying genetic information', domain: null, sourceReference: null, aliases: [], sourceId: SID, secured: false },
]

const BASE_SOURCE = { id: SID, name: 'Test Glossary', type: 'file', url: null, termCount: 3, lastLoaded: new Date().toISOString(), autoRefresh: false, secured: false }

async function seedGlossary(page: Page, extraSource = false) {
  await page.addInitScript(({ sid, sid2, source, terms, extra }) => {
    const PFX = '__termbox_'
    const sources = [source, ...(extra ? [{ id: sid2, name: 'Second Glossary', type: 'file', url: null, termCount: 1, lastLoaded: new Date().toISOString(), autoRefresh: false, secured: false }] : [])]
    localStorage.setItem(PFX + 'termbox_sources', JSON.stringify(sources))
    localStorage.setItem(PFX + `termbox_terms_${sid}`, JSON.stringify(terms))
    if (extra) {
      localStorage.setItem(PFX + `termbox_terms_${sid2}`, JSON.stringify([
        { id: `${sid2}_0`, term: 'GPU', fullForm: 'Graphics Processing Unit', definition: 'A processor optimised for parallel computation', domain: null, sourceReference: null, aliases: [], sourceId: sid2, secured: false },
      ]))
    }
    localStorage.setItem(PFX + 'termbox_prefs', JSON.stringify({ activeSourceId: sid }))
  }, { sid: SID, sid2: SID2, source: BASE_SOURCE, terms: BASE_TERMS, extra: extraSource })
}

async function gotoPopup(page: Page) {
  await page.goto('/popup.html')
}

// ─── Empty state ──────────────────────────────────────────────────────────────

test.describe('empty state', () => {
  test('shows empty state with add-glossary prompt', async ({ page }) => {
    await gotoPopup(page)
    await expect(page.getByText('Load a CSV glossary or acronym list to get started')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add a glossary' })).toBeVisible()
  })

  test('"Add a glossary" opens Sources view', async ({ page }) => {
    await gotoPopup(page)
    await page.getByRole('button', { name: 'Add a glossary' }).click()
    await expect(page.getByText('Glossary Sources')).toBeVisible()
  })
})

// ─── Search view ──────────────────────────────────────────────────────────────

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    await seedGlossary(page)
    await gotoPopup(page)
  })

  test('shows search input and source subtitle', async ({ page }) => {
    await expect(page.getByPlaceholder('Search terms…')).toBeVisible()
    await expect(page.getByText('Test Glossary')).toBeVisible()
  })

  test('finds a term by name', async ({ page }) => {
    await page.getByPlaceholder('Search terms…').fill('API')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Application Programming Interface')).toBeVisible()
    await expect(page.getByText('A set of rules for software communication')).toBeVisible()
  })

  test('finds a term by prefix', async ({ page }) => {
    await page.getByPlaceholder('Search terms…').fill('po')
    await page.keyboard.press('Enter')
    // PCR has fullForm "Polymerase Chain Reaction" — alias prefix match not triggered here
    // but DNA has "Deoxyribonucleic" — let's search "dn"
    await page.getByPlaceholder('Search terms…').fill('dn')
    await page.keyboard.press('Enter')
    await expect(page.getByText('DNA')).toBeVisible()
  })

  test('shows no-results message for unmatched query', async ({ page }) => {
    await page.getByPlaceholder('Search terms…').fill('xyz')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/No results for/)).toBeVisible()
  })

  test('searches by definition', async ({ page }) => {
    await page.getByLabel('Search by Definition').check()
    await page.getByPlaceholder('Search terms…').fill('amplify')
    await page.keyboard.press('Enter')
    await expect(page.getByText('PCR')).toBeVisible()
  })

  test('clicking a result shows yellow highlight', async ({ page }) => {
    await page.getByPlaceholder('Search terms…').fill('API')
    await page.keyboard.press('Enter')
    const defn = page.getByText('A set of rules for software communication')
    await defn.click()
    await expect(defn).toHaveCSS('background', /rgb\(254,\s*249,\s*195\)|#fef9c3/)
    await expect(page.getByText('✓ Copied to clipboard')).toBeVisible()
  })

  test('✕ clear button resets results', async ({ page }) => {
    await page.getByPlaceholder('Search terms…').fill('API')
    await page.keyboard.press('Enter')
    await expect(page.getByText('API')).toBeVisible()
    await page.getByTitle('Clear search').click()
    await expect(page.getByText('API')).not.toBeVisible()
    await expect(page.getByPlaceholder('Search terms…')).toHaveValue('')
  })
})

// ─── Sources view ─────────────────────────────────────────────────────────────

test.describe('sources view', () => {
  test.beforeEach(async ({ page }) => {
    await seedGlossary(page)
    await gotoPopup(page)
    await page.getByTitle('Manage sources').click()
    await expect(page.getByText('Glossary Sources')).toBeVisible()
  })

  test('shows loaded source with term count', async ({ page }) => {
    await expect(page.getByText('Test Glossary')).toBeVisible()
    await expect(page.getByText('3 terms')).toBeVisible()
  })

  test('← back returns to search view', async ({ page }) => {
    await page.getByRole('button', { name: '←' }).click()
    await expect(page.getByPlaceholder('Search terms…')).toBeVisible()
  })

  test('creates a new glossary', async ({ page }) => {
    await page.getByRole('button', { name: '+ New glossary' }).click()
    await page.getByPlaceholder('Glossary name').fill('My Terms')
    await page.keyboard.press('Enter')
    await expect(page.getByText('My Terms')).toBeVisible()
    await expect(page.getByText('0 terms')).toBeVisible()
  })

  test('adds a term and it becomes searchable', async ({ page }) => {
    // Open add-term form for the seeded source
    const sourceRow = page.locator('div').filter({ hasText: /^Test Glossary/ }).first()
    await sourceRow.getByTitle('Add term').click()
    await page.getByPlaceholder('Term *').fill('LLM')
    await page.getByPlaceholder('Full form (optional)').fill('Large Language Model')
    await page.getByPlaceholder('Definition *').fill('A neural network trained on vast text data')
    await page.getByRole('button', { name: 'Add term' }).click()
    // Go back and search
    await page.getByRole('button', { name: '←' }).click()
    await page.getByPlaceholder('Search terms…').fill('LLM')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Large Language Model')).toBeVisible()
  })

  test('shows "All sources" toggle when multiple sources loaded', async ({ page }) => {
    // This test needs two sources — re-seed via addInitScript before reload
    await seedGlossary(page, true)  // seeds two sources
    await page.reload()
    await page.getByTitle('Manage sources').click()
    await expect(page.getByText('All sources')).toBeVisible()
  })
})

// ─── About view ───────────────────────────────────────────────────────────────

test.describe('about view', () => {
  test('opens and shows version and links', async ({ page }) => {
    await gotoPopup(page)
    await page.getByTitle('About TermBox').click()
    await expect(page.getByText('About')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'TermBox' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'User Guide' })).toBeVisible()
    await expect(page.getByRole('button', { name: "What's New" })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Privacy Policy' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Terms & Conditions' })).toBeVisible()
  })

  test('← back returns to search view', async ({ page }) => {
    await gotoPopup(page)
    await page.getByTitle('About TermBox').click()
    await page.getByRole('button', { name: '←' }).click()
    await expect(page.getByText('TermBox')).toBeVisible()
    await expect(page.locator('header')).toHaveCSS('background-color', /rgb/)
  })
})

// ─── Dark mode ────────────────────────────────────────────────────────────────

test.describe('dark mode', () => {
  test('toggles dark/light mode', async ({ page }) => {
    await gotoPopup(page)
    const body = page.locator('body')
    // Default is light — background is near-white
    await page.getByTitle('Dark mode').click()
    await expect(body).toHaveCSS('background-color', 'rgb(17, 24, 39)')
    await page.getByTitle('Light mode').click()
    await expect(body).toHaveCSS('background-color', 'rgb(249, 250, 251)')
  })
})

// ─── Right-click edit / delete ────────────────────────────────────────────────

test.describe('context menu', () => {
  test.beforeEach(async ({ page }) => {
    await seedGlossary(page)
    await gotoPopup(page)
    await page.getByPlaceholder('Search terms…').fill('DNA')
    await page.keyboard.press('Enter')
    await expect(page.getByText('DNA')).toBeVisible()
  })

  test('right-click shows Edit and Delete options', async ({ page }) => {
    await page.getByText('DNA').click({ button: 'right' })
    await expect(page.getByRole('button', { name: /Edit/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Delete/ })).toBeVisible()
  })

  test('edit updates the term inline', async ({ page }) => {
    await page.getByText('DNA').click({ button: 'right' })
    await page.getByRole('button', { name: /Edit/ }).click()
    const defInput = page.getByPlaceholder('Definition *')
    await defInput.clear()
    await defInput.fill('Updated definition')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Updated definition')).toBeVisible()
  })

  test('delete shows confirmation and removes the term', async ({ page }) => {
    await page.getByText('DNA').click({ button: 'right' })
    await page.getByRole('button', { name: /Delete/ }).click()
    // Confirmation appears
    await expect(page.getByText('Delete this term?')).toBeVisible()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await expect(page.locator('strong', { hasText: 'DNA' })).not.toBeVisible()
  })
})

// ─── PIN protection ───────────────────────────────────────────────────────────

test.describe('PIN protection', () => {
  test.beforeEach(async ({ page }) => {
    await seedGlossary(page)
    await gotoPopup(page)
    await page.getByTitle('Manage sources').click()
  })

  test('lock button is visible on each source row', async ({ page }) => {
    await expect(page.getByTitle('Add PIN protection')).toBeVisible()
  })

  test('clicking lock button opens PIN setup modal', async ({ page }) => {
    await page.getByTitle('Add PIN protection').click()
    await expect(page.getByText('Add PIN protection')).toBeVisible()
    await expect(page.getByPlaceholder('Choose a PIN (min 4 chars)')).toBeVisible()
  })

  test('mismatched PINs shows an error', async ({ page }) => {
    await page.getByTitle('Add PIN protection').click()
    await page.getByPlaceholder('Choose a PIN (min 4 chars)').fill('1234')
    await page.getByPlaceholder('Confirm PIN').fill('9999')
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('PINs do not match')).toBeVisible()
  })

  test('short PIN shows an error', async ({ page }) => {
    await page.getByTitle('Add PIN protection').click()
    await page.getByPlaceholder('Choose a PIN (min 4 chars)').fill('12')
    await page.getByPlaceholder('Confirm PIN').fill('12')
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('PIN must be at least 4 characters')).toBeVisible()
  })

  test('full setup flow: PIN → recovery key → locked source', async ({ page }) => {
    await page.getByTitle('Add PIN protection').click()
    await page.getByPlaceholder('Choose a PIN (min 4 chars)').fill('test1234')
    await page.getByPlaceholder('Confirm PIN').fill('test1234')
    await page.getByRole('button', { name: 'Next' }).click()

    // Recovery key screen
    await expect(page.getByText('Save your recovery key')).toBeVisible()
    const recoveryBox = page.locator('div[style*="monospace"]').first()
    await expect(recoveryBox).toBeVisible()

    // Acknowledge and finalize
    await page.getByLabel("I've saved this recovery key in a safe place").check()
    await page.getByRole('button', { name: 'Set up PIN protection' }).click({ timeout: 15_000 })

    // After setup the source is secured+unlocked — lock it now to verify locked state
    await page.getByTitle('Secured & unlocked — click to manage').click()
    await page.getByRole('button', { name: /Lock now/ }).click()
    await expect(page.getByTitle('Locked — click to unlock')).toBeVisible()
  })

  test('locked source shows lock screen in search view', async ({ page }) => {
    // Set up PIN
    await page.getByTitle('Add PIN protection').click()
    await page.getByPlaceholder('Choose a PIN (min 4 chars)').fill('test1234')
    await page.getByPlaceholder('Confirm PIN').fill('test1234')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel("I've saved this recovery key in a safe place").check()
    await page.getByRole('button', { name: 'Set up PIN protection' }).click({ timeout: 15_000 })

    // Lock the source (setup leaves it unlocked in current session)
    await page.getByTitle('Secured & unlocked — click to manage').click()
    await page.getByRole('button', { name: /Lock now/ }).click()

    // Go back to search
    await page.getByRole('button', { name: '←' }).click()
    await expect(page.getByText(/is locked/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter PIN' })).toBeVisible()
  })

  test('wrong PIN shows error', async ({ page }) => {
    // Set up PIN first
    await page.getByTitle('Add PIN protection').click()
    await page.getByPlaceholder('Choose a PIN (min 4 chars)').fill('correct')
    await page.getByPlaceholder('Confirm PIN').fill('correct')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel("I've saved this recovery key in a safe place").check()
    await page.getByRole('button', { name: 'Set up PIN protection' }).click({ timeout: 15_000 })

    // Lock the source before testing unlock flow
    await page.getByTitle('Secured & unlocked — click to manage').click()
    await page.getByRole('button', { name: /Lock now/ }).click()

    // Try to unlock with wrong PIN
    await page.getByRole('button', { name: '←' }).click()
    await page.getByRole('button', { name: 'Enter PIN' }).click()
    await page.getByPlaceholder('PIN').fill('wrongpin')
    await page.getByRole('button', { name: 'Unlock' }).click({ timeout: 15_000 })
    await expect(page.getByText('Incorrect PIN')).toBeVisible()
  })

  test('correct PIN unlocks source and shows search', async ({ page }) => {
    // Set up PIN
    await page.getByTitle('Add PIN protection').click()
    await page.getByPlaceholder('Choose a PIN (min 4 chars)').fill('open1234')
    await page.getByPlaceholder('Confirm PIN').fill('open1234')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel("I've saved this recovery key in a safe place").check()
    await page.getByRole('button', { name: 'Set up PIN protection' }).click({ timeout: 15_000 })

    // Lock the source before testing unlock flow
    await page.getByTitle('Secured & unlocked — click to manage').click()
    await page.getByRole('button', { name: /Lock now/ }).click()

    // Go to search and unlock
    await page.getByRole('button', { name: '←' }).click()
    await page.getByRole('button', { name: 'Enter PIN' }).click()
    await page.getByPlaceholder('PIN').fill('open1234')
    await page.getByRole('button', { name: 'Unlock' }).click({ timeout: 15_000 })

    // Should now be able to search
    await expect(page.getByPlaceholder('Search terms…')).toBeVisible()
    await page.getByPlaceholder('Search terms…').fill('API')
    await page.keyboard.press('Enter')
    await expect(page.getByText('A set of rules for software communication')).toBeVisible()
  })
})
