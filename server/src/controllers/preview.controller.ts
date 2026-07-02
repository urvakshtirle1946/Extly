import { Request, Response } from 'express'
import { 
  startPreviewSession, 
  stopPreviewSession, 
  getSession 
} from '../services/preview.service'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

export async function handleStartPreview(req: AuthenticatedRequest, res: Response) {
  const { id: projectId } = req.params
  const { files } = req.body
  const userId = req.user?.id

  if (!projectId || !files) {
    return res.status(400).json({ error: 'Missing projectId or files' })
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Verify ownership
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    // Set status to previewing
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['previewing', projectId]
    )

    const backendUrl = `${req.protocol}://${req.get('host')}`
    const sessionId = await startPreviewSession(projectId, files, backendUrl)
    return res.status(200).json({ sessionId })
  } catch (error: any) {
    console.error('Error starting preview:', error)
    
    // Revert status to idle
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['idle', projectId]
    )

    return res.status(500).json({ error: error.message || 'Failed to start preview session' })
  }
}

export async function handleGetLogs(req: AuthenticatedRequest, res: Response) {
  const { sessionId } = req.params

  const session = getSession(sessionId)
  if (!session) {
    return res.status(444).json({ error: 'Session not found' })
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // Send all past events in history
  session.eventsHistory.forEach((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  })

  // Register listener for new events
  const listener = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  session.listeners.push(listener)

  // On client disconnect, clean up listener list and set a buffer for potential reconnection
  req.on('close', async () => {
    session.listeners = session.listeners.filter((l) => l !== listener)
    console.log(`[Preview] Client disconnected from logs channel of session ${sessionId}.`)
    
    // Set a 30s buffer timeout. If no client reconnects within 30s, clean up session.
    if (session.listeners.length === 0) {
      console.log(`[Preview] No active listeners for session ${sessionId}. Scheduling cleanup in 30s...`)
      setTimeout(async () => {
        const currentSession = getSession(sessionId)
        if (currentSession && currentSession.listeners.length === 0) {
          console.log(`[Preview] Inactivity timeout reached for session ${sessionId}. Cleaning up...`)
          await stopPreviewSession(sessionId)
          await db.query(
            'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
            ['idle', currentSession.projectId]
          )
        }
      }, 30000)
    }
  })
}

export async function handleStopPreview(req: AuthenticatedRequest, res: Response) {
  const { sessionId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const session = getSession(sessionId)
    const projectId = session?.projectId

    if (projectId) {
      // Verify ownership before modifying status
      const projectCheck = await db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      )
      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    await stopPreviewSession(sessionId)

    if (projectId) {
      // Reset project status
      await db.query(
        'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
        ['idle', projectId]
      )
    }

    return res.status(200).json({ status: 'stopped' })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to stop preview' })
  }
}

export function handleAddLog(req: Request, res: Response) {
  const { sessionId } = req.params
  const { severity, message } = req.body

  const session = getSession(sessionId)
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  const event = {
    type: (severity === 'error' ? 'error' : 'log') as any,
    message,
    severity,
    timestamp: new Date().toISOString()
  }

  session.eventsHistory.push(event)
  session.listeners.forEach((listener) => listener(event))

  return res.status(200).json({ success: true })
}
