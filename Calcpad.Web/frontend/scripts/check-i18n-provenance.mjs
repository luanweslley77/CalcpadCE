import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '..');
const messages = path.join(frontend, 'calcpad-frontend/src/i18n/messages');
const monaco = path.join(frontend, 'calcpad-web/src/editor/monaco-nls');
const generator = path.join(here, 'generate-monaco-nls-maps.mjs');
const errors = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(frontend, file)}: ${error.message}`);
    return {};
  }
}

const zh = new Set();
const zhSource = fs.readFileSync(path.join(messages, 'zh.ts'), 'utf8');
for (const match of zhSource.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm))
  zh.add(JSON.parse('"' + match[1] + '"'));

const provenance = readJson(path.join(messages, 'provenance.json'));
if (provenance.default) {
  errors.push('provenance.json: a default source is not allowed; every key needs explicit provenance');
}
const counts = new Map();
const originCounts = new Map();
let vueOverrides = 0;
let vscodeMatches = 0;
for (const key of zh) {
  const entry = provenance.keys?.[key];
  if (!entry) {
    errors.push(`provenance.json: key "${key}" has no explicit provenance`);
    continue;
  }
  const source = typeof entry === 'string' ? entry : entry?.source;
  if (!source) {
    errors.push(`provenance.json: key "${key}" has no source`);
    continue;
  }
  if (typeof entry === 'object' && entry.replaces) {
    if (source !== 'community')
      errors.push(`provenance.json: key "${key}" can only replace from community`);
    if (!['vscode-monaco', 'vscode-vue'].includes(entry.replaces))
      errors.push(`provenance.json: key "${key}" replaces unknown source "${entry.replaces}"`);
    vueOverrides++;
  }
  if (typeof entry === 'object' && entry.origin) {
    if (!provenance.origins?.[entry.origin])
      errors.push(`provenance.json: key "${key}" uses undeclared origin "${entry.origin}"`);
    else
      originCounts.set(entry.origin, (originCounts.get(entry.origin) ?? 0) + 1);
  } else if (source === 'community') {
    errors.push(`provenance.json: community key "${key}" has no origin`);
  }
  if (typeof entry === 'object' && entry.vscodeMatch !== undefined) {
    if (typeof entry.vscodeMatch !== 'boolean')
      errors.push(`provenance.json: key "${key}" vscodeMatch must be a boolean`);
    else if (entry.vscodeMatch)
      vscodeMatches++;
  }
  if (!provenance.sources?.[source]) {
    errors.push(`provenance.json: key "${key}" uses undeclared source "${source}"`);
    continue;
  }
  counts.set(source, (counts.get(source) ?? 0) + 1);
}
for (const [key, entry] of Object.entries(provenance.keys ?? {})) {
  if (!zh.has(key)) errors.push(`provenance.json: key "${key}" is not in zh.ts`);
  const source = typeof entry === 'string' ? entry : entry?.source;
  if (!source || !provenance.sources?.[source])
    errors.push(`provenance.json: key "${key}" has an undeclared source`);
  if (typeof entry === 'object' && entry.origin && !provenance.origins?.[entry.origin])
    errors.push(`provenance.json: key "${key}" has an undeclared origin`);
}

const monacoSources = readJson(path.join(monaco, 'SOURCES.json'));
const generatorSource = fs.readFileSync(generator, 'utf8');
const generatorTag = generatorSource.match(/const VSCODE_LOC_TAG = '([^']+)'/)?.[1];
const generatorCommit = generatorSource.match(/const VSCODE_LOC_COMMIT = '([^']+)'/)?.[1];
if (!generatorTag || !generatorCommit) {
  errors.push('generate-monaco-nls-maps.mjs: tag or commit constant is missing');
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
  if (info.source !== 'vscode-monaco')
    errors.push(`SOURCES.json: map "${file}" must be vscode-monaco`);
  baseMaps[output] = readJson(path.join(monaco, file));
}
if (Object.keys(monacoSources.maps ?? {}).length !== packs.size)
  errors.push('SOURCES.json: map count does not match the generator packs');

let monacoOverrides = 0;
for (const [locale, info] of Object.entries(monacoSources.overrides ?? {})) {
  if (info.source !== 'community')
    errors.push(`SOURCES.json: override "${locale}" must be community`);
  if (info.replaces !== 'vscode-monaco')
    errors.push(`SOURCES.json: override "${locale}" must replace vscode-monaco`);
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
  const summary = [...counts].map(([source, count]) => `${count} ${source}`).join(', ');
  const topOrigins = [...originCounts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([origin, count]) => `${origin} (${count})`)
    .join(', ');
  console.log(`Vue zh: ${zh.size} keys (${summary}; ${vscodeMatches} VS Code matches; ${vueOverrides} overrides)`);
  console.log(`Origins: ${topOrigins}`);
  console.log(`Monaco: ${Object.keys(monacoSources.maps).length} maps from ${monacoSources.source} ${monacoSources.tag} (vscode-monaco; ${monacoOverrides} overrides)`);
  console.log('Provenance OK');
}
