"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const TOTAL_FRAMES = 135;

// Helper to get image path for frame number (1-indexed)
const getFramePath = (index: number) => {
  const paddedIndex = String(index).padStart(3, "0");
  return `/snaps/ezgif-frame-${paddedIndex}.jpg`;
};

export function ScrollVideoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedMapRef = useRef<boolean[]>(new Array(TOTAL_FRAMES + 1).fill(false));
  const currentFrameRef = useRef<number>(1);
  const animFrameIdRef = useRef<number | null>(null);

  // Draw frame on canvas (with fallback to nearest loaded frame if current frame is loading)
  const renderFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Find requested frame or fallback to nearest loaded frame
    let targetIdx = frameIndex;
    if (!loadedMapRef.current[targetIdx]) {
      // Search closest loaded frame backward then forward
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        if (targetIdx - offset >= 1 && loadedMapRef.current[targetIdx - offset]) {
          targetIdx = targetIdx - offset;
          break;
        }
        if (targetIdx + offset <= TOTAL_FRAMES && loadedMapRef.current[targetIdx + offset]) {
          targetIdx = targetIdx + offset;
          break;
        }
      }
    }

    const img = imagesRef.current[targetIdx - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }, []);

  // Priority preloading: load initial frames (1..15) first for instant display, then batch load 16..135
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    // Initialize HTMLImageElement array
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      images.push(img);
    }
    imagesRef.current = images;

    const onFrameLoad = (index: number) => {
      loadedCount++;
      loadedMapRef.current[index] = true;
      setLoadProgress(Math.floor((loadedCount / TOTAL_FRAMES) * 100));

      // Instantly render Frame 1 when it finishes loading
      if (index === 1 || (currentFrameRef.current === index)) {
        renderFrame(currentFrameRef.current);
      }

      // Hide loading spinner as soon as initial keyframes (1..15) are ready so view is instant
      if (loadedCount >= 15) {
        setIsPreloaded(true);
      }
    };

    // Load initial 15 keyframes with high priority
    for (let i = 1; i <= 15; i++) {
      const img = images[i - 1];
      img.onload = () => onFrameLoad(i);
      img.onerror = () => onFrameLoad(i);
      img.src = getFramePath(i);
    }

    // Load remaining frames (16..135) concurrently in background
    setTimeout(() => {
      for (let i = 16; i <= TOTAL_FRAMES; i++) {
        const img = images[i - 1];
        img.onload = () => onFrameLoad(i);
        img.onerror = () => onFrameLoad(i);
        img.src = getFramePath(i);
      }
    }, 50);
  }, [renderFrame]);

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

      if (currentFrameRef.current !== frameIndex) {
        currentFrameRef.current = frameIndex;
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
        }
        animFrameIdRef.current = requestAnimationFrame(() => {
          renderFrame(frameIndex);
        });
      }
    };

    const mainContainer = document.getElementById("main-container");

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    if (mainContainer) {
      mainContainer.addEventListener("scroll", handleScroll, { passive: true });
    }

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (mainContainer) {
        mainContainer.removeEventListener("scroll", handleScroll);
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [renderFrame]);

  return (
    <div ref={containerRef} className="relative w-full h-[320vh] select-none">
      {/* Sticky full-height container that pins in place while user scrolls through all frames */}
      <div className="sticky top-0 h-screen flex items-center justify-center w-full max-w-6xl mx-auto px-4 sm:px-6 z-20 pointer-events-none">
        <div className="pointer-events-auto relative w-full flex items-center justify-center">
          
          {/* Preloader Overlay */}
          {!isPreloaded && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-xs text-neutral-400 font-mono font-medium">{loadProgress}% loading frames...</p>
            </div>
          )}

          {/* Main Frame Canvas — Completely Borderless */}
          <canvas 
            ref={canvasRef} 
            className="w-full h-auto object-contain max-h-[82vh] md:max-h-[88vh] rounded-2xl shadow-2xl relative z-10" 
          />
        </div>
      </div>
    </div>
  );
}




