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
  const { user: kindeUser, isLoading, getToken } = useKindeBrowserClient()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    async function fetchToken() {
      if (kindeUser) {
        try {
          const t = await getToken()
          setToken(t || null)
        } catch (err) {
          console.error('Failed to retrieve Kinde token:', err)
          setToken(null)
        }
      } else {
        setToken(null)
      }
    }
    fetchToken()
  }, [kindeUser, getToken])

  const user: User | null = kindeUser
    ? {
        id: kindeUser.id || 'usr_kinde',
        email: kindeUser.email || '',
        created_at: new Date().toISOString(),
      }
    : null

  const login = async () => {
    window.location.href = '/api/auth/login'
  }

  const signup = async () => {
    window.location.href = '/api/auth/register'
  }

  const logout = async () => {
    window.location.href = '/api/auth/logout'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading: Boolean(isLoading),
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
