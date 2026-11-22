import { getActiveLocale } from 'calcpad-frontend/i18n'

/** Picks between an English and a Chinese literal using the active UI locale. */
export function uiText(en: string, zh: string): string {
    return getActiveLocale() === 'zh' ? zh : en
}
