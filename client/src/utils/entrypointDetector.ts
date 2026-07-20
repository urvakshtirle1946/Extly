export interface DetectedEntrypoint {
  type: 'popup' | 'sidepanel' | 'devtools' | 'options' | 'content' | 'background' | 'sandbox'
  filePath: string
  title: string
  valid: boolean
  description?: string
}

/**
 * Addfox & WXT-inspired Multi-Entrypoint Detector for Client IDE
 */
export function detectClientEntrypoints(files: Record<string, string>): DetectedEntrypoint[] {
  const entrypoints: DetectedEntrypoint[] = []
  const fileKeys = Object.keys(files)

  // 1. Popup
  const popupPath = fileKeys.find((f) =>
    ['popup.html', 'entrypoints/popup/index.html', 'entrypoints/popup.html', 'src/popup.html'].includes(f)
  )
  if (popupPath) {
    entrypoints.push({
      type: 'popup',
      filePath: popupPath,
      title: 'Action Popup',
      valid: true,
      description: 'Modal UI opened from extension toolbar icon',
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
      title: 'Side Panel',
      valid: true,
      description: 'Persistent sidebar UI attached to browser tab',
    })
  }

  // 3. DevTools
  const devtoolsPath = fileKeys.find((f) =>
    ['devtools.html', 'entrypoints/devtools/index.html', 'entrypoints/devtools.html', 'src/devtools.html'].includes(f)
  )
  if (devtoolsPath) {
    entrypoints.push({
      type: 'devtools',
      filePath: devtoolsPath,
      title: 'DevTools Panel',
      valid: true,
      description: 'Custom Developer Tools inspect tab',
    })
  }

  // 4. Options
  const optionsPath = fileKeys.find((f) =>
    ['options.html', 'entrypoints/options/index.html', 'entrypoints/options.html', 'src/options.html'].includes(f)
  )
  if (optionsPath) {
    entrypoints.push({
      type: 'options',
      filePath: optionsPath,
      title: 'Options Page',
      valid: true,
      description: 'Settings and user configuration page',
    })
  }

  // 5. Background Worker
  const bgPath = fileKeys.find((f) =>
    ['background.js', 'background.ts', 'entrypoints/background.ts', 'entrypoints/background.js', 'src/background.js'].includes(f)
  )
  if (bgPath) {
    entrypoints.push({
      type: 'background',
      filePath: bgPath,
      title: 'Service Worker',
      valid: true,
      description: 'MV3 Background Service Worker script',
    })
  }

  // 6. Content Scripts
  const contentPaths = fileKeys.filter((f) =>
    ['content.js', 'content.ts', 'entrypoints/content.ts', 'entrypoints/content.js', 'src/content.js'].includes(f) ||
    f.startsWith('content_scripts/') ||
    (f.includes('content') && (f.endsWith('.js') || f.endsWith('.ts')))
  )
  contentPaths.forEach((cp) => {
    entrypoints.push({
      type: 'content',
      filePath: cp,
      title: `Content Script`,
      valid: true,
      description: `Injected script: ${cp}`,
    })
  })

  return entrypoints
}
