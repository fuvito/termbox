import './chrome-mock'
import '@fontsource-variable/inter'
import { StrictMode, useState, useEffect, useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import type { TermEntry, GlossarySource } from './types'
import type { SearchResult } from './search'
import { rankTerms } from './search'
import { parseCsv, csvToTermEntries } from './csv'
import {
  getSources,
  setSources,
  setTerms,
  deleteTerms,
  getActiveSourceId,
  setActiveSourceId,
  loadGlossary,
} from './storage'

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

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function autoName(raw: string): string {
  return raw
    .replace(/\.csv$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    || 'Glossary'
}

function loadFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target!.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file, 'utf-8')
  })
}

async function loadFromUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

declare const __APP_VERSION__: string

// ─── AboutView ────────────────────────────────────────────────────────────────

function AboutView({ onBack, theme, prefs }: {
  onBack: () => void
  theme: Theme
  prefs: Prefs
}) {
  const fs = prefs.fontSize

  function openUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const infoRow = (label: string, value: string, url?: string) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.border}` }}>
      <span style={{ fontSize: fs - 1, color: theme.muted }}>{label}</span>
      {url ? (
        <button onClick={() => openUrl(url)}
          style={{ background: 'none', border: 'none', color: theme.primary, fontSize: fs - 1, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          {value}
        </button>
      ) : (
        <span style={{ fontSize: fs - 1, color: theme.text, fontWeight: 500 }}>{value}</span>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bg }}>

      <header style={{ background: BRAND, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, padding: '0 4px 0 0', lineHeight: 1, opacity: 0.85 }}>
          ←
        </button>
        <span style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>About</span>
      </header>

      <div style={{ flex: 1, padding: '32px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: BRAND,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14, boxShadow: '0 4px 20px rgba(59,75,200,0.28)',
        }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 24, letterSpacing: '-0.5px' }}>TB</span>
        </div>

        <h1 style={{ fontSize: fs + 7, fontWeight: 700, color: theme.text, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          TermBox
        </h1>
        <p style={{ fontSize: fs - 1, color: theme.muted, margin: '0 0 10px' }}>
          Version {__APP_VERSION__}
        </p>
        <p style={{ fontSize: fs - 1, color: theme.secondary, textAlign: 'center', lineHeight: 1.65, maxWidth: 240, margin: '0 0 28px' }}>
          Instant glossary search from any CSV file. Free, open-source, and fully offline.
        </p>

        {/* Info rows */}
        <div style={{ width: '100%', borderTop: `1px solid ${theme.border}` }}>
          {infoRow('Author', 'Fuat Yazar')}
          {infoRow('License', 'MIT')}
          {infoRow('Source', 'github.com/fuvito/termbox', 'https://github.com/fuvito/termbox')}
        </div>
      </div>
    </div>
  )
}

// ─── SourcesView ──────────────────────────────────────────────────────────────

function SourcesView({
  sources,
  activeSourceId,
  onBack,
  onReload,
  theme,
  prefs,
}: {
  sources: GlossarySource[]
  activeSourceId: string | 'all' | null
  onBack: () => void
  onReload: () => Promise<void>
  theme: Theme
  prefs: Prefs
}) {
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fs = prefs.fontSize
  const isBusy = loadingId !== null

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError(null)
    const id = crypto.randomUUID()
    setLoadingId(id)
    try {
      const text = await loadFromFile(file)
      const rows = parseCsv(text)
      const terms = csvToTermEntries(rows, id)
      const source: GlossarySource = {
        id,
        name: autoName(file.name),
        type: 'file',
        url: null,
        termCount: terms.length,
        lastLoaded: new Date().toISOString(),
        autoRefresh: false,
      }
      await setSources([...sources, source])
      await setTerms(id, terms)
      await setActiveSourceId(id)
      await onReload()
    } catch (err) {
      setError((err as Error).message || 'Failed to load file')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleUrlLoad() {
    const url = urlInput.trim()
    if (!url) return
    setError(null)
    const id = crypto.randomUUID()
    setLoadingId(id)
    try {
      const text = await loadFromUrl(url)
      const rows = parseCsv(text)
      const terms = csvToTermEntries(rows, id)
      let name = 'Glossary'
      try {
        const pathname = new URL(url).pathname
        const filename = pathname.split('/').pop() ?? ''
        if (filename) name = autoName(filename)
      } catch {}
      const source: GlossarySource = {
        id,
        name,
        type: 'url',
        url,
        termCount: terms.length,
        lastLoaded: new Date().toISOString(),
        autoRefresh: false,
      }
      await setSources([...sources, source])
      await setTerms(id, terms)
      await setActiveSourceId(id)
      setShowUrlInput(false)
      setUrlInput('')
      await onReload()
    } catch (err) {
      const msg = (err as Error).message || 'Failed to load URL'
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.toLowerCase().includes('cors')) {
        setError(
          "The server at this URL doesn't allow cross-origin access. Try hosting the CSV on GitHub (raw.githubusercontent.com), Gist, or a CORS-enabled server.",
        )
      } else {
        setError(msg)
      }
    } finally {
      setLoadingId(null)
    }
  }

  async function handleRefresh(source: GlossarySource) {
    if (!source.url) return
    setLoadingId(source.id)
    setError(null)
    try {
      const text = await loadFromUrl(source.url)
      const rows = parseCsv(text)
      const terms = csvToTermEntries(rows, source.id)
      const updated: GlossarySource = { ...source, termCount: terms.length, lastLoaded: new Date().toISOString() }
      await setSources(sources.map(s => s.id === source.id ? updated : s))
      await setTerms(source.id, terms)
      await onReload()
    } catch (err) {
      setError((err as Error).message || 'Failed to refresh')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(sourceId: string) {
    const newSources = sources.filter(s => s.id !== sourceId)
    await setSources(newSources)
    await deleteTerms(sourceId)
    const newActiveId: string | 'all' | null =
      activeSourceId === sourceId
        ? (newSources.length > 0 ? newSources[0].id : null)
        : activeSourceId
    await setActiveSourceId(newActiveId)
    await onReload()
  }

  async function handleSetActive(id: string | 'all') {
    await setActiveSourceId(id)
    await onReload()
  }

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px 6px', borderRadius: 4, color: theme.muted, fontSize: 14, lineHeight: 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300, background: theme.bg }}>

      {/* Header */}
      <header style={{ background: BRAND, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, padding: '0 4px 0 0', lineHeight: 1, opacity: 0.85 }}>
          ←
        </button>
        <span style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>Glossary Sources</span>
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
              <span style={{ color: theme.text, fontWeight: 500 }}>All sources</span>
              <span style={{ color: theme.muted, fontSize: fs - 1 }}>
                ({sources.reduce((n, s) => n + s.termCount, 0)} terms)
              </span>
            </label>
          </div>
        )}

        {/* Source list */}
        {sources.length === 0 && (
          <p style={{ color: theme.muted, fontSize: fs, padding: '20px 14px' }}>No sources loaded yet.</p>
        )}
        {sources.map(source => (
          <div key={source.id}
            style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, background: theme.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  {source.termCount} term{source.termCount !== 1 ? 's' : ''} · loaded {timeAgo(source.lastLoaded)}
                </div>
              </div>
              {source.type === 'url' && (
                <button
                  onClick={() => { void handleRefresh(source) }}
                  disabled={isBusy}
                  title="Refresh from URL"
                  style={{ ...iconBtn, fontSize: 18, opacity: isBusy ? 0.4 : 1 }}>
                  {loadingId === source.id ? '⌛' : '↻'}
                </button>
              )}
              <button
                onClick={() => { void handleDelete(source.id) }}
                disabled={isBusy}
                title="Delete source"
                style={{ ...iconBtn, color: theme.error, opacity: isBusy ? 0.4 : 1 }}>
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Error */}
        {error && (
          <div style={{ margin: '12px 14px', padding: '10px 12px', background: `${theme.error}18`, borderRadius: 6, border: `1px solid ${theme.error}55` }}>
            <p style={{ fontSize: fs - 1, color: theme.error, lineHeight: 1.5, margin: 0 }}>{error}</p>
          </div>
        )}
      </div>

      {/* Add buttons */}
      <div style={{ borderTop: `1px solid ${theme.border}`, padding: 14, background: theme.surface, flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        {showUrlInput ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              autoFocus
              type="url"
              placeholder="https://example.com/glossary.csv"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { void handleUrlLoad() }
                else if (e.key === 'Escape') { setShowUrlInput(false); setUrlInput(''); setError(null) }
              }}
              style={{
                border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: '7px 10px',
                fontSize: fs, outline: 'none', background: theme.bg, color: theme.text, width: '100%',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { void handleUrlLoad() }}
                disabled={!urlInput.trim() || isBusy}
                style={{
                  flex: 1, background: BRAND, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '8px 0', fontSize: fs,
                  cursor: urlInput.trim() && !isBusy ? 'pointer' : 'not-allowed',
                  opacity: urlInput.trim() && !isBusy ? 1 : 0.5,
                }}>
                {isBusy ? 'Loading…' : 'Load'}
              </button>
              <button
                onClick={() => { setShowUrlInput(false); setUrlInput(''); setError(null) }}
                style={{
                  background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6,
                  padding: '8px 12px', fontSize: fs, cursor: 'pointer', color: theme.secondary,
                }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              style={{
                flex: 1, background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6,
                padding: '8px 0', fontSize: fs, cursor: isBusy ? 'not-allowed' : 'pointer',
                color: theme.text, opacity: isBusy ? 0.5 : 1,
              }}>
              + Add from file
            </button>
            <button
              onClick={() => { setShowUrlInput(true); setError(null) }}
              disabled={isBusy}
              style={{
                flex: 1, background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6,
                padding: '8px 0', fontSize: fs, cursor: isBusy ? 'not-allowed' : 'pointer',
                color: theme.text, opacity: isBusy ? 0.5 : 1,
              }}>
              + Add from URL
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SearchView ───────────────────────────────────────────────────────────────

function SearchView({
  sources,
  activeSourceId,
  glossary,
  onOpenSources,
  onOpenAbout,
  theme,
  prefs,
}: {
  sources: GlossarySource[]
  activeSourceId: string | 'all' | null
  glossary: TermEntry[]
  onOpenSources: () => void
  onOpenAbout: () => void
  theme: Theme
  prefs: Prefs
}) {
  const [query, setQuery] = useState(() => {
    try { return localStorage.getItem('lastQuery') ?? '' } catch { return '' }
  })
  const [searchMode, setSearchMode] = useState<'term' | 'definition'>('term')
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fs = prefs.fontSize

  const defaultH = Math.round(window.screen.availHeight * 0.25)
  const [size, setSize] = useStoredPref<{ w: number; h: number }>('pref_size', { w: 360, h: defaultH })

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    document.body.style.width = size.w + 'px'
    return () => { document.body.style.width = '' }
  }, [size.w])

  const handleSearch = useCallback(() => {
    const q = query.trim()
    if (q.length < 2 || glossary.length === 0) return
    setHasSearched(true)
    const { results: ranked, hasMore: more } = rankTerms(glossary, q, searchMode)
    setResults(ranked)
    setHasMore(more)
    try { localStorage.setItem('lastQuery', q) } catch {}
  }, [query, searchMode, glossary])

  const makeResizer = (edges: { right?: boolean; bottom?: boolean }) => (e: React.MouseEvent) => {
    e.preventDefault()
    const x0 = e.clientX, y0 = e.clientY, w0 = size.w, h0 = size.h
    const onMove = (ev: MouseEvent) => setSize({
      w: edges.right  ? Math.max(280, Math.min(700, Math.round(w0 + ev.clientX - x0))) : w0,
      h: edges.bottom ? Math.max(180, Math.min(600, Math.round(h0 + ev.clientY - y0))) : h0,
    })
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const noSources = sources.length === 0
  const canSearch = query.trim().length >= 2 && !noSources
  const sourceMap = Object.fromEntries(sources.map(s => [s.id, s.name]))
  const showSourceBadge = sources.length > 1

  const hdrBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
    color: '#fff', cursor: 'pointer', padding: '2px 6px', fontSize: 11, lineHeight: 1.4,
  }
  const edgeH: React.CSSProperties = { position: 'absolute', bottom: 0, left: 12, right: 12, height: 5, cursor: 'ns-resize', zIndex: 10 }
  const edgeV: React.CSSProperties = { position: 'absolute', top: 0, right: 0, width: 5, bottom: 12, cursor: 'ew-resize', zIndex: 10 }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: size.w, height: size.h, background: theme.bg, overflow: 'hidden' }}>

      {/* Resize handles */}
      <div style={edgeH} onMouseDown={makeResizer({ bottom: true })} />
      <div style={edgeV} onMouseDown={makeResizer({ right: true })} />
      <div
        onMouseDown={makeResizer({ right: true, bottom: true })}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, cursor: 'nwse-resize', zIndex: 11 }}>
        <svg width="9" height="9" viewBox="0 0 9 9" style={{ position: 'absolute', right: 2, bottom: 2 }}>
          <path d="M9 3 L3 9 M9 6 L6 9 M9 0 L0 9" stroke={theme.muted} strokeWidth="1.2" opacity="0.5" />
        </svg>
      </div>

      {/* Header */}
      <header style={{ background: BRAND, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, color: '#fff', fontSize: 20, letterSpacing: '-0.3px' }}>TermBox</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button style={hdrBtn} title="Decrease font size" onClick={() => prefs.setFontSize(Math.max(11, prefs.fontSize - 1))}>A−</button>
          <button style={hdrBtn} title="Increase font size" onClick={() => prefs.setFontSize(Math.min(17, prefs.fontSize + 1))}>A+</button>
          <button style={hdrBtn} title={prefs.dark ? 'Light mode' : 'Dark mode'} onClick={() => prefs.setDark(!prefs.dark)}>
            {prefs.dark ? '☀' : '☾'}
          </button>
          <button onClick={onOpenSources} style={{ ...hdrBtn, fontSize: 17, padding: '1px 5px' }} title="Manage sources">
            ≡
          </button>
          <button onClick={onOpenAbout} style={{ ...hdrBtn, fontSize: 15, padding: '1px 5px' }} title="About TermBox">
            ⓘ
          </button>
        </div>
      </header>

      {/* Empty state when no sources */}
      {noSources ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', background: theme.bg }}>
          <svg width="48" height="48" fill="none" stroke={theme.muted} strokeWidth={1.2} viewBox="0 0 24 24" style={{ marginBottom: 16, opacity: 0.45 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <p style={{ fontSize: fs, color: theme.muted, marginBottom: 16, textAlign: 'center', lineHeight: 1.5 }}>
            Load a CSV to get started
          </p>
          <button
            onClick={onOpenSources}
            style={{ background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: fs, cursor: 'pointer' }}>
            Add a glossary
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
                placeholder="Search terms…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canSearch) handleSearch() }}
                style={{
                  flex: 1, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
                  padding: '7px 10px', fontSize: fs, outline: 'none',
                  background: theme.bg, color: theme.text,
                }}
              />
              <button
                onClick={handleSearch}
                disabled={!canSearch}
                style={{
                  background: BRAND, border: 'none', borderRadius: 6, padding: '0 13px',
                  cursor: canSearch ? 'pointer' : 'not-allowed', opacity: canSearch ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24">
                  <circle cx={11} cy={11} r={8} />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 9 }}>
              {(['term', 'definition'] as const).map(mode => (
                <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: fs - 1, cursor: 'pointer', color: theme.secondary }}>
                  <input type="radio" name="searchMode" checked={searchMode === mode}
                    onChange={() => setSearchMode(mode)}
                    style={{ accentColor: BRAND, cursor: 'pointer', margin: 0 }}
                  />
                  {mode === 'term' ? 'Search by Term' : 'Search by Definition'}
                </label>
              ))}
            </div>
          </div>

          {/* Results area */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {!hasSearched && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px 56px', color: theme.muted }}>
                <svg width="54" height="54" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24" style={{ marginBottom: 12, opacity: 0.35 }}>
                  <circle cx={11} cy={11} r={8} />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                <p style={{ fontSize: fs, margin: 0, opacity: 0.6 }}>Search for terms to see results</p>
              </div>
            )}

            {hasSearched && results.length === 0 && (
              <p style={{ fontSize: fs, color: theme.muted, padding: '14px 16px' }}>
                No results for &ldquo;{query}&rdquo;
              </p>
            )}

            {results.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {results.map(r => (
                  <li
                    key={r.id}
                    style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', background: expanded === r.id ? theme.bg : theme.surface }}
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
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
                    <p style={{ fontSize: fs - 1, color: theme.secondary, lineHeight: 1.5, margin: 0 }}>
                      {r.definition}
                    </p>
                    {expanded === r.id && r.aliases.length > 0 && (
                      <p style={{ fontSize: fs - 2, color: theme.muted, margin: '6px 0 0' }}>
                        Also known as: {r.aliases.join(', ')}
                      </p>
                    )}
                    {expanded === r.id && r.sourceReference && (
                      <p style={{ fontSize: fs - 2, color: theme.muted, margin: '4px 0 0' }}>
                        Source: {r.sourceReference}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <p style={{ fontSize: fs - 1, color: theme.muted, padding: '8px 16px', borderTop: `1px solid ${theme.border}`, textAlign: 'center' }}>
                More results exist — try a more specific term.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

type Screen = 'search' | 'sources' | 'about'

interface AppData {
  sources: GlossarySource[]
  activeSourceId: string | 'all' | null
  glossary: TermEntry[]
}

function App() {
  const [dark, setDark] = useStoredPref('pref_dark', false)
  const [fontSize, setFontSize] = useStoredPref('pref_fontSize', 13)
  const theme = dark ? DARK : LIGHT
  const prefs: Prefs = { dark, setDark, fontSize, setFontSize }

  const [screen, setScreen] = useState<Screen>('search')
  const [appData, setAppData] = useState<AppData>({ sources: [], activeSourceId: null, glossary: [] })

  useEffect(() => { document.body.style.background = theme.bg }, [theme.bg])

  const reload = useCallback(async () => {
    const srcs = await getSources()
    const rawActive = await getActiveSourceId()
    const effectiveId: string | 'all' | null =
      rawActive === 'all' ? 'all'
      : rawActive && srcs.some(s => s.id === rawActive) ? rawActive
      : srcs.length > 0 ? srcs[0].id
      : null
    const glossary = await loadGlossary(srcs, effectiveId)
    setAppData({ sources: srcs, activeSourceId: effectiveId, glossary })
  }, [])

  useEffect(() => {
    void reload().then(async () => {
      const srcs = await getSources()
      for (const src of srcs) {
        if (src.type === 'url' && src.autoRefresh && src.url) {
          void (async () => {
            try {
              const text = await loadFromUrl(src.url!)
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

  return (
    <>
      {screen === 'search' && (
        <SearchView
          sources={appData.sources}
          activeSourceId={appData.activeSourceId}
          glossary={appData.glossary}
          onOpenSources={() => setScreen('sources')}
          onOpenAbout={() => setScreen('about')}
          theme={theme}
          prefs={prefs}
        />
      )}
      {screen === 'sources' && (
        <SourcesView
          sources={appData.sources}
          activeSourceId={appData.activeSourceId}
          onBack={() => setScreen('search')}
          onReload={reload}
          theme={theme}
          prefs={prefs}
        />
      )}
      {screen === 'about' && (
        <AboutView
          onBack={() => setScreen('search')}
          theme={theme}
          prefs={prefs}
        />
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
