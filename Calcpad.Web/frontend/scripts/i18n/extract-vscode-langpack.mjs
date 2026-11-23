/**
 * Extracts the pinned VS Code language-pack subset used by import-vscode.mjs.
 * The subset is a faithful copy of the module/key pairs named in
 * vscode.index.json; never edit vscode.langpack.<locale>.json by hand.
 *
 *   node scripts/i18n/extract-vscode-langpack.mjs [--locale=<tag>] [--check]
 *
 * Reads the pinned full pack from the Monaco cache, or downloads it when the
 * cache is cold. No network is used by the importer at build time.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../..');
const dataDir = path.join(here, 'data');
const cacheDir = path.join(frontend, 'calcpad-web/node_modules/.cache/calcpad-monaco-nls');
const args = process.argv.slice(2);
const check = args.includes('--check');
const only = args.find(argument => argument.startsWith('--locale='))?.split('=')[1];

const index = JSON.parse(fs.readFileSync(path.join(dataDir, 'vscode.index.json'), 'utf8'));
const locales = fs.readdirSync(dataDir)
    .map(file => file.match(/^vscode\.langpack\.(.+)\.json$/)?.[1])
    .filter(Boolean)
    .filter(locale => !only || locale === only)
    .sort();

if (!locales.length) {
    console.error(`No vscode.langpack.<locale>.json found in ${path.relative(frontend, dataDir)}`);
    process.exitCode = 1;
}

async function loadFullPack(pins) {
    const cacheFile = path.join(cacheDir, `${pins.pack}-${pins.locCommit}.json`);
    if (!fs.existsSync(cacheFile)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        const url = `https://raw.githubusercontent.com/microsoft/vscode-loc/${pins.locCommit}/i18n/${pins.pack}/translations/main.i18n.json`;
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`failed to download ${url}: ${response.status} ${response.statusText}`);
        fs.writeFileSync(cacheFile, await response.text());
    }
    const pack = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (!pack.contents || typeof pack.contents !== 'object')
        throw new Error(`invalid language pack: ${cacheFile}`);
    return pack.contents;
}

let failed = false;

for (const locale of locales) {
    const file = path.join(dataDir, `vscode.langpack.${locale}.json`);
    const current = JSON.parse(fs.readFileSync(file, 'utf8'));
    const pins = current.vscode;
    if (!pins?.pack || !pins?.locCommit) {
        console.error(`VS Code ${locale}: missing vscode.pack or vscode.locCommit in ${path.basename(file)}`);
        failed = true;
        continue;
    }

    const full = await loadFullPack(pins);
    const contents = {};
    const errors = [];
    for (const [english, entries] of Object.entries(index.keys ?? {})) {
        for (const { source, module, key } of entries) {
            const value = full[module]?.[key];
            if (typeof value !== 'string' || !value) {
                errors.push(`"${english}": ${module}::${key} is missing from ${pins.pack}`);
                continue;
            }
            (contents[source] ??= {});
            (contents[source][module] ??= {});
            contents[source][module][key] = value;
        }
    }

    if (errors.length) {
        console.error(`VS Code ${locale}:`);
        for (const error of errors) console.error(`- ${error}`);
        failed = true;
        continue;
    }

    // Keep the committed order so adding an entry does not rewrite the file.
    const ordered = {};
    for (const source of Object.keys(current.contents ?? {})) {
        for (const module of Object.keys(current.contents[source])) {
            for (const key of Object.keys(current.contents[source][module])) {
                const value = contents[source]?.[module]?.[key];
                if (value === undefined) continue;
                (ordered[source] ??= {});
                (ordered[source][module] ??= {});
                ordered[source][module][key] = value;
            }
        }
    }
    for (const source of Object.keys(contents).sort()) {
        for (const module of Object.keys(contents[source]).sort()) {
            for (const key of Object.keys(contents[source][module]).sort()) {
                if (ordered[source]?.[module]?.[key] !== undefined) continue;
                (ordered[source] ??= {});
                (ordered[source][module] ??= {});
                ordered[source][module][key] = contents[source][module][key];
            }
        }
    }

    const entryCount = Object.values(ordered).reduce(
        (sum, modules) => sum + Object.values(modules).reduce((count, keys) => count + Object.keys(keys).length, 0),
        0,
    );
    const output = JSON.stringify({ vscode: pins, contents: ordered }, null, 2) + '\n';
    if (check) {
        const committed = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
        if (committed !== output) {
            console.error(`VS Code ${locale}: language-pack subset is out of date; run:`);
            console.error(`  node scripts/i18n/extract-vscode-langpack.mjs --locale=${locale}`);
            failed = true;
        } else {
            console.log(`VS Code ${locale}: ${entryCount} entries for ${Object.keys(index.keys ?? {}).length} English keys, up to date.`);
        }
    } else {
        fs.writeFileSync(file, output);
        console.log(`VS Code ${locale}: extracted ${entryCount} entries for ${Object.keys(index.keys ?? {}).length} English keys.`);
    }
}

if (failed) process.exitCode = 1;
