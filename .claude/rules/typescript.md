---
paths:
  - '**/*.ts'
  - '**/*.tsx'
---

# TypeScript

## Types

- NEVER use `any` or `as any`. Use `unknown` for values not yet typed, then
  narrow.
- Use zod for runtime validation (see the JSON parsing rule).
- Guards and assertions: `import { is, assert } from '@app/utils'`.
- Use `type` for unions, intersections and mapped types; discriminated unions
  for state.
- Use `null` for an unknown value — never sentinels like `'UNKNOWN'`.
- `readonly` for properties that must not change.

## Naming

- PascalCase types, camelCase values and functions, UPPER_CASE constants.
- Auxiliary verbs for booleans: `isLoading`, `hasError`.
- Component props types end in `Props` (`ButtonProps`), co-located with the
  component.

## Functions

- Explicit return types on exported functions.
- Function declarations over function expressions; arrow functions for
  callbacks.
- async/await over `.then` chains.
- Functional code over classes; one class or component per file.

## Imports

- `@/…` aliases over relative imports, except within the same directory.
- No inline `await import(…)`.

## Errors

- Don't add error handling proactively — let errors reach Sentry unless there
  is a specific recovery.
