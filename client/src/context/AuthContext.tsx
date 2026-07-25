'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_USER: User = {
  id: 'usr_dev_default',
  email: 'urvakshtirle@gmail.com',
  created_at: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('promptex_user')
      const storedToken = localStorage.getItem('promptex_token')

      if (storedUser) {
        setUser(JSON.parse(storedUser))
        setToken(storedToken || 'promptex_session_token')
      } else {
        // Fallback default user so user is authenticated by default
        setUser(DEFAULT_USER)
        setToken('promptex_session_token')
        localStorage.setItem('promptex_user', JSON.stringify(DEFAULT_USER))
        localStorage.setItem('promptex_token', 'promptex_session_token')
      }
    } catch (err) {
      console.error('Failed to load user session:', err)
      setUser(DEFAULT_USER)
      setToken('promptex_session_token')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, _password?: string) => {
    const newUser: User = {
      id: `usr_${Date.now()}`,
      email: email || 'user@promptex.tech',
      created_at: new Date().toISOString(),
    }
    const newToken = `token_${Date.now()}`

    setUser(newUser)
    setToken(newToken)
    localStorage.setItem('promptex_user', JSON.stringify(newUser))
    localStorage.setItem('promptex_token', newToken)
    router.push('/')
  }

  const signup = async (email: string, _password?: string) => {
    await login(email, _password)
  }

  const logout = () => {
    localStorage.removeItem('promptex_user')
    localStorage.removeItem('promptex_token')
    setUser(null)
    setToken(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
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
