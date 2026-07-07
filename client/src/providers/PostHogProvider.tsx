'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
      
      if (token) {
        posthog.init(token, {
          api_host: host,
          person_profiles: 'identified_only', // Recommended for client tracking
          capture_pageview: true, // Automatically track pageviews on client-side route transitions
        })
      }
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
