import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { lintExtension } from '../services/webext.service'
import { db } from '../config/db'
import fs from 'fs'
import path from 'path'

export async function handleLintProject(req: AuthenticatedRequest, res: Response) {
  const projectId = req.params.id || req.body.projectId
  const files = req.body.files as Record<string, string>
  const userId = req.user?.id

  if (!files) {
    return res.status(400).json({ error: 'Missing extension files' })
  }

  const tempId = `lint_${projectId}_${Date.now()}`
  const tempDir = path.join(process.cwd(), 'temp-lint', tempId)

  try {
    // Write files to temporary directory for web-ext linting
    fs.mkdirSync(tempDir, { recursive: true })
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tempDir, filePath)
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, content)
    }

    const lintResult = await lintExtension(tempDir)
    cleanup(tempDir)

    return res.json(lintResult)
  } catch (error: any) {
    cleanup(tempDir)
    console.error('Lint controller error:', error)
    return res.status(500).json({ error: error.message || 'web-ext lint failed' })
  }
}

function cleanup(tempDir: string) {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch (e) {
    // ignore
  }
}
