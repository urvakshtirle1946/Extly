'use client'

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { ExtlyLogo } from '@/components/ui/extly-logo'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 flex flex-col items-center gap-8">
        {/* Brand */}
        <Link href="/" className="group hover:opacity-80 transition-opacity">
          <ExtlyLogo width={156} height={40} />
        </Link>

        {/* Clerk SignUp component — styled to match dark theme */}
        <SignUp
          routing="hash"
          appearance={{
            variables: {
              colorPrimary: '#8b5cf6',
              colorBackground: '#0a0a0b',
              colorInputBackground: '#0f0f11',
              colorInputText: '#f5f5f5',
              colorText: '#f5f5f5',
              colorTextSecondary: '#a1a1aa',
              colorNeutral: '#3f3f46',
              borderRadius: '0.75rem',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            },
            elements: {
              card: 'bg-[#0a0a0b] border border-neutral-800 shadow-2xl shadow-black/60',
              headerTitle: 'text-white font-bold',
              headerSubtitle: 'text-neutral-400',
              socialButtonsBlockButton: 'border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-white',
              formFieldInput: 'bg-[#0f0f11] border-neutral-800 text-white placeholder-neutral-600 focus:border-violet-500',
              formFieldLabel: 'text-neutral-400 text-xs font-semibold uppercase tracking-wider',
              footerActionLink: 'text-violet-400 hover:text-violet-300',
              formButtonPrimary: 'bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold',
            },
          }}
          redirectUrl="/"
        />
      </div>
    </div>
  )
}
