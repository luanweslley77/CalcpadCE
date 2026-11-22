# Monaco NLS maps

Generated from the VS Code language packs pinned in
`Calcpad.Web/frontend/scripts/generate-monaco-nls-maps.mjs`:

- `vscode-language-pack-zh-hans`
- `vscode-language-pack-pt-BR`

Source: [microsoft/vscode-loc](https://github.com/microsoft/vscode-loc) tag
`v1.96.2024121109`, commit `110df563b65cd2a1f9d8b58e3bdcadce90427f6d`.
License: MIT, see [LICENSE.md](LICENSE.md).

Do not edit the JSON files by hand. Regenerate them with:

```sh
cd Calcpad.Web/frontend/calcpad-web
npm run generate:monaco-nls
```

The Vite plugin in `calcpad-web/vite.config.ts` matches the `(module, key)`
pairs of Monaco's `localize()` calls and falls back to English when an entry
is missing.

Every entry is generated from the pinned pack; see `SOURCES.json`.
None of the entries are hand-written.

Community overrides live in `overrides/<locale>.json` and are declared in
`SOURCES.json` with `replaces: vscode`.
Monaco maps record `vscodeSource: vscode-monaco`; shared UI entries use `vscode-shared-ui`.
The Vite plugin merges them over the generated map at build time.
