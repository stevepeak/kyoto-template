'use client'

import { useEffect } from 'react'

/** Dev-only: hover any element and ⌘C to copy its component context for agents. */
export function ReactGrab() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      void import('react-grab')
    }
  }, [])

  return null
}
