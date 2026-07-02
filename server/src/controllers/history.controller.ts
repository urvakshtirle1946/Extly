import { Response } from 'express'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

export async function handleGetHistory(req: AuthenticatedRequest, res: Response) {
  const { id: projectId } = req.params
  const userId = req.user?.id

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Verify ownership
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    // Fetch generations metadata
    const result = await db.query(
      'SELECT id, prompt, created_at FROM generations WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    )

    return res.status(200).json(result.rows)
  } catch (error: any) {
    console.error('Error fetching history:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch history' })
  }
}

export async function handleRollback(req: AuthenticatedRequest, res: Response) {
  const { id: projectId, genId } = req.params
  const userId = req.user?.id

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Start transaction
    await db.query('BEGIN')

    // 1. Verify project ownership
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    if (projectCheck.rows.length === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    // 2. Fetch the generation snapshot
    const genResult = await db.query(
      'SELECT prompt, files_snapshot FROM generations WHERE id = $1 AND project_id = $2',
      [genId, projectId]
    )

    if (genResult.rows.length === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Generation snapshot not found' })
    }

    const generation = genResult.rows[0]
    const snapshot = generation.files_snapshot as Record<string, string>

    // 3. Delete existing files for this project
    await db.query('DELETE FROM files WHERE project_id = $1', [projectId])

    // 4. Insert files from the snapshot
    for (const [path, content] of Object.entries(snapshot)) {
      await db.query(
        'INSERT INTO files (project_id, path, content) VALUES ($1, $2, $3)',
        [projectId, path, content]
      )
    }

    // 5. Insert a system message about the rollback
    await db.query(
      'INSERT INTO messages (project_id, role, content) VALUES ($1, $2, $3)',
      [projectId, 'assistant', `I have rolled back the workspace files to the version: "${generation.prompt}"`]
    )

    await db.query('COMMIT')
    return res.status(200).json({ status: 'success', files: snapshot })
  } catch (error: any) {
    await db.query('ROLLBACK')
    console.error('Error during rollback:', error)
    return res.status(500).json({ error: error.message || 'Failed to rollback' })
  }
}
