---
name: ungeneric
description: "Use when the user says 'use ungeneric' or /ungeneric, or asks to unslop, de-slop, un-AI, fix, clean up, polish, restyle, redesign or rebuild a page that looks AI-generated or vibecoded. Deterministic local tool: audits HTML on 32 slop checks (purple gradients, glow shadows, emoji icons, stock marketing copy, looping animations, pill radii, off-grid spacing, dead links and more), rebuilds the page with one of sixteen real design systems - or polishes the existing design - then re-audits to prove the fix. No API key, no model call, works offline on a file or URL."
user-invocable: true
argument-hint: "[audit|rebuild|polish|verify] [file.html|https://url] [-d direction]"
license: MIT
---

# Ungeneric

Ungeneric finds the signs that make AI-generated UI look generated, fixes them with a real design system, and proves the fix with a measured before-and-after score. It is a deterministic local tool: no API key, no model call, no npm dependencies, no network beyond Google Fonts in the output. It works on plain HTML: paste it, point at a file, or give it a live URL.

This skill runs in any coding agent that can execute shell commands and read markdown: Claude Code, Cursor, Codex, Copilot, Gemini CLI and others. Nothing here is agent-specific.

## When the user says "use ungeneric"

Treat `use ungeneric`, `/ungeneric`, `$ungeneric` (Codex), "unslop this", "this looks AI-generated, fix it", "make this page look designed" and similar phrasings as an invocation of this skill. Then run the flow below. `node` means the `cli.mjs` in this skill's folder - use the full path to it.

## Commands

| Shortcut | What it runs | What you get |
| --- | --- | --- |
| `audit <target>` | `node cli.mjs <target>` | Slop score 0-100, severity, every finding with its reason |
| `audit <target> --json` | `node cli.mjs <target> --json` | Machine-readable audit for agent loops |
| `rebuild <target> [-d dir] [-o out]` | `node cli.mjs <target> -d <dir> -o <out> --verify` | New page rebuilt on a design system, with the verify block |
| `polish <target> [-o out]` | `node cli.mjs <target> --polish -o <out> --verify` | Existing design kept, slop tells stripped |
| `verify <original> <output>` | `node cli.mjs <output>` then compare scores | Proof the output is not worse than the input |
| `render <target>` | `node cli.mjs <target> --render` | Computed-style audit in a real browser (needs puppeteer) |
| `annotate <target> <png>` | `node cli.mjs <target> --render --annotate <png>` | Screenshot with numbered markers on the blamed elements |
| CI gate | `node cli.mjs <target> --max-score 40` | Exits 2 when the score exceeds the gate |

Targets accept `.html` files, live `https://` URLs, and framework sources (`.jsx`, `.tsx`, `.vue`, `.svelte`, `.astro` - audited for the markup patterns they render).

## The flow

1. **Audit first.** Run `audit` on the target and read the findings to the user. The score decides the mode:
   - 50 and up: heavy slop, full rebuild.
   - 22 to 49: light slop, prefer `polish` so the existing design survives.
   - Under 22: the page looks designed already. Say so; suggest at most small refinements. Stop.
2. **Confirm the direction** before writing files when the user has not picked one. The audit prints a suggested direction; name it and a few alternatives (editorial, brutalist, swiss, night, blueprint, botanical, zine, construct, noir, memphis, letterpress, neon, bauhaus, riso, arcade, mono). When the user said "just fix it", take the suggestion and go.
3. **Write output to a new file** (`-o`), never over the original, unless the user asks.
4. **Always verify.** Every rebuild and polish runs with `--verify`. If the output did not measurably improve, do not ship it: pick another direction or fix the remaining findings first.
5. **Report what changed.** The CLI lists every fix (gradients stripped, emoji replaced with line icons, hero recomposed, stock copy rewritten, dead links surfaced). Findings marked "left for content" are the site's own words and assets, which a restyle should not invent replacements for - say so.
6. For React/Vue/Tailwind codebases, run Ungeneric on the rendered HTML to choose a direction, then port that direction's tokens (type, palette, surfaces) into the components yourself.

## Install (per coding agent)

The whole skill is this folder: `SKILL.md`, `cli.mjs`, `engine.js`, `render-audit.mjs`. Node 18+ is the only requirement; puppeteer is optional (only `--render`/`--annotate` use it, and they say so when it is missing). Install once, then the trigger phrase works in that agent:

```bash
node install.mjs                  # detect the coding agents present in this project, install for them
node install.mjs --agents=claude,cursor,codex   # pick agents explicitly
node install.mjs --global --agents=claude       # available in every project
```

Or copy the folder by hand into the agent's skills directory:

| Agent | Project install | Global install |
| --- | --- | --- |
| Claude Code | `.claude/skills/ungeneric/` | `~/.claude/skills/ungeneric/` |
| Cursor | `.cursor/skills/ungeneric/` | `~/.cursor/skills/ungeneric/` |
| Codex CLI | `.agents/skills/ungeneric/` | `~/.agents/skills/ungeneric/` |
| Google Antigravity | `.agents/skills/ungeneric/` (shared with Codex) | `~/.gemini/config/skills/ungeneric/` |
| GitHub Copilot / VS Code | `.github/skills/ungeneric/` | `~/.copilot/skills/ungeneric/` |
| Gemini CLI | `.gemini/skills/ungeneric/` | `~/.gemini/skills/ungeneric/` |
| OpenCode | `.opencode/skills/ungeneric/` | |

Reload the agent after installing. Then invoke with `/ungeneric` (Claude Code, Cursor, OpenCode, Antigravity, VS Code chat), `$ungeneric` (Codex), or plain language: "use ungeneric on index.html". Antigravity CLI exposes the skill as the `/ungeneric` slash command (run `/skills reload` if added mid-session). Cursor and Gemini CLI may need Agent Skills enabled in settings.

## What it does not do

It does not generate images, edit source components, or call any paid service. Polish and reskin keep the original structure; recompose keeps the real content and links but rebuilds the layout on purpose. Framework sources are audited for the markup patterns they render; complex components are best audited as rendered HTML. Its source checks are text heuristics and can false-positive on unusual but intentional markup; the slop score is a conversation starter, not a judgment.

## Honest position

Other tools in this space: Anthropic's frontend-design skill (prompt guidance only - no measurement, no rebuild, quality varies per session), Impeccable (a design vocabulary skill - 24 steering commands and a detector; it guides the agent, it does not rebuild pages deterministically), uislop (source-level linter for framework code with CI gating - detection only, no rebuild), sloplint (the broadest auditor - 54 tells and computed-style measurement in Chromium - detection and guidance, no rebuild). Ungeneric's difference: it is the only one that audits, rebuilds with real design systems, and re-audits to prove the improvement, deterministically, offline, free. Its audit alone is competitive, not the broadest; the rebuild-and-verify loop is the reason to use it.

## Files

- `engine.js` - the audit (32 checks), the sixteen design systems, the extraction and rebuild pipeline. Importable from Node or a browser as an ES module: `import { detect, restyle, polish, recompose, verify, extract, recommend } from './engine.js'`.
- `cli.mjs` - the command line. `--render` merges the computed-style audit into findings; `--annotate report.png` writes the marked screenshot; `--max-score N` is the CI gate.
- `render-audit.mjs` - the optional computed-style audit in headless Chromium. Needs `npm i puppeteer`; skipped gracefully without it.
- `install.mjs` - the per-agent installer described above.
