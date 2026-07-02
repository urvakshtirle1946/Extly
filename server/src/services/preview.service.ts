import { chromium, BrowserContext, Page } from 'playwright'
import fs from 'fs'
import path from 'path'

export interface PreviewEvent {
  type: 'log' | 'error' | 'screenshot' | 'status'
  message?: string
  severity?: 'info' | 'warning' | 'error' | 'log'
  data?: string // Base64 screenshot or status details
  timestamp: string
}

interface PreviewSession {
  id: string
  projectId: string
  context: BrowserContext
  page: Page
  tempDir: string
  listeners: ((event: PreviewEvent) => void)[]
  eventsHistory: PreviewEvent[]
}

const activeSessions = new Map<string, PreviewSession>()

const getPolyfillContent = (sessionId: string, backendUrl: string) => `
// ExtensionCraft Lightweight Promise-based WebExtension Polyfill
const SESSION_ID = "${sessionId}";
const BACKEND_URL = "${backendUrl}";

// Intercept console logs and errors to send to the backend preview session
const _log = console.log;
const _warn = console.warn;
const _error = console.error;

function sendLogToBackend(severity, msg) {
  _log("[Preview Log Sync]", severity, msg);
  fetch(BACKEND_URL + "/api/preview/" + SESSION_ID + "/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ severity, message: msg })
  }).catch(() => {});
}

console.log = (...args) => {
  _log(...args);
  sendLogToBackend("log", args.join(" "));
};

console.warn = (...args) => {
  _warn(...args);
  sendLogToBackend("warning", args.join(" "));
};

console.error = (...args) => {
  _error(...args);
  sendLogToBackend("error", args.join(" "));
};

// Intercept global window errors
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    sendLogToBackend("error", "[Unhandled Exception] " + event.message + " at " + event.filename + ":" + event.lineno);
  });
  window.addEventListener("unhandledrejection", (event) => {
    sendLogToBackend("error", "[Unhandled Promise Rejection] " + (event.reason ? event.reason.message || event.reason : ""));
  });
} else if (typeof self !== "undefined") {
  // Intercept Service Worker errors
  self.addEventListener("error", (event) => {
    sendLogToBackend("error", "[Background Worker Exception] " + event.message);
  });
  self.addEventListener("unhandledrejection", (event) => {
    sendLogToBackend("error", "[Background Worker Promise Rejection] " + (event.reason ? event.reason.message || event.reason : ""));
  });
}

if (typeof browser === "undefined") {
  if (typeof chrome !== "undefined" && chrome.runtime) {
    const promisify = (fn) => (...args) => new Promise((resolve, reject) => {
      fn(...args, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });

    window.browser = new Proxy(chrome, {
      get(target, prop) {
        if (typeof target[prop] === 'object' && target[prop] !== null) {
          return new Proxy(target[prop], {
            get(subTarget, subProp) {
              if (typeof subTarget[subProp] === 'function') {
                // List of synchronous APIs that should not be promisified
                const syncApis = ['addListener', 'removeListener', 'hasListener', 'getURL', 'getManifest'];
                if (syncApis.includes(subProp)) {
                  return subTarget[subProp].bind(subTarget);
                }
                return promisify(subTarget[subProp].bind(subTarget));
              }
              return subTarget[subProp];
            }
          });
        }
        return target[prop];
      }
    });
  }
}
`

export async function startPreviewSession(
  projectId: string,
  files: Record<string, string>,
  backendUrl: string
): Promise<string> {
  const sessionId = Math.random().toString(36).substring(2, 15)
  const tempDir = path.join(process.cwd(), 'temp-extensions', sessionId)

  // 1. Create temp directory recursively
  fs.mkdirSync(tempDir, { recursive: true })

  // 2. Parse and validate manifest.json
  if (!files['manifest.json']) {
    throw new Error('Missing manifest.json in virtual filesystem')
  }

  let manifest: any
  try {
    manifest = JSON.parse(files['manifest.json'])
  } catch (e) {
    throw new Error('manifest.json is not valid JSON')
  }

  // 3. Write files & inject polyfill
  // Write the polyfill file
  fs.writeFileSync(path.join(tempDir, 'browser-polyfill.js'), getPolyfillContent(sessionId, backendUrl))

  // Inject polyfill in background service worker
  if (manifest.background && manifest.background.service_worker) {
    const swPath = manifest.background.service_worker
    if (files[swPath]) {
      const swContent = `importScripts('browser-polyfill.js');\n` + files[swPath]
      
      // Ensure parent directories of the service worker exist
      const swFullPath = path.join(tempDir, swPath)
      fs.mkdirSync(path.dirname(swFullPath), { recursive: true })
      fs.writeFileSync(swFullPath, swContent)
    }
  }

  // Inject polyfill in content scripts
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script: any) => {
      if (script.js) {
        script.js.unshift('browser-polyfill.js')
      }
    })
  }

  // Write HTML files with polyfill script tag, and write all other files
  for (const [filePath, content] of Object.entries(files)) {
    if (filePath === 'manifest.json') continue
    if (manifest.background && filePath === manifest.background.service_worker) continue

    const fullPath = path.join(tempDir, filePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })

    if (filePath.endsWith('.html')) {
      const injectedHtml = content.replace(
        '<head>',
        '<head><script src="browser-polyfill.js"></script>'
      )
      fs.writeFileSync(fullPath, injectedHtml)
    } else {
      fs.writeFileSync(fullPath, content)
    }
  }

  // Write the modified manifest
  fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // 4. Launch Playwright Chromium with the extension loaded
  const context = await chromium.launchPersistentContext(path.join(tempDir, 'profile'), {
    headless: false, // Extensions only load in headed mode
    args: [
      `--disable-extensions-except=${tempDir}`,
      `--load-extension=${tempDir}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  })

  // Open a test page
  const page = await context.newPage()
  await page.goto('https://example.com')

  const session: PreviewSession = {
    id: sessionId,
    projectId,
    context,
    page,
    tempDir,
    listeners: [],
    eventsHistory: [],
  }

  // 5. Set up event listeners to capture logs, errors, and screenshots
  const logEvent = (event: Omit<PreviewEvent, 'timestamp'>) => {
    const fullEvent: PreviewEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }
    session.eventsHistory.push(fullEvent)
    session.listeners.forEach((listener) => listener(fullEvent))
  }

  // Capture Page console logs
  page.on('console', (msg) => {
    logEvent({
      type: 'log',
      message: `[Page Console] ${msg.text()}`,
      severity: msg.type() as any,
    })
  })

  // Capture Page errors
  page.on('pageerror', (err) => {
    logEvent({
      type: 'error',
      message: `[Page Error] ${err.message}`,
      severity: 'error',
    })
  })

  // Capture Background Service Worker logs & events
  context.on('serviceworker', (worker) => {
    logEvent({
      type: 'status',
      message: `Background Service Worker detected: ${worker.url()}`,
      severity: 'info',
    })
  })

  // Periodically take screenshots of the page
  const takeScreenshot = async () => {
    if (page.isClosed()) return
    try {
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 })
      logEvent({
        type: 'screenshot',
        data: screenshot.toString('base64'),
      })
    } catch (e) {
      // Ignore screenshot failures if page is navigating or closing
    }
  }

  // Take initial screenshot
  setTimeout(takeScreenshot, 1500)

  // Take screenshot on navigation or DOM mutations
  page.on('framenavigated', () => {
    logEvent({
      type: 'status',
      message: `Navigated to ${page.url()}`,
      severity: 'info',
    })
    setTimeout(takeScreenshot, 1000)
  })

  // Set interval for periodic screenshots (every 5 seconds)
  const screenshotInterval = setInterval(takeScreenshot, 5000)

  // Handle page closing
  page.on('close', () => {
    clearInterval(screenshotInterval)
    logEvent({
      type: 'status',
      message: 'Preview tab closed',
      severity: 'warning',
    })
  })

  activeSessions.set(sessionId, session)

  logEvent({
    type: 'status',
    message: 'Preview environment initialized successfully',
    severity: 'info',
  })

  return sessionId
}

export function getSession(sessionId: string): PreviewSession | undefined {
  return activeSessions.get(sessionId)
}

export async function stopPreviewSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId)
  if (!session) return

  try {
    // Close browser context
    await session.context.close()
  } catch (e) {
    console.error('Error closing Playwright context:', e)
  }

  // Delete temp directory
  try {
    fs.rmSync(session.tempDir, { recursive: true, force: true })
  } catch (e) {
    console.error('Error removing temp directory:', e)
  }

  activeSessions.delete(sessionId)
}
