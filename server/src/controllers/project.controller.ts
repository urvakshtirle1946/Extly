import { Response } from 'express'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

export async function handleGetProjects(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await db.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    )
    return res.status(200).json(result.rows)
  } catch (error: any) {
    console.error('Error fetching projects:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch projects' })
  }
}

export async function handleGetProject(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const { id: projectId } = req.params

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // 1. Verify project ownership
    const projectResult = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }
    const project = projectResult.rows[0]

    // 2. Fetch project files
    const filesResult = await db.query(
      'SELECT path, content FROM files WHERE project_id = $1',
      [projectId]
    )

    // 3. Fetch project messages
    const messagesResult = await db.query(
      'SELECT * FROM messages WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    )

    return res.status(200).json({
      project,
      files: filesResult.rows,
      messages: messagesResult.rows
    })
  } catch (error: any) {
    console.error('Error fetching project:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch project' })
  }
}

export async function handleCreateProject(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const { name, description, template, files } = req.body

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' })
  }

  try {
    // Start transaction
    await db.query('BEGIN')

    // 1. Create project
    const projectResult = await db.query(
      'INSERT INTO projects (user_id, name, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, description, 'idle']
    )
    const project = projectResult.rows[0]

    // 2. Insert template files if provided
    if (files && typeof files === 'object') {
      for (const [path, content] of Object.entries(files)) {
        await db.query(
          'INSERT INTO files (project_id, path, content) VALUES ($1, $2, $3)',
          [project.id, path, content]
        )
      }
    }

    // 3. Create initial message
    const initialContent = `Created project with template: ${template || 'Blank'}. Description: ${description}`
    await db.query(
      'INSERT INTO messages (project_id, role, content) VALUES ($1, $2, $3)',
      [project.id, 'user', initialContent]
    )

    await db.query('COMMIT')
    return res.status(201).json(project)
  } catch (error: any) {
    await db.query('ROLLBACK')
    console.error('Error creating project:', error)
    return res.status(500).json({ error: error.message || 'Failed to create project' })
  }
}

export async function handleDeleteProject(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const { id: projectId } = req.params

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await db.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *',
      [projectId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    return res.status(200).json({ status: 'success', message: 'Project deleted' })
  } catch (error: any) {
    console.error('Error deleting project:', error)
    return res.status(500).json({ error: error.message || 'Failed to delete project' })
  }
}

export async function handleSaveFile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const { id: projectId } = req.params
  const { path, content } = req.body

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  if (!path || content === undefined) {
    return res.status(400).json({ error: 'Path and content are required' })
  }

  try {
    // Verify project ownership
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    // Upsert the file
    await db.query(
      `INSERT INTO files (project_id, path, content, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (project_id, path)
       DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
      [projectId, path, content]
    )

    return res.status(200).json({ status: 'success' })
  } catch (error: any) {
    console.error('Error saving file:', error)
    return res.status(500).json({ error: error.message || 'Failed to save file' })
  }
}

export async function handleMessageFeedback(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const { id: projectId, messageId } = req.params
  const { feedback } = req.body // 'liked' | 'disliked' | null

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  if (feedback !== undefined && feedback !== null && feedback !== 'liked' && feedback !== 'disliked') {
    return res.status(400).json({ error: 'Invalid feedback value' })
  }

  try {
    // 1. Verify project ownership
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' })
    }

    // 2. Update message feedback
    const result = await db.query(
      'UPDATE messages SET feedback = $1 WHERE id = $2 AND project_id = $3 RETURNING *',
      [feedback, messageId, projectId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }

    return res.status(200).json({ status: 'success', message: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating message feedback:', error)
    return res.status(500).json({ error: error.message || 'Failed to update feedback' })
  }
}

export async function handleGetUsage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // 1. Fetch last 30 days usage for chart
    const chartQueryText = `
      SELECT 
        TO_CHAR(g.created_at, 'YYYY-MM-DD') as date,
        COUNT(g.id)::int as count
      FROM generations g
      JOIN projects p ON g.project_id = p.id
      WHERE p.user_id = $1
        AND g.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY TO_CHAR(g.created_at, 'YYYY-MM-DD')
      ORDER BY date ASC;
    `
    const chartResult = await db.query(chartQueryText, [userId])

    // 2. Fetch today's usage (since midnight UTC)
    const todayQueryText = `
      SELECT COUNT(g.id)::int as count 
      FROM generations g
      JOIN projects p ON g.project_id = p.id
      WHERE p.user_id = $1
        AND g.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
    `
    const todayResult = await db.query(todayQueryText, [userId])
    const usedToday = todayResult.rows[0]?.count || 0

    // 3. Fetch user plan
    const userResult = await db.query('SELECT plan FROM users WHERE id = $1', [userId])
    const plan = userResult.rows[0]?.plan || 'free'
    const isPro = plan === 'pro'
    const limit = isPro ? 999999 : 5
    const remaining = isPro ? 999999 : Math.max(0, 5 - usedToday)

    return res.status(200).json({
      chartData: chartResult.rows,
      plan,
      dailyCredits: {
        limit,
        usedToday,
        remaining
      }
    })
  } catch (error: any) {
    console.error('Error fetching usage:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch usage' })
  }
}

export async function handleUpgradePlan(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const { plan = 'pro' } = req.body

  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    await db.query(
      "UPDATE users SET plan = $1 WHERE id = $2",
      [plan, userId]
    )
    return res.status(200).json({ status: 'success', plan })
  } catch (error: any) {
    console.error('Error upgrading plan:', error)
    return res.status(500).json({ error: error.message || 'Failed to upgrade plan' })
  }
}
