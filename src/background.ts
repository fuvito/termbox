// Minimal MV3 service worker — required by the manifest.
import { parseCsv, csvToTermEntries } from './csv'
import { getSources, setSources, setTerms } from './storage'

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return
  const existing = await getSources()
  if (existing.length > 0) return

  const defaults = [
    { file: 'biotest-diagnostics.csv', name: 'Biotest Diagnostics' },
    { file: 'ai-ml.csv', name: 'AI / ML' },
  ]

  const sources = []
  for (const { file, name } of defaults) {
    const text = await (await fetch(chrome.runtime.getURL(file))).text()
    const id = crypto.randomUUID()
    const terms = csvToTermEntries(parseCsv(text), id)
    await setTerms(id, terms)
    sources.push({
      id,
      name,
      type: 'file' as const,
      url: null,
      termCount: terms.length,
      lastLoaded: new Date().toISOString(),
      autoRefresh: false,
      secured: false,
    })
  }

  await setSources(sources)
})
