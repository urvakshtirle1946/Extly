import { Response } from 'express'
import { generateExtension } from '../services/openrouter.service'
import { generateWithBYOK } from '../services/byok.service'
import { encryptKey, decryptKey } from '../utils/encryption'
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

  let isBYOK = false
  let byokApiKey: string | null = null
  let byokProvider = 'openrouter'

  try {
    // 1. Check if this is a BYOK project
    const projectMeta = await db.query(
      'SELECT workspace_type, byok_api_key, byok_provider FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )

    if (projectMeta.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    const useByok = req.body.useByok === true
    let userByokKey: string | null = null
    let userByokProvider: string = 'openrouter'

    if (useByok) {
      const { rows: userRows } = await db.query(
        'SELECT byok_api_key, byok_provider FROM users WHERE id = $1',
        [userId]
      )
      if (!userRows[0]?.byok_api_key) {
        return res.status(400).json({ 
          error: 'No BYOK key configured. Please set up your API key first.' 
        })
      }
      userByokKey = decryptKey(userRows[0].byok_api_key)
      userByokProvider = userRows[0].byok_provider || 'openrouter'
      isBYOK = true
      byokApiKey = userRows[0].byok_api_key
      byokProvider = userByokProvider
    } else {
      isBYOK = projectMeta.rows[0]?.workspace_type === 'byok'
      byokApiKey = projectMeta.rows[0]?.byok_api_key || null
      byokProvider = projectMeta.rows[0]?.byok_provider || 'openrouter'
    }

    if (isBYOK) {
      // BYOK workspace — no credit check, just validate key exists
      console.log(`[BYOK] user=${userId} project=${projectId} provider=${byokProvider}`)
      if (!byokApiKey) {
        return res.status(400).json({ error: 'No API key configured for this BYOK workspace.' })
      }
    } else {
      // Standard workspace — ensure user record exists cleanly without breaking UNIQUE(email) constraint
      await db.query(
        `INSERT INTO users (id, email, password_hash, plan, total_credits, used_credits, last_credit_reset)
         VALUES ($1, $2, '', 'free', 10, 0, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING`,
        [userId, req.user?.email || `${userId}@promptex.tech`]
      )

      // Reset daily free credits at midnight UTC for free plan users
      await db.query(
        `UPDATE users 
         SET used_credits = 0, 
             last_credit_reset = CURRENT_TIMESTAMP
         WHERE id = $1 
           AND plan = 'free'
           AND (last_credit_reset IS NULL OR last_credit_reset < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC'))`,
        [userId]
      )

      const userResult = await db.query(
        'SELECT plan, total_credits, used_credits FROM users WHERE id = $1',
        [userId]
      )

      const userPlan = userResult.rows[0]?.plan || 'free'
      let total = userResult.rows[0]?.total_credits ?? 10
      if (total <= 0) {
        total = 10
        await db.query('UPDATE users SET total_credits = 10 WHERE id = $1', [userId])
      }

      const used = userResult.rows[0]?.used_credits ?? 0
      const remaining = Math.max(0, total - used)

      console.log(`[Credits] user=${userId} plan=${userPlan} used=${used} total=${total} remaining=${remaining}`)

      if (remaining <= 0) {
        const errorMsg = userPlan === 'free'
          ? 'You have reached your 10 free daily credits for today. Credits reset at midnight UTC, or you can top up credits to keep building.'
          : 'You have used all your account credits. Please top up your credits to continue building.'

        return res.status(403).json({
          error: errorMsg,
          remaining: 0,
          total
        })
      }
    }
  } catch (err: any) {
    console.error('[Pre-check] Failed:', err.message)
    return res.status(500).json({ error: 'Pre-generation check failed. Please try again.' })
  }

  // Set up Server-Sent Events (SSE) headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  let accumulatedText = ''
  let generatedFiles: Record<string, string> = {}

  try {
    // 1. Verify project ownership (already checked above, but also update status)
    await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )

    // 2. Save the user's message in the database
    await db.query(
      'INSERT INTO messages (project_id, role, content) VALUES ($1, $2, $3)',
      [projectId, 'user', prompt]
    )

    // 3. Update project status to 'generating'
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['generating', projectId]
    )

    // 4. Call the appropriate AI service
    let result: { files: Record<string, string> }

    if (isBYOK && byokApiKey) {
      const decryptedKey = decryptKey(byokApiKey)
      result = await generateWithBYOK(
        prompt,
        files,
        history,
        decryptedKey,
        byokProvider,
        (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          if (event.type === 'text') accumulatedText += event.delta
        }
      )
    } else {
      result = await generateExtension(
        prompt,
        files,
        history,
        (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          if (event.type === 'text') accumulatedText += event.delta
        }
      )
    }

    generatedFiles = result.files
    const finalFilesState = { ...files, ...generatedFiles }

    // 5. Save/Upsert the modified files in the database
    for (const [path, content] of Object.entries(generatedFiles)) {
      await db.query(
        `INSERT INTO files (project_id, path, content, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (project_id, path)
         DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
        [projectId, path, content]
      )
    }

    // 6. Save the generation snapshot
    await db.query(
      'INSERT INTO generations (project_id, prompt, files_snapshot) VALUES ($1, $2, $3)',
      [projectId, prompt, JSON.stringify(finalFilesState)]
    )

    // 7. Save the assistant's message
    await db.query(
      'INSERT INTO messages (project_id, role, content) VALUES ($1, $2, $3)',
      [projectId, 'assistant', accumulatedText || 'I have generated the requested changes.']
    )

    // 8. Reset project status back to 'idle'
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['idle', projectId]
    )

    // 9. Deduct one credit — only for standard workspace
    if (!isBYOK) {
      await db.query(
        'UPDATE users SET used_credits = used_credits + 1 WHERE id = $1',
        [userId]
      )
    }

    // 10. Send final completion event
    res.write(`data: ${JSON.stringify({ type: 'done', files: finalFilesState })}\n\n`)
    res.end()
  } catch (error: any) {
    console.error('Error in handleGenerate:', error)

    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['failed', projectId]
    )

    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Generation failed' })}\n\n`)
    res.end()
  }
}
