'use client'

import { Monitor, Smartphone } from 'lucide-react'
import { useState } from 'react'

/** Rendered width of the preview frame. 600px is the email-safe body width. */
const VIEWPORTS = {
  desktop: { label: 'Desktop', width: 600, icon: Monitor },
  mobile: { label: 'Mobile', width: 375, icon: Smartphone },
} as const

type ViewportKey = keyof typeof VIEWPORTS

function toggleClass(on: boolean) {
  return `flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${
    on
      ? 'bg-gray-100 font-medium text-gray-900'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
  }`
}

interface EmailViewerProps {
  title: string
  subject: string
  description: string
  html: string
  text: string
}

/**
 * One rendered mail, in an iframe rather than inline. Email HTML is a full
 * document of table layouts and inline styles; dropped into the app's DOM the
 * app's stylesheet would reach into it, and the preview would no longer be
 * what a recipient receives.
 */
export function EmailViewer({
  title,
  subject,
  description,
  html,
  text,
}: EmailViewerProps) {
  const [viewport, setViewport] = useState<ViewportKey>('desktop')
  const [showText, setShowText] = useState(false)
  const width = VIEWPORTS[viewport].width

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 p-4">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Subject</p>
          <p className="truncate text-sm font-medium text-gray-900">
            {subject}
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {(Object.keys(VIEWPORTS) as ViewportKey[]).map((key) => {
            const { label, icon: Icon } = VIEWPORTS[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => setViewport(key)}
                aria-pressed={viewport === key}
                className={toggleClass(viewport === key)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
          {/* The `text/plain` part ships with every mail and is what a
              text-preferring client shows, so it should be lookable-at. */}
          <button
            type="button"
            onClick={() => setShowText((on) => !on)}
            aria-pressed={showText}
            className={toggleClass(showText)}
          >
            Plain text
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-gray-50 p-6">
        <div className="flex justify-center">
          {showText ? (
            <pre
              className="overflow-x-auto rounded-md border border-gray-200 bg-white p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap"
              style={{ width }}
            >
              {text}
            </pre>
          ) : (
            <iframe
              title={title}
              srcDoc={html}
              // No `allow-scripts`: an email has no reason to run anything,
              // and a frame that cannot cannot reach back into the app.
              sandbox=""
              className="h-[900px] rounded-md border border-gray-200 bg-white shadow-sm"
              style={{ width }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
