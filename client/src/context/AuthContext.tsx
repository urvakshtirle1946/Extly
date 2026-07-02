'use client'

import React, { createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/nextjs'

interface User {
  id: string
  email: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut, openSignIn, openSignUp } = useClerk()

  // Map Clerk user to our internal User shape
  const user: User | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        created_at: clerkUser.createdAt?.toISOString() ?? new Date().toISOString(),
      }
    : null

  const loading = !isLoaded

  // login: open Clerk's sign-in modal (or redirect to /login)
  const login = async (_email: string, _password: string) => {
    router.push('/login')
  }

  // signup: redirect to /signup
  const signup = async (_email: string, _password: string) => {
    router.push('/signup')
  }

  // logout: use Clerk signOut
  const logout = () => {
    signOut(() => router.push('/'))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
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
