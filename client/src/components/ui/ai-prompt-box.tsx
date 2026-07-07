"use client";

import React from "react";
import { ArrowUp, Loader2, Plus, Mic, ChevronDown } from "lucide-react";
import { useApiFetch } from "@/utils/api";

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

interface PromptInputBoxProps {
  onSend?: (message: string, useByok?: boolean, byokProvider?: string, byokApiKey?: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  showByokToggle?: boolean;
}

export const PromptInputBox = React.forwardRef((props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
  const { onSend = () => {}, isLoading = false, placeholder = "Ask Promptex to create a Chrome extension...", className, showByokToggle = false } = props;
  const [input, setInput] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const apiFetch = useApiFetch();

  const [byokEnabled, setByokEnabled] = React.useState(false);
  const [byokProvider, setByokProvider] = React.useState("openrouter");
  const [byokCustomProvider, setByokCustomProvider] = React.useState("");
  const [byokApiKey, setByokApiKey] = React.useState("");
  const [byokSaved, setByokSaved] = React.useState(false);
  const [byokSaving, setByokSaving] = React.useState(false);

  React.useEffect(() => {
    if (showByokToggle) {
      const checkUserByok = async () => {
        try {
          const data = await apiFetch("/api/user/byok");
          if (data.hasKey) {
            setByokEnabled(true);
            setByokSaved(true);
            setByokProvider(data.provider || "openrouter");
            setByokApiKey("••••••••••••••••");
          }
        } catch (err) {
          console.error("Failed to load user BYOK info:", err);
        }
      };
      checkUserByok();
    }
  }, [showByokToggle]);

  const handleSaveByokKey = async () => {
    const finalProvider = byokProvider === "other" ? byokCustomProvider : byokProvider;
    if (!byokApiKey.trim() || !finalProvider || byokApiKey === "••••••••••••••••") return;
    setByokSaving(true);
    try {
      await apiFetch("/api/user/byok", {
        method: "POST",
        body: JSON.stringify({
          provider: finalProvider,
          api_key: byokApiKey,
        }),
      });
      setByokSaved(true);
      setByokApiKey("••••••••••••••••");
    } catch (err: any) {
      alert("Failed to save API key: " + err.message);
    } finally {
      setByokSaving(false);
    }
  };

  const handleDisableByok = async () => {
    try {
      await apiFetch("/api/user/byok", { method: "DELETE" });
      setByokEnabled(false);
      setByokSaved(false);
      setByokApiKey("");
      setByokProvider("openrouter");
      setByokCustomProvider("");
    } catch (err: any) {
      alert("Failed to disable BYOK: " + err.message);
    }
  };

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(64, textarea.scrollHeight)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(
        input,
        byokEnabled && byokSaved,
        byokProvider === "other" ? byokCustomProvider : byokProvider,
        byokApiKey
      );
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
        className="w-full bg-transparent text-white placeholder-neutral-550 text-sm focus:outline-none resize-none min-h-[64px] py-1 leading-relaxed font-normal overflow-y-auto"
      />

      {/* Action Row */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-900/50 gap-2">
        {/* Left Side: Plus Button and BYOK Toggle */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            className="w-8 h-8 rounded-full border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Add attachment"
          >
            <Plus className="h-4 w-4 stroke-[2]" />
          </button>

          {showByokToggle && (
            <div className="flex items-center gap-1.5 min-w-0 max-w-full">
              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  if (byokEnabled) {
                    handleDisableByok();
                  } else {
                    setByokEnabled(true);
                  }
                }}
                title={byokEnabled ? "Click to disable BYOK" : "Use your own API key — free unlimited builds"}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer",
                  byokEnabled && byokSaved
                    ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                    : byokEnabled && !byokSaved
                    ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 animate-pulse"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
                )}
              >
                <span>🔑</span>
                <span className="hidden sm:inline text-[9px]">
                  {byokEnabled && byokSaved ? "BYOK" : byokEnabled ? "Setup..." : "BYOK"}
                </span>
                {/* Toggle pill */}
                <div className={cn(
                  "w-6 h-3 rounded-full transition-all relative shrink-0",
                  byokEnabled ? "bg-purple-500" : "bg-neutral-700"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all duration-200",
                    byokEnabled ? "left-3.5" : "left-0.5"
                  )} />
                </div>
              </button>

              {/* Inline BYOK Config — visible only when enabled */}
              {byokEnabled && (
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Provider Dropdown */}
                  <select
                    value={byokProvider}
                    onChange={(e) => {
                      setByokProvider(e.target.value);
                      if (byokSaved) {
                        setByokSaved(false);
                        setByokApiKey("");
                      }
                    }}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-purple-500/40 shrink-0 cursor-pointer"
                  >
                    <option value="openrouter">OpenRouter</option>
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="other">Other...</option>
                  </select>

                  {/* Custom provider input — only when Other selected */}
                  {byokProvider === "other" && (
                    <input
                      type="text"
                      placeholder="e.g. Together"
                      value={byokCustomProvider}
                      onChange={(e) => setByokCustomProvider(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500/40 w-20 shrink-0"
                    />
                  )}

                  {/* API Key Input or Saved State */}
                  {byokSaved ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="bg-neutral-900 border border-purple-500/20 rounded-lg px-2 py-1 text-[10px] text-purple-400 font-mono truncate max-w-[80px] sm:max-w-[120px] select-none">
                        ••••••••••••
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setByokSaved(false);
                          setByokApiKey("");
                        }}
                        className="text-[9px] text-neutral-500 hover:text-white transition-colors shrink-0 font-bold cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="password"
                        placeholder={
                          byokProvider === "openrouter" ? "sk-or-v1-..." :
                          byokProvider === "groq" ? "gsk_..." :
                          byokProvider === "openai" ? "sk-..." :
                          byokProvider === "anthropic" ? "sk-ant-..." :
                          "API key..."
                        }
                        value={byokApiKey}
                        onChange={(e) => setByokApiKey(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveByokKey();
                          }
                        }}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500/40 w-24 sm:w-32 shrink-0"
                      />
                      <button
                        type="button"
                        onClick={handleSaveByokKey}
                        disabled={
                          byokSaving || 
                          !byokApiKey.trim() || 
                          byokApiKey === "••••••••••••••••" ||
                          (byokProvider === "other" && !byokCustomProvider.trim())
                        }
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-[10px] font-bold rounded-lg transition-all shrink-0 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                      >
                        {byokSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "🔒"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3 shrink-0">
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
