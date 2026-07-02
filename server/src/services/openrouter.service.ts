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

const SYSTEM_PROMPT = `You are an expert AI assistant specializing in building Chrome browser extensions using Manifest V3.
You generate raw, clean, and fully functional Manifest V3 extensions based on the user's request.

CRITICAL RULES:
1. All generated code MUST use the standard 'browser.*' API namespace instead of the Chrome-specific 'chrome.*' namespace to ensure cross-browser compatibility. We automatically inject 'webextension-polyfill' in the final package.
2. Every file you generate or modify MUST be enclosed within custom XML tags in the format:
   <file path="relative/path/to/file.js">
   file content here
   </file>
3. Do NOT use inline scripts in HTML files (like popup.html). Always put script logic in a separate JS file (like popup.js) and include it via <script src="popup.js"></script>. This is required for Content Security Policy (CSP) in Manifest V3.
4. Use standard, raw Manifest V3 structures. Do NOT use frameworks like WXT or Plasmo.
5. In manifest.json, ensure:
   - "manifest_version": 3 is set.
   - All referenced files (popup.html, background.js, content.js, icons) actually exist in the file list.
   - Correct permissions and host_permissions are requested.
   - Under "background", use "service_worker": "background.js" (do NOT use "scripts" or "page").
6. When outputting a file inside the <file> tag, you MUST write the COMPLETE, FULL code of the file. You are STRICTLY FORBIDDEN from using placeholders, snippets, or comments like "// ... rest of the code remains the same" or "// existing imports...". The file content you provide will completely overwrite the existing file on the disk, so it must be 100% complete, functional, and self-contained.

DEBUGGING & SELF-HEALING RULES:
1. If the user presents a runtime error or exception (e.g. from the background worker, popup, or page console), carefully analyze the stack trace and the existing code in the virtual filesystem.
2. Identify the root cause. Common extension issues include:
   - Asynchronous 'browser.runtime.onMessage' listeners not returning 'true' (which closes the message channel before sendResponse is called).
   - Missing 'host_permissions' in 'manifest.json' for external API fetch calls.
   - Missing files or incorrect paths in manifest.json.
   - Inline script violations in HTML files.
3. Do NOT rewrite the entire extension. Only modify the specific files and lines necessary to fix the bug, preserving the rest of the working code.
4. Explain the root cause of the error clearly and how your changes resolve it.
5. PERSISTENT/REPEATED ERRORS: If the conversation history shows you already tried to fix this exact error (or a very similar one) but it is still appearing, it means your previous approach failed. You MUST NOT repeat the same code changes or logic. Analyze why it failed, and try a completely different approach (e.g., use a different API, bypass the failing library, simplify the code, add robust fallbacks, or change the architecture). Explicitly mention that you are taking a different approach.

Always provide a brief, friendly explanation of your changes before and after the file blocks, explaining what you built and how it works.`;

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
    const isLimitError = 
      error.status === 429 || // Rate limit
      error.status === 402 || // Insufficient credits / Out of balance
      error.status === 401 || // Key invalid / expired
      (error.message && (
        error.message.toLowerCase().includes("limit") ||
        error.message.toLowerCase().includes("exceed") ||
        error.message.toLowerCase().includes("quota") ||
        error.message.toLowerCase().includes("credit") ||
        error.message.toLowerCase().includes("balance") ||
        error.message.toLowerCase().includes("payment")
      ));

    if (isLimitError) {
      console.warn("[OpenRouter] Primary API key limits exceeded or key invalid. Switching silently to fallback key...");
      
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
    } else {
      console.error("OpenRouter API Error:", error);
      throw error;
    }
  }
}

const FALLBACK_API_KEY = process.env.OPENROUTER_API_KEY || "";

async function executeCompletion(
  client: OpenAI,
  messages: any[],
  parser: XmlStreamParser,
  onEvent: (event: StreamEvent) => void
): Promise<{ files: Record<string, string> }> {
  const responseStream = await client.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages,
    stream: true,
    temperature: 0.2,
    max_tokens: 2048,
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
