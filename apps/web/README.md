# @app/web

Next.js 16 on Cloudflare Workers (OpenNext). See the [root README](../../README.md)
for setup, scripts and deployment.

| Path                             | What                                                                   |
| -------------------------------- | ---------------------------------------------------------------------- |
| `app/login`, `app/oauth/consent` | sign-in (email/password, Google, passkey) and the OAuth consent screen |
| `app/workflows`                  | the 007 workflow console                                               |
| `app/privacy`, `app/terms`       | legal page templates                                                   |
| `app/api/auth`                   | better-auth (per request, on D1)                                       |
| `app/api/trpc`                   | tRPC (`@app/api`)                                                      |
| `app/api/mcp`                    | the app's MCP server (`whoami`)                                        |
| `app/api/wf`                     | 007 data plane, connector callback, 007 MCP                            |
| `lib/cf-env.ts`                  | the one place Cloudflare bindings are read                             |
| `cloudflare-env.d.ts`            | hand-written mirror of `wrangler.jsonc` bindings                       |

```bash
bun run dev               # next dev on :3000, with D1/email/service bindings via miniflare
bun run deploy:cloudflare # OpenNext build + wrangler deploy
```
