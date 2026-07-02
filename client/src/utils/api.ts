import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

/**
 * Hook that returns an apiFetch function pre-loaded with the current
 * Clerk session token as the Authorization bearer.
 */
export function useApiFetch() {
  const { getToken } = useAuth()

  const apiFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = await getToken()

    const headers = new Headers(options.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errMsg = 'API Request failed'
      try {
        const data = await response.json()
        errMsg = data.error || data.details?.join(', ') || errMsg
      } catch {
        // Ignore parse errors
      }
      throw new Error(errMsg)
    }

    const contentType = response.headers.get('Content-Type')
    if (contentType && (contentType.includes('application/zip') || contentType.includes('application/octet-stream'))) {
      return response
    }

    return response.json()
  }, [getToken])

  return apiFetch
}

/**
 * Standalone apiFetch for use outside React components.
 * Reads token from Clerk's __session cookie fallback (SSR-safe).
 * For client components, prefer useApiFetch() hook.
 */
export async function apiFetch(path: string, options: RequestInit = {}, token?: string | null) {
  const resolvedToken = token ?? (typeof window !== 'undefined' ? (window as any).__clerkToken : null)

  const headers = new Headers(options.headers)
  if (resolvedToken) {
    headers.set('Authorization', `Bearer ${resolvedToken}`)
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errMsg = 'API Request failed'
    try {
      const data = await response.json()
      errMsg = data.error || data.details?.join(', ') || errMsg
    } catch {
      // Ignore
    }
    throw new Error(errMsg)
  }

  const contentType = response.headers.get('Content-Type')
  if (contentType && (contentType.includes('application/zip') || contentType.includes('application/octet-stream'))) {
    return response
  }

  return response.json()
}
