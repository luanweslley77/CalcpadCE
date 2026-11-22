/**
 * Generates Monaco NLS maps from pinned VS Code language packs.
 *
 * Monaco's ESM build calls localize('key', 'English') with a string key, so the
 * numeric NLS table used by the AMD build is never consulted. We look up the
 * same (module, key) pairs in the VS Code language pack and rewrite the English
 * fallback at build time.
 *
 * Source: microsoft/vscode-loc v1.96.2024121109 (MIT). See monaco-nls/README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const webRoot = path.join(frontendRoot, 'calcpad-web');
const nlsDir = path.join(webRoot, 'src/editor/monaco-nls');
const cacheDir = path.join(webRoot, 'node_modules/.cache/calcpad-monaco-nls');

const VSCODE_LOC_TAG = 'v1.96.2024121109';
const VSCODE_LOC_COMMIT = '110df563b65cd2a1f9d8b58e3bdcadce90427f6d';

const PACKS = [
    { output: 'zh', folder: 'vscode-language-pack-zh-hans' },
    { output: 'pt-BR', folder: 'vscode-language-pack-pt-BR' },
];

const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const verbose = args.has('--verbose');
const only = [...args].find(argument => argument.startsWith('--locale='))?.split('=')[1];

const monacoRoot = [
    path.join(webRoot, 'node_modules/monaco-editor'),
    path.join(frontendRoot, 'node_modules/monaco-editor'),
].find(candidate => fs.existsSync(candidate));

if (!monacoRoot) {
    console.error('monaco-editor is not installed; run npm ci in calcpad-web first');
    process.exit(1);
}

const esmRoot = path.join(monacoRoot, 'esm');

function walk(directory, output = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(full, output);
        else output.push(full);
    }
    return output;
}

function decodeString(raw) {
    try {
        return JSON.parse('"' + raw.replace(/\\'/g, "'") + '"');
    } catch {
        return raw;
    }
}

function scanCalls() {
    const calls = [];
    const files = walk(esmRoot).filter(file => file.endsWith('.js'));
    const pattern = /\blocalize2?\s*\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*,\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;

    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        const module = path.relative(esmRoot, file).replace(/\\/g, '/').replace(/\.js$/, '');
        let match;
        while ((match = pattern.exec(source))) {
            calls.push({
                module,
                key: decodeString(match[1] ?? match[2]),
                english: decodeString(match[3] ?? match[4]),
            });
        }
    }
    return calls;
}

async function loadPack(pack) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const cacheFile = path.join(cacheDir, `${pack.folder}-${VSCODE_LOC_COMMIT}.json`);
    if (!fs.existsSync(cacheFile)) {
        const url = `https://raw.githubusercontent.com/microsoft/vscode-loc/${VSCODE_LOC_COMMIT}/i18n/${pack.folder}/translations/main.i18n.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`failed to download ${url}: ${response.status} ${response.statusText}`);
        }
        fs.writeFileSync(cacheFile, await response.text());
    }
    const contents = JSON.parse(fs.readFileSync(cacheFile, 'utf8')).contents;
    if (!contents || typeof contents !== 'object') {
        throw new Error(`invalid language pack: ${cacheFile}`);
    }
    return contents;
}

function placeholders(text) {
    return [...text.matchAll(/\{(\d+)\}/g)].map(match => match[1]).sort().join(',');
}

function addTranslation(map, module, key, translation, conflicts) {
    const previous = map[module]?.[key];
    if (previous !== undefined && previous !== translation) {
        conflicts.add(`${module}::${key}`);
        return false;
    }
    (map[module] ??= {})[key] = translation;
    return true;
}

function sortMap(map) {
    const sorted = {};
    for (const module of Object.keys(map).sort()) {
        sorted[module] = {};
        for (const key of Object.keys(map[module]).sort()) {
            sorted[module][key] = map[module][key];
        }
    }
    return sorted;
}

const calls = scanCalls();
console.log(`Monaco NLS maps from vscode-loc ${VSCODE_LOC_TAG} (${VSCODE_LOC_COMMIT.slice(0, 12)})`);
console.log(`Monaco: ${monacoRoot}`);
console.log(`Calls: ${calls.length} across ${new Set(calls.map(call => call.module)).size} modules\n`);

fs.mkdirSync(nlsDir, { recursive: true });
let stale = false;

for (const pack of PACKS) {
    if (only && only !== pack.output) continue;

    const contents = await loadPack(pack);
    const map = {};
    const conflicts = new Set();
    const placeholderMismatches = new Set();
    const misses = [];
    let hits = 0;
    let identical = 0;

    for (const call of calls) {
        const translation = contents[call.module]?.[call.key];
        if (typeof translation !== 'string' || !translation) {
            misses.push(call);
            continue;
        }
        if (translation === call.english) {
            identical++;
            continue;
        }
        if (placeholders(translation) !== placeholders(call.english)) {
            placeholderMismatches.add(`${call.module}::${call.key}`);
            continue;
        }
        if (addTranslation(map, call.module, call.key, translation, conflicts)) hits++;
    }

    const sorted = sortMap(map);
    const entries = Object.values(sorted).reduce((sum, module) => sum + Object.keys(module).length, 0);
    const coverage = ((hits / calls.length) * 100).toFixed(1);
    console.log(
        `${pack.output}: ${hits} translated, ${identical} identical to English, ${misses.length} missing ` +
        `(${coverage}% translated, ${entries} entries)`,
    );

    if (conflicts.size) {
        console.warn(`  conflicting translations: ${[...conflicts].slice(0, 5).join(', ')}${conflicts.size > 5 ? '…' : ''}`);
    }
    if (placeholderMismatches.size) {
        console.warn(`  placeholder mismatches: ${[...placeholderMismatches].slice(0, 5).join(', ')}${placeholderMismatches.size > 5 ? '…' : ''}`);
    }

    const byModule = new Map();
    for (const miss of misses) byModule.set(miss.module, (byModule.get(miss.module) ?? 0) + 1);
    const top = [...byModule].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length) console.log(`  top misses: ${top.map(([module, count]) => `${module} (${count})`).join(', ')}`);
    if (verbose) {
        for (const miss of misses) console.log(`  ${miss.module} :: ${miss.key} :: ${miss.english}`);
    }

    const serialized = JSON.stringify(sorted, null, 2) + '\n';
    const target = path.join(nlsDir, `${pack.output}.json`);
    if (check) {
        const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
        if (current !== serialized) {
            console.error(`  out of date: ${target}`);
            stale = true;
        }
    } else {
        fs.writeFileSync(target, serialized);
        console.log(`  wrote ${path.relative(frontendRoot, target)}`);
    }
}

if (stale) process.exitCode = 1;
