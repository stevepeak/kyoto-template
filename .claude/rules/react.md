---
paths:
  - '**/*.tsx'
---

# React

## Files and components

- kebab-case for files and directories.
- One component per file; named exports.
- Add `'use client'` only to components that need hooks, state or browser
  APIs; keep pages and layouts as server components where possible.
- Keep logic low: a `PostItem` handles its own deletion rather than taking an
  `onDelete` callback from its parent.
- Move large handlers (e.g. a tRPC mutation flow) out of the component into a
  hook or helper.
- Import React APIs by name (`import { useState, type ChangeEvent } from
'react'`) — never `import * as React` or `React.ChangeEvent`.
- "useTRPCClient() can only be used inside of a <TRPCProvider>" usually means
  split client islands; collapse them under one provider.

## UI

- There is no component library. Reuse what exists before writing new UI:
  - `@/components/states` — `LoadingState`, `EmptyState`, error states
  - `@/components/settings/styles` — shared input/label/button classes
  - `@/components/settings/section-card` — settings section wrapper
  - `lucide-react` icons, `sonner` toasts, `cmdk` (command palette)
- Tailwind, mobile-first. See the styling rule for colours.
