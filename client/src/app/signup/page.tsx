'use client'

import { RegisterLink } from '@kinde-oss/kinde-auth-nextjs/components'
import Link from 'next/link'
import { PromptexLogo } from '@/components/ui/promptex-logo'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      <div className="w-full max-w-md z-10 flex flex-col items-center gap-8">
        <Link href="/" className="group hover:opacity-80 transition-opacity">
          <PromptexLogo />
        </Link>
        <div className="w-full bg-[#0a0a0b] border border-neutral-800 rounded-2xl p-8 shadow-2xl shadow-black/60 space-y-6 text-center">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">Create an account</h1>
            <p className="text-xs text-neutral-400">Start building AI-powered Chrome extensions</p>
          </div>
          <div className="pt-2">
            <RegisterLink 
              postLoginRedirectURL="/dashboard"
              className="w-full inline-block bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-950/30"
            >
              Create Account with Kinde
            </RegisterLink>
          </div>
        </div>
      </div>
    </div>
  )
}
