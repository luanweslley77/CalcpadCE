let uiLocale: string | undefined

export function currentCulture(): string {
    const intl = Intl.DateTimeFormat().resolvedOptions().locale
    if (intl && intl !== 'en-US') return intl
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
