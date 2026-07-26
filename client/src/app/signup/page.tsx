'use client'

import { useEffect } from 'react'

export default function SignupPage() {
  useEffect(() => {
    window.location.href = '/api/auth/register'
  }, [])

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col justify-center items-center font-sans">
      <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider animate-pulse">
        Redirecting to Kinde Registration...
      </p>
    </div>
  )
}
