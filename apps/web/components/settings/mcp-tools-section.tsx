import { Wrench } from 'lucide-react'

import { SectionCard } from './section-card'

export type McpTool = {
  name: string
  title: string
  description: string
  readOnly: boolean
}

/** What an assistant can do once connected — straight from the MCP server. */
export function McpToolsSection({ tools }: { tools: McpTool[] }) {
  return (
    <SectionCard
      title="Available tools"
      description="What a connected assistant can do on your behalf."
      icon={Wrench}
    >
      <ul className="divide-y divide-gray-100">
        {tools.map((tool) => (
          <li
            key={tool.name}
            className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {tool.title}{' '}
                <code className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-normal text-gray-600">
                  {tool.name}
                </code>
              </p>
              <p className="mt-0.5 text-sm text-gray-500">{tool.description}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                tool.readOnly
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {tool.readOnly ? 'Read only' : 'Can make changes'}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
