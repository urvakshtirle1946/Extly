"use client";

import { useState, useEffect, useRef } from "react";

const images = [
  "/Screenshort/1.png",
  "/Screenshort/2.png",
  "/Screenshort/3.png",
  "/Screenshort/4.png",
  "/Screenshort/5.png",
];

const ExpandOnHover = () => {
  const [expandedImage, setExpandedImage] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Define viewport range for sequential card expansion:
      // Card 1 expands immediately as the section approaches center view (starts at 80% height).
      // Last card expands when it reaches upper view (15% height).
      const startScroll = windowHeight * 0.8;
      const endScroll = windowHeight * 0.15;

      const totalRange = startScroll - endScroll;
      const currentPos = startScroll - rect.top;

      const progress = Math.max(0, Math.min(1, currentPos / totalRange));

      const numCards = images.length;
      const index = Math.floor(progress * numCards) + 1;
      setExpandedImage(Math.max(1, Math.min(numCards, index)));
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Trigger once on mount

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const getImageWidth = (index: number) =>
    index === expandedImage ? "24rem" : "5rem";

  return (
    <div ref={containerRef} className="w-full h-full bg-transparent">
      <div className="relative flex items-center justify-center p-2 transition-all duration-300 ease-in-out w-full">
        <div className="w-full h-full overflow-hidden rounded-3xl">
          <div className="flex h-full w-full items-center justify-center overflow-hidden bg-transparent">
            <div className="relative w-full max-w-6xl px-5">
              <div className="flex w-full items-center justify-center gap-1">
                {images.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative cursor-pointer overflow-hidden rounded-3xl transition-all duration-500 ease-in-out"
                    style={{
                      width: getImageWidth(idx + 1),
                      height: "24rem",
                    }}
                    onMouseEnter={() => setExpandedImage(idx + 1)}
                  >
                    <img
                      className="w-full h-full object-cover"
                      src={src}
                      alt={`Image ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandOnHover;
