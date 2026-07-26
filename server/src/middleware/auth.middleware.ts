import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../config/db'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
  }
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  try {
    // Decode Kinde JWT payload
    const decoded = jwt.decode(token) as { sub?: string; email?: string; [key: string]: any } | null

    const userId = decoded?.sub || 'usr_kinde_default'
    const userEmail = decoded?.email || `${userId}@promptex.tech`

    if (userId) {
      const userById = await db.query('SELECT id, email FROM users WHERE id = $1', [userId])
      if (userById.rows.length > 0) {
        req.user = {
          id: userById.rows[0].id,
          email: userById.rows[0].email,
        }
        return next()
      }

      if (userEmail) {
        const userByEmail = await db.query('SELECT id, email FROM users WHERE email = $1', [userEmail])
        if (userByEmail.rows.length > 0) {
          req.user = {
            id: userByEmail.rows[0].id,
            email: userByEmail.rows[0].email,
          }
          return next()
        }
      }

      // Sync user profile in PostgreSQL database on first API call
      await db.query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, $2, '')
         ON CONFLICT DO NOTHING`,
        [userId, userEmail]
      )

      req.user = {
        id: userId,
        email: userEmail,
      }
      return next()
    }

    return res.status(401).json({ error: 'Invalid authentication token' })
  } catch (error) {
    console.error('[Auth] Token validation failed:', error)
    return res.status(500).json({ error: 'Unable to validate authentication token' })
  }
}
