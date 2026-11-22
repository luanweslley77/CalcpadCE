# Vue UI catalogs

- `en.ts` is the English source.
  Keys are the English text, so the file is intentionally empty.
- `zh.ts` is the Chinese catalog.
- `provenance.json` records whether each key is `community` or `vscode-vue`.
- A community entry can be an object `{ source, replaces, note }` when it replaces a `vscode-vue` string.
- Add new keys to `zh.ts` and mark `vscode-vue` keys in `provenance.json`.
