'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle2, Scale, AlertTriangle } from 'lucide-react'
import { PromptexLogo } from '@/components/ui/promptex-logo'

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative select-none overflow-x-hidden">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Floating Header */}
      <header className="sticky top-6 z-50 flex justify-center px-4 mb-8">
        <div className="h-12 max-w-4xl w-full flex items-center justify-between px-6 bg-black/60 backdrop-blur-xl border border-white/[0.08] rounded-full shadow-2xl">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <PromptexLogo height={20} />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 flex-1 w-full space-y-8 select-text">
        {/* Title Badge */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-medium uppercase tracking-wider bg-white/[0.05] border border-white/[0.1] text-purple-400 rounded-full">
            <Scale className="w-3.5 h-3.5" />
            Legal Agreement
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif-yc font-normal text-white">
            Terms &amp; <span className="italic text-neutral-400">Conditions</span>
          </h1>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto">
            Last updated: July 2026. Please read these Terms of Service carefully before using the Promptex AI platform.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-[#0c0c0e]/80 border border-white/[0.1] rounded-3xl p-8 sm:p-10 space-y-8 backdrop-blur-xl shadow-2xl text-neutral-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Promptex ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to all terms, you may not access or use our AI extension generator.
            </p>
          </section>

          <hr className="border-white/[0.08]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              2. Code Generation &amp; Ownership
            </h2>
            <p>
              Promptex generates browser extension source code based on your natural language inputs. You retain full ownership of the generated code, scripts, and ZIP exports produced by your account.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-400 pl-2">
              <li>You are free to inspect, modify, distribute, or publish your generated extensions.</li>
              <li>You are responsible for ensuring that your extensions comply with the Chrome Web Store Developer Program Policies.</li>
            </ul>
          </section>

          <hr className="border-white/[0.08]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              3. Prohibited Uses
            </h2>
            <p>
              You agree not to use Promptex to build or distribute extensions that:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-400 pl-2">
              <li>Engage in malicious activities, phishing, spyware, or unauthorized data collection.</li>
              <li>Bypass security controls, inject malicious scripts, or violate user privacy.</li>
              <li>Infringe upon intellectual property rights of third parties.</li>
            </ul>
          </section>

          <hr className="border-white/[0.08]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              4. Limitation of Liability
            </h2>
            <p>
              Promptex is provided "as is" without warranty of any kind. We are not liable for any damages resulting from extension publication, browser environment incompatibilities, or third-party web changes.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 mt-12 text-center text-xs text-neutral-400">
        <p className="mb-2">© {new Date().getFullYear()} Promptex Inc. All rights reserved.</p>
        <p>
          Made with ❤️ by{' '}
          <a
            href="https://www.linkedin.com/in/urvaksh-tirle-772601297/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white hover:underline transition-all"
          >
            Urvaksh
          </a>
        </p>
      </footer>
    </div>
  )
}
