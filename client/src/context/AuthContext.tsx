'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'

export interface User {
  id: string
  email: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email?: string, password?: string) => Promise<void>
  signup: (email?: string, password?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { 
    user: kindeUser, 
    isLoading, 
    getToken, 
    accessTokenRaw, 
    idTokenRaw,
    getAccessTokenRaw,
    getIdTokenRaw 
  } = useKindeBrowserClient()

  const [asyncToken, setAsyncToken] = useState<string | null>(null)

  // Direct synchronous token retrieval from Kinde state
  const directToken = 
    accessTokenRaw || 
    idTokenRaw || 
    (getAccessTokenRaw ? getAccessTokenRaw() : null) || 
    (getIdTokenRaw ? getIdTokenRaw() : null)

  const token = directToken || asyncToken

  useEffect(() => {
    async function fetchToken() {
      if (kindeUser && !directToken) {
        try {
          const t = await getToken()
          setAsyncToken(t || null)
        } catch (err) {
          console.error('Failed to retrieve Kinde token:', err)
          setAsyncToken(null)
        }
      }
    }
    fetchToken()
  }, [kindeUser, directToken, getToken])

  const user: User | null = kindeUser
    ? {
        id: kindeUser.id || 'usr_kinde',
        email: kindeUser.email || '',
        created_at: new Date().toISOString(),
      }
    : null

  const login = async () => {
    window.location.href = '/api/auth/login?prompt=select_account'
  }

  const signup = async () => {
    window.location.href = '/api/auth/register?prompt=select_account'
  }


  const logout = async () => {
    window.location.href = '/api/auth/logout'
  }

  // Treat as loading if Kinde is loading OR if user exists but token has not resolved yet
  const authLoading = Boolean(isLoading) || (Boolean(kindeUser) && !token)

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading: authLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
