import { useAuth } from '@clerk/nextjs'
import { useCallback, useRef } from 'react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

// Module-level token cache — shared across all hook instances
let _cachedToken: string | null = null
let _tokenExpiresAt = 0

function isTokenFresh() {
  return _cachedToken && Date.now() < _tokenExpiresAt
}

/**
 * Hook that returns an apiFetch function pre-loaded with the current
 * Clerk session token as the Authorization bearer.
 * Token is cached for 55s to avoid a Clerk round-trip on every call.
 */
export function useApiFetch() {
  const { getToken } = useAuth()

  const apiFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    // Use cached token if still fresh, otherwise fetch + cache for 55s
    if (!isTokenFresh()) {
      _cachedToken = await getToken()
      _tokenExpiresAt = Date.now() + 55_000
    }
    const token = _cachedToken

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
      // If 401, token may have expired early — clear cache and retry once
      if (response.status === 401) {
        _cachedToken = null
        _tokenExpiresAt = 0
        const freshToken = await getToken()
        _cachedToken = freshToken
        _tokenExpiresAt = Date.now() + 55_000
        const retryHeaders = new Headers(options.headers)
        if (freshToken) retryHeaders.set('Authorization', `Bearer ${freshToken}`)
        if (!retryHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
          retryHeaders.set('Content-Type', 'application/json')
        }
        const retryResponse = await fetch(`${BACKEND_URL}${path}`, { ...options, headers: retryHeaders })
        if (!retryResponse.ok) {
          let errMsg = 'API Request failed'
          try {
            const data = await retryResponse.json()
            errMsg = data.error || data.details?.join(', ') || errMsg
          } catch { /* ignore */ }
          throw new Error(errMsg)
        }
        const retryContent = retryResponse.headers.get('Content-Type')
        if (retryContent && (retryContent.includes('application/zip') || retryContent.includes('application/octet-stream'))) {
          return retryResponse
        }
        return retryResponse.json()
      }

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
