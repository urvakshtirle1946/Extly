'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PromptexLogo } from '@/components/ui/promptex-logo'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsSubmitting(true)
    try {
      await login(email, password)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 flex flex-col items-center gap-8">
        {/* Brand */}
        <Link href="/" className="group hover:opacity-80 transition-opacity">
          <PromptexLogo />
        </Link>

        {/* Custom Login Form */}
        <div className="w-full bg-[#0a0a0b] border border-neutral-800 rounded-2xl p-8 shadow-2xl shadow-black/60 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-white">Welcome back</h1>
            <p className="text-xs text-neutral-400">Sign in to continue building browser extensions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0f0f11] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0f0f11] border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-950/30 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center text-xs text-neutral-400 pt-2 border-t border-neutral-900">
            Don't have an account?{' '}
            <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-semibold">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
