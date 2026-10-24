// Minimal MV3 service worker — required by the manifest.
import { csvToTermEntries, parseCsv } from './csv'
import { getSources, setActiveSourceId, setSources, setTerms } from './storage'

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return
  const existing = await getSources()
  if (existing.length > 0) return

  const defaults = [
    { file: 'artificial-intelligence-and-machine-learning.csv', name: 'AI / ML' },
    { file: 'biotest-diagnostics.csv', name: 'Biotest Diagnostics' },
    { file: 'cybersecurity.csv', name: 'Cybersecurity' },
    { file: 'finance-business-intelligence.csv', name: 'Finance & Business Intelligence' },
    { file: 'software-engineering-cloud-devops.csv', name: 'Software Engineering & DevOps' },
  ]

  const sources = []
  for (const { file, name } of defaults) {
    try {
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
        author: null,
        authorUrl: null,
      })
    } catch {
      // File not bundled (e.g. unpacked/dev mode) — skip silently
    }
  }

  await setSources(sources)
  const aiMl = sources.find(s => s.name === 'AI / ML')
  if (aiMl) await setActiveSourceId(aiMl.id)
})
