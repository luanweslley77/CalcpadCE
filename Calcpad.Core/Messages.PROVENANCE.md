# .NET message provenance

- `Messages.resx` is the canonical English source.
- `Messages.bg.resx` and `Messages.zh.resx` predate the provenance convention; their review status is unknown.
- `Calcpad.Cli/Messages.*` and `Calcpad.OpenXml/Messages.*` follow the same rule.
- A future `Messages.pt-BR.resx` is authored by contributors and needs native review.
- The 30 keys missing from the Bulgarian and Chinese satellites still fall back to English.
- `Calcpad.Highlighter/Linter/Constants/ErrorCodes.cs` descriptions are English source, not translated yet.
- `Calcpad.Highlighter/Snippets/Data/*.cs` descriptions are English source, not translated yet.
