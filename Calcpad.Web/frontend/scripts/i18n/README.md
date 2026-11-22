# i18n scripts

All translation tooling lives here. None of these scripts fetch anything at build time.

## Layout

```
scripts/i18n/
├── generate-monaco-nls.mjs      Monaco NLS maps from the pinned VS Code packs
├── import-vscode.mjs            exact shared-UI matches -> pt-BR catalog
├── check-provenance.mjs         validates every catalog's provenance
└── data/
    ├── vscode.index.json        English -> VS Code module/key
    └── vscode.langpack.pt-BR.json
```

## Commands

Run from `Calcpad.Web/frontend`, or through the `calcpad-web` package scripts:

```sh
node scripts/i18n/generate-monaco-nls.mjs
node scripts/i18n/generate-monaco-nls.mjs --check

node scripts/i18n/import-vscode.mjs
node scripts/i18n/import-vscode.mjs --check

node scripts/i18n/check-provenance.mjs
```

The CI runs the two `--check` commands and the provenance check.

## Rules

- `generate-monaco-nls.mjs` writes `calcpad-web/src/editor/monaco-nls/`.
  Do not edit those maps by hand.
- `import-vscode.mjs` writes `calcpad-frontend/src/i18n/messages/pt-BR.ts` and
  `provenance.pt-BR.json`. Do not edit them by hand.
- The VS Code pack is keyed by `module::key`, not by English text.
  `vscode.index.json` is the English bridge.
- A word can have several translations across modules.
  Only keys with one unique translation are imported; the rest stay English
  until the community decides.
- `vscodeSource` records `vscode-monaco` or `vscode-shared-ui`.
- Community overrides use `source: "community"` and `replaces: "vscode"`.
  The review workflow is not defined yet.

See `TRANSLATING.md` for the provenance policy.
