'use client'

import {
  Brain,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  type ComponentType,
  type ReactNode,
  type SVGProps,
  useEffect,
  useRef,
  useState,
} from 'react'

import { PRODUCT_NAME } from '@/lib/brand'

import { ClaudeLogo, OpenAILogo } from './brand-logos'
import { CopyButton } from './copy-button'
import { primaryButtonClass } from './styles'

// How often an open guide re-reads the page to notice the new connection.
const POLL_MS = 3000

type Guide = {
  name: string
  logo: ComponentType<SVGProps<SVGSVGElement>>
  /** Tailwind text color for the logo. */
  logoClass: string
  /** Everything after "copy the URL". */
  steps: string[]
  /** Where the first step happens, when the assistant has a settings URL. */
  link?: { href: string; label: string }
  /** Also offer the Claude Code one-liner. */
  claudeCode?: boolean
}

/** The server's name in Claude Code's config, e.g. "Acme Co" → "acme-co". */
const CLAUDE_CODE_NAME =
  PRODUCT_NAME.toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '') || 'app'

// Menu names drift as these products ship; keep the steps short so a stale
// label is still recognizable.
const GUIDES: Guide[] = [
  {
    name: 'Claude',
    logo: ClaudeLogo,
    logoClass: 'text-[#D97757]',
    steps: [
      'In Claude, open Settings → Connectors.',
      'Click "Add custom connector", paste the URL, and click Add.',
      'Click Connect, then sign in here and approve.',
    ],
    link: {
      href: 'https://claude.ai/settings/connectors',
      label: 'Open Claude connectors',
    },
    claudeCode: true,
  },
  {
    name: 'ChatGPT',
    logo: OpenAILogo,
    logoClass: 'text-gray-900',
    steps: [
      'In ChatGPT, open Settings → Apps & Connectors.',
      'Under Advanced, turn on Developer mode.',
      'Click Create, paste the URL, and choose OAuth.',
      'Connect, then sign in here and approve.',
    ],
    link: {
      href: 'https://chatgpt.com/#settings/Connectors',
      label: 'Open ChatGPT settings',
    },
  },
  {
    name: 'Other',
    logo: Brain,
    logoClass: 'text-gray-500',
    steps: [
      'Use a client that supports remote (HTTP) MCP servers.',
      'Add the URL as a new server.',
      'When it opens a browser, sign in here and approve.',
    ],
  },
]

/**
 * How to add the app's MCP to an assistant: one large tile per assistant, each
 * opening a step-by-step dialog. There's no secret to hand out — the client
 * discovers the OAuth sign-in from the URL and sends the user through login
 * and consent itself.
 */
export function McpConnectGuide({
  url,
  connectionCount,
}: {
  url: string
  /** Live count of connections, so an open guide can confirm success. */
  connectionCount: number
}) {
  const [open, setOpen] = useState<Guide | null>(null)

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-3">
        {GUIDES.map((guide) => (
          <li key={guide.name}>
            <button
              type="button"
              onClick={() => setOpen(guide)}
              className="group flex w-full flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-6 text-center transition hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none"
            >
              <guide.logo
                className={`h-12 w-12 ${guide.logoClass}`}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-gray-900">
                {guide.name}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-600 group-hover:text-gray-900">
                Set up
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <GuideDialog
          guide={open}
          url={url}
          connectionCount={connectionCount}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  )
}

function GuideDialog({
  guide,
  url,
  connectionCount,
  onClose,
}: {
  guide: Guide
  url: string
  connectionCount: number
  onClose: () => void
}) {
  const router = useRouter()
  const ref = useRef<HTMLDialogElement>(null)
  // Count at open time: any rise after this is the connection being made.
  const [baseline] = useState(connectionCount)
  const connected = connectionCount > baseline

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  // The approval happens in another tab, so nothing here hears about it;
  // re-reading the server page is what lets the dialog confirm it.
  useEffect(() => {
    if (connected) return
    const timer = setInterval(() => router.refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [connected, router])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close()
      }}
      className="m-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-gray-900/40"
    >
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
        <guide.logo
          className={`h-8 w-8 shrink-0 ${guide.logoClass}`}
          aria-hidden="true"
        />
        <h2 className="flex-1 text-base font-semibold text-gray-900">
          Connect {guide.name}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <ol className="flex flex-col gap-4 px-5 py-5">
        <Step n={1}>
          <p>Copy the server URL.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-gray-100 px-3 py-2 font-mono text-xs text-gray-800">
              {url}
            </code>
            <CopyButton value={url} label="Copy server URL" />
          </div>
        </Step>
        {guide.steps.map((step, i) => (
          <Step key={step} n={i + 2}>
            <p>{step}</p>
            {i === 0 && guide.link ? (
              <a
                href={guide.link.href}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-medium text-gray-900 hover:underline"
              >
                {guide.link.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </Step>
        ))}
      </ol>

      {guide.claudeCode ? <ClaudeCodeSetup url={url} /> : null}

      <div className="flex items-center gap-3 border-t border-gray-200 bg-gray-50/60 px-5 py-4">
        {connected ? (
          <>
            <CircleCheck
              className="h-5 w-5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <p className="flex-1 text-sm font-medium text-emerald-700">
              Connected! {guide.name} can now use your account.
            </p>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className={primaryButtonClass}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-gray-400"
              aria-hidden="true"
            />
            <p className="flex-1 text-sm text-gray-500" aria-live="polite">
              Waiting for {guide.name} to connect…
            </p>
          </>
        )}
      </div>
    </dialog>
  )
}

/**
 * Claude Code takes the server from the command line. `--scope user` puts it in
 * the user's own config, so it's available in every project rather than
 * written into one repo's `.mcp.json`.
 */
function ClaudeCodeSetup({ url }: { url: string }) {
  const command = `claude mcp add --transport http --scope user ${CLAUDE_CODE_NAME} ${url}`
  return (
    <div className="border-t border-gray-200 px-5 py-5">
      <h3 className="text-sm font-semibold text-gray-900">
        Using Claude Code?
      </h3>
      <p className="mt-0.5 text-sm text-gray-500">
        Run this once to add it for all your projects:
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-gray-900 px-3 py-2 font-mono text-xs whitespace-nowrap text-gray-100">
          {command}
        </code>
        <CopyButton value={command} label="Copy Claude Code command" />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Then run{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800">
          /mcp
        </code>{' '}
        in Claude Code and choose {PRODUCT_NAME} to sign in and approve.
      </p>
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-gray-700">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </li>
  )
}
