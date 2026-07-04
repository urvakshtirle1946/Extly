'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import DashboardContent from '@/components/DashboardContent'
import Link from 'next/link'
import Image from 'next/image'
import { Code, Loader2, Check, Terminal, Download } from 'lucide-react'
import { useApiFetch } from '@/utils/api'
import { PromptexLogo, PromptexLogoMark } from '@/components/ui/promptex-logo'
import { PromptInputBox } from '@/components/ui/ai-prompt-box'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { CinematicFooter } from '@/components/ui/motion-footer'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [creatingProject, setCreatingProject] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [isYearly, setIsYearly] = useState(false)

  const faqItems = [
    {
      id: 'item-1',
      question: 'What is Promptex?',
      answer: 'Promptex is an AI-powered Chrome extension builder. Describe what you want in plain English, and our agent writes all necessary files (manifest, scripts, pages), runs diagnostics, and packages it up.',
    },
    {
      id: 'item-2',
      question: 'Do I need coding experience?',
      answer: 'Not at all! Promptex translates your ideas into standard, clean Manifest V3 code automatically. If you want to modify the code manually later, you can inspect it and download the files.',
    },
    {
      id: 'item-3',
      question: 'How do I test my extensions?',
      answer: 'You can start a live browser preview session directly in the dashboard. Promptex boots up a sandboxed browser instance so you can interact with your popup, options, and background workers in real time.',
    },
    {
      id: 'item-4',
      question: 'Can I download the source code?',
      answer: 'Absolutely. In one click, you can export your extension as a standard production-ready ZIP archive. Extract it locally and load it into Chrome or Edge dev mode instantly.',
    },
  ]

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
          className="w-full h-full object-cover"
        />
      </div>

      {/* Floating Header Pill */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none select-none">
        <header className="pointer-events-auto h-12 max-w-fit flex items-center justify-between gap-6 px-1.5 bg-black/60 backdrop-blur-xl border border-white/[0.08] rounded-full shadow-2xl">
          {/* Promptex Logo */}
          <Link href="/" className="flex items-center justify-center hover:opacity-85 transition-opacity ml-3.5 pointer-events-auto shrink-0">
            <PromptexLogo height={20} />
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
          </nav>

          {/* Right Side: Action capsule - clerk aware */}
          <div className="flex items-center gap-2">
            <SignedOut>
              <Link
                href="/signup"
                className="h-9 px-5 flex items-center justify-center bg-white hover:bg-neutral-100 text-black text-[12px] font-extrabold rounded-full transition-colors shadow-lg"
              >
                Get Started
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
            <h1 className="text-4xl sm:text-[64px] font-serif-yc tracking-tight text-white leading-[1.1] font-normal">
              Build extensions <span className="italic">with Promptex</span>
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
      <section id="how-it-works" className="relative z-10 py-24 px-6 max-w-5xl w-full mx-auto select-none font-sans relative">
        <div className="text-center space-y-4 mb-20">
          <div className="inline-block px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            Workflow
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif-yc text-white tracking-tight font-normal">
            How Promptex <span className="italic">Works</span>
          </h2>
          <p className="text-[15px] text-neutral-450 max-w-md mx-auto">
            From idea to Chrome Extension in 3 simple steps
          </p>
        </div>

        {/* Decorative connection line for desktop */}
        <div className="hidden lg:block absolute left-1/2 top-48 bottom-32 w-px bg-gradient-to-b from-purple-500/20 via-cyan-500/20 to-transparent -translate-x-1/2 -z-10" />

        <div className="space-y-24">
          {/* Step 1: Draft your prompt */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 order-2 lg:order-1">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-8 rounded-3xl transition-all duration-300 shadow-2xl hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">01</span>
                  <h3 className="text-xl font-bold text-white">Draft your prompt</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                  Describe your browser extension in plain English. Prompt for custom UI popups, options pages, background scripts, or DOM content injects.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[10px] font-bold tracking-wider uppercase">Variables</span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[10px] font-bold tracking-wider uppercase">MV3 Ready</span>
                </div>
              </div>
            </div>
            <div className="flex-1 order-1 lg:order-2 w-full">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-transparent opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl bg-neutral-950 aspect-[1.79]">
                  <Image 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKqnjcqQPRoaYvFZmiLaDHoxa2inrVnXiB4xaUBjN_G38Hs2tbfdVWeO_N6an77yWs0xXTUi3K4uRO-fqYc_IdqR4bIthXki0bHyEWPjYqRAil-hJfnhxOM3KdiNp_vTgC5jk9VV-Y3OSNYAeIs1mVprKdj8FIrsPwbzj6R2BAsg8ykiyAePtS8vzNcc8ivy1eGkRMJOmvApLcdlW7fWyEHHkJE4rc0bMVnJumoC4vc0zB_gn-bdY3JWtMuaKtUmHPtDXk5hn8ZOLf" 
                    alt="Draft your prompt illustration" 
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transform transition-transform duration-700 group-hover:scale-103"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Live AI generation */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 w-full">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-transparent opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl bg-neutral-950 aspect-[1.79]">
                  <Image 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaKBJPiQhOHF4_7nW5rmBST97UefPUlm1tb_uPflVoUz68NGlk-gih1TtxWVoqGO_UZjl6rThLVmWR862XKizk7SMsueoGrNDsugeS_5_77KfXZZvaPoIh7NSiab7HAMB3Pr0VvvmiadkZ83VqARGwphDrW52F9ZLnEke2mdDuPNI5CClnN483bjHKJi2xtGzAlOsu0z-qU43PfIHMgB3bogDBZeM1ckjTP9G2yZhvEhH6c_vItRuKNTjcn_d_x5ZDwcn89CDZQ7of" 
                    alt="Live AI generation illustration" 
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transform transition-transform duration-700 group-hover:scale-103"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-8 rounded-3xl transition-all duration-300 shadow-2xl hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">02</span>
                  <h3 className="text-xl font-bold text-white">Live AI generation</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Watch Promptex write HTML, JavaScript, CSS, and manifest files, resolve API connections, design layouts, and automatically resolve bugs.
                </p>
                <div className="bg-[#0b0b0c]/80 p-4 rounded-2xl border border-white/[0.06] mt-6 font-mono text-[11px]">
                  <div className="flex items-center gap-2 text-cyan-400 mb-2">
                    <Terminal className="w-3.5 h-3.5 animate-pulse" />
                    <span>Generating manifest.json...</span>
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 w-2/3 animate-[pulse_2s_infinite]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Export MV3 Extension */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 order-2 lg:order-1">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-8 rounded-3xl transition-all duration-300 shadow-2xl hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">03</span>
                  <h3 className="text-xl font-bold text-white">Export MV3 Extension</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Test your extension inside a live sandboxed browser environment, inspect file code, debug, and download a production ZIP in one click.
                </p>
                <button className="w-full py-3 mt-6 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl flex items-center justify-center gap-2 transition-all duration-200 text-xs font-semibold text-neutral-300 active:scale-98">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>PREVIEW BUILD</span>
                </button>
              </div>
            </div>
            <div className="flex-1 order-1 lg:order-2 w-full">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-transparent opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl bg-neutral-950 aspect-[1.79]">
                  <Image 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuADgI_n5SoE-wBUP-BSiPl6H56NngvaPY3x41xZPVpPHvYuv1ff1r1EBGH-BA7nO2w6wBf580jB8Dao3PQeU3h6JTjNe6v2ctw8dLoXRmAnZNVduWP5ZwRrz2Zi-Rd79A9wOLymDexkWZl6nlSUfydZBia6ffd4b9WZAtJW1KdxeVmB7pFqWqo2QcMsxUp-eyj3A3DkSJVLY_vf8_EEEjT4hVb93hVdXrmN0iWbrBao16CADaUZ3RkcEheo1nz6OAF-IBAhK07i3cmy" 
                    alt="Export MV3 Extension illustration" 
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transform transition-transform duration-700 group-hover:scale-103"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 pt-16 pb-32 px-6 w-full select-none overflow-hidden">
        {/* Background Large Text "Pricing" with low opacity */}
        <div className="absolute inset-x-0 -top-16 flex justify-center pointer-events-none z-0 overflow-hidden">
          <h2 className="text-[160px] sm:text-[240px] md:text-[320px] font-serif-yc font-normal tracking-tighter leading-[1.2] pt-10 select-none text-white italic"
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
                  <h3 className="text-4xl font-extrabold text-white tracking-tight">
                    {isYearly ? '$7.99' : '$9.99'}
                    <span className="text-lg font-medium text-neutral-450">/m</span>
                  </h3>
                  {isYearly && (
                    <span className="text-[10px] text-neutral-500 block mt-1">
                      Billed yearly ($95.88/yr)
                    </span>
                  )}
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
                href={user ? "/dashboard?tab=billing" : "/signup"} 
                className="mt-8 w-full py-3 bg-white hover:bg-neutral-100 text-black text-center font-bold rounded-full text-xs transition-all duration-205 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                {user ? "Upgrade Plan" : "Get Started"}
              </Link>
            </div>

            {/* Card 3: Pro Plan */}
            <div className="bg-white/[0.04] backdrop-blur-[20px] border border-white/[0.12] rounded-[24px] p-8 flex flex-col justify-between min-h-[580px] shadow-2xl transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.2]">
              <div className="space-y-8">
                <div className="space-y-2">
                  <span className="text-[12px] font-semibold text-purple-400">Pro Plan</span>
                  <h3 className="text-4xl font-extrabold text-white tracking-tight">
                    {isYearly ? '$15.99' : '$19.99'}
                    <span className="text-lg font-medium text-neutral-450">/m</span>
                  </h3>
                  {isYearly && (
                    <span className="text-[10px] text-neutral-500 block mt-1">
                      Billed yearly ($191.88/yr)
                    </span>
                  )}
                </div>
                
                <div className="h-[1px] bg-white/[0.06]" />

                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] text-neutral-455">400 build credits / month</span>
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
                href={user ? "/dashboard?tab=billing" : "/signup"} 
                className="mt-8 w-full py-3 bg-[#0d0d0e]/80 hover:bg-neutral-900 border border-white/[0.08] hover:border-white/[0.15] text-white text-center font-bold rounded-full text-xs transition-all duration-200"
              >
                {user ? "Upgrade Plan" : "Get Started"}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="max-w-5xl mx-auto mt-16 flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10 px-4">
          {/* Switch: Billed Yearly */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isYearly} 
                onChange={(e) => setIsYearly(e.target.checked)} 
              />
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

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-24 px-4 md:px-6 max-w-5xl w-full mx-auto select-none font-sans">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-balance text-3xl font-serif-yc md:text-4xl text-white font-normal">
            Frequently Asked <span className="italic">Questions</span>
          </h2>
          <p className="text-neutral-400 mt-4 text-balance text-sm">
            Discover quick and comprehensive answers to common questions about our platform, services, and features.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-xl">
          <Accordion
            type="single"
            collapsible
            className="bg-[#0b0b0c]/80 w-full rounded-2xl border border-white/[0.08] px-8 py-3 shadow-2xl">
            {faqItems.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-dashed border-white/[0.08]">
                <AccordionTrigger className="cursor-pointer text-sm font-semibold text-white hover:no-underline py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-neutral-400 leading-relaxed pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="text-neutral-400 mt-6 text-center text-xs">
            Can't find what you're looking for?{' '}
            <a
              href="mailto:support@promptex.io"
              className="text-white font-medium hover:underline">
              Contact our support team
            </a>
          </p>
        </div>
      </section>

      {/* Cinematic Footer */}
      <CinematicFooter />
    </div>
  )
}
