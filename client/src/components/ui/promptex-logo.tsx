"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import promptexLogoImg from '../../../public/promptex.png';

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
 * PromptexLogo — Renders the brand logo image.
 */
export function PromptexLogo({
  className = "",
  imageClassName = "",
  width,
  height,
}: PromptexLogoProps) {
  // Crop aspect ratio is ~ 1059 / 195 = 5.43
  const finalHeight = height ?? 26;
  const finalWidth = width ?? Math.round(finalHeight * 5.43);

  return (
    <div className={`flex items-center select-none ${className}`}>
      <Image 
        src={promptexLogoImg} 
        alt="Promptex Logo" 
        width={finalWidth}
        height={finalHeight}
        className={`object-contain ${imageClassName}`}
        priority
      />
    </div>
  );
}

