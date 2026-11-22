# Vue UI catalogs

- `en.ts` is the English source.
  Keys are the English text, so the file is intentionally empty.
- `zh.ts` is the Chinese catalog, with `provenance.json`.
- `pt-BR.ts` is the Portuguese catalog, with `provenance.pt-BR.json`.
  Keys missing from a catalog fall back to English.
- `provenance.json` records every key's source and origin; there is no default.
- A community entry is `{ source: "community", origin: "<commit>" }`.
  `origin` is the short commit that last changed the translation.
- A `vscode-vue` entry is copied from the pinned VS Code pack.
- `vscodeMatch: true` flags an exact English+Chinese match with the pack.
  It is an observation, not proof of copying.
- A community entry can add `replaces` when it supersedes a `vscode-vue` string.
- Add new keys to `zh.ts` and add their explicit provenance to `provenance.json`.
