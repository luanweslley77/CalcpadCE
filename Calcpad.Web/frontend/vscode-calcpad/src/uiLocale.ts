let uiLocale: string | undefined

export function currentCulture(): string {
    let intl = 'en-US'
    try {
        intl = Intl.DateTimeFormat().resolvedOptions().locale
        // Small-ICU builds report en-US for every locale. Full ICU knows whether
        // a non-English locale such as pt-BR is actually available.
        if (Intl.DateTimeFormat.supportedLocalesOf(['pt-BR']).length > 0) return intl
    } catch {
        // Fall through to the environment.
    }
    const env = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG
    if (env) {
        const tag = env.split('.')[0].replace('_', '-')
        if (tag && !/^(C|POSIX)$/i.test(tag)) return tag
    }
    return intl
}

export function setUiLocale(locale: string | undefined): void {
    uiLocale = locale?.trim() || undefined
}

/** The webview's resolved locale, with the OS culture as the pre-webview fallback. */
export function getUiLocale(): string {
    return uiLocale || currentCulture()
}
