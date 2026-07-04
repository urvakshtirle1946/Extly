import OpenAI from "openai";
import { XmlStreamParser, StreamEvent } from "../utils/streamParser";
import dotenv from "dotenv";

dotenv.config();

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/OpenExtensionCraft",
    "X-Title": "ExtensionCraft",
  },
});

const SYSTEM_PROMPT = `You are an elite Chrome Extension developer and UI/UX designer. 
You build Manifest V3 extensions with stunning, modern, production-quality interfaces.

CRITICAL OUTPUT FORMAT — STRICTLY FOLLOW:
- Output files using EXACTLY this format, no exceptions:
<file path="manifest.json">
...content...
</file>
- NEVER use markdown code blocks (\`\`\`)
- NEVER explain code outside file tags
- Always start with manifest.json first

DESIGN PHILOSOPHY — EVERY extension must look like a premium product:

1. COLOR & THEME:
   - Use rich, intentional color palettes — not generic grey/white
   - Dark themes: deep blacks (#0a0a0a, #111111) with vibrant accents
   - Light themes: clean whites with strong typographic hierarchy  
   - Use CSS variables for consistent theming:
     :root { --primary: #6366f1; --bg: #0f0f11; --surface: #1a1a1f; --text: #e4e4e7; }
   - Add subtle gradients: linear-gradient(135deg, #667eea 0%, #764ba2 100%)

2. TYPOGRAPHY:
   - Use Google Fonts via @import — Inter, Plus Jakarta Sans, or Geist
   - Strong hierarchy: large bold headers (20-24px), clear body (13-14px)
   - Letter spacing on labels: letter-spacing: 0.05em
   - Never use default system fonts alone

3. COMPONENTS — always build these properly:
   - Buttons: rounded-full or rounded-lg, hover states, active scale transform
     .btn { padding: 10px 20px; border-radius: 9999px; background: var(--primary);
            transition: all 0.2s; cursor: pointer; font-weight: 600; }
     .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
     .btn:active { transform: scale(0.97); }
   - Inputs: clean borders, focus rings, smooth transitions
     input { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px;
             background: rgba(255,255,255,0.05); color: white; outline: none; }
     input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
   - Cards: glass morphism with backdrop-filter
     .card { background: rgba(255,255,255,0.04); backdrop-filter: blur(12px);
             border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; }

4. ANIMATIONS — make it feel alive:
   - Page load: fade in + slide up
     @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
     body { animation: fadeUp 0.3s ease; }
   - Hover transitions: all 0.2s ease
   - Loading states: spinning ring or pulsing dots
   - Success states: checkmark animation

5. POPUP DIMENSIONS & LAYOUT:
   - popup.html body: width 360px, min-height 480px, overflow hidden
   - Use flexbox/grid for layouts — never float
   - Add proper padding: 20px sides
   - Header section with icon + title
   - Scrollable content area if needed

6. ICONS:
   - Use inline SVGs — never external icon libraries
   - Create clean, minimal SVG icons for actions
   - Size: 16x16 or 20x20 for UI, 24x24 for feature icons

7. MICRO-INTERACTIONS:
   - Toggle switches: smooth sliding animation
   - List items: hover highlight with left border accent
   - Notifications/toasts: slide in from top-right
   - Tab switching: sliding indicator

8. EXTENSION-SPECIFIC PATTERNS:
   - Status indicators: colored dot + label (green=active, red=paused)
   - Site counter: large number display with label
   - Toggle on/off: prominent switch in header
   - Stats grid: 2x2 or 1x3 metric cards

EXAMPLE POPUP STRUCTURE:
popup.html should always have:
- A branded header (logo/icon + extension name + status dot)
- Primary action area (the main feature)
- Secondary controls or settings
- Clean footer with version or links

MANIFEST V3 RULES:
- manifest_version must be 3
- Use service_worker for background (not scripts)
- Content Security Policy if needed
- All referenced files must be created
- All generated code MUST use the standard 'browser.*' API namespace instead of 'chrome.*' for cross-browser compatibility
- Do NOT use inline scripts in HTML files — always put script logic in separate JS files (required for CSP)
- Do NOT use frameworks like WXT or Plasmo
- When outputting a file, write the COMPLETE, FULL code — no placeholders or "// rest of code" comments

DEBUGGING & SELF-HEALING RULES:
- If the user presents a runtime error, analyze the stack trace and existing code carefully
- Common extension issues: async onMessage listeners not returning true, missing host_permissions, missing files, inline script CSP violations
- Do NOT rewrite the entire extension — only fix the specific files needed
- PERSISTENT ERRORS: If a fix already failed, try a completely different approach and say so explicitly

OUTPUT EVERY FILE needed: manifest.json, popup.html, popup.css, popup.js, 
background.js (if needed), content.js (if needed), options.html (if needed).

Make every extension look like it belongs on the Chrome Web Store featured section.`;

export async function generateExtension(
  prompt: string,
  files: Record<string, string>,
  history: { role: "user" | "assistant"; content: string; feedback?: "liked" | "disliked" }[],
  onEvent: (event: StreamEvent) => void
): Promise<{ files: Record<string, string> }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API Key is not configured. Please add your OPENROUTER_API_KEY to server/.env");
  }

  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT }
  ];

  // 1. Format current filesystem state as the initial context
  let filesystemContext = "Here is the current state of the virtual filesystem:\n";
  if (Object.keys(files).length === 0) {
    filesystemContext += "(The filesystem is currently empty. Please create the initial files.)";
  } else {
    for (const [path, content] of Object.entries(files)) {
      filesystemContext += `\n--- FILE: ${path} ---\n${content}\n`;
    }
  }
  messages.push({ role: "user", content: filesystemContext });

  // Acknowledgment to align with turn-taking
  messages.push({
    role: "assistant",
    content: "Understood. I have loaded the virtual filesystem state. How can I help you?",
  });

  // 2. Add conversation history
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    let text = msg.content;
    if (msg.role === "assistant" && msg.feedback === "disliked") {
      text += "\n\n[USER FEEDBACK: The user disliked this response. It did not work or was incorrect. Please analyze what was wrong with the code/logic generated in this turn, and take a completely different approach in your next turn. Do not repeat the same coding mistakes or architecture.]";
    } else if (msg.role === "assistant" && msg.feedback === "liked") {
      text += "\n\n[USER FEEDBACK: The user liked this response. This approach is correct and working. Build upon this base.]";
    }
    messages.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: text,
    });
  }

  // 3. Add current user prompt
  messages.push({
    role: "user",
    content: prompt,
  });

  const parser = new XmlStreamParser();

  try {
    return await executeCompletion(openrouter, messages, parser, onEvent);
  } catch (error: any) {
    console.warn("[OpenRouter] Primary API key failed. Error:", error.message || error);
    
    if (process.env.GROQ_API_KEY) {
      console.warn("[LLM Fallback] Switching silently to Groq API...");
      const groqClient = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });
      const groqParser = new XmlStreamParser();
      try {
        return await executeCompletion(groqClient, messages, groqParser, onEvent, "llama-3.3-70b-versatile");
      } catch (groqErr) {
        console.error("Groq Fallback API Error:", groqErr);
        // Continue to backup OpenRouter if Groq fails
      }
    }

    console.warn("[OpenRouter] Switching silently to fallback key...");
    const fallbackClient = new OpenAI({
      apiKey: FALLBACK_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://github.com/OpenExtensionCraft",
        "X-Title": "ExtensionCraft",
      },
    });

    const fallbackParser = new XmlStreamParser();
    try {
      return await executeCompletion(fallbackClient, messages, fallbackParser, onEvent);
    } catch (fallbackErr) {
      console.error("OpenRouter Fallback API Error:", fallbackErr);
      throw fallbackErr;
    }
  }
}

const FALLBACK_API_KEY = process.env.OPENROUTER_API_KEY || "";

async function executeCompletion(
  client: OpenAI,
  messages: any[],
  parser: XmlStreamParser,
  onEvent: (event: StreamEvent) => void,
  model = "google/gemini-2.5-flash"
): Promise<{ files: Record<string, string> }> {
  const responseStream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
    temperature: 0.2,
    max_tokens: model.includes("gemini") ? 2048 : 4096,
  });

  for await (const chunk of responseStream) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) {
      const events = parser.push(text);
      for (const event of events) {
        onEvent(event);
      }
    }
  }

  // Flush any remaining buffered content
  const finalEvents = parser.flush();
  for (const event of finalEvents) {
    onEvent(event);
  }

  return {
    files: parser.getFiles(),
  };
}
