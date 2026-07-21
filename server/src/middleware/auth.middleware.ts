import { Request, Response, NextFunction } from 'express'
import { verifyToken, createClerkClient } from '@clerk/express'
import { db } from '../config/db'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
  }
}

const TRUSTED_ORIGINS = [
  'localhost',
  'vercel.app',
  'promptex.tech',
  'promptex.app',
  'extly.io',
  'extly.onrender.com',
]

export function isTrustedOrigin(origin: string): boolean {
  if (!origin) return true
  return TRUSTED_ORIGINS.some(trusted => origin.includes(trusted))
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // 1. Decode the token payload to extract the 'azp' (Authorized Party) claim
    let azp: string | undefined = undefined
    try {
      const payloadParts = token.split('.')[1]
      if (payloadParts) {
        const decodedPayload = JSON.parse(Buffer.from(payloadParts, 'base64').toString('utf-8'))
        azp = decodedPayload.azp
      }
    } catch (err) {
      console.warn('[Auth] Failed to decode token payload:', err)
    }

    // Dynamic authorized parties list
    const authorizedPartiesList = TRUSTED_ORIGINS.flatMap(o => [
      `https://${o}`,
      `https://www.${o}`,
      `http://${o}`,
      `http://localhost:3000`,
      `http://localhost:4000`,
    ])

    if (azp && isTrustedOrigin(azp) && !authorizedPartiesList.includes(azp)) {
      authorizedPartiesList.push(azp)
    }

    // Verify the Clerk session token
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      authorizedParties: authorizedPartiesList
    })

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Fetch the user's primary email from Clerk
    const clerkUser = await clerk.users.getUser(payload.sub)
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )

    const userEmail = primaryEmail?.emailAddress ?? ''

    // Ensure the Clerk user is registered in our local PostgreSQL database
    await db.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, '')
       ON CONFLICT (id) DO NOTHING`,
      [payload.sub, userEmail]
    )

    req.user = {
      id: payload.sub, // Clerk user ID is our user ID
      email: userEmail
    }

    next()
  } catch (error) {
    console.error('[Auth] Token verification failed:', error)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
