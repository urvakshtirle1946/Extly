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

    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };

  useEffect(() => {
    renderFrame(currentFrame);
  }, [currentFrame, isPreloaded]);

  // Handle scroll scrubbing with sticky locking
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate scroll progress within the sticky container's height
      const totalScrollableHeight = rect.height - windowHeight;
      if (totalScrollableHeight <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollableHeight));

      // Map progress cleanly across 1 to 135 frames
      const frameIndex = Math.max(1, Math.min(TOTAL_FRAMES, Math.floor(progress * (TOTAL_FRAMES - 1)) + 1));
      
      setCurrentFrame(frameIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[300vh] select-none">
      {/* Sticky full-height container that pins in place while user scrolls through all frames */}
      <div className="sticky top-0 h-screen flex items-center justify-center w-full max-w-6xl mx-auto px-4 z-20 overflow-hidden">
        <div className="relative w-full aspect-video bg-black/60 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl shadow-purple-950/20 overflow-hidden flex items-center justify-center">
          
          {/* Preloader Overlay */}
          {!isPreloaded && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm space-y-3">
              <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-xs text-neutral-400 font-mono">{loadProgress}%</p>
            </div>
          )}

          {/* Main Frame Canvas */}
          <canvas 
            ref={canvasRef} 
            className="w-full h-full object-contain max-h-[85vh] rounded-2xl" 
          />
        </div>
      </div>
    </div>
  );
}
