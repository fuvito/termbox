// Minimal MV3 service worker — required by the manifest.
// No logic needed; storage and fetch happen in the popup context.
chrome.runtime.onInstalled.addListener(() => {
  // noop
})
