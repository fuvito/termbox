// Standalone page opened by SourcesView on Firefox to work around the popup-closes-on-focus-loss
// limitation. Reads the selected file and saves it to chrome.storage.local so the main popup
// can pick it up when it reopens.

const input = document.getElementById('fileInput') as HTMLInputElement
const btn = document.getElementById('selectBtn') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLSpanElement

btn.addEventListener('click', () => input.click())

input.addEventListener('change', () => {
  const file = input.files?.[0]
  if (!file) return

  btn.disabled = true
  statusEl.textContent = 'Reading…'

  const reader = new FileReader()
  reader.onload = async e => {
    const content = e.target?.result as string
    await chrome.storage.local.set({
      termbox_pending_import: { content, filename: file.name },
    })
    statusEl.textContent = '✓ Done — return to TermBox'
    setTimeout(() => window.close(), 1200)
  }
  reader.onerror = () => {
    statusEl.textContent = '✗ Failed to read file'
    btn.disabled = false
  }
  reader.readAsText(file, 'utf-8')
})
