/**
 * UI translations for the shared CalcpadCE frontend.
 *
 * Keys are the English source strings, so a missing translation falls back to the
 * English text. "auto" follows the host language; a manual choice overrides it.
 */
import { createI18n, type I18n } from 'vue-i18n'
import en from './messages/en'
import zh from './messages/zh'

export { menuLabelsFor } from './menu'

export const SUPPORTED_LOCALES = ['en', 'zh'] as const
export type CalcpadLocale = (typeof SUPPORTED_LOCALES)[number]
export type LocaleSetting = 'auto' | CalcpadLocale

export const LOCALE_STORAGE_KEY = 'calcpad.locale'

const LOCALE_LABELS: Record<CalcpadLocale, string> = {
    en: 'English',
    zh: '中文',
}

export const LOCALE_OPTIONS: { value: LocaleSetting; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    ...SUPPORTED_LOCALES.map(value => ({ value, label: LOCALE_LABELS[value] })),
]

let hostLocale: string | undefined
let activeI18n: I18n | null = null
let activeLocale: CalcpadLocale = 'en'

export function setHostLocale(locale: string | undefined): void {
    hostLocale = locale
}

export function matchLocale(tag: string): CalcpadLocale | null {
    const normalized = tag.replace('_', '-').toLowerCase()
    for (const locale of SUPPORTED_LOCALES) {
        if (normalized === locale || normalized.startsWith(`${locale}-`)) return locale
    }
    if (normalized.startsWith('zh')) return 'zh'
    return null
}

export function resolveLocale(setting: LocaleSetting, fallbackTag?: string): CalcpadLocale {
    if (setting !== 'auto') return setting
    const tag = fallbackTag ?? hostLocale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en')
    return matchLocale(tag) ?? 'en'
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

function applyResolvedLocale(i18n: I18n, setting: LocaleSetting): CalcpadLocale {
    const locale = resolveLocale(setting)
    activeLocale = locale
    activeI18n = i18n
    const composer = i18n.global as unknown as { locale: { value: string } }
    composer.locale.value = locale
    writeLocaleSetting(setting)
    if (typeof document !== 'undefined') document.documentElement.lang = locale
    return locale
}

export function createCalcpadI18n(setting: LocaleSetting = readLocaleSetting()): I18n {
    const locale = resolveLocale(setting)
    const i18n = createI18n({
        legacy: false,
        locale,
        fallbackLocale: 'en',
        messages: { en, zh },
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
        activeLocale = resolveLocale(setting)
        writeLocaleSetting(setting)
        if (typeof document !== 'undefined') document.documentElement.lang = activeLocale
        return activeLocale
    }
    return applyLocale(activeI18n, setting)
}
