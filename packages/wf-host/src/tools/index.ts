import type { ToolRegistry, ToolRegistryEntry } from '@stevepeak/007'

import type { HostDeps } from '../deps'

import { documentToolEntries } from './documents'

/**
 * Every tool the host exposes to 007 agents. See packages/007/guide.md for the
 * `ToolRegistryEntry` shape. 007's built-ins (`extract_text`, `create_document`)
 * are added by `defineWfConfig` itself — register one here only to override it.
 *
 * TODO: add the app's tools.
 */
const ENTRIES: ToolRegistryEntry<HostDeps>[] = [...documentToolEntries]

/** `WfSdkConfig.toolRegistry` — every tool the host exposes, keyed by id. */
export const toolRegistry: ToolRegistry<HostDeps> = new Map(
  ENTRIES.map((e) => [e.id, e]),
)
