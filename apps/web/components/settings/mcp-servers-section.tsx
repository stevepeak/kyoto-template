import { Plug } from 'lucide-react'

import { CopyButton } from './copy-button'
import { SectionCard } from './section-card'

export type McpServer = { name: string; description: string; url: string }

/**
 * The MCP endpoints a user can add to an assistant. There's no secret to hand
 * out: the client discovers the OAuth sign-in from the URL and sends the user
 * through login and consent itself.
 */
export function McpServersSection({ servers }: { servers: McpServer[] }) {
  return (
    <SectionCard
      title="Connect an assistant"
      description="Add a server URL as a custom connector in Claude, ChatGPT, or any MCP client. You'll be asked to sign in and approve access."
      icon={Plug}
    >
      <ul className="flex flex-col gap-4">
        {servers.map((server) => (
          <li key={server.url} className="flex flex-col gap-1.5">
            <div>
              <p className="text-sm font-medium text-gray-900">{server.name}</p>
              <p className="text-xs text-gray-500">{server.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-gray-100 px-3 py-2 font-mono text-xs text-gray-800">
                {server.url}
              </code>
              <CopyButton
                value={server.url}
                label={`Copy ${server.name} URL`}
              />
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
