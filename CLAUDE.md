# PolyEdge Dash - Project Guidelines

## Standard Text Size Rules

| Element | Classes |
|---|---|
| Page titles (e.g. "PolyEdge", "Lab Analysis") | `text-2xl font-bold` |
| Section headers (e.g. "Markets", "Calibration Analysis") | `text-lg font-semibold` |
| Card titles (e.g. asset names like "Bitcoin", "BTC 5m") | `text-base font-semibold` |
| Table headers (`<th>`) | `text-xs font-semibold uppercase tracking-wider` |
| Table data (`<td>`) | `text-sm` |
| Badge/tag labels (e.g. "5m", "Live", "Strong") | `text-xs font-medium` |
| Metric values (large numbers in overview cards) | `text-2xl font-bold` |
| Metric labels (e.g. "RESOLVED", "TICKS") | `text-xs uppercase tracking-wider` |
| Chart axis labels | `text-xs` |
| Tooltip content | `text-xs` |
| Helper text / notes / descriptions | `text-xs text-muted-foreground` |
| Navigation links | `text-sm font-medium` |
| Button labels | `text-sm font-medium` |
| Input/filter labels | `text-sm` |
| Empty state messages | `text-sm text-muted-foreground` |
| Timestamps and secondary metadata | `text-xs text-muted-foreground` |

### Rules

- Never go below `text-xs` (12px) — anything smaller is unreadable
- Never use arbitrary pixel sizes — only use the Tailwind scale
- `text-sm` (14px) is the minimum for any content the user needs to read and act on, including all table data
- Consistency matters more than perfection — if two similar elements have different sizes, make them the same
