import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../..');
const messages = path.join(frontend, 'calcpad-frontend/src/i18n/messages');
const monaco = path.join(frontend, 'calcpad-web/src/editor/monaco-nls');
const generator = path.join(here, 'generate-monaco-nls.mjs');
const errors = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(frontend, file)}: ${error.message}`);
    return {};
  }
}

function parseKeys(file) {
  const keys = new Set();
  const source = fs.readFileSync(path.join(messages, file), 'utf8');
  for (const match of source.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm))
    keys.add(JSON.parse('"' + match[1] + '"'));
  return keys;
}

const zhProvenance = readJson(path.join(messages, 'provenance.zh.json'));
if (zhProvenance.default) {
  errors.push('provenance.zh.json: a default source is not allowed; every key needs explicit provenance');
}
const sources = zhProvenance.sources ?? {};
const catalogs = [
  { label: 'zh', file: 'zh.ts', manifest: zhProvenance },
  { label: 'pt-BR', file: 'pt-BR.ts', manifest: readJson(path.join(messages, 'provenance.pt-BR.json')) },
];
const catalogResults = [];
for (const catalog of catalogs) {
  const keys = parseKeys(catalog.file);
  const counts = new Map();
  const originCounts = new Map();
  const vscodeSourceCounts = new Map();
  let overrides = 0;
  let vscodeMatches = 0;
  for (const key of keys) {
    const entry = catalog.manifest.keys?.[key];
    if (!entry) {
      errors.push(`${catalog.file}: key "${key}" has no explicit provenance`);
      continue;
    }
    const source = typeof entry === 'string' ? entry : entry?.source;
    if (!source) {
      errors.push(`${catalog.label}: key "${key}" has no source`);
      continue;
    }
    if (source === 'vscode') {
      const vscodeSource = typeof entry === 'string' ? undefined : entry.vscodeSource;
      if (!['vscode-monaco', 'vscode-shared-ui'].includes(vscodeSource))
        errors.push(`${catalog.label}: key "${key}" has invalid vscodeSource "${vscodeSource}"`);
      else
        vscodeSourceCounts.set(vscodeSource, (vscodeSourceCounts.get(vscodeSource) ?? 0) + 1);
    }
    if (typeof entry === 'object' && entry.replaces) {
      if (source !== 'community')
        errors.push(`${catalog.label}: key "${key}" can only replace from community`);
      if (entry.replaces !== 'vscode')
        errors.push(`${catalog.label}: key "${key}" replaces unknown source "${entry.replaces}"`);
      overrides++;
    }
    if (typeof entry === 'object' && entry.origin) {
      const origins = catalog.manifest.origins ?? zhProvenance.origins ?? {};
      if (!origins[entry.origin])
        errors.push(`${catalog.label}: key "${key}" uses undeclared origin "${entry.origin}"`);
      else
        originCounts.set(entry.origin, (originCounts.get(entry.origin) ?? 0) + 1);
    } else if (source === 'community') {
      errors.push(`${catalog.label}: community key "${key}" has no origin`);
    }
    if (typeof entry === 'object' && entry.vscodeMatch !== undefined) {
      if (typeof entry.vscodeMatch !== 'boolean')
        errors.push(`${catalog.label}: key "${key}" vscodeMatch must be a boolean`);
      else if (entry.vscodeMatch)
        vscodeMatches++;
    }
    if (!sources[source]) {
      errors.push(`${catalog.label}: key "${key}" uses undeclared source "${source}"`);
      continue;
    }
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  for (const [key, entry] of Object.entries(catalog.manifest.keys ?? {})) {
    if (!keys.has(key)) errors.push(`${catalog.label}: key "${key}" is not in ${catalog.file}`);
    const source = typeof entry === 'string' ? entry : entry?.source;
    if (!source || !sources[source])
      errors.push(`${catalog.label}: key "${key}" has an undeclared source`);
    if (typeof entry === 'object' && entry.origin) {
      const origins = catalog.manifest.origins ?? zhProvenance.origins ?? {};
      if (!origins[entry.origin])
        errors.push(`${catalog.label}: key "${key}" has an undeclared origin`);
    }
  }
  catalogResults.push({
    label: catalog.label,
    total: keys.size,
    counts,
    originCounts,
    vscodeSourceCounts,
    overrides,
    vscodeMatches,
  });
}

const monacoSources = readJson(path.join(monaco, 'SOURCES.json'));
const generatorSource = fs.readFileSync(generator, 'utf8');
const generatorTag = generatorSource.match(/const VSCODE_LOC_TAG = '([^']+)'/)?.[1];
const generatorCommit = generatorSource.match(/const VSCODE_LOC_COMMIT = '([^']+)'/)?.[1];
if (!generatorTag || !generatorCommit) {
  errors.push('generate-monaco-nls.mjs: tag or commit constant is missing');
}
if (monacoSources.tag !== generatorTag || monacoSources.commit !== generatorCommit)
  errors.push('SOURCES.json: tag/commit do not match the generator');
if (monacoSources.source !== 'microsoft/vscode-loc')
  errors.push('SOURCES.json: expected source microsoft/vscode-loc');
if (monacoSources.license !== 'MIT')
  errors.push('SOURCES.json: expected MIT license');

const packs = new Map();
for (const match of generatorSource.matchAll(/\{ output: '([^']+)', folder: '([^']+)' \}/g))
  packs.set(match[1], match[2]);
const baseMaps = {};
for (const [file, info] of Object.entries(monacoSources.maps ?? {})) {
  const output = file.replace(/\.json$/, '');
  if (!fs.existsSync(path.join(monaco, file))) {
    errors.push(`SOURCES.json: map "${file}" does not exist`);
    continue;
  }
  if (!packs.has(output)) {
    errors.push(`SOURCES.json: map "${file}" has no matching generator pack`);
    continue;
  }
  if (packs.get(output) !== info.pack)
    errors.push(`SOURCES.json: pack for "${file}" does not match the generator`);
  if (info.source !== 'vscode')
    errors.push(`SOURCES.json: map "${file}" must be vscode`);
  if (info.vscodeSource !== 'vscode-monaco')
    errors.push(`SOURCES.json: map "${file}" must be vscode-monaco`);
  baseMaps[output] = readJson(path.join(monaco, file));
}
if (Object.keys(monacoSources.maps ?? {}).length !== packs.size)
  errors.push('SOURCES.json: map count does not match the generator packs');

let monacoOverrides = 0;
for (const [locale, info] of Object.entries(monacoSources.overrides ?? {})) {
  if (info.source !== 'community')
    errors.push(`SOURCES.json: override "${locale}" must be community`);
  if (info.replaces !== 'vscode')
    errors.push(`SOURCES.json: override "${locale}" must replace vscode`);
  const file = path.join(monaco, info.path);
  if (!fs.existsSync(file)) {
    errors.push(`SOURCES.json: override "${info.path}" does not exist`);
    continue;
  }
  const data = readJson(file);
  const base = baseMaps[locale];
  if (!base) {
    errors.push(`SOURCES.json: override "${locale}" has no base map`);
    continue;
  }
  for (const [module, entries] of Object.entries(data)) {
    if (!base[module]) {
      errors.push(`overrides/${locale}.json: module "${module}" is not in the base map`);
      continue;
    }
    for (const [key, value] of Object.entries(entries)) {
      if (!base[module][key])
        errors.push(`overrides/${locale}.json: "${module}::${key}" is not in the base map`);
      if (typeof value !== 'string' || !value)
        errors.push(`overrides/${locale}.json: "${module}::${key}" has an empty translation`);
      else
        monacoOverrides++;
    }
  }
}

if (errors.length) {
  console.error('Translation provenance check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  for (const result of catalogResults) {
    const summary = [...result.counts].map(([source, count]) => `${count} ${source}`).join(', ');
    const vscodeDetail = result.vscodeSourceCounts.size
      ? ` (${[...result.vscodeSourceCounts].map(([source, count]) => `${count} ${source}`).join(', ')})`
      : '';
    console.log(`Shared UI ${result.label} catalog: ${result.total} keys (${summary}; ${result.vscodeMatches} VS Code matches; ${result.overrides} overrides)${vscodeDetail}`);
    if (result.originCounts.size) {
      const topOrigins = [...result.originCounts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([origin, count]) => `${origin} (${count})`)
        .join(', ');
      console.log(`  Origins: ${topOrigins}`);
    }
  }
  console.log('Catalog counts only; missing keys fall back to English; hardcoded UI strings are not measured.');
  console.log(`Monaco: ${Object.keys(monacoSources.maps).length} maps from ${monacoSources.source} ${monacoSources.tag} (vscode; ${monacoOverrides} overrides)`);
  console.log('Provenance OK');
}
