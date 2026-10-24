import { createContext, useContext } from 'react'
import en from './locales/en'
import de from './locales/de'
import es from './locales/es'
import fr from './locales/fr'
import ja from './locales/ja'
import ko from './locales/ko'
import pt from './locales/pt'
import rw from './locales/rw'
import sw from './locales/sw'
import tr from './locales/tr'
import vi from './locales/vi'
import zh from './locales/zh'

export type Locale = string

export const BUILTIN_LOCALES: readonly string[] = ['en', 'de', 'es', 'fr', 'ja', 'ko', 'pt', 'rw', 'sw', 'tr', 'vi', 'zh']
export const BUILTIN_NAMES: Record<string, string> = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français',
  ja: '日本語', ko: '한국어', pt: 'Português', rw: 'Kinyarwanda',
  sw: 'Kiswahili', tr: 'Türkçe', vi: 'Tiếng Việt', zh: '中文',
}

type Strings = Record<string, string>

const BUILTIN_STRINGS: Record<string, Strings> = {
  en: en as Strings, de: de as Strings, es: es as Strings, fr: fr as Strings,
  ja: ja as Strings, ko: ko as Strings, pt: pt as Strings, rw: rw as Strings,
  sw: sw as Strings, tr: tr as Strings, vi: vi as Strings, zh: zh as Strings,
}

const CUSTOM_CODES_KEY = 'pref_custom_lang_codes'
const packKey = (code: string) => `lang_pack_${code}`

// Custom packs are always exactly 3 chars (uppercase letters/digits, padded with #).
// Built-in codes are 2 chars — no namespace collision by design.
export function normalizeLangCode(input: string): string {
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!clean) return '???'
  return clean.slice(0, 3).padEnd(3, '#')
}

export function getCustomLangCodes(): string[] {
  try {
    const s = localStorage.getItem(CUSTOM_CODES_KEY)
    return s ? (JSON.parse(s) as string[]) : []
  } catch { return [] }
}

export function getCustomStrings(code: string): Strings | null {
  try {
    const s = localStorage.getItem(packKey(code))
    return s ? (JSON.parse(s) as Strings) : null
  } catch { return null }
}

export function saveCustomPack(code: string, strings: Strings): void {
  const codes = getCustomLangCodes()
  if (!codes.includes(code)) {
    localStorage.setItem(CUSTOM_CODES_KEY, JSON.stringify([...codes, code]))
  }
  localStorage.setItem(packKey(code), JSON.stringify(strings))
}

export function removeCustomPack(code: string): void {
  const codes = getCustomLangCodes().filter(c => c !== code)
  localStorage.setItem(CUSTOM_CODES_KEY, JSON.stringify(codes))
  localStorage.removeItem(packKey(code))
}

export function getAllLocales(): string[] {
  return [...BUILTIN_LOCALES, ...getCustomLangCodes()]
}

export type TFunc = (key: string, vars?: Record<string, string | number>) => string

export function makeT(locale: Locale): TFunc {
  const strings: Strings = BUILTIN_STRINGS[locale] ?? getCustomStrings(locale) ?? {}
  const fallback = BUILTIN_STRINGS['en']
  return (key, vars) => {
    const template = strings[key] ?? fallback[key] ?? key
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
  }
}

interface LocaleCtxValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: TFunc
}

export const LocaleCtx = createContext<LocaleCtxValue>({
  locale: 'en',
  setLocale: () => {},
  t: makeT('en'),
})

export function useLocale(): LocaleCtxValue {
  return useContext(LocaleCtx)
}
