/**
 * Imports exact matches from a committed VS Code language pack into a
 * generated shared-UI catalog, preserving community entries. Offline and
 * deterministic.
 *
 *   node scripts/i18n/import-vscode.mjs [--locale=<tag>] [--check]
 *
 * With no locale it processes every data/vscode.langpack.<tag>.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../..');
const messages = path.join(frontend, 'calcpad-frontend/src/i18n/messages');
const dataDir = path.join(here, 'data');
const args = process.argv.slice(2);
const check = args.includes('--check');
const localeArg = args.find(argument => argument.startsWith('--locale='))?.split('=')[1]
    ?? args.find(argument => !argument.startsWith('--'));

const discovered = fs.readdirSync(dataDir)
    .map(file => file.match(/^vscode\.langpack\.(.+)\.json$/)?.[1])
    .filter(Boolean)
    .sort();
const locales = localeArg ? [localeArg] : discovered;
const index = JSON.parse(fs.readFileSync(path.join(dataDir, 'vscode.index.json'), 'utf8'));

const SOURCES = ['vscode-monaco', 'vscode-shared-ui'];
let failed = false;

function readCatalog(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < 0) return {};
    return JSON.parse(text.slice(start, end + 1).replace(/,\s*}/, '}'));
}

for (const locale of locales) {
    const packFile = path.join(dataDir, `vscode.langpack.${locale}.json`);
    if (!fs.existsSync(packFile)) {
        console.error(`VS Code ${locale}: missing ${path.relative(frontend, packFile)}`);
        failed = true;
        continue;
    }
    const pack = JSON.parse(fs.readFileSync(packFile, 'utf8'));
    const catalogFile = path.join(messages, `${locale}.ts`);
    const provenanceFile = path.join(messages, `provenance.${locale}.json`);
    const errors = [];
    const selected = {};
    const skipped = [];

    for (const [english, entries] of Object.entries(index.keys ?? {})) {
        const bySource = Object.fromEntries(SOURCES.map(source => [source, new Set()]));
        for (const { source, module, key } of entries) {
            const value = pack.contents?.[source]?.[module]?.[key];
            if (value && bySource[source]) bySource[source].add(value);
        }
        const all = new Set(SOURCES.flatMap(source => [...bySource[source]]));
        if (all.size === 0) {
            errors.push(`"${english}" has no translation in the committed langpack`);
            continue;
        }
        const single = SOURCES.find(source => bySource[source].size === 1);
        if (single) {
            selected[english] = { value: [...bySource[single]][0], vscodeSource: single };
            continue;
        }
        const detail = SOURCES
            .filter(source => bySource[source].size)
            .map(source => `${source}: ${[...bySource[source]].join(', ')}`)
            .join('; ');
        skipped.push({ english, detail });
    }

    const sorted = {};
    for (const key of Object.keys(selected).sort((a, b) => a.localeCompare(b))) sorted[key] = selected[key];
    const pins = pack.vscode;

    let existingProvenance = {};
    if (fs.existsSync(provenanceFile)) {
        try {
            existingProvenance = JSON.parse(fs.readFileSync(provenanceFile, 'utf8'));
        } catch (error) {
            errors.push(`${path.basename(provenanceFile)}: ${error.message}`);
        }
    }
    let existingCatalog = {};
    if (fs.existsSync(catalogFile)) {
        try {
            existingCatalog = readCatalog(fs.readFileSync(catalogFile, 'utf8'));
        } catch (error) {
            errors.push(`${path.basename(catalogFile)}: ${error.message}`);
        }
    }

    const community = {};
    for (const [key, entry] of Object.entries(existingProvenance.keys ?? {})) {
        if (entry?.source !== 'community') continue;
        const value = existingCatalog[key];
        if (typeof value !== 'string' || !value) {
            errors.push(`community key "${key}" has no value in ${path.basename(catalogFile)}`);
            continue;
        }
        if (key in sorted && entry.replaces !== 'vscode') {
            errors.push(`community key "${key}" replaces a VS Code key without replaces: "vscode"`);
            continue;
        }
        community[key] = { value, entry };
    }

    const merged = {};
    for (const [key, entry] of Object.entries(sorted)) {
        merged[key] = {
            value: entry.value,
            entry: { source: 'vscode', vscodeSource: entry.vscodeSource },
        };
    }
    for (const [key, entry] of Object.entries(community)) merged[key] = entry;

    const mergedKeys = Object.keys(merged).sort((a, b) => a.localeCompare(b));
    const vscodeCount = mergedKeys.filter(key => merged[key].entry.source === 'vscode').length;
    const communityCount = mergedKeys.length - vscodeCount;
    const monacoCount = mergedKeys.filter(
        key => merged[key].entry.source === 'vscode' && merged[key].entry.vscodeSource === 'vscode-monaco',
    ).length;
    const sharedCount = vscodeCount - monacoCount;

    const lines = mergedKeys.map(
        key => `    ${JSON.stringify(key)}: ${JSON.stringify(merged[key].value)},`,
    );
    const catalog = `// Generated by scripts/i18n/import-vscode.mjs for ${locale} from VS Code ${pins.tag}
// and ${pins.pack} ${pins.locTag}. Community entries are preserved; generated entries are rewritten.
const catalog: Record<string, string> = {
${lines.join('\n')}
}

export default catalog
`;

    const origins = existingProvenance.origins ?? {};
    const provenance = {
        locale,
        vscode: pins,
        ...(Object.keys(origins).length ? { origins } : {}),
        keys: Object.fromEntries(mergedKeys.map(key => [key, merged[key].entry])),
    };
    const provenanceText = JSON.stringify(provenance, null, 2) + '\n';

    if (errors.length) {
        console.error(`VS Code ${locale}:`);
        for (const error of errors) console.error(`- ${error}`);
        failed = true;
        continue;
    }

    if (check) {
        const currentCatalog = fs.existsSync(catalogFile) ? fs.readFileSync(catalogFile, 'utf8') : '';
        const currentProvenance = fs.existsSync(provenanceFile) ? fs.readFileSync(provenanceFile, 'utf8') : '';
        if (currentCatalog !== catalog || currentProvenance !== provenanceText) {
            console.error(`VS Code ${locale}: catalog is out of date; run:`);
            console.error(`  node scripts/i18n/import-vscode.mjs --locale=${locale}`);
            failed = true;
        } else {
            console.log(`VS Code ${locale}: ${mergedKeys.length} keys, up to date.`);
        }
        continue;
    }

    const existing = fs.existsSync(catalogFile) ? fs.readFileSync(catalogFile, 'utf8') : '';
    if (existing && !existing.startsWith('// Generated by scripts/i18n/import-vscode.mjs')) {
        console.error(`VS Code ${locale}: refusing to overwrite a non-generated catalog`);
        failed = true;
        continue;
    }

    fs.writeFileSync(catalogFile, catalog);
    fs.writeFileSync(provenanceFile, provenanceText);
    console.log(
        `VS Code ${locale}: ${mergedKeys.length} keys ` +
        `(${monacoCount} vscode-monaco, ${sharedCount} vscode-shared-ui, ${communityCount} community).`,
    );
    if (skipped.length) {
        console.log(`Skipped ${skipped.length} keys with multiple translations:`);
        for (const item of skipped) console.log(`- ${item.english} (${item.detail})`);
    }
}

if (!locales.length) {
    console.error(`No vscode.langpack.<locale>.json found in ${path.relative(frontend, dataDir)}`);
    failed = true;
}
if (failed) process.exitCode = 1;
