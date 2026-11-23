import { getActiveLocale } from 'calcpad-frontend/i18n'

/** Picks a literal for the active UI locale. */
export function uiText(en: string, zh: string, ptBR: string = en): string {
    const locale = getActiveLocale()
    if (locale === 'zh') return zh
    if (locale === 'pt-BR') return ptBR
    return en
}
