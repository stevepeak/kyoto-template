import { createWfSdkHandlers } from '@stevepeak/007/server'

import { wfSdkOptions } from '@/lib/wf-handler-options'

/** 007's RPC data plane — the editor and run viewer talk to this. */
export const POST = createWfSdkHandlers(wfSdkOptions)
