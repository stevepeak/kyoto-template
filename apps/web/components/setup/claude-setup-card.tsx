import { Terminal } from 'lucide-react'
import type { ReactNode } from 'react'

import { CopyButton } from '@/components/settings/copy-button'

const SETUP_COMMAND = '/setup'

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1 text-sm text-gray-700">{children}</div>
    </li>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800">
      {children}
    </code>
  )
}

/**
 * Points the owner at the `/setup` Claude Code command
 * (`.claude/commands/setup.md`), which does most of the checklist below for
 * them through the Cloudflare MCP in `.mcp.json`.
 */
export function ClaudeSetupCard() {
  return (
    <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
      <header className="flex items-start gap-3 border-b border-gray-200 bg-gray-50/60 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500">
          <Terminal className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">
            Set up with Claude Code
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            A guided command creates the Cloudflare resources, sets secrets and
            fills in the config for you — asking before anything it can’t undo.
          </p>
        </div>
      </header>
      <ol className="flex flex-col gap-4 p-5">
        <Step n={1}>
          Open this repo in Claude Code: <Code>claude</Code> from the repo root.
        </Step>
        <Step n={2}>
          <p>Run the setup command:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-sm text-gray-900">
              {SETUP_COMMAND}
            </code>
            <CopyButton value={SETUP_COMMAND} label="Copy setup command" />
          </div>
          <p className="mt-2 text-gray-500">
            Add a phase name to jump to it, e.g. <Code>/setup turnstile</Code>{' '}
            or <Code>/setup email</Code>.
          </p>
        </Step>
        <Step n={3}>
          Approve the <Code>cloudflare</Code> MCP server when asked — its first
          call opens a browser to sign in to Cloudflare.
        </Step>
        <Step n={4}>
          Come back here: the checklist below reports what this deployment can
          see is configured.
        </Step>
      </ol>
    </section>
  )
}
