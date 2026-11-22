# Translation sources

CalcpadCE records where every translation came from.
Provenance is part of the review, not an afterthought.

The English keys are the canonical source.
A translated key has one of three sources.

## Source labels

| Label | Meaning |
|---|---|
| `community` | Translations contributed by the CalcpadCE community, including the initial Chinese catalog and future locales. |
| `vscode` | Reused from the pinned `microsoft/vscode-loc` pack, in Monaco or a shared Calcpad UI surface: Vue sidebar, Tauri menu, webview. |

`vscode` describes the origin, not the surface.
The same source label applies whether the string lands in Monaco, Vue, the native menu, or a webview.
A `vscode` entry also records `vscodeSource`: `vscode-monaco` or `vscode-shared-ui`.

## Where provenance lives

- **Shared UI catalogs:** `Calcpad.Web/frontend/calcpad-frontend/src/i18n/messages/provenance.zh.json`.
  Every key has an explicit entry; there is no blanket default.
  `origins` records the commit, author and date that last changed the string.
  A partial catalog uses its own manifest, such as `provenance.pt-BR.json`.
- **Native menu:** the same shared catalogs.
  `Calcpad.Web/frontend/calcpad-frontend/src/i18n/menu.ts` lists the keys the Rust menu uses.
- **Monaco:** `Calcpad.Web/frontend/calcpad-web/src/editor/monaco-nls/SOURCES.json`.
  Every map comes from one pinned pack; entries are generated, not hand-written.
- **.NET messages:** `Calcpad.Core/Messages.PROVENANCE.md`.
- **Docs:** each translated page should declare its source in front matter.

## Per-key entries

```json
"keys": {
  "Files": {
    "source": "community",
    "origin": "3e486ccf"
  },
  "Find": {
    "source": "vscode",
    "vscodeSource": "vscode-shared-ui"
  },
  "Copy": {
    "source": "community",
    "origin": "3e486ccf",
    "vscodeMatch": true
  }
}
```

`origin` for a community key is the short commit that last changed the line, as reported by `git blame`.
A `vscode` entry uses the pack pin in `sources`, records `vscodeSource`, and does not need a commit origin.
`vscodeMatch: true` means the English key and the Chinese value exactly match a pinned VS Code pack.
It is an observation, not proof that the translator copied the pack, so the source stays `community` unless a contributor confirms it.

## Catalog coverage

A catalog may contain only the keys that have been translated.
Missing keys fall back to English; every key that is present must have explicit provenance.
`pt-BR.ts` currently contains the strings verified against the pinned VS Code pack, marked `vscode`.
Community translations are added as new entries with `source: "community"` and an `origin`.

## Shared UI from VS Code

The shared UI catalog imports exact matches from the pinned VS Code UI pack.
The pack is keyed by `module::key`, not by English text, so the repo also carries an index:

- `scripts/vscode.index.json` — English string to `module`/`key`.
- `scripts/vscode.langpack.pt-BR.json` — pinned pack subset.

Run `node scripts/import-vscode.mjs` to write `pt-BR.ts` and `provenance.pt-BR.json`.
`--check` verifies the committed output.
No network access or VS Code source checkout is needed at build time.
The importer includes only keys with one unique translation; keys with multiple variants stay English until the community decides.
When a key exists in both sources the importer uses Monaco first and records `vscode-monaco`; otherwise it records `vscode-shared-ui`.
Community overrides use `source: "community"` and `replaces: "vscode"`; the review workflow is not defined yet.
Do not edit the generated catalog by hand.

## Community overrides

A community translation can replace a string that came from VS Code.
Record the replaced source in `replaces`.
The only valid value is `vscode`.

In a shared UI catalog, a per-key entry becomes an object:

```json
"keys": {
  "Find": {
    "source": "community",
    "replaces": "vscode",
    "note": "Calcpad uses its own wording here."
  }
}
```

In Monaco, put the replacement in `monaco-nls/overrides/<locale>.json`.
`SOURCES.json` declares the override file and its `replaces`:

```json
"overrides": {
  "zh": {
    "source": "community",
    "replaces": "vscode",
    "path": "overrides/zh.json"
  }
}
```

The generated maps stay untouched.
The Vite plugin merges the overrides at build time.

## Rules

1. Every translated key is `community` or `vscode`.
2. Every shared UI key has an explicit entry; there is no default source.
3. Every `community` shared UI key records its `origin` commit.
4. `vscode` entries record `vscodeSource` plus the pack, tag, commit and license.
5. `vscodeMatch` does not change the source by itself.
6. Do not edit generated Monaco maps by hand; regenerate them.
7. Do not copy VS Code wording blindly; check context and terminology.
8. Machine translation is not a source.
   A machine draft must be reworked and reviewed as a community contribution before merging.
9. Language names are endonyms; never translate them.
10. A catalog may omit keys; missing keys fall back to English. Do not fill gaps with unreviewed text.
11. Run the provenance check before merging.

The check lives at `Calcpad.Web/frontend/scripts/check-i18n-provenance.mjs`.
