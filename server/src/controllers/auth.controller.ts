import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

const JWT_SECRET = process.env.JWT_SECRET || 'extcraft_jwt_secret_2026'

export async function handleSignup(req: Request, res: Response) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    // 1. Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered' })
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // 3. Insert user
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    )
    const user = result.rows[0]

    // 4. Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

    return res.status(201).json({ user, token })
  } catch (error: any) {
    console.error('Signup error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

export async function handleLogin(req: Request, res: Response) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    // 1. Fetch user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }
    const user = result.rows[0]

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    // 3. Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      token
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

export async function handleMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const result = await db.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.user.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    return res.status(200).json({ user: result.rows[0] })
  } catch (error: any) {
    console.error('Auth check error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
