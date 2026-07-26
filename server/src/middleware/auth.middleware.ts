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

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  try {
    // Better Auth stores opaque session tokens in its own `session` table.
    // Validate that the token is both known and unexpired before associating it
    // with the app's existing `users` record.
    const authSession = await db.query(
      `SELECT u.id, u.email
       FROM "session" s
       INNER JOIN "user" u ON u.id = s."userId"
       WHERE s.token = $1 AND s."expiresAt" > NOW()`,
      [token]
    )

    if (authSession.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const authUser = authSession.rows[0]
    const userById = await db.query('SELECT id, email FROM users WHERE id = $1', [authUser.id])
    
    if (userById.rows.length > 0) {
      req.user = {
        id: userById.rows[0].id,
        email: userById.rows[0].email
      }
      return next()
    }

    // Preserve projects created by a pre-Better-Auth account with the same email.
    const userByEmail = await db.query('SELECT id, email FROM users WHERE email = $1', [authUser.email])

    if (userByEmail.rows.length > 0) {
      req.user = {
        id: userByEmail.rows[0].id,
        email: userByEmail.rows[0].email
      }
      return next()
    }

    // Create the app profile the first time a verified Better Auth user calls
    // the API. Passwords are managed only by Better Auth.
    await db.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, '')
       ON CONFLICT DO NOTHING`,
      [authUser.id, authUser.email]
    )

    req.user = {
      id: authUser.id,
      email: authUser.email
    }

    next()
  } catch (error) {
    console.error('[Auth] Session validation failed:', error)
    return res.status(500).json({ error: 'Unable to validate session' })
  }
}
