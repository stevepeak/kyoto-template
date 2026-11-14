import type { ToolRegistry, ToolRegistryEntry } from '@stevepeak/007'

import type { HostDeps } from '../deps'

/**
 * Every tool the host exposes to 007 agents. See packages/007/guide.md for the
 * `ToolRegistryEntry` shape.
 *
 * TODO: add the app's tools.
 */
const ENTRIES: ToolRegistryEntry<HostDeps>[] = []

/** `WfSdkConfig.toolRegistry` — every tool the host exposes, keyed by id. */
export const toolRegistry: ToolRegistry<HostDeps> = new Map(
  ENTRIES.map((e) => [e.id, e]),
)
