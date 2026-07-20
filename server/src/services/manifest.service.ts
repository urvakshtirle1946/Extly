export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface DetectedEntrypoint {
  type: 'popup' | 'sidepanel' | 'devtools' | 'options' | 'content' | 'background' | 'sandbox'
  filePath: string
  title: string
  valid: boolean
  description?: string
}

/**
 * Validates manifest.json structure and file dependencies.
 */
export function validateManifest(files: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = []

  // 1. Check if manifest.json exists
  if (!files['manifest.json']) {
    errors.push({
      field: 'manifest.json',
      message: 'Missing manifest.json file in the root directory.',
      severity: 'error',
    })
    return errors
  }

  // 2. Parse JSON
  let manifest: any
  try {
    manifest = JSON.parse(files['manifest.json'])
  } catch (e) {
    errors.push({
      field: 'manifest.json',
      message: 'manifest.json is not valid JSON.',
      severity: 'error',
    })
    return errors
  }

  // 3. Verify manifest_version
  if (manifest.manifest_version !== 3) {
    errors.push({
      field: 'manifest_version',
      message: `manifest_version must be 3 (received: ${manifest.manifest_version || 'none'}).`,
      severity: 'error',
    })
  }

  // 4. Verify required fields
  if (!manifest.name || typeof manifest.name !== 'string' || !manifest.name.trim()) {
    errors.push({
      field: 'name',
      message: 'Required field "name" is missing or empty.',
      severity: 'error',
    })
  }

  if (!manifest.version || typeof manifest.version !== 'string' || !manifest.version.trim()) {
    errors.push({
      field: 'version',
      message: 'Required field "version" is missing or empty.',
      severity: 'error',
    })
  }

  // 5. Verify service worker
  if (manifest.background && manifest.background.service_worker) {
    const swPath = manifest.background.service_worker
    if (!files[swPath]) {
      errors.push({
        field: 'background.service_worker',
        message: `Background service worker file "${swPath}" does not exist in the project.`,
        severity: 'error',
      })
    }
  }

  // 6. Verify popup
  if (manifest.action && manifest.action.default_popup) {
    const popupPath = manifest.action.default_popup
    if (!files[popupPath]) {
      errors.push({
        field: 'action.default_popup',
        message: `Popup HTML file "${popupPath}" does not exist in the project.`,
        severity: 'error',
      })
    }
  }

  // 7. Verify content scripts
  if (manifest.content_scripts && Array.isArray(manifest.content_scripts)) {
    manifest.content_scripts.forEach((script: any, idx: number) => {
      if (script.js && Array.isArray(script.js)) {
        script.js.forEach((jsPath: string) => {
          if (!files[jsPath] && jsPath !== 'browser-polyfill.js') {
            errors.push({
              field: `content_scripts[${idx}].js`,
              message: `Content script JS file "${jsPath}" does not exist in the project.`,
              severity: 'error',
            })
          }
        })
      }
      if (script.css && Array.isArray(script.css)) {
        script.css.forEach((cssPath: string) => {
          if (!files[cssPath]) {
            errors.push({
              field: `content_scripts[${idx}].css`,
              message: `Content script CSS file "${cssPath}" does not exist in the project.`,
              severity: 'error',
            })
          }
        })
      }
    })
  }

  // 8. Verify icons
  if (manifest.icons && typeof manifest.icons === 'object') {
    Object.entries(manifest.icons).forEach(([size, iconPath]) => {
      if (typeof iconPath === 'string' && !files[iconPath]) {
        errors.push({
          field: `icons.${size}`,
          message: `Icon file "${iconPath}" (size ${size}) does not exist in the project.`,
          severity: 'warning',
        })
      }
    })
  }

  // 9. Verify host permissions format
  if (manifest.host_permissions && Array.isArray(manifest.host_permissions)) {
    const matchPatternRegex = /^(\*|https?|file|ftp):\/\/(\*|\*\.[^/]+|[^/]+)\/.*$/
    manifest.host_permissions.forEach((perm: string, idx: number) => {
      if (perm !== '<all_urls>' && !matchPatternRegex.test(perm)) {
        errors.push({
          field: `host_permissions[${idx}]`,
          message: `Host permission "${perm}" is not a valid match pattern.`,
          severity: 'warning',
        })
      }
    })
  }

  return errors
}

/**
 * Addfox & WXT-inspired Multi-Entrypoint Detection Engine
 * Scans files to discover popup, sidepanel, devtools, options, content scripts, and service workers.
 */
export function detectMultiEntrypoints(files: Record<string, string>): DetectedEntrypoint[] {
  const entrypoints: DetectedEntrypoint[] = []

  const fileKeys = Object.keys(files)

  // 1. Action Popup
  const popupPath = fileKeys.find((f) =>
    ['popup.html', 'entrypoints/popup/index.html', 'entrypoints/popup.html', 'src/popup.html'].includes(f)
  )
  if (popupPath) {
    entrypoints.push({
      type: 'popup',
      filePath: popupPath,
      title: 'Action Popup UI',
      valid: true,
      description: 'Modal interface shown when extension icon is clicked',
    })
  }

  // 2. Side Panel
  const sidepanelPath = fileKeys.find((f) =>
    ['sidepanel.html', 'entrypoints/sidepanel/index.html', 'entrypoints/sidepanel.html', 'src/sidepanel.html'].includes(f)
  )
  if (sidepanelPath) {
    entrypoints.push({
      type: 'sidepanel',
      filePath: sidepanelPath,
      title: 'Side Panel UI',
      valid: true,
      description: 'Persistent side panel UI attached to browser window',
    })
  }

  // 3. DevTools Panel
  const devtoolsPath = fileKeys.find((f) =>
    ['devtools.html', 'entrypoints/devtools/index.html', 'entrypoints/devtools.html', 'src/devtools.html'].includes(f)
  )
  if (devtoolsPath) {
    entrypoints.push({
      type: 'devtools',
      filePath: devtoolsPath,
      title: 'Developer Tools Panel',
      valid: true,
      description: 'Custom inspect panel integrated into Browser DevTools',
    })
  }

  // 4. Options Page
  const optionsPath = fileKeys.find((f) =>
    ['options.html', 'entrypoints/options/index.html', 'entrypoints/options.html', 'src/options.html'].includes(f)
  )
  if (optionsPath) {
    entrypoints.push({
      type: 'options',
      filePath: optionsPath,
      title: 'Extension Options Page',
      valid: true,
      description: 'Dedicated settings / preferences configuration page',
    })
  }

  // 5. Background Service Worker
  const bgPath = fileKeys.find((f) =>
    ['background.js', 'background.ts', 'entrypoints/background.ts', 'entrypoints/background.js', 'src/background.js'].includes(f)
  )
  if (bgPath) {
    entrypoints.push({
      type: 'background',
      filePath: bgPath,
      title: 'Background Service Worker',
      valid: true,
      description: 'Event-driven MV3 background service worker',
    })
  }

  // 6. Content Script(s)
  const contentPaths = fileKeys.filter((f) =>
    ['content.js', 'content.ts', 'entrypoints/content.ts', 'entrypoints/content.js', 'src/content.js'].includes(f) ||
    f.startsWith('content_scripts/') ||
    (f.includes('content') && (f.endsWith('.js') || f.endsWith('.ts')))
  )
  contentPaths.forEach((cp) => {
    entrypoints.push({
      type: 'content',
      filePath: cp,
      title: `Content Script (${cp})`,
      valid: true,
      description: 'Injected script running in webpage DOM context',
    })
  })

  return entrypoints
}

/**
 * WXT-inspired Manifest Auto-Generation Logic
 * Analyzes code dependencies and file tree to build or complete a valid MV3 manifest.json.
 */
export function autoGenerateManifest(
  files: Record<string, string>,
  projectName: string = 'ExtensionCraft Extension'
): Record<string, any> {
  let manifest: any = {}

  if (files['manifest.json']) {
    try {
      manifest = JSON.parse(files['manifest.json'])
    } catch (e) {
      manifest = {}
    }
  }

  manifest.manifest_version = 3
  if (!manifest.name) manifest.name = projectName
  if (!manifest.version) manifest.version = '1.0.0'
  if (!manifest.description) manifest.description = 'Manifest V3 Browser Extension generated by ExtensionCraft'

  const entrypoints = detectMultiEntrypoints(files)

  // Auto-configure Action Popup
  const popupEntry = entrypoints.find((e) => e.type === 'popup')
  if (popupEntry) {
    manifest.action = manifest.action || {}
    manifest.action.default_popup = popupEntry.filePath
  }

  // Auto-configure Side Panel
  const sidepanelEntry = entrypoints.find((e) => e.type === 'sidepanel')
  if (sidepanelEntry) {
    manifest.side_panel = manifest.side_panel || { default_path: sidepanelEntry.filePath }
  }

  // Auto-configure DevTools
  const devtoolsEntry = entrypoints.find((e) => e.type === 'devtools')
  if (devtoolsEntry) {
    manifest.devtools_page = devtoolsEntry.filePath
  }

  // Auto-configure Options Page
  const optionsEntry = entrypoints.find((e) => e.type === 'options')
  if (optionsEntry) {
    manifest.options_ui = manifest.options_ui || { page: optionsEntry.filePath, open_in_tab: true }
  }

  // Auto-configure Background Service Worker
  const bgEntry = entrypoints.find((e) => e.type === 'background')
  if (bgEntry) {
    manifest.background = { service_worker: bgEntry.filePath, type: 'module' }
  }

  // Auto-configure Content Scripts
  const contentEntries = entrypoints.filter((e) => e.type === 'content')
  if (contentEntries.length > 0 && (!manifest.content_scripts || manifest.content_scripts.length === 0)) {
    manifest.content_scripts = [
      {
        matches: ['<all_urls>'],
        js: contentEntries.map((e) => e.filePath),
        run_at: 'document_idle',
      },
    ]
  }

  // Auto-infer required permissions from code signatures across all files
  const permissionsSet = new Set<string>(manifest.permissions || [])

  const combinedCode = Object.values(files).join('\n')

  if (combinedCode.includes('chrome.storage') || combinedCode.includes('browser.storage') || combinedCode.includes('ExtensionStorage')) {
    permissionsSet.add('storage')
  }
  if (combinedCode.includes('chrome.tabs') || combinedCode.includes('browser.tabs')) {
    permissionsSet.add('activeTab')
  }
  if (combinedCode.includes('chrome.scripting') || combinedCode.includes('browser.scripting')) {
    permissionsSet.add('scripting')
  }
  if (combinedCode.includes('chrome.alarms') || combinedCode.includes('browser.alarms')) {
    permissionsSet.add('alarms')
  }
  if (combinedCode.includes('chrome.sidePanel') || sidepanelEntry) {
    permissionsSet.add('sidePanel')
  }
  if (combinedCode.includes('chrome.declarativeNetRequest') || combinedCode.includes('declarativeNetRequest')) {
    permissionsSet.add('declarativeNetRequest')
  }
  if (combinedCode.includes('chrome.contextMenus')) {
    permissionsSet.add('contextMenus')
  }

  manifest.permissions = Array.from(permissionsSet)

  if (!manifest.host_permissions && combinedCode.includes('fetch(')) {
    manifest.host_permissions = ['<all_urls>']
  }

  return manifest
}
