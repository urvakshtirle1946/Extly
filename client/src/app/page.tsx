'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import DashboardContent from '@/components/DashboardContent'
import Link from 'next/link'
import { Code, Loader2 } from 'lucide-react'
import { useApiFetch } from '@/utils/api'
import { NeatGradient } from '@firecms/neat'
import { PromptexLogo } from '@/components/ui/promptex-logo'
import { PromptInputBox } from '@/components/ui/ai-prompt-box'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const apiFetch = useApiFetch()
  const [creatingProject, setCreatingProject] = useState(false)

  // Initialize the NeatGradient canvas (identical to DashboardContent)
  useEffect(() => {
    if (!canvasRef.current) return

    const config = {
      colors: [
        { color: '#167CB3', enabled: true },
        { color: '#CB9854', enabled: true },
        { color: '#CE96CE', enabled: true },
        { color: '#E0115F', enabled: true },
        { color: '#FFFFFF', enabled: false },
        { color: '#000000', enabled: false },
      ],
      speed: 2.5,
      horizontalPressure: 5,
      verticalPressure: 5,
      waveFrequencyX: 2,
      waveFrequencyY: 3,
      waveAmplitude: 6,
      shadows: 2,
      highlights: 0,
      colorBrightness: 0.9,
      colorSaturation: -3,
      wireframe: false,
      colorBlending: 5,
      backgroundColor: '#A1A4B7',
      backgroundAlpha: 1,
      grainScale: 0,
      grainSparsity: 0,
      grainIntensity: 0,
      grainSpeed: 0,
      resolution: 0.4,
      yOffset: 0.0999755859375,
      yOffsetWaveMultiplier: 1,
      yOffsetColorMultiplier: 4.8,
      yOffsetFlowMultiplier: 5.3,
      flowDistortionA: 3.7,
      flowDistortionB: 0.8,
      flowScale: 1.6,
      flowEase: 0.32,
      flowEnabled: true,
      enableProceduralTexture: false,
      transparentTextureVoid: true,
      textureVoidLikelihood: 0.29,
      textureVoidWidthMin: 120,
      textureVoidWidthMax: 420,
      textureBandDensity: 2.9,
      textureColorBlending: 0.06,
      textureSeed: 536,
      textureEase: 0.93,
      proceduralBackgroundColor: '#775454',
      textureShapeTriangles: 48,
      textureShapeCircles: 15,
      textureShapeBars: 15,
      textureShapeSquiggles: 27,
      domainWarpEnabled: true,
      domainWarpIntensity: 0.1,
      domainWarpScale: 2.4,
      vignetteIntensity: 0.45,
      vignetteRadius: 0.55,
      fresnelEnabled: false,
      fresnelPower: 2.7,
      fresnelIntensity: 1.3,
      fresnelColor: '#F7E7CE',
      iridescenceEnabled: false,
      iridescenceIntensity: 0.5,
      iridescenceSpeed: 1,
      bloomIntensity: 1.9,
      bloomThreshold: 0.6,
      chromaticAberration: 17,
      shapeType: 'ribbon' as const,
      shapeRotationX: 0.3480000000000001,
      shapeRotationY: -26.783,
      shapeRotationZ: -0.29,
      shapeAutoRotateSpeedX: 0,
      shapeAutoRotateSpeedY: 0,
      sphereRadius: 15,
      torusRadius: 15,
      torusTube: 5,
      cylinderRadius: 10,
      cylinderHeight: 40,
      planeBend: 2.3,
      planeTwist: -2.9,
      silhouetteFade: 0.83,
      cylinderFade: 0.08,
      ribbonFade: 0.31,
      flatShading: false,
      cameraLock: false,
      cameraX: 0,
      cameraY: 0,
      cameraZ: 0,
      cameraRotationX: -0.014,
      cameraRotationY: -0.23800000000000002,
      cameraRotationZ: 0,
      cameraZoom: 1,
    }

    const gradient = new NeatGradient({ ref: canvasRef.current, ...config })

    return () => {
      if (gradient && typeof gradient.destroy === 'function') {
        gradient.destroy()
      }
    }
  }, [user, loading, creatingProject])

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

      {/* NEAT Animated Gradient Canvas */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full opacity-100"
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 bg-[#0c0c0e]/90 backdrop-blur-md border-b border-neutral-900/60 select-none">
        
        {/* Left Side: Logo & Links */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group hover:opacity-85 transition-opacity flex items-center">
            <PromptexLogo />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 ml-8">
            <Link 
              href="#how-it-works" 
              className="text-[13px] font-medium text-neutral-450 hover:text-white transition-colors"
            >
              How it Works
            </Link>
            <Link 
              href="#pricing" 
              className="text-[13px] font-medium text-neutral-450 hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </nav>
        </div>

        {/* Right Side: Auth nav — Clerk-aware */}
        <div className="flex items-center space-x-3">
          <SignedOut>
            <Link
              href="/login"
              className="text-neutral-450 hover:text-white text-[13px] font-bold px-3 py-1.5 transition-colors cursor-pointer"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-white hover:bg-neutral-100 text-black font-extrabold rounded-full text-[13px] px-5 py-1.5 transition-all shadow-sm cursor-pointer"
            >
              Get Started
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{
                variables: { colorPrimary: '#8b5cf6' },
                elements: { avatarBox: 'w-8 h-8' },
              }}
              afterSignOutUrl="/"
            />
          </SignedIn>
        </div>
      </header>

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
      <section id="pricing" className="relative z-10 py-24 px-6 max-w-5xl w-full mx-auto border-t border-neutral-900/60 bg-[#0c0c0e]/40 backdrop-blur-md rounded-3xl my-10 select-none">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Simple Credit Packages
          </h2>
          <p className="text-[15px] text-neutral-400 max-w-md mx-auto">
            No subscriptions or hidden monthly fees. Buy package credits dynamically to fund your extension development.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Card 1 */}
          <div className="bg-neutral-950/80 border border-neutral-900/60 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-neutral-800 transition-all duration-300">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Starter pack</span>
                <h3 className="text-lg font-bold text-white">100 Credits</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$24</span>
                <span className="text-neutral-500 text-xs font-semibold">one-time</span>
              </div>
              <p className="text-xs text-neutral-450 leading-relaxed">
                Great for trying out ideas or building 2-3 standard Chrome extensions.
              </p>
            </div>
            <Link 
              href="/signup" 
              className="mt-8 w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-white text-center font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Card 2 - Featured */}
          <div className="bg-neutral-950/90 border-2 border-purple-600 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-purple-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Developer pack</span>
                <h3 className="text-lg font-bold text-white">400 Credits</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$99</span>
                <span className="text-neutral-500 text-xs font-semibold">one-time</span>
              </div>
              <p className="text-xs text-neutral-450 leading-relaxed">
                Perfect for developers building complex extensions and debugging multiple scripts.
              </p>
            </div>
            <Link 
              href="/signup" 
              className="mt-8 w-full py-2.5 bg-purple-600 hover:bg-purple-550 text-white text-center font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-purple-950/40"
            >
              Get Started
            </Link>
          </div>

          {/* Card 3 */}
          <div className="bg-neutral-950/80 border border-neutral-900/60 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-neutral-800 transition-all duration-300">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Professional pack</span>
                <h3 className="text-lg font-bold text-white">1200 Credits</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$299</span>
                <span className="text-neutral-500 text-xs font-semibold">one-time</span>
              </div>
              <p className="text-xs text-neutral-450 leading-relaxed">
                Designed for power creators publishing production extensions and managing teams.
              </p>
            </div>
            <Link 
              href="/signup" 
              className="mt-8 w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-white text-center font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Get Started
            </Link>
          </div>
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

      {/* NEAT watermark */}
      <div className="fixed bottom-3 right-4 z-10 pointer-events-none select-none">
        <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">NEAT</span>
      </div>
    </div>
  )
}
