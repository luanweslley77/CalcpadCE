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
  A `default` source applies to every key; `keys` lists per-key exceptions, such as `vscode-vue`.
- **Monaco:** `Calcpad.Web/frontend/calcpad-web/src/editor/monaco-nls/SOURCES.json`.
  Every map comes from one pinned pack; entries are generated, not hand-written.
- **.NET messages:** `Calcpad.Core/Messages.PROVENANCE.md`.
- **Docs:** each translated page should declare its source in front matter.

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
2. `vscode-*` entries record the pack, tag, commit and license.
3. Do not edit generated Monaco maps by hand; regenerate them.
4. Do not copy VS Code wording blindly; check context and terminology.
5. Machine translation is not a source.
   A machine draft must be reworked and reviewed as a community contribution before merging.
6. Run the provenance check before merging.

The check lives at `Calcpad.Web/frontend/scripts/check-i18n-provenance.mjs`.
