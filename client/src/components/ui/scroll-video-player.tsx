"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL_FRAMES = 135;

// Helper to get image path for frame number (1-indexed)
const getFramePath = (index: number) => {
  const paddedIndex = String(index).padStart(3, "0");
  return `/snaps/ezgif-frame-${paddedIndex}.jpg`;
};

export function ScrollVideoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  // Preload all 135 frames into memory for instantaneous 60fps rendering
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        loadedCount++;
        setLoadProgress(Math.floor((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount === TOTAL_FRAMES) {
          setIsPreloaded(true);
        }
      };
      // In case of any individual image error, count it so progress completes
      img.onerror = () => {
        loadedCount++;
        setLoadProgress(Math.floor((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount === TOTAL_FRAMES) {
          setIsPreloaded(true);
        }
      };
      images.push(img);
    }
    imagesRef.current = images;
  }, []);

  // Draw frame on canvas
  const renderFrame = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imagesRef.current[frameIndex - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    // Set canvas dimensions to match image natural resolution
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };

  // Render current frame whenever currentFrame changes or preloading completes
  useEffect(() => {
    renderFrame(currentFrame);
  }, [currentFrame, isPreloaded]);

  // Handle scroll scrubbing
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate scroll progress within the container's height
      const totalScrollableHeight = rect.height - windowHeight;
      if (totalScrollableHeight <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollableHeight));

      // Calculate frame index (1 to TOTAL_FRAMES)
      const frameIndex = Math.max(1, Math.min(TOTAL_FRAMES, Math.floor(progress * (TOTAL_FRAMES - 1)) + 1));
      
      setCurrentFrame(frameIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial position check

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[250vh]">
      {/* Sticky container pinned to screen center while scrolling */}
      <div className="sticky top-20 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 py-6 z-20">
        {/* Widescreen Glass Browser Container */}
        <div className="relative w-full bg-[#0a0a0c]/90 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl shadow-purple-950/20 overflow-hidden backdrop-blur-xl group">
          
          {/* Top Browser Bar */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-2 text-[11px] font-mono text-neutral-400 hidden sm:inline-block">
                promptex.tech/builder
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] md:text-xs font-mono text-neutral-400 bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-full">
                Frame {String(currentFrame).padStart(3, "0")} / {TOTAL_FRAMES}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Interactive Demo
              </span>
            </div>
          </div>

          {/* Canvas Video Display Area */}
          <div className="relative w-full aspect-video bg-black/80 flex items-center justify-center overflow-hidden">
            {/* Preloader Overlay */}
            {!isPreloaded && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm space-y-4">
                <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-white tracking-wider uppercase">Loading Interactive Preview...</p>
                  <p className="text-[11px] text-neutral-400 font-mono">{loadProgress}% ({Math.floor((loadProgress / 100) * TOTAL_FRAMES)} / {TOTAL_FRAMES} frames)</p>
                </div>
              </div>
            )}

            {/* Main Frame Canvas */}
            <canvas 
              ref={canvasRef} 
              className="w-full h-full object-contain max-h-[70vh]" 
            />

            {/* Scroll Indicator Prompt */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-300">
              <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white text-[11px] font-medium shadow-lg">
                <svg className="w-4 h-4 text-purple-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Scroll down to play frame-by-frame demo</span>
              </div>
            </div>
          </div>

          {/* Bottom Progress Bar Scrub Indicator */}
          <div className="w-full h-1 bg-white/5 relative">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 transition-all duration-75"
              style={{ width: `${(currentFrame / TOTAL_FRAMES) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
