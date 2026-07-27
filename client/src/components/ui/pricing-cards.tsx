'use client'

import React, { useState } from 'react'
import { 
  Check, 
  Zap, 
  Layers, 
  Lightbulb, 
  BarChart3, 
  Wand2, 
  Sparkles,
  ChevronDown
} from 'lucide-react'

interface PricingCardsProps {
  user?: any
}

// Actual Pay-As-You-Go Credit Tiers from Promptex Backend
const CREDIT_TIERS = [
  { credits: 20, price: 5, popular: false },
  { credits: 100, price: 24, popular: true },
  { credits: 200, price: 49, popular: false },
  { credits: 400, price: 99, popular: false },
  { credits: 800, price: 199, popular: false },
  { credits: 1200, price: 299, popular: false },
]

export function PricingCards({ user }: PricingCardsProps) {
  const [selectedTierIndex, setSelectedTierIndex] = useState(1) // Default to 100 credits ($24)
  const activeTier = CREDIT_TIERS[selectedTierIndex]

  return (
    <section id="pricing" className="relative z-10 py-20 px-4 sm:px-6 max-w-6xl w-full mx-auto select-none font-sans">
      {/* Clean Title Only */}
      <div className="mx-auto max-w-2xl text-center mb-12">
        <h2 className="text-4xl sm:text-5xl font-serif-yc font-normal text-white tracking-tight">
          Pricing
        </h2>
        <p className="text-neutral-400 text-sm mt-2">
          No monthly subscription traps. Pay only for the credits you need.
        </p>
      </div>

      {/* Credit Selection Pills - High Visibility Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-12 max-w-3xl mx-auto px-2">
        {CREDIT_TIERS.map((tier, idx) => (
          <button
            key={tier.credits}
            onClick={() => setSelectedTierIndex(idx)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
              selectedTierIndex === idx
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40'
            }`}
          >
            <span>{tier.credits} Credits</span>
            <span className={selectedTierIndex === idx ? 'text-neutral-600' : 'text-neutral-400'}>
              (${tier.price})
            </span>
            {tier.popular && (
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-amber-400 text-black rounded-full ml-1">
                Best
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        
        {/* CARD 1: Featured Pay-As-You-Go Credit Pack (Colorful Glow Header) */}
        <div className="bg-white text-neutral-900 rounded-[36px] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between border border-white/40">
          
          {/* Top Multi-Color Gradient Mesh Glow */}
          <div className="absolute -top-12 -left-12 -right-12 h-[220px] pointer-events-none z-0 overflow-hidden rounded-t-[36px]">
            <div className="absolute top-0 left-0 w-[140%] h-[200px] bg-gradient-to-r from-blue-400/60 via-amber-300/70 to-orange-400/60 blur-3xl rounded-full transform -rotate-12 opacity-90" />
            <div className="absolute top-4 right-2 w-[120px] h-[120px] bg-amber-400/50 blur-2xl rounded-full" />
          </div>

          {/* Card Content */}
          <div className="relative z-10 space-y-7">
            
            {/* Header Block */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight text-neutral-900">
                  Credit Pack
                </h3>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 bg-black/10 rounded-full text-neutral-900">
                  Pay As You Go
                </span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-5xl font-extrabold tracking-tight text-neutral-900">
                  ${activeTier.price}
                </span>
                <div className="text-xs text-neutral-700 font-medium leading-tight">
                  <p className="font-bold text-neutral-900">{activeTier.credits} AI Build Credits</p>
                  <p className="text-neutral-600">one-time purchase • never expires</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <a
              href={user ? `/dashboard?tab=billing` : "/api/auth/register"}
              className="block w-full text-center bg-[#18181b] hover:bg-black text-white font-semibold text-sm py-4 px-6 rounded-2xl shadow-lg border border-black/10 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              {user ? `Buy ${activeTier.credits} Credits` : "Get Started"}
            </a>

            <div className="h-[1px] bg-neutral-200/80 my-2" />

            {/* Feature List */}
            <ul className="space-y-4 text-sm text-neutral-800 font-medium">
              <li className="flex items-center gap-3.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <span><strong>{activeTier.credits} credits</strong> for AI extension generation</span>
              </li>
              <li className="flex items-center gap-3.5">
                <Layers className="w-4 h-4 text-neutral-700 shrink-0" />
                <span>Unlimited Manifest V3 file creations</span>
              </li>
              <li className="flex items-center gap-3.5">
                <Lightbulb className="w-4 h-4 text-neutral-700 shrink-0" />
                <span>Smart prompt enhancer &amp; auto-fixer</span>
              </li>
              <li className="flex items-center gap-3.5">
                <BarChart3 className="w-4 h-4 text-neutral-700 shrink-0" />
                <span>Live browser preview &amp; sandbox testing</span>
              </li>
              <li className="flex items-center gap-3.5">
                <Wand2 className="w-4 h-4 text-neutral-700 shrink-0" />
                <span>Download clean extension source ZIP</span>
              </li>
            </ul>
          </div>

          {/* Footer Link */}
          <div className="relative z-10 pt-8 mt-4 border-t border-neutral-100">
            <a 
              href={user ? "/dashboard?tab=billing" : "#faq"} 
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors inline-flex items-center gap-1"
            >
              Need custom enterprise limits?
            </a>
          </div>
        </div>

        {/* CARD 2: Free Daily Credits Plan */}
        <div className="bg-white text-neutral-900 rounded-[36px] p-8 shadow-xl relative overflow-hidden flex flex-col justify-between border border-neutral-200/80">
          
          {/* Card Content */}
          <div className="relative z-10 space-y-7">
            
            {/* Header Block */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-amber-500 bg-clip-text text-transparent">
                    Free Starter
                  </span>
                </h3>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  Free Forever
                </span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-5xl font-extrabold tracking-tight text-neutral-900">
                  $0
                </span>
                <div className="text-xs text-neutral-500 font-medium leading-tight">
                  <p className="font-bold text-neutral-900">10 Daily Credits</p>
                  <p>refreshes every 24 hours</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <a
              href="/api/auth/register"
              className="block w-full text-center bg-[#f4f4f5] hover:bg-neutral-200 text-neutral-900 font-semibold text-sm py-4 px-6 rounded-2xl border border-neutral-200/80 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Start Free
            </a>

            <div className="h-[1px] bg-neutral-100 my-2" />

            {/* Feature List with Clean Checkmarks */}
            <ul className="space-y-4 text-sm text-neutral-800 font-medium">
              <li className="flex items-center gap-3.5">
                <Check className="w-4 h-4 text-neutral-900 shrink-0" strokeWidth={2.5} />
                <span>10 free AI build credits per day</span>
              </li>
              <li className="flex items-center gap-3.5">
                <Check className="w-4 h-4 text-neutral-900 shrink-0" strokeWidth={2.5} />
                <span>Full Manifest V3 extension generation</span>
              </li>
              <li className="flex items-center gap-3.5">
                <Check className="w-4 h-4 text-neutral-900 shrink-0" strokeWidth={2.5} />
                <span>Popup UI live preview</span>
              </li>
              <li className="flex items-center gap-3.5">
                <Check className="w-4 h-4 text-neutral-900 shrink-0" strokeWidth={2.5} />
                <span>Instant extension ZIP download</span>
              </li>
              <li className="flex items-center gap-3.5">
                <Check className="w-4 h-4 text-neutral-900 shrink-0" strokeWidth={2.5} />
                <span>Community support</span>
              </li>
            </ul>
          </div>

          {/* Footer Link */}
          <div className="relative z-10 pt-8 mt-4 border-t border-neutral-100">
            <a 
              href="#faq" 
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors inline-flex items-center gap-1"
            >
              Need higher limits?
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
