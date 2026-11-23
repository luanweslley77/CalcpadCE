/**
 * UI translations for the shared CalcpadCE frontend.
 *
 * Keys are the English source strings, so a missing translation falls back to the
 * English text. "auto" follows the current culture, then the host language; a
 * manual choice overrides both.
 */
import { createI18n, type I18n } from 'vue-i18n'
import en from './messages/en'
import zh from './messages/zh'
import ptBR from './messages/pt-BR'

export { menuLabels, MENU_KEYS } from './menu'

export const SUPPORTED_LOCALES = ['en', 'zh', 'pt-BR'] as const
export type CalcpadLocale = (typeof SUPPORTED_LOCALES)[number]
export type LocaleSetting = 'auto' | CalcpadLocale

export const LOCALE_STORAGE_KEY = 'calcpad.locale'
/** Fired after a locale change so hosts can rebuild the editor. */
export const LOCALE_CHANGED_EVENT = 'calcpad:locale-changed'

// Endonyms: language names are never translated.
export const LOCALE_LABELS: Record<CalcpadLocale, string> = {
    en: 'English',
    zh: '中文',
    'pt-BR': 'Português (Brasil)',
}

export const LOCALE_OPTIONS: { value: LocaleSetting; label: string; translatable: boolean }[] = [
    { value: 'auto', label: 'Auto', translatable: true },
    ...SUPPORTED_LOCALES.map(value => ({ value, label: LOCALE_LABELS[value], translatable: false })),
]

let hostLocale: string | undefined
let currentCulture: string | undefined
let activeI18n: I18n | null = null
let activeLocale: CalcpadLocale = 'en'

export function setHostLocale(locale: string | undefined): void {
    hostLocale = locale
}

export function setCurrentCulture(locale: string | undefined): void {
    currentCulture = locale?.trim() || undefined
}

export function matchLocale(tag: string): CalcpadLocale | null {
    const normalized = tag.replace('_', '-').toLowerCase()
    for (const locale of SUPPORTED_LOCALES) {
        const candidate = locale.toLowerCase()
        if (normalized === candidate || normalized.startsWith(`${candidate}-`)) return locale
    }
    // Bare "pt" is ambiguous (Portugal vs Brazil); require an explicit pt-BR tag.
    return null
}

function browserLocaleTags(): string[] {
    if (typeof navigator === 'undefined') return []
    const tags = [...(navigator.languages ?? [])]
    if (navigator.language && !tags.includes(navigator.language)) tags.push(navigator.language)
    return tags
}

export function resolveLocale(setting: LocaleSetting, fallbackTag?: string): CalcpadLocale {
    if (setting !== 'auto') return setting
    let tags: string[]
    if (fallbackTag) tags = [fallbackTag]
    else if (currentCulture) tags = [currentCulture]
    else if (hostLocale) tags = [hostLocale]
    else tags = browserLocaleTags()
    for (const tag of tags) {
        const locale = matchLocale(tag)
        if (locale) return locale
    }
    return 'en'
}

export function readLocaleSetting(): LocaleSetting {
    try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
        if (stored === 'auto' || (SUPPORTED_LOCALES as readonly string[]).includes(stored ?? ''))
            return stored as LocaleSetting
    } catch {
        // Storage can be unavailable in sandboxed hosts; fall back to auto.
    }
    return 'auto'
}

export function writeLocaleSetting(setting: LocaleSetting): void {
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, setting)
    } catch {
        // Persisting is best-effort.
    }
}

export function getActiveLocale(): CalcpadLocale {
    return activeLocale
}

function notifyLocaleChanged(setting: LocaleSetting, locale: CalcpadLocale): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGED_EVENT, { detail: { setting, locale } }))
}

function applyResolvedLocale(i18n: I18n, setting: LocaleSetting): CalcpadLocale {
    const locale = resolveLocale(setting)
    activeLocale = locale
    activeI18n = i18n
    const composer = i18n.global as unknown as { locale: { value: string } }
    composer.locale.value = locale
    writeLocaleSetting(setting)
    if (typeof document !== 'undefined') document.documentElement.lang = locale
    notifyLocaleChanged(setting, locale)
    return locale
}

export function createCalcpadI18n(setting: LocaleSetting = readLocaleSetting()): I18n {
    const locale = resolveLocale(setting)
    const i18n = createI18n({
        legacy: false,
        locale,
        fallbackLocale: 'en',
        messages: { en, zh, 'pt-BR': ptBR },
        missingWarn: false,
        fallbackFormat: true,
        fallbackWarn: false,
    }) as unknown as I18n
    activeI18n = i18n
    activeLocale = locale
    if (typeof document !== 'undefined') document.documentElement.lang = locale
    return i18n
}

export function applyLocale(i18n: I18n, setting: LocaleSetting): CalcpadLocale {
    return applyResolvedLocale(i18n, setting)
}

export function setLocale(setting: LocaleSetting): CalcpadLocale {
    if (!activeI18n) {
        const locale = resolveLocale(setting)
        activeLocale = locale
        writeLocaleSetting(setting)
        if (typeof document !== 'undefined') document.documentElement.lang = locale
        notifyLocaleChanged(setting, locale)
        return locale
    }
    return applyLocale(activeI18n, setting)
}
