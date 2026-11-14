import { apiKeyClient } from '@better-auth/api-key/client'
import { passkeyClient } from '@better-auth/passkey/client'
import { adminClient, lastLoginMethodClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [
    passkeyClient(),
    lastLoginMethodClient(),
    adminClient(),
    apiKeyClient(),
  ],
})
