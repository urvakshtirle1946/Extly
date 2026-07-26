'use client'

import React, { createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export interface User {
  id: string
  email: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password?: string) => Promise<void>
  signup: (email: string, password?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session, isPending, refetch } = authClient.useSession()

  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        created_at: String(session.user.createdAt),
      }
    : null
  const token = session?.session.token ?? null

  const login = async (email: string, password?: string) => {
    const { error } = await authClient.signIn.email({ email, password: password || '' })
    if (error) throw new Error(error.message || 'Unable to sign in.')
    await refetch()
    router.push('/')
  }

  const signup = async (email: string, password?: string) => {
    const { error } = await authClient.signUp.email({
      email,
      password: password || '',
      name: email.split('@')[0] || 'Promptex user',
    })
    if (error) throw new Error(error.message || 'Unable to create your account.')
    await refetch()
    router.push('/')
  }

  const logout = async () => {
    const { error } = await authClient.signOut()
    if (error) throw new Error(error.message || 'Unable to sign out.')
    await refetch()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading: isPending, login, signup, logout }}>
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
