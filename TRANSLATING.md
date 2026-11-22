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
| `vscode-vue` | Reused from a `microsoft/vscode-loc` pack in the Vue UI. |

## Where provenance lives

- **Vue UI:** `Calcpad.Web/frontend/calcpad-frontend/src/i18n/messages/provenance.json`.
  Every key has an explicit entry; there is no blanket default.
  `origins` records the commit, author and date that last changed the string.
  A partial catalog uses its own manifest, such as `provenance.pt-BR.json`.
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
    "source": "vscode-vue"
  },
  "Copy": {
    "source": "community",
    "origin": "3e486ccf",
    "vscodeMatch": true
  }
}
```

`origin` for a community key is the short commit that last changed the line, as reported by `git blame`.
A `vscode-vue` entry uses the pack pin in `sources` and does not need a commit origin.
`vscodeMatch: true` means the English key and the Chinese value exactly match a pinned VS Code pack.
It is an observation, not proof that the translator copied the pack, so the source stays `community` unless a contributor confirms it.

## Partial catalogs

A catalog may start partial.
Missing keys fall back to English; every key that is present must have explicit provenance.
`pt-BR.ts` is currently partial: it contains only strings verified against the pinned VS Code pack, marked `vscode-vue`.
Community translations are added as new entries with `source: "community"` and an `origin`.

## Community overrides

A community translation can replace a string that came from VS Code.
Record the replaced source in `replaces`.
The only valid values are `vscode-vue` and `vscode-monaco`.

In the Vue catalog, a per-key entry becomes an object:

```json
"keys": {
  "Find": {
    "source": "community",
    "replaces": "vscode-vue",
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

1. Every translated key is `community`, `vscode-monaco`, or `vscode-vue`.
2. Every Vue key has an explicit entry; there is no default source.
3. Every `community` Vue key records its `origin` commit.
4. `vscode-*` entries record the pack, tag, commit and license.
5. `vscodeMatch` does not change the source by itself.
6. Do not edit generated Monaco maps by hand; regenerate them.
7. Do not copy VS Code wording blindly; check context and terminology.
8. Machine translation is not a source.
   A machine draft must be reworked and reviewed as a community contribution before merging.
9. Language names are endonyms; never translate them.
10. A partial catalog falls back to English; do not fill gaps with unreviewed text.
11. Run the provenance check before merging.

The check lives at `Calcpad.Web/frontend/scripts/check-i18n-provenance.mjs`.
