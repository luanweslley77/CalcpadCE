# Translation sources

CalcpadCE records where every translation came from.
Provenance is part of the review, not an afterthought.

The English keys are the canonical source.
A translated key has one of three sources.

## Source labels

| Label | Meaning |
|---|---|
| `community` | Translations contributed by the CalcpadCE community, including the initial Chinese catalog and future locales. |
| `vscode-monaco` | Generated from a `microsoft/vscode-loc` pack into Monaco NLS. |
| `vscode-shared-ui` | Reused from a `microsoft/vscode-loc` pack in a shared Calcpad UI surface: Vue sidebar, Tauri menu, webview. |

`vscode-shared-ui` describes the origin, not the surface.
The same source label applies whether the string lands in Vue, the native menu, or a webview.

## Where provenance lives

- **Shared UI catalogs:** `Calcpad.Web/frontend/calcpad-frontend/src/i18n/messages/provenance.json`.
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
    "source": "vscode-shared-ui"
  },
  "Copy": {
    "source": "community",
    "origin": "3e486ccf",
    "vscodeMatch": true
  }
}
```

`origin` for a community key is the short commit that last changed the line, as reported by `git blame`.
A `vscode-shared-ui` entry uses the pack pin in `sources` and does not need a commit origin.
`vscodeMatch: true` means the English key and the Chinese value exactly match a pinned VS Code pack.
It is an observation, not proof that the translator copied the pack, so the source stays `community` unless a contributor confirms it.

## Catalog coverage

A catalog may contain only the keys that have been translated.
Missing keys fall back to English; every key that is present must have explicit provenance.
`pt-BR.ts` currently contains the strings verified against the pinned VS Code pack, marked `vscode-shared-ui`.
Community translations are added as new entries with `source: "community"` and an `origin`.

## Shared UI from VS Code

The shared UI catalog imports exact matches from the pinned VS Code UI pack.
The pack is keyed by `module::key`, not by English text, so the repo also carries an index:

- `scripts/vscode-shared-ui.index.json` — English string to `module`/`key`.
- `scripts/vscode-shared-ui.langpack.pt-BR.json` — pinned pack subset.
- `scripts/vscode-shared-ui.exceptions.json` — context overrides and exclusions.

Run `node scripts/import-vscode-shared-ui.mjs` to write `pt-BR.ts` and `provenance.pt-BR.json`.
`--check` verifies the committed output.
No network access or VS Code source checkout is needed at build time.
Do not edit the generated catalog by hand.

## Community overrides

A community translation can replace a string that came from VS Code.
Record the replaced source in `replaces`.
The only valid values are `vscode-shared-ui` and `vscode-monaco`.

In a shared UI catalog, a per-key entry becomes an object:

```json
"keys": {
  "Find": {
    "source": "community",
    "replaces": "vscode-shared-ui",
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
    "replaces": "vscode-monaco",
    "path": "overrides/zh.json"
  }
}
```

The generated maps stay untouched.
The Vite plugin merges the overrides at build time.

## Rules

1. Every translated key is `community`, `vscode-monaco`, or `vscode-shared-ui`.
2. Every shared UI key has an explicit entry; there is no default source.
3. Every `community` shared UI key records its `origin` commit.
4. `vscode-*` entries record the pack, tag, commit and license.
5. `vscodeMatch` does not change the source by itself.
6. Do not edit generated Monaco maps by hand; regenerate them.
7. Do not copy VS Code wording blindly; check context and terminology.
8. Machine translation is not a source.
   A machine draft must be reworked and reviewed as a community contribution before merging.
9. Language names are endonyms; never translate them.
10. A catalog may omit keys; missing keys fall back to English. Do not fill gaps with unreviewed text.
11. Run the provenance check before merging.

The check lives at `Calcpad.Web/frontend/scripts/check-i18n-provenance.mjs`.
