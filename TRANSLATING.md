# Translation sources

CalcpadCE records where every translation came from.
Provenance is part of the review, not an afterthought.

## Source labels

| Label | Meaning | Review |
|---|---|---|
| `english-source` | The canonical English string; no translation yet. | — |
| `upstream-community` | Translations that predate this convention (initial Chinese/Bulgarian work). | Unknown |
| `ours-reviewed` | Authored by CalcpadCE contributors and reviewed by a native speaker. | Complete |
| `ours-unreviewed` | Authored by CalcpadCE contributors; native review still pending. | Pending |
| `vscode-monaco` | Generated from a `microsoft/vscode-loc` pack into Monaco NLS. | Generated |
| `vscode-vue` | Reused from a `microsoft/vscode-loc` pack in the Vue UI. | Context reviewed |
| `machine-draft` | Machine translation or AI draft. | Never final |

## Where provenance lives

- **Vue UI:** `Calcpad.Web/frontend/calcpad-frontend/src/i18n/messages/provenance.json`.
  A `default` source applies to every key; `keys` lists per-key exceptions.
- **Monaco:** `Calcpad.Web/frontend/calcpad-web/src/editor/monaco-nls/SOURCES.json`.
  Every map comes from one pinned pack; entries are generated, not hand-written.
- **.NET messages:** `Calcpad.Core/Messages.PROVENANCE.md`.
- **Docs:** each translated page should declare its source and review status in front matter.

## Rules

1. Every new translated key has a source.
2. `vscode-*` entries record the pack, tag, commit and license.
3. Do not edit generated Monaco maps by hand; regenerate them.
4. Do not copy VS Code wording blindly; check context and terminology.
5. `ours-unreviewed` is not final; a native speaker must review it.
6. `machine-draft` is never merged without native review.
7. Run the provenance check before merging.

The check lives at `Calcpad.Web/frontend/scripts/check-i18n-provenance.mjs`.
