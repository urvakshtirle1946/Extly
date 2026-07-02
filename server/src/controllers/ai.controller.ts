import { Response } from 'express'
import { generateExtension } from '../services/openrouter.service'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

export async function handleGenerate(req: AuthenticatedRequest, res: Response) {
  const { projectId, prompt, files = {}, history = [] } = req.body
  const userId = req.user?.id

  if (!projectId || !prompt) {
    return res.status(450).json({ error: 'Missing projectId or prompt' })
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Verify daily build credits (Limit 5 per day for free users)
  try {
    const userResult = await db.query('SELECT plan FROM users WHERE id = $1', [userId])
    const plan = userResult.rows[0]?.plan || 'free'

    if (plan === 'free') {
      const todayResult = await db.query(
        `SELECT COUNT(g.id)::int as count 
         FROM generations g
         JOIN projects p ON g.project_id = p.id
         WHERE p.user_id = $1
           AND g.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')`,
        [userId]
      )
      const count = todayResult.rows[0]?.count || 0
      const defaultLimit = process.env.NODE_ENV === 'production' ? 5 : 999
      const DAILY_LIMIT = parseInt(process.env.DAILY_CREDIT_LIMIT || String(defaultLimit), 10)
      if (count >= DAILY_LIMIT) {
        return res.status(403).json({ error: 'Daily build credits limit reached. Please upgrade your plan.' })
      }
    }
  } catch (err: any) {
    console.error('Error checking credits:', err)
    return res.status(500).json({ error: 'Failed to verify build credits' })
  }

  // Set up Server-Sent Events (SSE) headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  let accumulatedText = ''
  let generatedFiles: Record<string, string> = {}

  try {
    // 1. Verify project ownership
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    if (projectCheck.rows.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Project not found or unauthorized' })}\n\n`)
      res.end()
      return
    }

    // 2. Save the user's message in the database
    await db.query(
      'INSERT INTO messages (project_id, role, content) VALUES ($1, $2, $3)',
      [projectId, 'user', prompt]
    )

    // 3. Update project status in DB to 'generating'
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['generating', projectId]
    )

    // 3. Call the Groq service
    const result = await generateExtension(
      prompt,
      files,
      history,
      (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`)

        if (event.type === 'text') {
          accumulatedText += event.delta
        }
      }
    )

    generatedFiles = result.files
    const finalFilesState = { ...files, ...generatedFiles }

    // 4. Save/Upsert the modified files in the database
    for (const [path, content] of Object.entries(generatedFiles)) {
      await db.query(
        `INSERT INTO files (project_id, path, content, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (project_id, path)
         DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
        [projectId, path, content]
      )
    }

    // 5. Save the generation snapshot
    await db.query(
      'INSERT INTO generations (project_id, prompt, files_snapshot) VALUES ($1, $2, $3)',
      [projectId, prompt, JSON.stringify(finalFilesState)]
    )

    // 6. Save the assistant's message in the database
    await db.query(
      'INSERT INTO messages (project_id, role, content) VALUES ($1, $2, $3)',
      [projectId, 'assistant', accumulatedText || 'I have generated the requested changes.']
    )

    // 7. Reset project status back to 'idle'
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['idle', projectId]
    )

    // 8. Send final completion event
    res.write(`data: ${JSON.stringify({ type: 'done', files: finalFilesState })}\n\n`)
    res.end()
  } catch (error: any) {
    console.error('Error in handleGenerate:', error)
    
    // Update project status to 'failed'
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['failed', projectId]
    )

    // Send error event
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Generation failed' })}\n\n`)
    res.end()
  }
}
