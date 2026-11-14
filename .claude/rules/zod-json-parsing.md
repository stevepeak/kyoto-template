---
paths:
  - '**/*.ts'
  - '**/*.tsx'
---

# JSON parsing: always validate with zod

Never type-assert parsed JSON. Data from outside the process is `unknown` until
a zod schema says otherwise.

```ts
// ❌
const result = (await response.json()) as SomeType
const { field } = await request.json()

// ✅
const resultSchema = z.object({ success: z.boolean(), data: z.string() })
const result = resultSchema.parse(await response.json())
```

Next.js route handler:

```ts
const bodySchema = z.object({ id: z.string(), force: z.boolean().optional() })

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  // use parsed.data
}
```

Applies to:

- `request.json()` and query params in `/api` routes
- third-party API responses and webhook payloads
- Queue messages, Workflow params and Durable Object payloads
- `JSON.parse` of anything stored (D1 text columns, R2 objects, KV)

tRPC `.input(schema)` already validates — don't parse twice.
