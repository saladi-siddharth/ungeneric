# Contributing

Ungeneric is one person's project for now, but good ideas are welcome.

## Ways to help

- **New slop checks.** Found an AI-UI tell we miss? Open an issue with a real HTML snippet that shows it. A check ships only if it fires on real vibecoded pages and does not false-positive on the sixteen built-in directions.
- **New design systems.** A direction is one JSON file: `{ id, name, hint, author, fonts, css, swatches }`. See `directions/` for examples. It must pass the full audit on its own output - that is the bar.
- **Bug reports.** Include the input HTML (or a minimal cut of it), the command you ran, and what you expected.

## Ground rules

- `node test/smoke.mjs` must stay green.
- Every rebuild must re-audit better than its input. The verify loop is the product; do not bypass it.
- No stock assets, no external URLs in generated pages, no dependencies in the core engine. `render-audit.mjs` may use puppeteer; nothing else may.
- Honest scope in docs. The slop score is a heuristic, not a verdict - keep that framing.
