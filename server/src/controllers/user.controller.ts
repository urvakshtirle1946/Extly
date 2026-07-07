import { Response } from 'express'
import { db } from '../config/db'
import { encryptKey } from '../utils/encryption'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

export async function handleSaveUserByok(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const { provider, api_key } = req.body

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!provider || !api_key) {
    return res.status(400).json({ error: 'Provider and API key required' })
  }

  try {
    const encrypted = encryptKey(api_key)

    await db.query(
      `UPDATE users SET byok_provider = $1, byok_api_key = $2 WHERE id = $3`,
      [provider, encrypted, userId]
    )

    return res.json({ success: true })
  } catch (error: any) {
    console.error('Error saving user BYOK:', error)
    return res.status(500).json({ error: error.message || 'Failed to save BYOK details' })
  }
}

export async function handleGetUserByok(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { rows } = await db.query(
      'SELECT byok_provider, byok_api_key FROM users WHERE id = $1',
      [userId]
    )
    
    return res.json({
      provider: rows[0]?.byok_provider || null,
      hasKey: !!rows[0]?.byok_api_key,
    })
  } catch (error: any) {
    console.error('Error getting user BYOK:', error)
    return res.status(500).json({ error: error.message || 'Failed to get BYOK details' })
  }
}

export async function handleDeleteUserByok(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await db.query(
      'UPDATE users SET byok_provider = NULL, byok_api_key = NULL WHERE id = $1',
      [userId]
    )
    return res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user BYOK:', error)
    return res.status(500).json({ error: error.message || 'Failed to delete BYOK details' })
  }
}
