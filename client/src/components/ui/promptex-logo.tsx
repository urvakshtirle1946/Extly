"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['700'],
});

interface PromptexLogoProps {
  className?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
}

/**
 * PromptexLogoMark — Renders a clean branding icon.
 */
export function PromptexLogoMark({
  className = "",
  width = 18,
  height = 18,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Sparkles 
      className={`text-white shrink-0 ${className}`} 
      style={{ width, height }} 
      strokeWidth={2.5} 
    />
  );
}

/**
 * PromptexLogo — Renders the brand name written in an elegant calligraphic font.
 */
export function PromptexLogo({
  className = "",
  width,
  height,
}: PromptexLogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <span className={`${dancingScript.className} text-3xl font-bold tracking-wide text-white`}>
        Promptex
      </span>
    </div>
  );
}
