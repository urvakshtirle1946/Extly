'use client'

import Link from 'next/link'
import { RegisterLink } from '@kinde-oss/kinde-auth-nextjs/components'
import { PromptexLogo } from '@/components/ui/promptex-logo'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 flex flex-col items-center gap-8">
        {/* Brand */}
        <Link href="/" className="group hover:opacity-80 transition-opacity">
          <PromptexLogo />
        </Link>

        {/* Custom Signup Card */}
        <div className="w-full bg-[#0a0a0b] border border-neutral-800 rounded-2xl p-8 shadow-2xl shadow-black/60 space-y-6 text-center">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">Create an account</h1>
            <p className="text-xs text-neutral-400">Start building AI-powered Chrome extensions</p>
          </div>

          <div className="pt-2">
            <RegisterLink className="w-full inline-block bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-950/30">
              Create Account with Kinde
            </RegisterLink>
          </div>

          <div className="text-center text-xs text-neutral-400 pt-4 border-t border-neutral-900">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
