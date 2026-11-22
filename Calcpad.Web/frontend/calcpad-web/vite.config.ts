import { resolveVersion } from '../../../tools/version.mjs';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import fs from 'node:fs';

// Monaco's ESM build calls localize('key', 'English') with a string key, so the
// numeric NLS table used by its AMD build is never consulted. The maps carry the
// same (module, key) pairs from the pinned VS Code language packs.
function loadMonacoNls(locale: string): Record<string, Record<string, string>> {
    return JSON.parse(
        fs.readFileSync(path.resolve(__dirname, `src/editor/monaco-nls/${locale}.json`), 'utf8'),
    );
}

const monacoNls = {
    zh: loadMonacoNls('zh'),
    'pt-BR': loadMonacoNls('pt-BR'),
};

const MONACO_NLS_HELPER =
    "const __calcpadTr=(en,zh,pt)=>{try{const l=localStorage.getItem('calcpad.locale');" +
    "if(l==='en')return en;if(l==='zh')return zh||en;if(l==='pt-BR')return pt||en}catch(e){}" +
    "const n=typeof navigator!=='undefined'?navigator.language.toLowerCase():'';" +
    "if(n.startsWith('zh'))return zh||en;if(n.startsWith('pt'))return pt||en;return en};";

const MONACO_LOCALIZE =
    /(\blocalize2?\s*\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*,\s*)(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;

function decodeString(raw: string): string {
    try {
        return JSON.parse('"' + raw.replace(/\\'/g, "'") + '"');
    } catch {
        return raw;
    }
}

function monacoModule(id: string): string | null {
    const normalized = id.replace(/\\/g, '/').split('?')[0].split('#')[0];
    const marker = 'monaco-editor/esm/';
    const start = normalized.indexOf(marker);
    return start < 0 ? null : normalized.slice(start + marker.length).replace(/\.js$/, '');
}

function translateMonacoLiterals(code: string, module: string): string {
    const zhMap = monacoNls.zh[module];
    const ptMap = monacoNls['pt-BR'][module];
    if (!zhMap && !ptMap) return code;

    let changed = false;
    const out = code.replace(
        MONACO_LOCALIZE,
        (match, head, keySingle, keyDouble, bodySingle, bodyDouble) => {
            const key = decodeString(keySingle ?? keyDouble);
            const english = decodeString(bodySingle ?? bodyDouble);
            const zh = zhMap?.[key];
            const pt = ptMap?.[key];
            if (!zh && !pt) return match;
            changed = true;
            const zhArg = zh ? JSON.stringify(zh) : 'undefined';
            const ptArg = pt ? JSON.stringify(pt) : 'undefined';
            return `${head}__calcpadTr(${JSON.stringify(english)}, ${zhArg}, ${ptArg})`;
        },
    );
    return changed ? MONACO_NLS_HELPER + '\n' + out : code;
}

function monacoLanguagePacks() {
    return {
        name: 'monaco-language-packs',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
            const cleanId = id.split('?')[0].split('#')[0];
            if (!cleanId.includes('monaco-editor/esm/') || !cleanId.endsWith('.js')) return null;
            if (!code.includes('localize(') && !code.includes('localize2(')) return null;
            const module = monacoModule(cleanId);
            if (!module) return null;
            const out = translateMonacoLiterals(code, module);
            return out === code ? null : { code: out, map: null };
        },
    };
}

// Tauri picks up frontendDist from tauri.conf.json (../../calcpad-web/dist),
// so the desktop build just needs vite's default outDir. VITE_SERVER_URL
// still overrides the dev proxy target when developers point at an already-
// running Calcpad.Server.
export default defineConfig(() => ({
    plugins: [monacoLanguagePacks(), vue()],
    define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(resolveVersion()),
        'import.meta.env.VITE_PLATFORM': JSON.stringify('web'),
    },
    resolve: {
        alias: {
            'calcpad-frontend': path.resolve(__dirname, '../calcpad-frontend/src'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // rolldown drops /*! @license */ banners by default. DOMPurify's is the
        // only attribution monaco ships for it, so losing it breaches Apache-2.0.
        rolldownOptions: {
            output: {
                comments: { legal: true },
            },
        },
    },
    // Monaco pulls in ~100 language files, and without pre-bundling vite's dep-optimizer runs
    // esbuild in parallel with browser transform requests, where esbuild 0.21.5's worker races
    // itself and dies with "callback is not a function". Naming the top-level Monaco
    // entrypoints forces vite to bundle them once at startup.
    optimizeDeps: {
        include: [
            'monaco-editor',
            'monaco-editor/esm/vs/editor/editor.worker',
            'monaco-editor/esm/vs/language/typescript/ts.worker',
            'monaco-editor/esm/vs/language/json/json.worker',
            'monaco-editor/esm/vs/language/html/html.worker',
            'monaco-editor/esm/vs/language/css/css.worker',
            'vue',
        ],
    },
    // Tauri consumes JS on the same port during `tauri dev`; keep the port
    // stable so vite.config's port matches tauri.conf.json's devUrl.
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': {
                target: process.env.VITE_SERVER_URL || 'http://localhost:9420',
                changeOrigin: true,
            },
        },
    },
}));
