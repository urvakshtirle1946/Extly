import { Request, Response, NextFunction } from 'express'
import { db } from '../config/db'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
  }
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  let userId = 'usr_dev_default'
  let userEmail = 'urvakshtirle@gmail.com'

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    if (token && token.startsWith('usr_')) {
      userId = token
    }
  }

  try {
    // Ensure user exists in PostgreSQL database
    await db.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, '')
       ON CONFLICT (id) DO NOTHING`,
      [userId, userEmail]
    )

    req.user = {
      id: userId,
      email: userEmail
    }

    next()
  } catch (error) {
    console.error('[Auth] User lookup failed:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}
