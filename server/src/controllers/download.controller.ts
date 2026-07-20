import { Response } from 'express'
import { validateManifest, autoGenerateManifest } from '../services/manifest.service'
import { lintExtension, buildExtension } from '../services/webext.service'
import { generateCICDWorkflows } from '../services/cicd.service'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import {
  RUNTIME_STORAGE_HELPER,
  RUNTIME_MESSAGING_HELPER,
  RUNTIME_SHADOWDOM_HELPER,
  RUNTIME_CSUI_HELPER,
} from '../utils/extensionHelpers'
import fs from 'fs'
import path from 'path'

const POLYFILL_CONTENT = `
// ExtensionCraft Lightweight Promise-based WebExtension Polyfill
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

export async function handleDownload(req: AuthenticatedRequest, res: Response) {
  const projectId = req.body.projectId as string
  const files = req.body.files as Record<string, string>
  const userId = req.user?.id

  if (!projectId || !files) {
    return res.status(400).json({ error: 'Missing projectId or files' })
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const tempId = `${projectId}_${Date.now()}`
  const tempDir = path.join(process.cwd(), 'temp-downloads', tempId, 'extension')
  const artifactsDir = path.join(process.cwd(), 'temp-downloads', tempId, 'artifacts')

  try {
    // Verify ownership
    const projectCheck = await db.query(
      'SELECT id, name FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    const projectName = projectCheck.rows[0].name || 'extension'

    // 1. Custom Manifest Validation & Auto-Generation Fallback (WXT pattern)
    let manifest: any
    const manifestErrors = validateManifest(files)
    const criticalErrors = manifestErrors.filter((err) => err.severity === 'error')

    if (criticalErrors.length > 0 || !files['manifest.json']) {
      manifest = autoGenerateManifest(files, projectName)
    } else {
      manifest = JSON.parse(files['manifest.json'])
    }

    // Create directories
    fs.mkdirSync(tempDir, { recursive: true })
    fs.mkdirSync(path.join(tempDir, 'utils'), { recursive: true })

    // 2. Write runtime helper libraries (Plasmo & Addfox patterns)
    fs.writeFileSync(path.join(tempDir, 'browser-polyfill.js'), POLYFILL_CONTENT)
    fs.writeFileSync(path.join(tempDir, 'utils', 'storage.js'), RUNTIME_STORAGE_HELPER)
    fs.writeFileSync(path.join(tempDir, 'utils', 'messaging.js'), RUNTIME_MESSAGING_HELPER)
    fs.writeFileSync(path.join(tempDir, 'utils', 'shadowDom.js'), RUNTIME_SHADOWDOM_HELPER)
    fs.writeFileSync(path.join(tempDir, 'utils', 'csui.js'), RUNTIME_CSUI_HELPER)

    // 3. Automatically bundle Bedframe CI/CD publishing workflows
    const cicdWorkflows = generateCICDWorkflows(projectName)
    const githubDir = path.join(tempDir, '.github', 'workflows')
    fs.mkdirSync(githubDir, { recursive: true })
    fs.writeFileSync(path.join(githubDir, 'publish.yml'), cicdWorkflows['publish.yml'])
    fs.writeFileSync(path.join(githubDir, 'lint.yml'), cicdWorkflows['lint.yml'])
    fs.writeFileSync(path.join(tempDir, 'README-CICD.md'), cicdWorkflows['README-CICD.md'])

    if (manifest.background && manifest.background.service_worker) {
      const swPath = manifest.background.service_worker
      if (files[swPath]) {
        const swContent = `importScripts('browser-polyfill.js');\nimportScripts('utils/storage.js');\nimportScripts('utils/messaging.js');\n` + files[swPath]
        const swFullPath = path.join(tempDir, swPath)
        fs.mkdirSync(path.dirname(swFullPath), { recursive: true })
        fs.writeFileSync(swFullPath, swContent)
      }
    }

    if (manifest.content_scripts) {
      manifest.content_scripts.forEach((script: any) => {
        if (script.js) {
          script.js.unshift('utils/csui.js')
          script.js.unshift('utils/shadowDom.js')
          script.js.unshift('utils/messaging.js')
          script.js.unshift('utils/storage.js')
          script.js.unshift('browser-polyfill.js')
        }
      })
    }

    for (const [filePath, content] of Object.entries(files)) {
      if (filePath === 'manifest.json') continue
      if (manifest.background && filePath === manifest.background.service_worker) continue

      const fullPath = path.join(tempDir, filePath)
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })

      if (filePath.endsWith('.html')) {
        const injectedHtml = content.replace(
          '<head>',
          '<head><script src="browser-polyfill.js"></script><script src="utils/storage.js"></script><script src="utils/messaging.js"></script>'
        )
        fs.writeFileSync(fullPath, injectedHtml)
      } else {
        fs.writeFileSync(fullPath, content)
      }
    }

    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

    // 4. Automatic web-ext linting before packaging (web-ext pattern)
    const lintResult = await lintExtension(tempDir)
    if (!lintResult.success) {
      return res.status(400).json({
        error: 'web-ext lint validation failed',
        details: lintResult.errors,
        diagnostics: lintResult.diagnostics,
      })
    }

    // 5. web-ext build
    const zipPath = await buildExtension(tempDir, artifactsDir)

    // 6. Stream ZIP file back to client
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${(manifest.name || projectName).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_extension.zip"`)

    const fileStream = fs.createReadStream(zipPath)
    fileStream.pipe(res)

    res.on('finish', () => {
      cleanup(tempId)
    })
  } catch (error: any) {
    console.error('Download error:', error)
    cleanup(tempId)
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Failed to package extension' })
    }
  }
}

function cleanup(tempId: string) {
  try {
    const parentDir = path.join(process.cwd(), 'temp-downloads', tempId)
    if (fs.existsSync(parentDir)) {
      fs.rmSync(parentDir, { recursive: true, force: true })
    }
  } catch (e) {
    console.error('Cleanup error:', e)
  }
}
