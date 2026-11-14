---
paths:
  - 'apps/web/**/*.tsx'
  - 'apps/web/**/*.css'
  - 'apps/web/components/**/*.ts'
---

# Styling

Theme tokens are defined in `apps/web/app/globals.css` and follow the shadcn
naming, so they adapt to dark mode. Prefer them over raw palette colours in new
code:

| Instead of                | Use                                      |
| ------------------------- | ---------------------------------------- |
| `text-gray-900`           | `text-foreground`                        |
| `text-gray-600/500/400`   | `text-muted-foreground`                  |
| `text-red-600`            | `text-destructive`                       |
| `text-blue-600` + hover   | `text-primary hover:text-primary-hover`  |
| `bg-white` / `bg-gray-50` | `bg-background` / `bg-card` / `bg-muted` |
| `border-gray-200/300`     | `border-border` (inputs: `border-input`) |

Existing code still uses `gray-*` heavily (e.g. `components/settings/styles.ts`);
match the surrounding file when making a small edit rather than mixing styles
inside one component.

## Adding shadcn components

`apps/web/components.json` is configured, but no components are installed yet.
To add one:

```bash
bunx --bun shadcn@latest add <component> --cwd apps/web
```

This also adds the `cn` helper at `@/lib/utils`. Read
`https://ui.shadcn.com/docs/components/<component>` first. Never edit the
generated files in `apps/web/components/ui`.
