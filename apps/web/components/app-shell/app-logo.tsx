import type { ReactElement } from 'react'

interface AppLogoProps {
  className?: string
}

/** The app mark: the 🏔️ emoji. Mirrors `app/icon.svg`. */
export function AppLogo({ className }: AppLogoProps): ReactElement {
  return (
    <span
      className={`flex items-center justify-center text-xl leading-none ${className ?? ''}`}
      aria-hidden="true"
    >
      🏔️
    </span>
  )
}
