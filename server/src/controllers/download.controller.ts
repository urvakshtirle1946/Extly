import { Response } from 'express'
import { validateManifest } from '../services/manifest.service'
import { lintExtension, buildExtension } from '../services/webext.service'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
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
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    // 1. Custom Manifest Validation
    const manifestErrors = validateManifest(files)
    const criticalErrors = manifestErrors.filter((err) => err.severity === 'error')
    if (criticalErrors.length > 0) {
      return res.status(400).json({
        error: 'Manifest validation failed',
        details: criticalErrors.map((e) => e.message),
      })
    }

    // Create directories
    fs.mkdirSync(tempDir, { recursive: true })

    // 2. Write files and inject polyfill
    fs.writeFileSync(path.join(tempDir, 'browser-polyfill.js'), POLYFILL_CONTENT)

    const manifest = JSON.parse(files['manifest.json'])

    if (manifest.background && manifest.background.service_worker) {
      const swPath = manifest.background.service_worker
      if (files[swPath]) {
        const swContent = `importScripts('browser-polyfill.js');\n` + files[swPath]
        const swFullPath = path.join(tempDir, swPath)
        fs.mkdirSync(path.dirname(swFullPath), { recursive: true })
        fs.writeFileSync(swFullPath, swContent)
      }
    }

    if (manifest.content_scripts) {
      manifest.content_scripts.forEach((script: any) => {
        if (script.js) {
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
          '<head><script src="browser-polyfill.js"></script>'
        )
        fs.writeFileSync(fullPath, injectedHtml)
      } else {
        fs.writeFileSync(fullPath, content)
      }
    }

    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

    // 3. web-ext lint
    const lintResult = await lintExtension(tempDir)
    if (!lintResult.success) {
      return res.status(400).json({
        error: 'web-ext lint validation failed',
        details: lintResult.errors,
      })
    }

    // 4. web-ext build
    const zipPath = await buildExtension(tempDir, artifactsDir)

    // 5. Stream ZIP file back to client
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${manifest.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_extension.zip"`)

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
