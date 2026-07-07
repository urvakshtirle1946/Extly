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

Make every extension look like it belongs on the Chrome Web Store featured section.

DEFAULT UI TEMPLATE — ALWAYS USE THIS unless the user explicitly describes their own design/colors/layout in the prompt:

Every extension popup must use this exact default design system:

popup.html structure:
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #0f0f11;
      --surface: #1a1a1f;
      --surface-2: #222228;
      --border: rgba(255,255,255,0.08);
      --border-hover: rgba(255,255,255,0.15);
      --text: #f4f4f5;
      --text-muted: #71717a;
      --text-dim: #52525b;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --accent-glow: rgba(99,102,241,0.25);
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --radius: 10px;
      --radius-sm: 6px;
    }

    body {
      width: 360px;
      min-height: 480px;
      max-height: 600px;
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 13px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: fadeUp 0.25s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 14px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo {
      width: 28px;
      height: 28px;
      background: var(--accent);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      box-shadow: 0 0 12px var(--accent-glow);
      flex-shrink: 0;
    }

    .app-name {
      font-weight: 700;
      font-size: 14px;
      color: var(--text);
      letter-spacing: -0.3px;
    }

    .app-tagline {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      background: rgba(34,197,94,0.08);
      border: 1px solid rgba(34,197,94,0.2);
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      color: var(--success);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* ── Main Content ── */
    .content {
      flex: 1;
      padding: 16px 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .content::-webkit-scrollbar { width: 4px; }
    .content::-webkit-scrollbar-track { background: transparent; }
    .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    /* ── Stat Cards ── */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
      transition: border-color 0.2s, background 0.2s;
    }

    .stat-card:hover {
      border-color: var(--border-hover);
      background: var(--surface-2);
    }

    .stat-label {
      font-size: 10px;
      color: var(--text-muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.5px;
      line-height: 1;
    }

    .stat-sub {
      font-size: 10px;
      color: var(--text-dim);
      margin-top: 4px;
    }

    /* ── Section ── */
    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* ── List Items ── */
    .list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 11px 14px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s;
      cursor: pointer;
    }

    .list-item:last-child { border-bottom: none; }

    .list-item:hover { background: var(--surface-2); }

    .list-item-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .item-icon {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .item-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--text);
    }

    .item-sub {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .item-value {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
    }

    /* ── Buttons ── */
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
      width: 100%;
      box-shadow: 0 2px 12px var(--accent-glow);
    }

    .btn-primary:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 20px var(--accent-glow);
    }

    .btn-primary:active { transform: scale(0.98); }

    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      width: 100%;
    }

    .btn-secondary:hover {
      background: var(--surface-2);
      border-color: var(--border-hover);
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
      padding: 6px 10px;
      font-size: 11px;
    }

    .btn-ghost:hover { color: var(--text); background: var(--surface-2); }

    /* ── Toggle Switch ── */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
    }

    .toggle-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text);
    }

    .toggle-sub {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .toggle {
      position: relative;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }

    .toggle input { opacity: 0; width: 0; height: 0; }

    .toggle-slider {
      position: absolute;
      inset: 0;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.25s;
    }

    .toggle-slider:before {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
      left: 2px;
      top: 2px;
      background: var(--text-muted);
      border-radius: 50%;
      transition: all 0.25s;
    }

    .toggle input:checked + .toggle-slider {
      background: var(--accent);
      border-color: var(--accent);
    }

    .toggle input:checked + .toggle-slider:before {
      transform: translateX(16px);
      background: white;
    }

    /* ── Input ── */
    .input-group {
      display: flex;
      gap: 8px;
    }

    .input {
      flex: 1;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 9px 12px;
      color: var(--text);
      font-size: 12px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    .input::placeholder { color: var(--text-dim); }

    /* ── Footer ── */
    .footer {
      padding: 12px 18px;
      border-top: 1px solid var(--border);
      background: var(--surface);
      display: flex;
      gap: 8px;
    }

    /* ── Empty State ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      text-align: center;
      gap: 10px;
    }

    .empty-icon {
      font-size: 32px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }

    .empty-sub {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* ── Progress Bar ── */
    .progress-bar {
      height: 4px;
      background: var(--surface-2);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-hover));
      border-radius: 999px;
      transition: width 0.5s ease;
    }

    /* ── Tag/Badge ── */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
    }

    .badge-default {
      background: var(--surface-2);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .badge-accent {
      background: rgba(99,102,241,0.12);
      color: var(--accent-hover);
      border: 1px solid rgba(99,102,241,0.2);
    }
  </style>
</head>
<body>
  <!-- IMPORTANT: Customize the actual content below based on what the 
       extension does. Use the CSS classes above for all UI elements.
       The structure, colors, fonts, and components are fixed — 
       only the content, icons, labels, and functionality change. -->

  <div class="header">
    <div class="header-left">
      <div class="logo">⚡</div>
      <div>
        <div class="app-name">Extension Name</div>
        <div class="app-tagline">Short description here</div>
      </div>
    </div>
    <div class="status-badge">
      <div class="status-dot"></div>
      Active
    </div>
  </div>

  <div class="content">
    <!-- Add your extension-specific content here using the classes above -->
  </div>

  <div class="footer">
    <button class="btn btn-secondary">Settings</button>
    <button class="btn btn-primary">Main Action</button>
  </div>
</body>
</html>

RULES FOR USING THIS TEMPLATE:
1. ALWAYS use this exact CSS — colors, fonts, spacing, border-radius
2. ONLY change: content inside .content, button labels, app-name, 
   logo emoji, status text — based on what the extension actually does
3. For stats: use .stats-grid + .stat-card
4. For lists: use .section + .list-item  
5. For settings/toggles: use .toggle-row + .toggle
6. For search/input: use .input-group + .input + .btn
7. NEVER use different colors, fonts, or border-radius values
8. If extension has NO popup (background only): still create a minimal 
   popup.html using this template showing the extension status`;

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
