// Minimal MV3 service worker — required by the manifest.
import { parseCsv, csvToTermEntries } from './csv'
import { getSources, setSources, setTerms } from './storage'

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return
  const existing = await getSources()
  if (existing.length > 0) return

  const url = chrome.runtime.getURL('biotest-diagnostics.csv')
  const text = await (await fetch(url)).text()
  const id = crypto.randomUUID()
  const terms = csvToTermEntries(parseCsv(text), id)

  const source = {
    id,
    name: 'Biotest Diagnostics',
    type: 'file' as const,
    url: null,
    termCount: terms.length,
    lastLoaded: new Date().toISOString(),
    autoRefresh: false,
  }

  await setSources([source])
  await setTerms(id, terms)
})
