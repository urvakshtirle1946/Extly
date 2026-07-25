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
    if (token && token.trim().length > 0) {
      userId = token
    }
  }

  try {
    // 1. First check if user exists by ID
    const userById = await db.query('SELECT id, email FROM users WHERE id = $1', [userId])
    
    if (userById.rows.length > 0) {
      req.user = {
        id: userById.rows[0].id,
        email: userById.rows[0].email
      }
      return next()
    }

    // 2. If not found by ID, check if default email user exists
    const userByEmail = await db.query('SELECT id, email FROM users WHERE email = $1', [userEmail])

    if (userByEmail.rows.length > 0) {
      req.user = {
        id: userByEmail.rows[0].id,
        email: userByEmail.rows[0].email
      }
      return next()
    }

    // 3. If neither exists, insert a new user safely
    await db.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, '')
       ON CONFLICT DO NOTHING`,
      [userId, `${userId}@promptex.tech`]
    )

    req.user = {
      id: userId,
      email: `${userId}@promptex.tech`
    }

    next()
  } catch (error) {
    console.error('[Auth] User resolution warning:', error)
    // Fallback so the request never crashes with 500
    req.user = {
      id: userId,
      email: userEmail
    }
    next()
  }
}
