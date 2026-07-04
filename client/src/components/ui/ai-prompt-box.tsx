"use client";

import React from "react";
import { ArrowUp, Loader2, Plus, Mic, ChevronDown } from "lucide-react";

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

interface PromptInputBoxProps {
  onSend?: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const PromptInputBox = React.forwardRef((props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
  const { onSend = () => {}, isLoading = false, placeholder = "Ask Promptex to create a Chrome extension...", className } = props;
  const [input, setInput] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(64, textarea.scrollHeight)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInput((prev) => {
              const trimmed = prev.trim();
              return trimmed ? `${trimmed} ${transcript}` : transcript;
            });
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[24px] border border-neutral-800/80 bg-[#161618] p-4 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.7)] transition-all duration-300 w-full max-w-[800px] mx-auto min-h-[140px]",
        className
      )}
    >
      {/* Text Area Input */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="w-full bg-transparent text-white placeholder-neutral-500 text-sm focus:outline-none resize-none min-h-[64px] py-1 leading-relaxed font-normal overflow-y-auto"
      />

      {/* Action Row */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-900/50">
        {/* Left Side: Plus Button */}
        <button
          type="button"
          className="w-8 h-8 rounded-full border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="Add attachment"
        >
          <Plus className="h-4 w-4 stroke-[2]" />
        </button>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Build selector */}
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-900/40 text-[11px] font-bold text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <span>Build</span>
            <ChevronDown className="h-3 w-3 stroke-[2.5]" />
          </button>

          {/* Voice Input */}
          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              "p-1.5 transition-all cursor-pointer rounded-full",
              isListening 
                ? "text-red-500 bg-red-500/10 animate-pulse border border-red-500/20" 
                : "text-neutral-500 hover:text-white"
            )}
            title={isListening ? "Listening... click to stop" : "Use voice input"}
          >
            <Mic className="h-4 w-4" />
          </button>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 text-white disabled:text-neutral-600 flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-neutral-550" />
            ) : (
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

PromptInputBox.displayName = "PromptInputBox";
