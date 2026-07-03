'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import DashboardContent from '@/components/DashboardContent'
import Link from 'next/link'
import { Code, Loader2, Check } from 'lucide-react'
import { useApiFetch } from '@/utils/api'
import { PromptexLogo, PromptexLogoMark } from '@/components/ui/promptex-logo'
import { PromptInputBox } from '@/components/ui/ai-prompt-box'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [creatingProject, setCreatingProject] = useState(false)

  // Intercept pending prompt after successful login
  useEffect(() => {
    async function checkPendingPrompt() {
      if (user && !loading) {
        const pendingPrompt = localStorage.getItem('pending_prompt')
        if (pendingPrompt) {
          setCreatingProject(true)
          try {
            const name = pendingPrompt.slice(0, 30).trim() + '...' || 'AI Extension'
            const data = await apiFetch('/api/projects', {
              method: 'POST',
              body: JSON.stringify({
                name,
                description: pendingPrompt,
                template: 'Blank',
                files: {}
              })
            })
            localStorage.removeItem('pending_prompt')
            router.push(`/projects/${data.project.id}`)
          } catch (err) {
            console.error('Failed to auto-create project:', err)
            setCreatingProject(false)
          }
        }
      }
    }
    checkPendingPrompt()
  }, [user, loading, router])

  const handlePromptSend = async (message: string) => {
    if (!message.trim()) return

    if (!user) {
      // Not logged in — save prompt and redirect to login
      localStorage.setItem('pending_prompt', message)
      router.push('/login')
      return
    }

    // Logged in — create project immediately and navigate to editor
    setCreatingProject(true)
    try {
      const name = message.slice(0, 40).trim() + (message.length > 40 ? '...' : '')
      const data = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: name || 'AI Extension',
          description: message,
          template: 'Blank',
          files: {}
        })
      })
      router.push(`/projects/${data.id || data.project?.id}`)
    } catch (err) {
      console.error('Failed to create project:', err)
      setCreatingProject(false)
    }
  }

  if (loading || creatingProject) {
    return (
      <div className="min-h-screen bg-[#A1A4B7] flex flex-col items-center justify-center space-y-4 select-none">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
        {creatingProject && (
          <p className="text-white/70 text-xs font-bold uppercase tracking-wider animate-pulse">
            Initializing extension builder...
          </p>
        )}
      </div>
    )
  }

  // Logged in → full dashboard
  if (user) {
    return <DashboardContent />
  }

  // Unauthenticated → NEAT landing
  return (
    <div className="min-h-screen text-white overflow-y-auto relative font-sans flex flex-col scroll-smooth">

      {/* Background Video */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <video
          src="/Hero.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
        />
      </div>

      {/* Floating Header Pill */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none select-none">
        <header className="pointer-events-auto h-12 max-w-fit flex items-center justify-between gap-6 px-1.5 bg-black/60 backdrop-blur-xl border border-white/[0.08] rounded-full shadow-2xl">
          {/* Logo Mark Capsule Icon */}
          <Link href="/" className="w-8 h-8 rounded-full bg-neutral-900 border border-white/[0.08] flex items-center justify-center hover:bg-neutral-800 transition-colors ml-1">
            <PromptexLogoMark width={14} height={14} />
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 px-3">
            <Link 
              href="/" 
              className="text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link 
              href="#pricing" 
              className="text-[12px] font-bold text-white transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="#faq" 
              className="text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
            >
              FAQ
            </Link>
            <Link 
              href="#contact" 
              className="text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right Side: Action capsule - clerk aware */}
          <div className="flex items-center gap-2">
            <SignedOut>
              <Link
                href="/signup"
                className="h-9 px-5 flex items-center justify-center bg-white hover:bg-neutral-100 text-black text-[12px] font-extrabold rounded-full transition-colors shadow-lg"
              >
                Download
              </Link>
            </SignedOut>
            <SignedIn>
              <Link 
                href="/dashboard"
                className="text-neutral-300 hover:text-white text-[12px] font-bold px-3 transition-colors cursor-pointer"
              >
                Dashboard
              </Link>
              <div className="mr-1.5 flex items-center">
                <UserButton
                  appearance={{
                    variables: { colorPrimary: '#8b5cf6' },
                    elements: { avatarBox: 'w-7 h-7 border border-white/[0.08]' },
                  }}
                  afterSignOutUrl="/"
                />
              </div>
            </SignedIn>
          </div>
        </header>
      </div>

      {/* Centered hero */}
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-4xl w-full mx-auto relative z-10 pt-16 pb-20 select-none font-sans">
        <div className="text-center space-y-7 w-full my-auto">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-[62px] font-extrabold tracking-tight text-white leading-[1.1] drop-shadow-lg">
              Build extensions with Promptex
            </h1>
            <p className="text-[17px] sm:text-[19px] text-slate-300 max-w-xl mx-auto font-medium leading-relaxed mt-3">
              Create Chrome extensions by chatting with AI
            </p>
          </div>

          <div className="w-full text-left">
            <PromptInputBox
              placeholder="Ask Promptex to create a prototype..."
              onSend={handlePromptSend}
            />
          </div>
        </div>

        {/* Scroll Indicator */}
        <div 
          onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-6 flex flex-col items-center gap-1 text-[10px] text-neutral-450 animate-bounce cursor-pointer font-bold uppercase tracking-widest select-none"
        >
          <span>Learn More</span>
          <svg className="w-3.5 h-3.5 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </main>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 max-w-5xl w-full mx-auto border-t border-neutral-900/60 bg-[#0c0c0e]/40 backdrop-blur-md rounded-3xl my-10 select-none">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How Promptex Works
          </h2>
          <p className="text-[15px] text-neutral-400 max-w-md mx-auto">
            Build, test, and deploy browser extensions in minutes with the power of natural language.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-neutral-950/80 border border-neutral-900/60 rounded-2xl p-6 space-y-4 shadow-lg hover:border-neutral-800 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center font-black text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              1
            </div>
            <h3 className="text-base font-bold text-white">Draft your prompt</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Describe your browser extension in plain English. Prompt for custom UI popups, options pages, background scripts, or DOM content injects.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-neutral-950/80 border border-neutral-900/60 rounded-2xl p-6 space-y-4 shadow-lg hover:border-neutral-800 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center font-black text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              2
            </div>
            <h3 className="text-base font-bold text-white">Live AI generation</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Watch Promptex write HTML, JavaScript, CSS, and manifest files, resolve API connections, design layouts, and automatically resolve bugs.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-neutral-950/80 border border-neutral-900/60 rounded-2xl p-6 space-y-4 shadow-lg hover:border-neutral-800 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center font-black text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              3
            </div>
            <h3 className="text-base font-bold text-white">Export MV3 Extension</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Test your extension inside a live sandboxed browser environment, inspect file code, debug, and download a production ZIP in one click.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 pt-16 pb-32 px-6 w-full select-none overflow-hidden">
        {/* Background Large Text "Pricing" with low opacity */}
        <div className="absolute inset-x-0 -top-16 flex justify-center pointer-events-none z-0 overflow-hidden">
          <h2 className="text-[160px] sm:text-[240px] md:text-[320px] font-bold tracking-tighter leading-[1.2] pt-10 select-none text-white"
            style={{ 
              userSelect: 'none',
              filter: 'drop-shadow(0 0 35px rgba(255,255,255,0.25))'
            }}
          >
            Pricing
          </h2>
        </div>


        {/* Pricing Cards Grid */}
        <div className="relative mt-44">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto relative z-10">
            {/* Card 1: Free Plan */}
            <div className="bg-white/[0.04] backdrop-blur-[20px] border border-white/[0.12] rounded-[24px] p-8 flex flex-col justify-between min-h-[580px] shadow-2xl transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.2]">
              <div className="space-y-8">
                <div className="space-y-2">
                  <span className="text-[12px] font-semibold text-neutral-400">Free Plan</span>
                  <h3 className="text-4xl font-extrabold text-white tracking-tight">Free</h3>
                </div>
                
                <div className="h-[1px] bg-white/[0.06]" />

                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-450">10 build credits on signup</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-450">Popup UI preview</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-455">Download extension ZIP</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-455">Community support</span>
                  </li>
                </ul>
              </div>
              
              <Link 
                href="/signup" 
                className="mt-8 w-full py-3 bg-[#0d0d0e]/80 hover:bg-neutral-900 border border-white/[0.08] hover:border-white/[0.15] text-white text-center font-bold rounded-full text-xs transition-all duration-200"
              >
                Get Started
              </Link>
            </div>

            {/* Card 2: Standard Plan */}
            <div className="bg-white/[0.06] backdrop-blur-[20px] border border-white/[0.25] rounded-[24px] p-8 flex flex-col justify-between min-h-[580px] shadow-2xl transition-all duration-300 hover:bg-white/[0.09] hover:border-white/[0.35] relative ring-1 ring-white/[0.1]">
              <div className="space-y-8">
                <div className="space-y-2">
                  <span className="text-[12px] font-semibold text-neutral-400">Standard Plan</span>
                  <h3 className="text-4xl font-extrabold text-white tracking-tight">$9.99<span className="text-lg font-medium text-neutral-450">/m</span></h3>
                </div>
                
                <div className="h-[1px] bg-white/[0.06]" />

                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-450">100 build credits / month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-450">Everything in Free</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-455">Version history & rollback</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-455">Priority support</span>
                  </li>
                </ul>
              </div>
              
              <Link 
                href="/signup" 
                className="mt-8 w-full py-3 bg-white hover:bg-neutral-100 text-black text-center font-bold rounded-full text-xs transition-all duration-205 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                Get Started
              </Link>
            </div>

            {/* Card 3: Pro Plan */}
            <div className="bg-white/[0.04] backdrop-blur-[20px] border border-white/[0.12] rounded-[24px] p-8 flex flex-col justify-between min-h-[580px] shadow-2xl transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.2]">
              <div className="space-y-8">
                <div className="space-y-2">
                  <span className="text-[12px] font-semibold text-purple-400">Pro Plan</span>
                  <h3 className="text-4xl font-extrabold text-white tracking-tight">$19.99<span className="text-lg font-medium text-neutral-450">/m</span></h3>
                </div>
                
                <div className="h-[1px] bg-white/[0.06]" />

                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-450">400 build credits / month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-450">Everything in Standard</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-455">Live browser preview (Playwright)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-455">AI self-healing debugger</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-455">Early access to new features</span>
                  </li>
                </ul>
              </div>
              
              <Link 
                href="/signup" 
                className="mt-8 w-full py-3 bg-[#0d0d0e]/80 hover:bg-neutral-900 border border-white/[0.08] hover:border-white/[0.15] text-white text-center font-bold rounded-full text-xs transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="max-w-5xl mx-auto mt-16 flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10 px-4">
          {/* Switch: Billed Yearly */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-9 h-5 bg-neutral-900 border border-white/[0.08] rounded-full transition-colors duration-200 peer-checked:bg-white"></div>
              <div className="absolute left-[3px] top-[3px] w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 transform peer-checked:translate-x-4 peer-checked:bg-black"></div>
            </div>
            <span className="text-xs font-semibold text-neutral-400">
              Billed Yearly
            </span>
          </label>

          {/* Badge: Plans */}
          <div className="px-4 py-1 bg-[#0b0b0c]/80 border border-white/[0.08] rounded-full text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
            Plans
          </div>
          
          {/* Spacer to align Billed Yearly left and Plans center */}
          <div className="hidden sm:block w-[100px]" />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 shrink-0 bg-[#0c0c0e] border-t border-neutral-900/60 mt-auto text-center space-y-4">
        <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider flex items-center justify-center gap-2 select-none">
          <span>Promptex</span>
          <span>•</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  )
}
