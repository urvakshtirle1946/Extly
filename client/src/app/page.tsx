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
    <div className="min-h-screen text-white overflow-hidden relative font-sans flex flex-col">

      {/* NEAT Animated Gradient Canvas */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full opacity-100"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 h-16 flex items-center justify-between px-8 shrink-0 bg-[#0c0c0e]/90 backdrop-blur-md border-b border-neutral-900/60 select-none">
        
        {/* Left Side: Logo & Links */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group hover:opacity-85 transition-opacity flex items-center">
            <PromptexLogo />
          </Link>
          <span className="px-1.5 py-0.5 text-[9px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800/80 rounded-md uppercase tracking-wider select-none">
            BETA
          </span>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 ml-8">
            <Link 
              href="#how-it-works" 
              className="text-[13px] font-medium text-neutral-400 hover:text-white transition-colors"
            >
              How it Works
            </Link>
            <Link 
              href="#pricing" 
              className="text-[13px] font-medium text-neutral-400 hover:text-white transition-colors"
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-4xl w-full mx-auto relative z-10 pb-20 select-none font-sans">
        <div className="text-center space-y-7 w-full">
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
      </main>

      {/* NEAT watermark */}
      <div className="absolute bottom-3 right-4 z-10 pointer-events-none select-none">
        <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">NEAT</span>
      </div>
    </div>
  )
}
