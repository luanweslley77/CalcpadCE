# Shared UI catalogs

- `en.ts` is the English source.
  Keys are the English text, so the file is intentionally empty.
- `zh.ts` is the Chinese catalog, with `provenance.json`.
- `pt-BR.ts` is the Portuguese catalog, with `provenance.pt-BR.json`.
  Keys missing from a catalog fall back to English.
- `provenance.json` records every key's source and origin; there is no default.
- A community entry is `{ source: "community", origin: "<commit>" }`.
  `origin` is the short commit that last changed the translation.
- A `vscode-shared-ui` entry is copied from the pinned VS Code pack.
  The label covers any shared Calcpad UI surface, not only Vue.
- `vscodeMatch: true` flags an exact English + translation match with the pack.
  It is an observation, not proof of copying.
- A community entry can add `replaces` when it supersedes a `vscode-shared-ui` string.
- Native Tauri menu labels live in the same catalogs.
  `i18n/menu.ts` lists the keys and filters untranslated entries.
- `Auto` is looked up as `tt('Auto')`; each catalog can add its own reviewed entry.
- Add new keys to `zh.ts` and add their explicit provenance to `provenance.json`.
