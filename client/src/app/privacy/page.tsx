'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText } from 'lucide-react'
import { PromptexLogo } from '@/components/ui/promptex-logo'

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-medium uppercase tracking-wider bg-white/[0.05] border border-white/[0.1] text-emerald-400 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Privacy Protection
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif-yc font-normal text-white">
            Privacy <span className="italic text-neutral-400">Policy</span>
          </h1>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto">
            Last updated: July 2026. Learn how Promptex handles your project prompts, account details, and browser extension assets safely.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-[#0c0c0e]/80 border border-white/[0.1] rounded-3xl p-8 sm:p-10 space-y-8 backdrop-blur-xl shadow-2xl text-neutral-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              1. Information We Collect
            </h2>
            <p>
              When you use Promptex, we collect information necessary to provide and improve our AI extension generator services:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-400 pl-2">
              <li><strong>Account Credentials:</strong> Basic authentication details (email address and login tokens via Kinde).</li>
              <li><strong>Project Prompts:</strong> Text instructions, code specifications, and file outputs generated for your browser extensions.</li>
              <li><strong>Usage Data:</strong> Diagnostic statistics, execution logs, and browser preview session telemetry to optimize code generation.</li>
            </ul>
          </section>

          <hr className="border-white/[0.08]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              2. How We Use Your Data
            </h2>
            <p>
              Your data is utilized strictly for processing prompts into standard Manifest V3 Chrome extensions and delivering service features:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-400 pl-2">
              <li>Generating extension code files, manifest definitions, and background workers.</li>
              <li>Powering live sandboxed browser preview sessions.</li>
              <li>Allowing single-click ZIP export of your generated extension source code.</li>
              <li>We <strong>do not sell</strong> your personal data or extension prompts to third parties.</li>
            </ul>
          </section>

          <hr className="border-white/[0.08]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              3. Data Security & Storage
            </h2>
            <p>
              We implement industry-standard encryption algorithms and secure database infrastructure (Supabase SSR) to safeguard your account data, project codebases, and credentials. Access to project source files is restricted to your authenticated session.
            </p>
          </section>

          <hr className="border-white/[0.08]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              4. Contact Us
            </h2>
            <p>
              If you have any questions regarding this Privacy Policy or wish to request deletion of your account data, contact our team at{' '}
              <a href="mailto:support@promptex.io" className="text-white underline hover:text-purple-400 transition-colors">
                support@promptex.io
              </a>.
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
