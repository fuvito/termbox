import { devInitReady } from './chrome-mock'
import '@fontsource-variable/inter'
import { StrictMode, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {decryptStr, 
  deriveKeyFromPin, deriveKeyFromRecoveryKey, encryptStr, generateDekHex,generateRecoveryKey, 
  generateSaltHex, hashStr,
} from './crypto'
import { csvToTermEntries, parseCsv, parseSourcePackJson, termEntriesToCsv, termEntriesToSourcePackJson } from './csv'
import type { Locale, TFunc } from './locale'
import {
  BUILTIN_LOCALES, BUILTIN_NAMES,getCustomLangCodes, getCustomStrings,
  LocaleCtx, makeT, 
  normalizeLangCode, removeCustomPack,
  saveCustomPack, useLocale,
} from './locale'
import type { SearchResult } from './search'
import { rankTerms } from './search'
import {
  clearSessionDek,
  deleteEncryptedBlob,
  deleteSecureMeta,
  deleteTerms,
  getActiveSourceId,
  getSecureMeta,
  getSecureTerms,
  getSessionDek,
  getSources,
  getTerms,
  loadGlossary,
  setActiveSourceId,
  setSecureMeta,
  setSecureTerms,
  setSessionDek,
  setSources,
  setTerms,
} from './storage'
import type { GlossarySource, SecureSourceMeta, TermEntry } from './types'

// ─── Theme ────────────────────────────────────────────────────────────────────

type Theme = {
  bg: string; surface: string; border: string
  text: string; secondary: string; muted: string; primary: string
  inputBorder: string; error: string; tag: string; tagText: string
}

const BRAND = '#3B4BC8'

const LIGHT: Theme = {
  bg: '#f9fafb', surface: '#fff', border: '#e5e7eb',
  text: '#111827', secondary: '#374151', muted: '#9ca3af', primary: '#2563eb',
  inputBorder: '#d1d5db', error: '#dc2626', tag: '#eff6ff', tagText: '#2563eb',
}

const DARK: Theme = {
  bg: '#111827', surface: '#1f2937', border: '#374151',
  text: '#f9fafb', secondary: '#d1d5db', muted: '#6b7280', primary: '#60a5fa',
  inputBorder: '#4b5563', error: '#f87171', tag: '#1e3a5f', tagText: '#93c5fd',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prefs {
  dark: boolean
  setDark: (v: boolean) => void
  fontSize: number
  setFontSize: (v: number) => void
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useStoredPref<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) return JSON.parse(stored) as T
    } catch {}
    return defaultValue
  })
  const set = useCallback((v: T) => {
    setValue(v)
    try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
  }, [key])
  return [value, set]
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeAgo(t: TFunc, isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('timeAgo.justNow')
  if (minutes < 60) return t('timeAgo.minutesAgo', { m: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('timeAgo.hoursAgo', { h: hours })
  return t('timeAgo.daysAgo', { d: Math.floor(hours / 24) })
}

function autoName(raw: string, t: TFunc): string {
  return raw
    .replace(/\.csv$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    || t('autoName.default')
}

function uniqueName(base: string, existing: GlossarySource[]): string {
  const names = new Set(existing.map(s => s.name))
  if (!names.has(base)) return base
  let n = 2
  while (names.has(`${base} - ${n}`)) n++
  return `${base} - ${n}`
}

function loadFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file, 'utf-8')
  })
}

async function loadFromUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function requestOriginPermission(url: string): Promise<boolean> {
  return new Promise(resolve => {
    try {
      const origin = new URL(url).origin
      chrome.permissions.request({ origins: [`${origin}/*`] }, resolve)
    } catch { resolve(false) }
  })
}

function hasOriginPermission(url: string): Promise<boolean> {
  return new Promise(resolve => {
    try {
      const origin = new URL(url).origin
      chrome.permissions.contains({ origins: [`${origin}/*`] }, resolve)
    } catch { resolve(false) }
  })
}

declare const __APP_VERSION__: string

// ─── AboutView ────────────────────────────────────────────────────────────────

function AboutView({ onBack, theme, prefs, sources }: {
  onBack: () => void
  theme: Theme
  prefs: Prefs
  sources: GlossarySource[]
}) {
  const fs = prefs.fontSize
  const { t } = useLocale()

  function openUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const infoRow = (label: string, value: string, url?: string) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.border}` }}>
      <span style={{ fontSize: fs - 1, color: theme.muted }}>{label}</span>
      {url ? (
        <button type="button" onClick={() => openUrl(url)}
          style={{ background: 'none', border: 'none', color: theme.primary, fontSize: fs - 1, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          {value}
        </button>
      ) : (
        <span style={{ fontSize: fs - 1, color: theme.text, fontWeight: 500 }}>{value}</span>
      )}
    </div>
  )

  const sourcesWithAuthor = sources.filter(s => s.author)
  const customLangCodes = getCustomLangCodes()
  const langPacksWithAuthor = customLangCodes
    .map(code => ({ code, strings: getCustomStrings(code) }))
    .filter(({ strings }) => strings?._author)

  const hasCredits = sourcesWithAuthor.length > 0 || langPacksWithAuthor.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bg }}>

      <header style={{ background: BRAND, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, padding: '0 4px 0 0', lineHeight: 1, opacity: 0.85 }}>
          ←
        </button>
        <span style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{t('about.title')}</span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '32px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: BRAND,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14, boxShadow: '0 4px 20px rgba(59,75,200,0.28)',
        }}>
          <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="7.5" y="7.5" width="49" height="49" fill="none" stroke="white" strokeWidth="3" />
            <rect x="14" y="18" width="34" height="8" fill="white" />
            <rect x="27" y="26" width="10" height="21" fill="white" />
          </svg>
        </div>

        <h1 style={{ fontSize: fs + 7, fontWeight: 700, color: theme.text, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          TermBox
        </h1>
        <p style={{ fontSize: fs - 1, color: theme.muted, margin: '0 0 10px' }}>
          {t('about.version', { v: __APP_VERSION__ })}
        </p>
        <p style={{ fontSize: fs - 1, color: theme.secondary, textAlign: 'center', lineHeight: 1.65, maxWidth: 240, margin: '0 0 28px' }}>
          {t('about.tagline')}
        </p>

        {/* Info rows */}
        <div style={{ width: '100%', borderTop: `1px solid ${theme.border}` }}>
          {infoRow(t('about.author'), 'Fuat Yazar')}
          {infoRow(t('about.license'), 'MIT')}
          {infoRow(t('about.source'), 'github.com/fuvito/termbox', 'https://github.com/fuvito/termbox')}
        </div>

        {/* Credits */}
        {hasCredits && (
          <div style={{ width: '100%', marginTop: 24 }}>
            <p style={{ fontSize: fs - 2, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>
              {t('about.credits')}
            </p>
            <div style={{ borderTop: `1px solid ${theme.border}` }}>
              {sourcesWithAuthor.map(s => (
                <div key={s.id} style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: fs - 2, color: theme.muted, flexShrink: 0 }}>{t('about.glossaryCredits')}</span>
                    <span style={{ fontSize: fs - 1, color: theme.secondary, fontWeight: 500, textAlign: 'right' }}>{s.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: fs - 1, color: theme.muted }}>{s.author}</span>
                    {s.authorUrl && (
                      <button type="button" onClick={() => openUrl(s.authorUrl as string)}
                        style={{ background: 'none', border: 'none', color: theme.primary, fontSize: fs - 2, cursor: 'pointer', padding: 0, fontFamily: 'inherit', flexShrink: 0 }}>
                        {t('about.visitSource')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {langPacksWithAuthor.map(({ code, strings }) => (
                <div key={code} style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: fs - 2, color: theme.muted, flexShrink: 0 }}>{t('about.langPackCredits')}</span>
                    <span style={{ fontSize: fs - 1, color: theme.secondary, fontWeight: 500, textAlign: 'right', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{code}</span>
                  </div>
                  <span style={{ fontSize: fs - 1, color: theme.muted }}>{strings?._author}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 24 }}>
          {[
            { label: t('about.userGuide'),       url: 'https://github.com/fuvito/termbox/blob/main/USER-GUIDE.md' },
            { label: t('about.whatsNew'),         url: 'https://github.com/fuvito/termbox/blob/main/CHANGELOG.md' },
            { label: t('about.privacyPolicy'),    url: 'https://github.com/fuvito/termbox/blob/main/PRIVACY.md' },
            { label: t('about.termsConditions'),  url: 'https://github.com/fuvito/termbox/blob/main/TERMS.md' },
          ].map(({ label, url }) => (
            <button key={label} type="button" onClick={() => openUrl(url)}
              style={{ background: 'none', border: 'none', color: theme.primary, fontSize: fs - 1, cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── LanguageModal ────────────────────────────────────────────────────────────

function LanguageModal({ theme, prefs, onClose }: {
  theme: Theme
  prefs: Prefs
  onClose: () => void
}) {
  const { locale, setLocale, t } = useLocale()
  const fs = prefs.fontSize
  const [customCodes, setCustomCodes] = useState(() => getCustomLangCodes())
  const [step, setStep] = useState<'list' | 'naming' | 'overwrite'>('list')
  const [pendingStrings, setPendingStrings] = useState<Record<string, string> | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [error, setError] = useState('')
  const [confirmRemoveCode, setConfirmRemoveCode] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const allLocales = [...BUILTIN_LOCALES, ...customCodes].sort((a, b) =>
    a.toUpperCase().localeCompare(b.toUpperCase())
  )
  const derivedCode = nameInput.trim() ? normalizeLangCode(nameInput) : ''

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError('')
    try {
      const text = await loadFromFile(file)
      const parsed = JSON.parse(text) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
      const strings = parsed as Record<string, string>
      setPendingStrings(strings)
      setNameInput(strings._name ? normalizeLangCode(strings._name) : '')
      setStep('naming')
    } catch {
      setError(t('lang.error.invalidJson'))
    }
  }

  function tryInstall() {
    if (!pendingStrings || !derivedCode || derivedCode === '???') return
    if (customCodes.includes(derivedCode)) {
      setStep('overwrite')
    } else {
      doInstall()
    }
  }

  function doInstall() {
    if (!pendingStrings || !derivedCode) return
    saveCustomPack(derivedCode, pendingStrings)
    setCustomCodes(getCustomLangCodes())
    setLocale(derivedCode)
    onClose()
  }

  function handleRemove(code: string) {
    if (locale === code) setLocale('en')
    removeCustomPack(code)
    setCustomCodes(getCustomLangCodes())
    setConfirmRemoveCode(null)
  }

  function localeDisplayName(l: string) {
    if (BUILTIN_NAMES[l]) return BUILTIN_NAMES[l]
    const raw = getCustomStrings(l)?._name
    return raw ? normalizeLangCode(raw) : ''
  }

  const chip = (_label: string, active: boolean): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', fontFamily: 'monospace',
    color: active ? '#fff' : theme.text,
    background: active ? BRAND : theme.border,
    borderRadius: 4, padding: '2px 6px', minWidth: 34, textAlign: 'center',
  })

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop closes on outside click
    <div role="presentation"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <div style={{ background: theme.surface, borderRadius: 10, width: 272, maxHeight: 400, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.28)', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: BRAND, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: fs + 1 }}>{t('lang.title')}</span>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px', opacity: 0.8 }}>
            ✕
          </button>
        </div>

        {step === 'list' && (<>
          {/* Locale list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {allLocales.map(l => {
              const isActive = l === locale
              const isCustom = !BUILTIN_LOCALES.includes(l)
              const name = localeDisplayName(l)
              return (
                <div key={l} style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${theme.border}`, background: isActive ? `${BRAND}12` : 'transparent' }}>
                  <button type="button"
                    onClick={() => { setLocale(l); onClose() }}
                    style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={chip(l.toUpperCase(), isActive)}>{l.toUpperCase()}</span>
                    {name && <span style={{ fontSize: fs - 1, color: isActive ? theme.text : theme.secondary }}>{name}</span>}
                    {isActive && <span style={{ fontSize: fs - 2, color: BRAND, marginLeft: 'auto', fontWeight: 700 }}>✓</span>}
                  </button>
                  {isCustom && confirmRemoveCode !== l && (
                    <button type="button" onClick={() => setConfirmRemoveCode(l)} title={t('lang.remove.title')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, fontSize: 13, padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>
                      ✕
                    </button>
                  )}
                  {confirmRemoveCode === l && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={() => handleRemove(l)}
                        style={{ background: theme.error, color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: fs - 2, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {t('lang.remove.confirm')}
                      </button>
                      <button type="button" onClick={() => setConfirmRemoveCode(null)}
                        style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 4, padding: '2px 6px', fontSize: fs - 2, cursor: 'pointer', color: theme.secondary, fontFamily: 'inherit' }}>
                        {t('lang.remove.cancel')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {error && <p style={{ fontSize: fs - 2, color: theme.error, margin: 0 }}>{error}</p>}
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 0', fontSize: fs - 1, cursor: 'pointer', color: theme.text, fontFamily: 'inherit', width: '100%' }}>
              {t('lang.installFromFile')}
            </button>
          </div>
        </>)}

        {step === 'naming' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: fs - 1, color: theme.secondary, margin: 0, lineHeight: 1.5 }}>
              {t('lang.naming.hint')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* biome-ignore lint/a11y/noAutofocus: focus moves to code input when naming step opens */}
              <input autoFocus type="text" placeholder={t('lang.naming.placeholder')} value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && derivedCode && derivedCode !== '???') tryInstall(); if (e.key === 'Escape') setStep('list') }}
                style={{ flex: 1, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: fs, outline: 'none', background: theme.bg, color: theme.text }} />
              {derivedCode && derivedCode !== '???' && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#fff', background: BRAND, borderRadius: 4, padding: '3px 7px', fontFamily: 'monospace', flexShrink: 0 }}>
                  {derivedCode}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={tryInstall} disabled={!derivedCode || derivedCode === '???'}
                style={{ flex: 1, background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: fs, cursor: derivedCode && derivedCode !== '???' ? 'pointer' : 'not-allowed', opacity: derivedCode && derivedCode !== '???' ? 1 : 0.4, fontFamily: 'inherit' }}>
                {t('lang.naming.install')}
              </button>
              <button type="button" onClick={() => { setStep('list'); setError('') }}
                style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 12px', fontSize: fs, cursor: 'pointer', color: theme.secondary, fontFamily: 'inherit' }}>
                {t('lang.naming.cancel')}
              </button>
            </div>
          </div>
        )}

        {step === 'overwrite' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: fs, color: theme.text, fontWeight: 600, margin: 0 }}>
              {t('lang.overwrite.title', { code: derivedCode })}
            </p>
            <p style={{ fontSize: fs - 1, color: theme.secondary, margin: 0, lineHeight: 1.5 }}>
              {t('lang.overwrite.body')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={doInstall}
                style={{ flex: 1, background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: fs, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('lang.overwrite.confirm')}
              </button>
              <button type="button" onClick={() => setStep('naming')}
                style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 12px', fontSize: fs, cursor: 'pointer', color: theme.secondary, fontFamily: 'inherit' }}>
                {t('lang.overwrite.back')}
              </button>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => { void handleFile(e) }} />
      </div>
    </div>
  )
}

// ─── PinModal ─────────────────────────────────────────────────────────────────

type PinModalMode = 'setup' | 'unlock'

function PinModal({
  mode, sourceId, sources, theme, prefs, onSuccess, onClose,
}: {
  mode: PinModalMode
  sourceId: string
  sources: GlossarySource[]
  theme: Theme
  prefs: Prefs
  onSuccess: (sourceId: string, dekHex: string) => Promise<void>
  onClose: () => void
}) {
  type Step = 'enter' | 'setup' | 'show-recovery' | 'forgot' | 'new-pin'
  const [step, setStep] = useState<Step>(mode === 'setup' ? 'setup' : 'enter')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [recoveryInput, setRecoveryInput] = useState('')
  const [recoveryAck, setRecoveryAck] = useState(false)
  const [generatedRecovery, setGeneratedRecovery] = useState('')
  const [recoveryDekHex, setRecoveryDekHex] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fs = prefs.fontSize
  const { t } = useLocale()
  const sourceName = sources.find(s => s.id === sourceId)?.name ?? t('pin.thisSource')

  async function handleUnlock() {
    if (pin.length < 4) { setError(t('pin.error.tooShort')); return }
    setBusy(true); setError('')
    try {
      const meta = await getSecureMeta(sourceId)
      if (!meta) { setError(t('pin.error.noSecurityData')); setBusy(false); return }
      const kek = await deriveKeyFromPin(pin, meta.pinSalt)
      let dekHex: string
      try { dekHex = await decryptStr(kek, meta.pinEncDek.iv, meta.pinEncDek.ct) }
      catch { setError(t('pin.error.incorrect')); setBusy(false); return }
      await onSuccess(sourceId, dekHex)
    } catch { setError(t('pin.error.unlockFailed')) }
    setBusy(false)
  }

  function handleSetupNext() {
    if (pin.length < 4) { setError(t('pin.error.tooShort')); return }
    if (pin !== pinConfirm) { setError(t('pin.error.noMatch')); return }
    setError('')
    setGeneratedRecovery(generateRecoveryKey())
    setStep('show-recovery')
  }

  async function handleSetupFinalize() {
    setBusy(true); setError('')
    try {
      const dekHex = generateDekHex()
      const pinSalt = generateSaltHex()
      const kek = await deriveKeyFromPin(pin, pinSalt)
      const pinEncDek = await encryptStr(kek, dekHex)
      const recoverySalt = generateSaltHex()
      const rkek = await deriveKeyFromRecoveryKey(generatedRecovery, recoverySalt)
      const recoveryEncDek = await encryptStr(rkek, dekHex)
      const recoveryKeyHash = await hashStr(generatedRecovery)
      const meta: SecureSourceMeta = { sourceId, pinSalt, pinEncDek, recoverySalt, recoveryEncDek, recoveryKeyHash }
      await setSecureMeta(meta)
      // Encrypt existing plain terms
      const plain = await getTerms(sourceId)
      await setSecureTerms(sourceId, plain, dekHex)
      await deleteTerms(sourceId)
      // Mark source secured
      const srcs = await getSources()
      await setSources(srcs.map(s => s.id === sourceId ? { ...s, secured: true } : s))
      await onSuccess(sourceId, dekHex)
    } catch (e) { setError((e as Error).message || t('pin.error.unlockFailed')) }
    setBusy(false)
  }

  async function handleForgotVerify() {
    if (!recoveryInput.trim()) { setError(t('pin.error.enterRecovery')); return }
    setBusy(true); setError('')
    try {
      const meta = await getSecureMeta(sourceId)
      if (!meta) { setError(t('pin.error.noSecurityData')); setBusy(false); return }
      const hash = await hashStr(recoveryInput.trim())
      if (hash !== meta.recoveryKeyHash) { setError(t('pin.error.invalidRecovery')); setBusy(false); return }
      const rkek = await deriveKeyFromRecoveryKey(recoveryInput.trim(), meta.recoverySalt)
      const dekHex = await decryptStr(rkek, meta.recoveryEncDek.iv, meta.recoveryEncDek.ct)
      setRecoveryDekHex(dekHex)
      setPin(''); setPinConfirm(''); setStep('new-pin')
    } catch { setError(t('pin.error.invalidRecovery')) }
    setBusy(false)
  }

  async function handleNewPin() {
    if (pin.length < 4) { setError(t('pin.error.tooShort')); return }
    if (pin !== pinConfirm) { setError(t('pin.error.noMatch')); return }
    setBusy(true); setError('')
    try {
      const meta = await getSecureMeta(sourceId)
      if (!meta) { setError(t('pin.error.noSecurityData')); setBusy(false); return }
      const newSalt = generateSaltHex()
      const kek = await deriveKeyFromPin(pin, newSalt)
      const newPinEncDek = await encryptStr(kek, recoveryDekHex)
      await setSecureMeta({ ...meta, pinSalt: newSalt, pinEncDek: newPinEncDek })
      await onSuccess(sourceId, recoveryDekHex)
    } catch { setError(t('pin.error.failedSetNewPin')) }
    setBusy(false)
  }

  const inp: React.CSSProperties = {
    border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: '8px 10px',
    fontSize: fs, outline: 'none', background: theme.bg, color: theme.text, width: '100%', boxSizing: 'border-box',
  }
  const btnPrimary: React.CSSProperties = {
    background: BRAND, color: '#fff', border: 'none', borderRadius: 6,
    padding: '9px 0', fontSize: fs, cursor: 'pointer', width: '100%',
  }
  const btnGhost: React.CSSProperties = {
    background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6,
    padding: '9px 0', fontSize: fs, cursor: 'pointer', color: theme.secondary, width: '100%',
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop closes on outside click
    <div role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <div style={{ background: theme.surface, borderRadius: 10, padding: 22, width: 272, boxShadow: '0 8px 32px rgba(0,0,0,0.28)', border: `1px solid ${theme.border}` }}>

        {step === 'enter' && (
          <>
            <p style={{ fontWeight: 700, fontSize: fs + 1, color: theme.text, margin: '0 0 4px' }}>{t('pin.unlock.title')}</p>
            <p style={{ fontSize: fs - 1, color: theme.muted, margin: '0 0 16px' }}>{sourceName}</p>
            {/* biome-ignore lint/a11y/noAutofocus: modal dialog should receive focus immediately */}
            <input type="password" placeholder={t('pin.unlock.pinPlaceholder')} autoFocus value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleUnlock() }}
              style={{ ...inp, marginBottom: 12 }} />
            {error && <p style={{ fontSize: fs - 2, color: theme.error, margin: '0 0 10px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button type="button" style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }} onClick={() => void handleUnlock()} disabled={busy}>
                {busy ? t('pin.unlock.submitting') : t('pin.unlock.submit')}
              </button>
              <button type="button" style={btnGhost} onClick={onClose}>{t('pin.cancel')}</button>
            </div>
            <button type="button"
              onClick={() => { setStep('forgot'); setError(''); setPin('') }}
              style={{ background: 'none', border: 'none', color: theme.primary, fontSize: fs - 2, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              {t('pin.unlock.forgotPin')}
            </button>
          </>
        )}

        {step === 'setup' && (
          <>
            <p style={{ fontWeight: 700, fontSize: fs + 1, color: theme.text, margin: '0 0 4px' }}>{t('pin.setup.title')}</p>
            <p style={{ fontSize: fs - 1, color: theme.muted, margin: '0 0 16px' }}>{sourceName}</p>
            {/* biome-ignore lint/a11y/noAutofocus: modal dialog should receive focus immediately */}
            <input type="password" placeholder={t('pin.setup.pinPlaceholder')} autoFocus value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSetupNext() }}
              style={{ ...inp, marginBottom: 8 }} />
            <input type="password" placeholder={t('pin.setup.confirmPlaceholder')} value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSetupNext() }}
              style={{ ...inp, marginBottom: 12 }} />
            {error && <p style={{ fontSize: fs - 2, color: theme.error, margin: '0 0 10px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={btnPrimary} onClick={handleSetupNext}>{t('pin.setup.next')}</button>
              <button type="button" style={btnGhost} onClick={onClose}>{t('pin.cancel')}</button>
            </div>
          </>
        )}

        {step === 'show-recovery' && (
          <>
            <p style={{ fontWeight: 700, fontSize: fs + 1, color: theme.text, margin: '0 0 8px' }}>{t('pin.setup.showRecovery.title')}</p>
            <p style={{ fontSize: fs - 1, color: theme.secondary, margin: '0 0 12px', lineHeight: 1.55 }}>
              {t('pin.setup.showRecovery.body')}
            </p>
            <div style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '10px 12px', marginBottom: 12, fontFamily: 'monospace', fontSize: fs - 1, color: theme.text, wordBreak: 'break-all', letterSpacing: '0.5px' }}>
              {generatedRecovery}
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: fs - 1, color: theme.secondary, marginBottom: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={recoveryAck} onChange={e => setRecoveryAck(e.target.checked)}
                style={{ marginTop: 2, accentColor: BRAND, cursor: 'pointer', flexShrink: 0 }} />
              {t('pin.setup.showRecovery.confirm')}
            </label>
            {error && <p style={{ fontSize: fs - 2, color: theme.error, margin: '0 0 10px' }}>{error}</p>}
            <button type="button"
              style={{ ...btnPrimary, opacity: recoveryAck && !busy ? 1 : 0.5, cursor: recoveryAck && !busy ? 'pointer' : 'not-allowed' }}
              disabled={!recoveryAck || busy}
              onClick={() => void handleSetupFinalize()}>
              {busy ? t('pin.setup.finishing') : t('pin.setup.finish')}
            </button>
          </>
        )}

        {step === 'forgot' && (
          <>
            <p style={{ fontWeight: 700, fontSize: fs + 1, color: theme.text, margin: '0 0 8px' }}>{t('pin.forgot.title')}</p>
            <p style={{ fontSize: fs - 1, color: theme.muted, margin: '0 0 12px' }}>{sourceName}</p>
            {/* biome-ignore lint/a11y/noAutofocus: modal dialog should receive focus immediately */}
            <input type="text" placeholder={t('pin.forgot.placeholder')} autoFocus value={recoveryInput}
              onChange={e => setRecoveryInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleForgotVerify() }}
              style={{ ...inp, fontFamily: 'monospace', marginBottom: 12 }} />
            {error && <p style={{ fontSize: fs - 2, color: theme.error, margin: '0 0 10px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }} onClick={() => void handleForgotVerify()} disabled={busy}>
                {busy ? t('pin.forgot.submitting') : t('pin.forgot.submit')}
              </button>
              <button type="button" style={btnGhost} onClick={() => { setStep('enter'); setError('') }}>{t('pin.back')}</button>
            </div>
          </>
        )}

        {step === 'new-pin' && (
          <>
            <p style={{ fontWeight: 700, fontSize: fs + 1, color: theme.text, margin: '0 0 8px' }}>{t('pin.newPin.title')}</p>
            {/* biome-ignore lint/a11y/noAutofocus: modal dialog should receive focus immediately */}
            <input type="password" placeholder={t('pin.newPin.pinPlaceholder')} autoFocus value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleNewPin() }}
              style={{ ...inp, marginBottom: 8 }} />
            <input type="password" placeholder={t('pin.newPin.confirmPlaceholder')} value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleNewPin() }}
              style={{ ...inp, marginBottom: 12 }} />
            {error && <p style={{ fontSize: fs - 2, color: theme.error, margin: '0 0 10px' }}>{error}</p>}
            <button type="button" style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }} onClick={() => void handleNewPin()} disabled={busy}>
              {busy ? t('pin.newPin.submitting') : t('pin.newPin.submit')}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

// ─── SourcesView ──────────────────────────────────────────────────────────────

function SourcesView({
  sources,
  activeSourceId,
  unlockedSources,
  onBack,
  onReload,
  onRequestUnlock,
  onRequestSetupPin,
  onLockSource,
  onRemoveSecurity,
  theme,
  prefs,
}: {
  sources: GlossarySource[]
  activeSourceId: string | 'all' | null
  unlockedSources: Set<string>
  onBack: () => void
  onReload: () => Promise<void>
  onRequestUnlock: (sourceId: string, then?: () => void) => void
  onRequestSetupPin: (sourceId: string) => void
  onLockSource: (sourceId: string) => void
  onRemoveSecurity: (sourceId: string) => Promise<void>
  theme: Theme
  prefs: Prefs
}) {
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newGlossaryMode, setNewGlossaryMode] = useState(false)
  const [newGlossaryName, setNewGlossaryName] = useState('')
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null)
  const [addTermSourceId, setAddTermSourceId] = useState<string | null>(null)
  const [newTerm, setNewTerm] = useState({ term: '', fullForm: '', definition: '' })
  const [managingSourceId, setManagingSourceId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [confirmDeleteSourceId, setConfirmDeleteSourceId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fs = prefs.fontSize
  const { t } = useLocale()
  const isBusy = loadingId !== null
  const isFirefox = /Firefox/.test(navigator.userAgent)

  function isLocked(sourceId: string) {
    return sources.find(s => s.id === sourceId)?.secured && !unlockedSources.has(sourceId)
  }

  async function importFileContent(content: string, filename: string, currentSources: GlossarySource[] = sources) {
    const id = crypto.randomUUID()
    setLoadingId(id)
    try {
      let terms: TermEntry[]
      let sourceName: string
      let author: string | null
      let authorUrl: string | null
      if (filename.toLowerCase().endsWith('.json')) {
        const { terms: jsonTerms, meta, name } = parseSourcePackJson(content)
        terms = jsonTerms.map((tt, i) => ({ ...tt, id: `${id}_${i}`, sourceId: id }))
        sourceName = uniqueName(name ?? autoName(filename, t), currentSources)
        author = meta.author
        authorUrl = meta.url
      } else {
        const { rows, meta } = parseCsv(content, true)
        terms = csvToTermEntries(rows, id)
        sourceName = uniqueName(autoName(filename, t), currentSources)
        author = meta.author
        authorUrl = meta.url
      }
      const source: GlossarySource = {
        id, name: sourceName, type: 'file', url: null,
        termCount: terms.length, lastLoaded: new Date().toISOString(),
        autoRefresh: false, secured: false, author, authorUrl,
      }
      await setSources([...currentSources, source])
      await setTerms(id, terms)
      await setActiveSourceId(id)
      await onReload()
    } catch (err) {
      setError((err as Error).message || t('sources.error.failedToLoad'))
    } finally {
      setLoadingId(null)
    }
  }

  // Firefox: popup closes when file dialog opens, so we open a separate importer window.
  // When that window saves the file to storage, pick it up here on mount or via listener.
  // biome-ignore lint/correctness/useExhaustiveDependencies: getSources() reads fresh state; stale importFileContent closure is safe
  useEffect(() => {
    async function checkPending() {
      const res = await chrome.storage.local.get('termbox_pending_import')
      const pending = res.termbox_pending_import as { content: string; filename: string } | undefined
      if (!pending || typeof pending.content !== 'string' || typeof pending.filename !== 'string') return
      await chrome.storage.local.remove('termbox_pending_import')
      const freshSources = await getSources()
      setError(null)
      await importFileContent(pending.content, pending.filename, freshSources)
    }
    void checkPending()
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.termbox_pending_import?.newValue) void checkPending()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function resetFooter() {
    setShowUrlInput(false)
    setNewGlossaryMode(false)
    setAddTermSourceId(null)
    setNewTerm({ term: '', fullForm: '', definition: '' })
    setError(null)
  }

  async function handleCreateGlossary() {
    const name = uniqueName(newGlossaryName.trim() || t('sources.newGlossary.defaultName'), sources)
    const id = crypto.randomUUID()
    const source: GlossarySource = {
      id, name, type: 'file', url: null,
      termCount: 0, lastLoaded: new Date().toISOString(), autoRefresh: false, secured: false,
      author: null, authorUrl: null,
    }
    await setSources([...sources, source])
    await setTerms(id, [])
    await setActiveSourceId(id)
    resetFooter()
    await onReload()
  }

  async function handleAddTerm() {
    if (!addTermSourceId) return
    const { term, fullForm, definition } = newTerm
    if (!term.trim() || !definition.trim()) return
    const src = sources.find(s => s.id === addTermSourceId)
    let existing: TermEntry[]
    let save: (terms: TermEntry[]) => Promise<void>
    if (src?.secured) {
      const dek = await getSessionDek(addTermSourceId)
      if (!dek) return
      existing = await getSecureTerms(addTermSourceId, dek)
      save = terms => setSecureTerms(addTermSourceId, terms, dek)
    } else {
      existing = await getTerms(addTermSourceId)
      save = terms => setTerms(addTermSourceId, terms)
    }
    const entry: TermEntry = {
      id: `${addTermSourceId}_${existing.length}`,
      term: term.trim(),
      fullForm: fullForm.trim() || null,
      definition: definition.trim(),
      domain: null, sourceReference: null, aliases: [],
      sourceId: addTermSourceId,
    }
    const updated = [...existing, entry]
    await save(updated)
    await setSources(sources.map(s =>
      s.id === addTermSourceId ? { ...s, termCount: updated.length, lastLoaded: new Date().toISOString() } : s
    ))
    setNewTerm({ term: '', fullForm: '', definition: '' })
    await onReload()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError(null)
    const text = await loadFromFile(file)
    await importFileContent(text, file.name)
  }

  async function handleRefresh(source: GlossarySource) {
    if (!source.url) return
    setError(null)
    const granted = await requestOriginPermission(source.url)
    if (!granted) {
      setError(t('sources.error.permissionNotGranted'))
      return
    }
    setLoadingId(source.id)
    try {
      const text = await loadFromUrl(source.url)
      const { rows, meta } = parseCsv(text, true)
      const terms = csvToTermEntries(rows, source.id)
      const updated: GlossarySource = { ...source, termCount: terms.length, lastLoaded: new Date().toISOString(), author: meta.author ?? source.author, authorUrl: meta.url ?? source.authorUrl }
      await setSources(sources.map(s => s.id === source.id ? updated : s))
      await setTerms(source.id, terms)
      await onReload()
    } catch (err) {
      setError((err as Error).message || t('sources.error.failedToRefresh'))
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(sourceId: string) {
    if (isLocked(sourceId)) {
      onRequestUnlock(sourceId, () => { void handleDelete(sourceId) })
      return
    }
    const src = sources.find(s => s.id === sourceId)
    const newSources = sources.filter(s => s.id !== sourceId)
    await setSources(newSources)
    if (src?.secured) {
      await deleteEncryptedBlob(sourceId)
      await deleteSecureMeta(sourceId)
      await clearSessionDek(sourceId)
    } else {
      await deleteTerms(sourceId)
    }
    const newActiveId: string | 'all' | null =
      activeSourceId === sourceId
        ? (newSources.length > 0 ? newSources[0].id : null)
        : activeSourceId
    await setActiveSourceId(newActiveId)
    await onReload()
  }

  async function handleSetActive(id: string | 'all') {
    if (id !== 'all' && isLocked(id)) {
      onRequestUnlock(id, () => { void setActiveSourceId(id).then(onReload) })
      return
    }
    await setActiveSourceId(id)
    await onReload()
  }

  async function handleDownload(source: GlossarySource) {
    if (isLocked(source.id)) {
      onRequestUnlock(source.id, () => { void handleDownload(source) })
      return
    }
    let terms: TermEntry[]
    if (source.secured) {
      const dek = await getSessionDek(source.id)
      if (!dek) return
      terms = await getSecureTerms(source.id, dek)
    } else {
      terms = await getTerms(source.id)
    }
    const csv = termEntriesToCsv(terms)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${source.name.toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setDownloadMenuId(null)
  }

  async function handleDownloadJson(source: GlossarySource) {
    if (isLocked(source.id)) {
      onRequestUnlock(source.id, () => { void handleDownloadJson(source) })
      return
    }
    let terms: TermEntry[]
    if (source.secured) {
      const dek = await getSessionDek(source.id)
      if (!dek) return
      terms = await getSecureTerms(source.id, dek)
    } else {
      terms = await getTerms(source.id)
    }
    const json = termEntriesToSourcePackJson(terms, { name: source.name, author: source.author, authorUrl: source.authorUrl })
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${source.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
    setDownloadMenuId(null)
  }

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px 6px', borderRadius: 4, color: theme.muted, fontSize: 14, lineHeight: 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bg }}>

      {/* Header */}
      <header style={{ background: BRAND, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, padding: '0 4px 0 0', lineHeight: 1, opacity: 0.85 }}>
          ←
        </button>
        <span style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{t('sources.title')}</span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* All sources toggle */}
        {sources.length > 1 && (
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, background: theme.surface }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: fs }}>
              <input
                type="radio" name="activeSource"
                checked={activeSourceId === 'all'}
                onChange={() => { void handleSetActive('all') }}
                style={{ accentColor: BRAND, cursor: 'pointer', margin: 0 }}
              />
              <span style={{ color: theme.text, fontWeight: 500 }}>{t('sources.allSources')}</span>
              <span style={{ color: theme.muted, fontSize: fs - 1 }}>
                {t('sources.allSourcesCount', { count: sources.reduce((n, s) => n + s.termCount, 0) })}
              </span>
            </label>
          </div>
        )}

        {/* Source list */}
        {sources.length === 0 && (
          <p style={{ color: theme.muted, fontSize: fs, padding: '20px 14px' }}>{t('sources.noSources')}</p>
        )}
        {sources.map(source => {
          // biome-ignore lint/a11y/noStaticElementInteractions: hover highlight only, child elements are interactive
          return <div key={source.id}
            onMouseEnter={() => setHoveredId(source.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              padding: '10px 14px', borderBottom: `1px solid ${theme.border}`,
              background: hoveredId === source.id ? theme.bg : theme.surface,
              transition: 'background-color 0.1s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}>
                <input
                  type="radio" name="activeSource"
                  checked={activeSourceId === source.id || (sources.length === 1 && activeSourceId !== 'all')}
                  onChange={() => { void handleSetActive(source.id) }}
                  style={{ accentColor: BRAND, cursor: 'pointer', margin: 0, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: fs, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {source.name}
                  </div>
                  <div style={{ fontSize: fs - 2, color: theme.muted, marginTop: 2 }}>
                    {source.termCount !== 1 ? t('sources.termCountPlural', { count: source.termCount }) : t('sources.termCount', { count: source.termCount })} · {t('sources.loadedAgo', { ago: timeAgo(t, source.lastLoaded) })}
                  </div>
                </div>
              </label>
              {/* Lock icon */}
              {(() => {
                const secured = source.secured
                const unlocked = unlockedSources.has(source.id)
                const color = secured ? (unlocked ? '#16a34a' : '#f97316') : theme.muted
                const label = secured
                  ? (unlocked ? t('sources.lock.securedUnlocked') : t('sources.lock.locked'))
                  : t('sources.lock.addPin')
                return (
                  <button type="button" title={label} disabled={isBusy}
                    onClick={() => {
                      if (!secured) { onRequestSetupPin(source.id); return }
                      if (!unlocked) { onRequestUnlock(source.id); return }
                      setManagingSourceId(managingSourceId === source.id ? null : source.id)
                    }}
                    style={{ ...iconBtn, color, fontSize: 15, opacity: isBusy ? 0.4 : 1 }}>
                    {secured && unlocked ? '🔓' : '🔒'}
                  </button>
                )
              })()}
              {source.type === 'url' && (
                <button type="button"
                  onClick={() => { void handleRefresh(source) }}
                  disabled={isBusy}
                  title={t('sources.refresh.title')}
                  style={{ ...iconBtn, fontSize: 18, opacity: isBusy ? 0.4 : 1 }}>
                  {loadingId === source.id ? '⌛' : '↻'}
                </button>
              )}
              <button type="button"
                onClick={() => {
                  if (isLocked(source.id)) { onRequestUnlock(source.id, () => { resetFooter(); setAddTermSourceId(source.id) }); return }
                  resetFooter(); setAddTermSourceId(source.id)
                }}
                disabled={isBusy}
                title={t('sources.addTerm.title')}
                style={{ ...iconBtn, fontSize: 16, opacity: isBusy ? 0.4 : 1 }}>
                +
              </button>
              <div style={{ position: 'relative' }}>
                <button type="button"
                  onClick={() => setDownloadMenuId(downloadMenuId === source.id ? null : source.id)}
                  disabled={isBusy}
                  title={t('sources.download.title')}
                  style={{ ...iconBtn, fontSize: 15, opacity: isBusy ? 0.4 : 1 }}>
                  ↓
                </button>
                {downloadMenuId === source.id && (<>
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: dismiss overlay */}
                  <div role="presentation"
                    style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                    onClick={() => setDownloadMenuId(null)}
                    onKeyDown={e => { if (e.key === 'Escape') setDownloadMenuId(null) }}
                  />
                  <div role="menu"
                    style={{ position: 'absolute', top: '100%', right: 0, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 11, minWidth: 90, overflow: 'hidden' }}>
                    <button type="button" role="menuitem"
                      onClick={() => { void handleDownload(source) }}
                      style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: prefs.fontSize - 1, color: theme.text, fontFamily: 'inherit' }}>
                      {t('sources.download.csv')}
                    </button>
                    <button type="button" role="menuitem"
                      onClick={() => { void handleDownloadJson(source) }}
                      style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: prefs.fontSize - 1, color: theme.text, fontFamily: 'inherit' }}>
                      {t('sources.download.json')}
                    </button>
                  </div>
                </>)}
              </div>
              <button type="button"
                onClick={() => setConfirmDeleteSourceId(source.id)}
                disabled={isBusy}
                title={t('sources.delete.title')}
                style={{ ...iconBtn, color: theme.error, opacity: isBusy ? 0.4 : 1 }}>
                ✕
              </button>
            </div>
            {/* Lock-manage dropdown for secured+unlocked sources */}
            {managingSourceId === source.id && (
              <div style={{ marginTop: 8, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 6, overflow: 'hidden' }}>
                <button type="button"
                  onClick={() => { onLockSource(source.id); setManagingSourceId(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', fontSize: fs - 1, cursor: 'pointer', color: theme.text, fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.surface)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  {t('sources.lock.lockNow')}
                </button>
                <button type="button"
                  onClick={() => { void onRemoveSecurity(source.id); setManagingSourceId(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', fontSize: fs - 1, cursor: 'pointer', color: theme.error, fontFamily: 'inherit', borderTop: `1px solid ${theme.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.surface)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  {t('sources.lock.removePin')}
                </button>
              </div>
            )}
            {confirmDeleteSourceId === source.id && (
              <div style={{ marginTop: 8, background: theme.bg, border: `1px solid ${theme.error}55`, borderRadius: 6, padding: '10px 12px' }}>
                <p style={{ fontSize: fs - 1, color: theme.text, margin: '0 0 8px', fontWeight: 600 }}>
                  {t('sources.delete.confirm', { name: source.name })}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button"
                    onClick={() => { void handleDelete(source.id); setConfirmDeleteSourceId(null) }}
                    style={{ flex: 1, background: theme.error, color: '#fff', border: 'none', borderRadius: 5, padding: '6px 0', fontSize: fs - 1, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t('sources.delete.delete')}
                  </button>
                  <button type="button"
                    onClick={() => setConfirmDeleteSourceId(null)}
                    style={{ flex: 1, background: 'none', border: `1px solid ${theme.border}`, borderRadius: 5, padding: '6px 0', fontSize: fs - 1, cursor: 'pointer', color: theme.secondary, fontFamily: 'inherit' }}>
                    {t('sources.delete.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        })}

        {/* Error */}
        {error && (
          <div style={{ margin: '12px 14px', padding: '10px 12px', background: `${theme.error}18`, borderRadius: 6, border: `1px solid ${theme.error}55` }}>
            <p style={{ fontSize: fs - 1, color: theme.error, lineHeight: 1.5, margin: 0 }}>{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${theme.border}`, padding: 14, background: theme.surface, flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={handleFile} />

        {addTermSourceId ? (
          /* ── Add term form ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: fs - 1, color: theme.muted }}>
              {t('sources.addTerm.addingTo', { name: sources.find(s => s.id === addTermSourceId)?.name ?? '' })}
            </span>
            <input
              type="text" placeholder={t('sources.addTerm.termPlaceholder')} value={newTerm.term}
              onChange={e => setNewTerm(t => ({ ...t, term: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Escape') resetFooter() }}
              style={{ border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: fs, outline: 'none', background: theme.bg, color: theme.text }}
            />
            <input
              type="text" placeholder={t('sources.addTerm.fullFormPlaceholder')} value={newTerm.fullForm}
              onChange={e => setNewTerm(prev => ({ ...prev, fullForm: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Escape') resetFooter() }}
              style={{ border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: fs, outline: 'none', background: theme.bg, color: theme.text }}
            />
            <input
              type="text" placeholder={t('sources.addTerm.definitionPlaceholder')} value={newTerm.definition}
              onChange={e => setNewTerm(prev => ({ ...prev, definition: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && newTerm.term.trim() && newTerm.definition.trim()) { void handleAddTerm() } else if (e.key === 'Escape') resetFooter() }}
              style={{ border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: fs, outline: 'none', background: theme.bg, color: theme.text }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                onClick={() => { void handleAddTerm() }}
                disabled={!newTerm.term.trim() || !newTerm.definition.trim()}
                style={{
                  flex: 1, background: BRAND, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '8px 0', fontSize: fs,
                  cursor: newTerm.term.trim() && newTerm.definition.trim() ? 'pointer' : 'not-allowed',
                  opacity: newTerm.term.trim() && newTerm.definition.trim() ? 1 : 0.5,
                }}>
                {t('sources.addTerm.add')}
              </button>
              <button type="button" onClick={resetFooter}
                style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 12px', fontSize: fs, cursor: 'pointer', color: theme.secondary }}>
                {t('sources.addTerm.done')}
              </button>
            </div>
          </div>

        ) : newGlossaryMode ? (
          /* ── New glossary name input ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text" placeholder={t('sources.newGlossary.namePlaceholder')} value={newGlossaryName}
              onChange={e => setNewGlossaryName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { void handleCreateGlossary() } else if (e.key === 'Escape') resetFooter() }}
              style={{ border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: fs, outline: 'none', background: theme.bg, color: theme.text }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                onClick={() => { void handleCreateGlossary() }}
                style={{ flex: 1, background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: fs, cursor: 'pointer' }}>
                {t('sources.newGlossary.create')}
              </button>
              <button type="button" onClick={resetFooter}
                style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 12px', fontSize: fs, cursor: 'pointer', color: theme.secondary }}>
                {t('sources.newGlossary.cancel')}
              </button>
            </div>
          </div>

        ) : showUrlInput ? (
          /* ── URL not available notice ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '10px 12px', background: theme.bg, borderRadius: 6, border: `1px solid ${theme.border}` }}>
              <p style={{ fontSize: fs - 1, color: theme.text, margin: '0 0 4px', fontWeight: 600 }}>
                {t('sources.url.notAvailableTitle')}
              </p>
              <p style={{ fontSize: fs - 1, color: theme.secondary, margin: 0, lineHeight: 1.55 }}>
                {t('sources.url.notAvailableBody')}
              </p>
            </div>
            <button type="button" onClick={resetFooter}
              style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 12px', fontSize: fs, cursor: 'pointer', color: theme.secondary, alignSelf: 'flex-end' }}>
              {t('sources.url.dismiss')}
            </button>
          </div>

        ) : (
          /* ── Default buttons ── */
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button"
              onClick={() => {
                if (isFirefox) {
                  void chrome.windows.create({ url: chrome.runtime.getURL('importer.html'), type: 'popup', width: 380, height: 200 })
                } else {
                  fileInputRef.current?.click()
                }
              }}
              disabled={isBusy}
              style={{ flex: 1, background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 0', fontSize: fs, cursor: isBusy ? 'not-allowed' : 'pointer', color: theme.text, opacity: isBusy ? 0.5 : 1 }}>
              {t('sources.btn.addFromFile')}
            </button>
            <button type="button"
              onClick={() => { resetFooter(); setNewGlossaryMode(true) }}
              disabled={isBusy}
              style={{ flex: 1, background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '8px 0', fontSize: fs, cursor: isBusy ? 'not-allowed' : 'pointer', color: theme.text, opacity: isBusy ? 0.5 : 1 }}>
              {t('sources.btn.newGlossary')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BrowseView ──────────────────────────────────────────────────────────────

function BrowseView({
  glossary, sources, activeSourceId, unlockedSources, onBack, onRequestUnlock, theme, prefs,
}: {
  glossary: TermEntry[]
  sources: GlossarySource[]
  activeSourceId: string | 'all' | null
  unlockedSources: Set<string>
  onBack: () => void
  onRequestUnlock: (sourceId: string) => void
  theme: Theme
  prefs: Prefs
}) {
  const fs = prefs.fontSize
  const { t } = useLocale()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const activeSrc = sources.find(s => s.id === activeSourceId)
  const isLocked = activeSrc?.secured && !unlockedSources.has(activeSrc.id)
  const showSourceBadge = activeSourceId === 'all'
  const sourceMap = Object.fromEntries(sources.map(s => [s.id, s.name]))
  const subtitle = activeSourceId === 'all' ? t('browse.allSources') : (activeSrc?.name ?? '')

  const sorted = [...glossary].sort((a, b) =>
    a.term.localeCompare(b.term, undefined, { sensitivity: 'base' })
  )
  const groups: { letter: string; terms: TermEntry[] }[] = []
  for (const entry of sorted) {
    const letter = /[a-zA-Z]/.test(entry.term[0] ?? '') ? entry.term[0]?.toUpperCase() ?? '#' : '#'
    const last = groups[groups.length - 1]
    if (last?.letter === letter) last.terms.push(entry)
    else groups.push({ letter, terms: [entry] })
  }

  function copyDef(id: string, definition: string) {
    void navigator.clipboard.writeText(definition).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(prev => prev === id ? null : prev), 1500)
    })
  }

  const hdrBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: '#fff', fontSize: fs,
    cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bg }}>
      <header style={{ background: BRAND, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button type="button" onClick={onBack} style={{ ...hdrBtn, fontSize: 18, padding: '0 4px' }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{t('browse.title')}</span>
          {subtitle && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </div>
          )}
        </div>
        {!isLocked && glossary.length > 0 && (
          <span style={{ fontSize: fs - 2, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>
            {t('browse.termCount', { count: glossary.length })}
          </span>
        )}
      </header>

      {isLocked ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
          <span style={{ fontSize: 40, marginBottom: 14 }}>🔒</span>
          <p style={{ fontSize: fs, color: theme.text, fontWeight: 600, margin: '0 0 6px', textAlign: 'center' }}>
            {t('browse.lockedTitle', { name: activeSrc?.name ?? '' })}
          </p>
          <p style={{ fontSize: fs - 1, color: theme.muted, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
            {t('browse.lockedBody')}
          </p>
          <button type="button"
            onClick={() => { if (activeSrc) onRequestUnlock(activeSrc.id) }}
            style={{ background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '9px 24px', fontSize: fs, cursor: 'pointer' }}>
            {t('browse.enterPin')}
          </button>
        </div>
      ) : glossary.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: fs, color: theme.muted, textAlign: 'center' }}>{t('browse.noTerms')}</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(({ letter, terms }) => (
            <div key={letter}>
              <div style={{
                position: 'sticky', top: 0, zIndex: 1,
                background: theme.border, color: theme.secondary,
                fontSize: fs - 2, fontWeight: 700, letterSpacing: '0.5px',
                padding: '3px 14px',
              }}>
                {letter}
              </div>
              {terms.map(term => {
                const isExpanded = expanded === term.id
                const isCopied = copiedId === term.id
                return (
                  <button key={term.id} type="button"
                    onMouseEnter={() => setHoveredId(term.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => { copyDef(term.id, term.definition); setExpanded(isExpanded ? null : term.id) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 14px',
                      border: 'none', borderBottom: `1px solid ${theme.border}`,
                      cursor: 'pointer',
                      background: isExpanded || hoveredId === term.id ? theme.bg : theme.surface,
                      transition: 'background-color 0.1s',
                      fontFamily: 'inherit',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: fs, color: theme.text }}>{term.term}</strong>
                      {term.fullForm && (
                        <span style={{ fontSize: fs - 1, color: theme.secondary }}>{term.fullForm}</span>
                      )}
                      {term.domain && (
                        <span style={{ fontSize: fs - 2, color: theme.tagText, background: theme.tag, borderRadius: 4, padding: '1px 6px' }}>
                          {term.domain}
                        </span>
                      )}
                      {showSourceBadge && sourceMap[term.sourceId] && (
                        <span style={{ fontSize: fs - 2, color: theme.muted, background: theme.border, borderRadius: 4, padding: '1px 6px', marginLeft: 'auto' }}>
                          {sourceMap[term.sourceId]}
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: fs - 1, color: theme.secondary, lineHeight: 1.5, margin: 0,
                      background: isCopied ? '#fef9c3' : 'transparent',
                      borderRadius: isCopied ? 4 : 0,
                      padding: isCopied ? '3px 5px' : '0',
                      transition: 'background 0.25s',
                    }}>
                      {term.definition}
                    </p>
                    {isCopied && (
                      <p style={{ fontSize: fs - 2, color: '#92400e', margin: '4px 0 0', textAlign: 'right' }}>
                        {t('browse.copied')}
                      </p>
                    )}
                    {isExpanded && term.aliases.length > 0 && (
                      <p style={{ fontSize: fs - 2, color: theme.muted, margin: '5px 0 0' }}>
                        {t('browse.alsoKnownAs', { aliases: term.aliases.join(', ') })}
                      </p>
                    )}
                    {isExpanded && term.sourceReference && (
                      <p style={{ fontSize: fs - 2, color: theme.muted, margin: '4px 0 0' }}>
                        {t('browse.sourceRef', { ref: term.sourceReference })}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SearchView ───────────────────────────────────────────────────────────────

function SearchView({
  sources,
  activeSourceId,
  glossary,
  unlockedSources,
  onOpenSources,
  onOpenBrowse,
  onOpenAbout,
  onReload,
  onRequestUnlock,
  theme,
  prefs,
  size,
  setSize,
}: {
  sources: GlossarySource[]
  activeSourceId: string | 'all' | null
  glossary: TermEntry[]
  unlockedSources: Set<string>
  onOpenSources: () => void
  onOpenBrowse: () => void
  onOpenAbout: () => void
  onReload: () => Promise<void>
  onRequestUnlock: (sourceId: string) => void
  theme: Theme
  prefs: Prefs
  size: { w: number; h: number }
  setSize: (v: { w: number; h: number }) => void
}) {
  const [query, setQuery] = useState(() => {
    try { return localStorage.getItem('lastQuery') ?? '' } catch { return '' }
  })
  const [searchMode, setSearchMode] = useState<'term' | 'definition'>(() => {
    try { return (localStorage.getItem('lastSearchMode') as 'term' | 'definition') ?? 'term' } catch { return 'term' }
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [showLangModal, setShowLangModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ term: '', fullForm: '', definition: '' })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => { setContextMenu(null); setConfirmDeleteId(null) }
    document.addEventListener('click', close)
    document.addEventListener('contextmenu', close)
    return () => { document.removeEventListener('click', close); document.removeEventListener('contextmenu', close) }
  }, [contextMenu])

  function copyDefinition(id: string, definition: string) {
    void navigator.clipboard.writeText(definition).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(prev => prev === id ? null : prev), 1500)
    })
  }

  function openContextMenu(e: React.MouseEvent, r: SearchResult) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ id: r.id, x: e.clientX, y: e.clientY })
  }

  function startEdit(r: SearchResult) {
    setEditingId(r.id)
    setEditForm({ term: r.term, fullForm: r.fullForm ?? '', definition: r.definition })
    setContextMenu(null)
  }

  async function handleEditSave(r: SearchResult) {
    if (!editForm.term.trim() || !editForm.definition.trim()) return
    const patch = { term: editForm.term.trim(), fullForm: editForm.fullForm.trim() || null, definition: editForm.definition.trim() }
    const src = sources.find(s => s.id === r.sourceId)
    if (src?.secured) {
      const dek = await getSessionDek(r.sourceId)
      if (!dek) return
      const terms = await getSecureTerms(r.sourceId, dek)
      await setSecureTerms(r.sourceId, terms.map(t => t.id === r.id ? { ...t, ...patch } : t), dek)
    } else {
      const terms = await getTerms(r.sourceId)
      await setTerms(r.sourceId, terms.map(t => t.id === r.id ? { ...t, ...patch } : t))
    }
    setResults(prev => prev.map(x => x.id === r.id ? { ...x, ...patch } : x))
    setEditingId(null)
    await onReload()
  }

  async function handleTermDelete(r: SearchResult) {
    const src = sources.find(s => s.id === r.sourceId)
    let updated: TermEntry[]
    if (src?.secured) {
      const dek = await getSessionDek(r.sourceId)
      if (!dek) return
      const terms = await getSecureTerms(r.sourceId, dek)
      updated = terms.filter(t => t.id !== r.id)
      await setSecureTerms(r.sourceId, updated, dek)
    } else {
      const terms = await getTerms(r.sourceId)
      updated = terms.filter(t => t.id !== r.id)
      await setTerms(r.sourceId, updated)
    }
    await setSources((await getSources()).map(s => s.id === r.sourceId ? { ...s, termCount: updated.length } : s))
    setResults(prev => prev.filter(x => x.id !== r.id))
    setContextMenu(null)
    setConfirmDeleteId(null)
    await onReload()
  }

  const didAutoSearch = useRef(false)
  const fs = prefs.fontSize
  const { t, locale } = useLocale()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (didAutoSearch.current || glossary.length === 0) return
    const q = query.trim()
    if (q.length < 2) return
    didAutoSearch.current = true
    const { results: ranked, hasMore: more } = rankTerms(glossary, q, searchMode)
    setResults(ranked)
    setHasMore(more)
    setHasSearched(true)
  }, [glossary, query, searchMode])

  const handleSearch = useCallback(() => {
    const q = query.trim()
    if (q.length < 2 || glossary.length === 0) return
    setHasSearched(true)
    const { results: ranked, hasMore: more } = rankTerms(glossary, q, searchMode)
    setResults(ranked)
    setHasMore(more)
    try { localStorage.setItem('lastQuery', q) } catch {}
  }, [query, searchMode, glossary])

  const makeResizer = (edges: { right?: boolean; left?: boolean; bottom?: boolean }) => (e: React.MouseEvent) => {
    e.preventDefault()
    // movementX/Y are screenX-based deltas, unaffected by the popup window
    // repositioning that happens when Chrome re-anchors a right-anchored popup.
    // Left-edge resize inverts movementX: dragging left (negative) widens the popup.
    let w = size.w, h = size.h
    const onMove = (ev: MouseEvent) => {
      if (edges.right)  w = Math.max(280, Math.min(700, w + ev.movementX))
      if (edges.left)   w = Math.max(280, Math.min(700, w - ev.movementX))
      if (edges.bottom) h = Math.max(220, Math.min(550, h + ev.movementY))
      setSize({ w: Math.round(w), h: Math.round(h) })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const noSources = sources.length === 0
  const activeSrc = activeSourceId && activeSourceId !== 'all'
    ? sources.find(s => s.id === activeSourceId) ?? sources[0]
    : null
  const activeIsLocked = activeSrc?.secured && !unlockedSources.has(activeSrc.id)
  const canSearch = query.trim().length >= 2 && !noSources && !activeIsLocked
  const sourceMap = Object.fromEntries(sources.map(s => [s.id, s.name]))
  const showSourceBadge = sources.length > 1

  const activeSourceLabel =
    sources.length === 0 ? null
    : activeSourceId === 'all' ? t('search.allSources')
    : sources.find(s => s.id === activeSourceId)?.name ?? sources[0]?.name ?? null

  const hdrBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
    color: '#fff', cursor: 'pointer', padding: '3px 7px', fontSize: 11, lineHeight: 1.4,
    fontFamily: 'inherit',
  }
  const edgeH:  React.CSSProperties = { position: 'absolute', bottom: 0, left: 14, right: 14, height: 5, cursor: 'ns-resize', zIndex: 10 }
  const edgeVR: React.CSSProperties = { position: 'absolute', top: 0, right: 0, width: 5, bottom: 14, cursor: 'ew-resize', zIndex: 10 }
  const edgeVL: React.CSSProperties = { position: 'absolute', top: 0, left: 0,  width: 5, bottom: 14, cursor: 'ew-resize', zIndex: 10 }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: theme.bg, overflow: 'hidden' }}>

      {/* Resize handles — pointer-only drag controls, no keyboard equivalent */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle */}
      <div style={edgeH}  onMouseDown={makeResizer({ bottom: true })} />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle */}
      <div style={edgeVR} onMouseDown={makeResizer({ right: true })} />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle */}
      <div style={edgeVL} onMouseDown={makeResizer({ left: true })} />
      {/* Bottom-right corner */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle */}
      <div
        onMouseDown={makeResizer({ right: true, bottom: true })}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, cursor: 'nwse-resize', zIndex: 11 }}>
        <svg aria-hidden="true" width="9" height="9" viewBox="0 0 9 9" style={{ position: 'absolute', right: 2, bottom: 2 }}>
          <path d="M9 3 L3 9 M9 6 L6 9 M9 0 L0 9" stroke={theme.muted} strokeWidth="1.2" opacity="0.5" />
        </svg>
      </div>
      {/* Bottom-left corner */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle */}
      <div
        onMouseDown={makeResizer({ left: true, bottom: true })}
        style={{ position: 'absolute', left: 0, bottom: 0, width: 14, height: 14, cursor: 'nesw-resize', zIndex: 11 }}>
        <svg aria-hidden="true" width="9" height="9" viewBox="0 0 9 9" style={{ position: 'absolute', left: 2, bottom: 2 }}>
          <path d="M0 3 L6 9 M0 6 L3 9 M0 0 L9 9" stroke={theme.muted} strokeWidth="1.2" opacity="0.5" />
        </svg>
      </div>

      {/* Header */}
      <header style={{ background: BRAND, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 20, letterSpacing: '-0.3px' }}>TermBox</span>
          {activeSourceLabel && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {activeSourceLabel}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" style={hdrBtn} title={t('header.decreaseFontSize')} onClick={() => prefs.setFontSize(Math.max(11, prefs.fontSize - 1))}>A−</button>
          <button type="button" style={hdrBtn} title={t('header.increaseFontSize')} onClick={() => prefs.setFontSize(Math.min(17, prefs.fontSize + 1))}>A+</button>
          <button type="button" style={hdrBtn} title={prefs.dark ? t('header.lightMode') : t('header.darkMode')} onClick={() => prefs.setDark(!prefs.dark)}>
            {prefs.dark ? '☀' : '☾'}
          </button>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.3)', margin: '0 3px', flexShrink: 0 }} />
          <button type="button" onClick={onOpenBrowse} style={hdrBtn} title={t('header.browseAZ')}>Az</button>
          <button type="button" onClick={onOpenSources} style={{ ...hdrBtn, fontSize: 17, padding: '1px 6px' }} title={t('header.manageSources')}>≡</button>
          <button type="button" onClick={onOpenAbout} style={{ ...hdrBtn, fontSize: 15, padding: '1px 6px' }} title={t('header.about')}>ⓘ</button>
          <button type="button"
            title={t('header.language')}
            onClick={() => setShowLangModal(true)}
            style={{ ...hdrBtn, fontSize: 10, letterSpacing: '0.5px', padding: '3px 6px', fontWeight: 700 }}>
            {locale.toUpperCase()}
          </button>
        </div>
      </header>
      {showLangModal && (
        <LanguageModal theme={theme} prefs={prefs} onClose={() => setShowLangModal(false)} />
      )}

      {/* Empty state when no sources */}
      {noSources ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', background: theme.bg }}>
          <svg aria-hidden="true" width="48" height="48" fill="none" stroke={theme.muted} strokeWidth={1.2} viewBox="0 0 24 24" style={{ marginBottom: 16, opacity: 0.45 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <p style={{ fontSize: fs, color: theme.muted, marginBottom: 16, textAlign: 'center', lineHeight: 1.5 }}>
            {t('search.empty.body')}
          </p>
          <button type="button"
            onClick={onOpenSources}
            style={{ background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: fs, cursor: 'pointer' }}>
            {t('search.empty.addGlossary')}
          </button>
        </div>
      ) : activeIsLocked ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', background: theme.bg }}>
          <span style={{ fontSize: 40, marginBottom: 14 }}>🔒</span>
          <p style={{ fontSize: fs, color: theme.text, fontWeight: 600, margin: '0 0 6px', textAlign: 'center' }}>
            {t('search.lockedTitle', { name: activeSrc?.name ?? '' })}
          </p>
          <p style={{ fontSize: fs - 1, color: theme.muted, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
            {t('search.lockedBody')}
          </p>
          <button type="button"
            onClick={() => { if (activeSrc) onRequestUnlock(activeSrc.id) }}
            style={{ background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '9px 24px', fontSize: fs, cursor: 'pointer' }}>
            {t('search.enterPin')}
          </button>
        </div>
      ) : (
        <>
          {/* Search panel */}
          <div style={{ background: theme.surface, padding: '12px 14px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('search.placeholder')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canSearch) handleSearch() }}
                style={{
                  flex: 1, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
                  padding: '7px 10px', fontSize: fs, outline: 'none',
                  background: theme.bg, color: theme.text,
                }}
              />
              <button type="button"
                onClick={handleSearch}
                disabled={!canSearch}
                style={{
                  background: BRAND, border: 'none', borderRadius: 6, padding: '0 13px',
                  cursor: canSearch ? 'pointer' : 'not-allowed', opacity: canSearch ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                <svg aria-hidden="true" width="15" height="15" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24">
                  <circle cx={11} cy={11} r={8} />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
              </button>
              {hasSearched && (
                <button type="button" title={t('search.clearSearch')}
                  onClick={() => {
                    setQuery(''); setResults([]); setHasSearched(false); setHasMore(false)
                    didAutoSearch.current = false
                    try { localStorage.removeItem('lastQuery') } catch {}
                  }}
                  style={{
                    background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6,
                    padding: '0 10px', cursor: 'pointer', color: theme.muted, fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: 'flex', marginTop: 9, background: theme.bg, borderRadius: 6, padding: 2, border: `1px solid ${theme.border}` }}>
              {(['term', 'definition'] as const).map(mode => (
                <button key={mode} type="button"
                  onClick={() => { setSearchMode(mode); try { localStorage.setItem('lastSearchMode', mode) } catch {} }}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: fs - 1, border: 'none', borderRadius: 4,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: searchMode === mode ? BRAND : 'transparent',
                    color: searchMode === mode ? '#fff' : theme.secondary,
                    fontWeight: searchMode === mode ? 600 : 400,
                    transition: 'background-color 0.15s, color 0.15s',
                  }}>
                  {mode === 'term' ? t('search.mode.term') : t('search.mode.definition')}
                </button>
              ))}
            </div>
          </div>

          {/* Results area */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {!hasSearched && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px 56px', color: theme.muted }}>
                <svg aria-hidden="true" width="54" height="54" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24" style={{ marginBottom: 12, opacity: 0.35 }}>
                  <circle cx={11} cy={11} r={8} />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                <p style={{ fontSize: fs, margin: 0, opacity: 0.6 }}>{t('search.idle')}</p>
              </div>
            )}

            {hasSearched && results.length === 0 && (
              <p style={{ fontSize: fs, color: theme.muted, padding: '14px 16px' }}>
                {t('search.noResults', { query })}
              </p>
            )}

            {results.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {results.map(r => (
                  <li
                    key={r.id}
                    style={{
                      padding: '10px 14px', borderBottom: `1px solid ${theme.border}`,
                      cursor: editingId === r.id ? 'default' : 'pointer',
                      background: expanded === r.id || hoveredId === r.id ? theme.bg : theme.surface,
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={() => { if (editingId !== r.id) setHoveredId(r.id) }}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => { if (editingId === r.id) return; copyDefinition(r.id, r.definition); setExpanded(expanded === r.id ? null : r.id) }}
                    onContextMenu={e => openContextMenu(e, r)}
                    onKeyDown={(e) => { if (editingId === r.id) return; if (e.key === 'Enter' || e.key === ' ') { copyDefinition(r.id, r.definition); setExpanded(expanded === r.id ? null : r.id) } }}>

                    {editingId === r.id ? (
                      /* ── Inline edit form ── */
                      // biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper only
                      <div role="presentation" style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                        {/* biome-ignore lint/a11y/noAutofocus: focus moves to edit field when inline edit opens */}
                        <input autoFocus value={editForm.term}
                          onChange={e => setEditForm(f => ({ ...f, term: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Escape') setEditingId(null) }}
                          placeholder={t('search.edit.termPlaceholder')}
                          style={{ border: `1px solid ${theme.inputBorder}`, borderRadius: 5, padding: '5px 8px', fontSize: fs - 1, background: theme.bg, color: theme.text, outline: 'none' }} />
                        <input value={editForm.fullForm}
                          onChange={e => setEditForm(f => ({ ...f, fullForm: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Escape') setEditingId(null) }}
                          placeholder={t('search.edit.fullFormPlaceholder')}
                          style={{ border: `1px solid ${theme.inputBorder}`, borderRadius: 5, padding: '5px 8px', fontSize: fs - 1, background: theme.bg, color: theme.text, outline: 'none' }} />
                        <input value={editForm.definition}
                          onChange={e => setEditForm(f => ({ ...f, definition: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && editForm.term.trim() && editForm.definition.trim()) { void handleEditSave(r) } else if (e.key === 'Escape') setEditingId(null) }}
                          placeholder={t('search.edit.definitionPlaceholder')}
                          style={{ border: `1px solid ${theme.inputBorder}`, borderRadius: 5, padding: '5px 8px', fontSize: fs - 1, background: theme.bg, color: theme.text, outline: 'none' }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => { void handleEditSave(r) }}
                            disabled={!editForm.term.trim() || !editForm.definition.trim()}
                            style={{ flex: 1, background: BRAND, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 0', fontSize: fs - 1, cursor: 'pointer', opacity: editForm.term.trim() && editForm.definition.trim() ? 1 : 0.5 }}>
                            {t('search.edit.save')}
                          </button>
                          <button type="button" onClick={() => setEditingId(null)}
                            style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 5, padding: '5px 10px', fontSize: fs - 1, cursor: 'pointer', color: theme.secondary }}>
                            {t('search.edit.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal result display ── */
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: fs, color: theme.text }}>{r.term}</strong>
                          {r.fullForm && (
                            <span style={{ fontSize: fs - 1, color: theme.secondary }}>{r.fullForm}</span>
                          )}
                          {r.domain && (
                            <span style={{ fontSize: fs - 2, color: theme.tagText, background: theme.tag, borderRadius: 4, padding: '1px 6px' }}>
                              {r.domain}
                            </span>
                          )}
                          {showSourceBadge && sourceMap[r.sourceId] && (
                            <span style={{ fontSize: fs - 2, color: theme.muted, background: theme.border, borderRadius: 4, padding: '1px 6px', marginLeft: 'auto' }}>
                              {sourceMap[r.sourceId]}
                            </span>
                          )}
                        </div>
                        <p style={{
                          fontSize: fs - 1, color: theme.secondary, lineHeight: 1.5, margin: 0,
                          background: copiedId === r.id ? '#fef9c3' : 'transparent',
                          borderRadius: copiedId === r.id ? 4 : 0,
                          padding: copiedId === r.id ? '3px 5px' : '0',
                          transition: 'background 0.25s',
                        }}>
                          {r.definition}
                        </p>
                        {copiedId === r.id && (
                          <p style={{ fontSize: fs - 2, color: '#92400e', margin: '4px 0 0', textAlign: 'right' }}>
                            {t('search.copied')}
                          </p>
                        )}
                        {expanded === r.id && r.aliases.length > 0 && (
                          <p style={{ fontSize: fs - 2, color: theme.muted, margin: '6px 0 0' }}>
                            {t('search.alsoKnownAs', { aliases: r.aliases.join(', ') })}
                          </p>
                        )}
                        {expanded === r.id && r.sourceReference && (
                          <p style={{ fontSize: fs - 2, color: theme.muted, margin: '4px 0 0' }}>
                            {t('search.sourceRef', { ref: r.sourceReference })}
                          </p>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <p style={{ fontSize: fs - 1, color: theme.muted, padding: '8px 16px', borderTop: `1px solid ${theme.border}`, textAlign: 'center' }}>
                {t('search.hasMore')}
              </p>
            )}
          </div>

          {/* Context menu */}
          {contextMenu && (() => {
            const r = results.find(x => x.id === contextMenu.id)
            if (!r) return null
            const menuW = 130, menuH = 72
            const x = Math.min(contextMenu.x, size.w - menuW - 4)
            const y = Math.min(contextMenu.y, size.h - menuH - 4)
            const menuBtn: React.CSSProperties = {
              display: 'block', width: '100%', textAlign: 'left', background: 'none',
              border: 'none', padding: '8px 14px', fontSize: fs - 1, cursor: 'pointer',
              color: theme.text, fontFamily: 'inherit',
            }
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper only
              <div
                role="presentation"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
                style={{
                  position: 'fixed', top: y, left: x, width: menuW,
                  background: theme.surface, border: `1px solid ${theme.border}`,
                  borderRadius: 7, boxShadow: '0 4px 14px rgba(0,0,0,0.18)', zIndex: 200, overflow: 'hidden',
                }}>
                {confirmDeleteId === r.id ? (
                  <div style={{ padding: '10px 14px' }}>
                    <p style={{ fontSize: fs - 2, color: theme.text, margin: '0 0 8px', fontWeight: 600 }}>{t('search.context.deleteThisTerm')}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button"
                        onClick={() => { void handleTermDelete(r) }}
                        style={{ flex: 1, background: theme.error, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 0', fontSize: fs - 2, cursor: 'pointer' }}>
                        {t('search.context.confirm.delete')}
                      </button>
                      <button type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        style={{ flex: 1, background: 'none', border: `1px solid ${theme.border}`, borderRadius: 5, padding: '5px 0', fontSize: fs - 2, cursor: 'pointer', color: theme.secondary }}>
                        {t('search.context.confirm.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button type="button" style={menuBtn}
                      onMouseEnter={e => (e.currentTarget.style.background = theme.bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      onClick={() => startEdit(r)}>
                      {t('search.context.edit')}
                    </button>
                    <button type="button" style={{ ...menuBtn, color: theme.error }}
                      onMouseEnter={e => (e.currentTarget.style.background = theme.bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      onClick={() => setConfirmDeleteId(r.id)}>
                      {t('search.context.delete')}
                    </button>
                  </>
                )}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

type Screen = 'search' | 'sources' | 'about' | 'browse'

interface AppData {
  sources: GlossarySource[]
  activeSourceId: string | 'all' | null
  glossary: TermEntry[]
}

function App() {
  const [dark, setDark] = useStoredPref('pref_dark', false)
  const [fontSize, setFontSize] = useStoredPref('pref_fontSize', 13)
  const [locale, setLocale] = useStoredPref<Locale>('pref_locale', 'en')
  const theme = dark ? DARK : LIGHT
  const prefs: Prefs = { dark, setDark, fontSize, setFontSize }

  const [rawSize, setSize] = useStoredPref<{ w: number; h: number }>('pref_size', { w: 360, h: 420 })
  // Clamp stored value to safe bounds — prevents clips when an old value exceeds Chrome's popup cap
  const size = { w: Math.max(280, Math.min(700, rawSize.w)), h: Math.max(220, Math.min(550, rawSize.h)) }

  const [screen, setScreen] = useState<Screen>('search')
  const [appData, setAppData] = useState<AppData>({ sources: [], activeSourceId: null, glossary: [] })
  const [unlockedSources, setUnlockedSources] = useState<Set<string>>(new Set())
  const [pinModal, setPinModal] = useState<{ mode: PinModalMode; sourceId: string; then?: () => void } | null>(null)

  useEffect(() => { document.body.style.background = theme.bg }, [theme.bg])

  useEffect(() => {
    // Width must be set explicitly to override popup.html's min-width rule.
    // Height is left to the browser — it auto-sizes to the outer div's height.
    document.body.style.width = `${size.w}px`
  }, [size.w])

  const reload = useCallback(async () => {
    const srcs = await getSources()
    const rawActive = await getActiveSourceId()
    const effectiveId: string | 'all' | null =
      rawActive === 'all' ? 'all'
      : rawActive && srcs.some(s => s.id === rawActive) ? rawActive
      : srcs.length > 0 ? 'all'
      : null
    const glossary = await loadGlossary(srcs, effectiveId)
    setAppData({ sources: srcs, activeSourceId: effectiveId, glossary })
  }, [])

  // Restore unlocked sources from session storage on mount
  useEffect(() => {
    void (async () => {
      const srcs = await getSources()
      const ids = await Promise.all(
        srcs.filter(s => s.secured).map(async s => {
          const dek = await getSessionDek(s.id)
          return dek ? s.id : null
        })
      )
      const unlocked = new Set(ids.filter(Boolean) as string[])
      if (unlocked.size > 0) setUnlockedSources(unlocked)
    })()
  }, [])

  async function handlePinSuccess(sourceId: string, dekHex: string) {
    await setSessionDek(sourceId, dekHex)
    setUnlockedSources(prev => new Set([...prev, sourceId]))
    await reload()
    const cb = pinModal?.then
    setPinModal(null)
    cb?.()
  }

  async function handleLockSource(sourceId: string) {
    await clearSessionDek(sourceId)
    setUnlockedSources(prev => { const n = new Set(prev); n.delete(sourceId); return n })
    await reload()
  }

  async function handleRemoveSecurity(sourceId: string) {
    const dek = await getSessionDek(sourceId)
    if (!dek) return
    const terms = await getSecureTerms(sourceId, dek)
    await setTerms(sourceId, terms)
    await deleteEncryptedBlob(sourceId)
    await deleteSecureMeta(sourceId)
    await clearSessionDek(sourceId)
    const srcs = await getSources()
    await setSources(srcs.map(s => s.id === sourceId ? { ...s, secured: false } : s))
    setUnlockedSources(prev => { const n = new Set(prev); n.delete(sourceId); return n })
    await reload()
  }

  useEffect(() => {
    void devInitReady.then(() => reload()).then(async () => {
      const srcs = await getSources()
      for (const src of srcs) {
        if (src.type === 'url' && src.autoRefresh && src.url) {
          void (async () => {
            try {
              if (!await hasOriginPermission(src.url as string)) return
              const text = await loadFromUrl(src.url as string)
              const rows = parseCsv(text)
              const terms = csvToTermEntries(rows, src.id)
              const updated: GlossarySource = { ...src, termCount: terms.length, lastLoaded: new Date().toISOString() }
              const latest = await getSources()
              await setSources(latest.map(s => s.id === src.id ? updated : s))
              await setTerms(src.id, terms)
              await reload()
            } catch {}
          })()
        }
      }
    })
  }, [reload])

  const localeCtxValue = { locale, setLocale, t: makeT(locale) }

  return (
    <LocaleCtx.Provider value={localeCtxValue}>
    <div style={{
      width: '100%',
      height: size.h,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 12,
    }}>
      {screen === 'search' && (
        <SearchView
          sources={appData.sources}
          activeSourceId={appData.activeSourceId}
          glossary={appData.glossary}
          unlockedSources={unlockedSources}
          onOpenSources={() => setScreen('sources')}
          onOpenBrowse={() => setScreen('browse')}
          onOpenAbout={() => setScreen('about')}
          onReload={reload}
          onRequestUnlock={sourceId => setPinModal({ mode: 'unlock', sourceId })}
          theme={theme}
          prefs={prefs}
          size={size}
          setSize={setSize}
        />
      )}
      {screen === 'browse' && (
        <BrowseView
          glossary={appData.glossary}
          sources={appData.sources}
          activeSourceId={appData.activeSourceId}
          unlockedSources={unlockedSources}
          onBack={() => setScreen('search')}
          onRequestUnlock={sourceId => setPinModal({ mode: 'unlock', sourceId })}
          theme={theme}
          prefs={prefs}
        />
      )}
      {screen === 'sources' && (
        <SourcesView
          sources={appData.sources}
          activeSourceId={appData.activeSourceId}
          unlockedSources={unlockedSources}
          onBack={() => setScreen('search')}
          onReload={reload}
          onRequestUnlock={(sourceId, then) => setPinModal({ mode: 'unlock', sourceId, then })}
          onRequestSetupPin={sourceId => setPinModal({ mode: 'setup', sourceId })}
          onLockSource={sourceId => { void handleLockSource(sourceId) }}
          onRemoveSecurity={handleRemoveSecurity}
          theme={theme}
          prefs={prefs}
        />
      )}
      {pinModal && (
        <PinModal
          mode={pinModal.mode}
          sourceId={pinModal.sourceId}
          sources={appData.sources}
          theme={theme}
          prefs={prefs}
          onSuccess={handlePinSuccess}
          onClose={() => setPinModal(null)}
        />
      )}
      {screen === 'about' && (
        <AboutView
          onBack={() => setScreen('search')}
          theme={theme}
          prefs={prefs}
          sources={appData.sources}
        />
      )}
    </div>
    </LocaleCtx.Provider>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode><App /></StrictMode>,
)
