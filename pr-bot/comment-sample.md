## Ungeneric report

**Slop score: 70/100** (worst file) · average 42/100 across 2 HTML files

| File | Score | Verdict |
| --- | ---: | --- |
| `/tmp/sample-test.html` | 70/100 | Heavy slop - full restyle recommended |
| `/tmp/sample-out.html` | 14/100 | Looks designed already - only small refinements suggested |

<details><summary>Top findings in <code>/tmp/sample-test.html</code></summary>

- **Gradient headline text** x2 - background-clip:text on a heading is a stock trick. Strong type in a solid color is stronger.
- **Stock AI marketing copy** x5 - "Supercharge", "unlock", "seamless" - copy that could sell anything sells nothing.
- **Purple / violet gradients** - The single most common AI-UI tell. One flat surface + one accent beats a violet wash.
- **Default vibecode font (Inter / Roboto / system stack)** - Typography is where generated UI gives itself away. A distinctive pairing changes everything.
- **Generic hero (big H1 + sub + two buttons)** - The centered hero with a gradient headline and two buttons is the default AI layout.
- **Colored glow shadows** - Huge soft colored shadows (the "AI glow") make surfaces feel like a template.

</details>

_Run `node cli.mjs <file> -d <direction> --verify` locally to fix and prove the fix. Heuristic, not a judgment._
