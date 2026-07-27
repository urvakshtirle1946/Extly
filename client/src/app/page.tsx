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
import { CinematicFooter } from '@/components/ui/motion-footer'
import FooterTapedDesign from '@/components/ui/footer-taped-design'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollVideoPlayer } from '@/components/ui/scroll-video-player'
import { PricingCards } from '@/components/ui/pricing-cards'

export default function RootPage() {

  const { user, loading } = useAuth()
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [creatingProject, setCreatingProject] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

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

  // Intercept pending prompt after successful login/signup
  useEffect(() => {
    async function checkPendingPrompt() {
      if (user && !loading) {
        const pendingPrompt = localStorage.getItem('pending_prompt')
        if (pendingPrompt) {
          localStorage.removeItem('pending_prompt') // clear early to avoid double-fire
          setCreatingProject(true)
          try {
            const name = pendingPrompt.slice(0, 40).trim() + (pendingPrompt.length > 40 ? '...' : '') || 'AI Extension'
            const data = await apiFetch('/api/projects', {
              method: 'POST',
              body: JSON.stringify({
                name,
                description: pendingPrompt,
                template: 'Blank',
                files: {}
              })
            })
            // API returns either { id } or { project: { id } } — handle both
            const projectId = data.id || data.project?.id
            if (projectId) {
              router.push(`/projects/${projectId}`)
            } else {
              console.error('No project ID in response', data)
              setCreatingProject(false)
            }
          } catch (err: any) {
            console.error('Failed to auto-create project:', err)
            alert(err.message || 'Failed to create project. Please sign out and sign in again.')
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
      // Not logged in — save prompt and redirect to Kinde signup directly
      localStorage.setItem('pending_prompt', message)
      window.location.href = '/api/auth/register'
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
    } catch (err: any) {
      console.error('Failed to create project:', err)
      alert(err.message || 'Failed to create project. Please sign out and sign in again.')
      setCreatingProject(false)
    }
  }

  // Only block the UI for active project creation (user-triggered)
  if (creatingProject) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4 select-none">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
        <p className="text-white/70 text-xs font-bold uppercase tracking-wider animate-pulse">
          Initializing extension builder...
        </p>
      </div>
    )
  }

  // Logged in → full dashboard
  if (!loading && user) {
    return <DashboardContent />
  }

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault()
    const mainDiv = document.getElementById('main-container')
    if (mainDiv) {
      mainDiv.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Unauthenticated → NEAT landing
  return (
    <div id="main-container" className="min-h-screen text-white relative font-sans flex flex-col scroll-smooth">

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
          <Link href="/" onClick={scrollToTop} className="flex items-center justify-center hover:opacity-85 transition-opacity ml-3.5 pointer-events-auto shrink-0">
            <PromptexLogo height={20} />
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 px-3">
            <Link 
              href="/" 
              onClick={scrollToTop}
              className="text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link 
              href="#pricing" 
              onClick={scrollToSection('pricing')}
              className="text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="#faq" 
              onClick={scrollToSection('faq')}
              className="text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
            >
              FAQ
            </Link>
          </nav>

          {/* Right Side: Action capsule */}
          <div className="flex items-center gap-2">
            {!user ? (
              <a
                href="/api/auth/register"
                className="h-9 px-5 flex items-center justify-center bg-white hover:bg-neutral-100 text-black text-[12px] font-extrabold rounded-full transition-colors shadow-lg"
              >
                Get Started
              </a>
            ) : (

              <Link 
                href="/dashboard"
                className="text-neutral-300 hover:text-white text-[12px] font-bold px-3 transition-colors cursor-pointer"
              >
                Dashboard
              </Link>
            )}
          </div>
        </header>
      </div>

      {/* Centered hero */}
      <main className="min-h-[80vh] flex flex-col items-center justify-center px-6 max-w-4xl w-full mx-auto relative z-10 pt-16 pb-12 select-none font-sans">
        <div className="text-center space-y-7 w-full my-auto">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-[64px] font-serif-yc tracking-tight leading-[1.1] font-normal" style={{ color: '#ffffff', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.85)) drop-shadow(0 0 25px rgba(0,0,0,0.75))' }}>
              Build extensions <span className="italic" style={{ color: '#000000' }}>with Promptex</span>
            </h1>
            <p className="text-[17px] sm:text-[19px] max-w-xl mx-auto font-medium leading-relaxed mt-3" style={{ color: '#ffffff', opacity: 0.9, textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 0 25px rgba(0,0,0,0.75)' }}>
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
      </main>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 pt-6 pb-16 w-full select-none font-sans">
        {/* Badge */}
        <div className="flex justify-center mb-10 px-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium tracking-wider uppercase bg-[#0c0c0d] border border-white/[0.08] text-neutral-400 rounded-full shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            How it works
          </span>
        </div>

        {/* Workspace Screenshot / Frame Player Track */}
        <div className="w-full relative">
          {/* Ambient Glow halo */}
          <div className="absolute inset-x-0 -top-12 h-40 bg-purple-500/[0.05] blur-3xl rounded-full pointer-events-none" />
          <div className="relative py-2">
            <ScrollVideoPlayer />
          </div>
        </div>
      </section>



      {/* Pricing Section */}
      <PricingCards user={user} />

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

      {/* Taped Footer Design */}
      <FooterTapedDesign />
    </div>
  )
}
