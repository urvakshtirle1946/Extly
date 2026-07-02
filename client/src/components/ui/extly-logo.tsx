"use client";

import React from 'react';
import Image from 'next/image';

interface ExtlyLogoProps {
  className?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
}

/**
 * ExtlyLogoMark — Renders the actual extly-logo.png file.
 */
export function ExtlyLogoMark({
  className = "",
  width = 32,
  height = 32,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src="/extly-logo.png"
      alt="Extly"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}

/**
 * ExtlyLogo — Renders the actual extly-logo.png file, scaled to the given size.
 */
export function ExtlyLogo({
  className = "",
  imageClassName = "",
  width = 130,
  height = 34,
}: ExtlyLogoProps) {
  return (
    <div className={className}>
      <Image
        src="/extly-logo.png"
        alt="Extly"
        width={width}
        height={height}
        className={imageClassName}
        priority
      />
    </div>
  );
}
