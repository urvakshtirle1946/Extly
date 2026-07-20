import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { generateCICDWorkflows } from '../services/cicd.service'
import { db } from '../config/db'

export async function handleGenerateCICD(req: AuthenticatedRequest, res: Response) {
  const projectId = req.params.id
  const userId = req.user?.id

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' })
  }

  try {
    let name = 'extension'
    if (userId) {
      const { rows } = await db.query('SELECT name FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId])
      if (rows.length > 0) {
        name = rows[0].name
      }
    }

    const workflows = generateCICDWorkflows(name)
    return res.json({
      success: true,
      workflows: {
        '.github/workflows/publish.yml': workflows['publish.yml'],
        '.github/workflows/lint.yml': workflows['lint.yml'],
        'README-CICD.md': workflows['README-CICD.md'],
      },
    })
  } catch (error: any) {
    console.error('CICD controller error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate CI/CD workflows' })
  }
}
