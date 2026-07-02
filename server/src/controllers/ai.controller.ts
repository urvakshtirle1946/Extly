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

  try {
    // 1. Ensure user record exists with 10 free credits initially
    await db.query(
      `INSERT INTO users (id, email, password_hash, plan, total_credits, used_credits)
       VALUES ($1, '', '', 'free', 10, 0)
       ON CONFLICT (id) DO UPDATE SET
         total_credits = CASE 
           WHEN users.total_credits = 0 THEN 10 
           ELSE users.total_credits 
         END`,
      [userId]
    )

    // 2. Credits check - pure DB based
    const userResult = await db.query(
      'SELECT total_credits, used_credits FROM users WHERE id = $1',
      [userId]
    )
    const total = userResult.rows[0]?.total_credits ?? 10
    const used = userResult.rows[0]?.used_credits ?? 0
    const remaining = total - used

    console.log(`[Credits] user=${userId} used=${used} total=${total} remaining=${remaining}`)

    if (remaining <= 0) {
      return res.status(403).json({ 
        error: 'Daily build credits limit reached. Please upgrade your plan.',
        remaining: 0,
        total
      })
    }
  } catch (err: any) {
    console.error('[Credits] Check failed — blocking request:', err.message)
    return res.status(500).json({ error: 'Credit check failed. Please try again.' })
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

    // 8. Deduct one credit from user
    await db.query(
      'UPDATE users SET used_credits = used_credits + 1 WHERE id = $1',
      [userId]
    )

    // 9. Send final completion event
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
