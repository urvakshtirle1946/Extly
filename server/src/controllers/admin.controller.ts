import { Response } from 'express'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { getKindeUsers, KindeUser } from '../services/kinde.service'

const PLANS = new Set(['free', 'pro', 'business'])
const SUBSCRIPTION_STATUSES = new Set(['active', 'cancelled', 'expired'])

export async function handleGetAdminOverview(_req: AuthenticatedRequest, res: Response) {
  try {
    const [userCount, activeSubscriptions, projectCount, revenue, recentUsers] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM users'),
      db.query("SELECT COUNT(*)::int AS count FROM users WHERE subscription_status = 'active' AND plan <> 'free'"),
      db.query('SELECT COUNT(*)::int AS count FROM projects'),
      db.query("SELECT COALESCE(SUM(amount), 0)::float AS total FROM processed_payments WHERE status = 'completed'"),
      db.query(`SELECT id, email, plan, subscription_status, total_credits, used_credits, created_at
                FROM users ORDER BY created_at DESC LIMIT 5`),
    ])

    res.json({
      metrics: {
        users: userCount.rows[0].count,
        activeSubscriptions: activeSubscriptions.rows[0].count,
        projects: projectCount.rows[0].count,
        revenue: revenue.rows[0].total,
      },
      recentUsers: recentUsers.rows,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to load admin overview' })
  }
}

export async function handleGetAdminUsers(req: AuthenticatedRequest, res: Response) {
  const search = String(req.query.search || '').trim()
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))
  const offset = (page - 1) * limit

  try {
    const kindeUsers = await getKindeUsers(search)

    if (kindeUsers !== null) {
      const userIds = kindeUsers.map(user => user.id)
      const localUsers = userIds.length
        ? await db.query(
          `SELECT id, plan, subscription_status, subscription_ends_at, total_credits, used_credits, created_at, updated_at
           FROM users WHERE id = ANY($1::varchar[])`,
          [userIds]
        )
        : { rows: [] as any[] }
      const localUsersById = new Map(localUsers.rows.map(user => [user.id, user]))
      const users = kindeUsers.map(user => mergeKindeUser(user, localUsersById.get(user.id)))
      const paginatedUsers = users.slice(offset, offset + limit)

      return res.json({ users: paginatedUsers, total: users.length, page, limit })
    }

    // Fallback: Query PostgreSQL database if Kinde M2M API is not configured
    let countQuery = 'SELECT COUNT(*)::int AS total FROM users'
    let dataQuery = `SELECT id, email, plan, subscription_status, subscription_ends_at, total_credits, used_credits, created_at, updated_at
                     FROM users`
    const params: any[] = []

    if (search) {
      countQuery += ' WHERE email ILIKE $1'
      dataQuery += ' WHERE email ILIKE $1'
      params.push(`%${search}%`)
    }

    dataQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`

    const [countResult, dataResult] = await Promise.all([
      db.query(countQuery, params),
      db.query(dataQuery, [...params, limit, offset]),
    ])

    const users = dataResult.rows.map(u => ({
      id: u.id,
      email: u.email,
      first_name: null,
      last_name: null,
      username: null,
      picture: null,
      is_suspended: false,
      total_sign_ins: 0,
      last_signed_in: null,
      plan: u.plan || 'free',
      subscription_status: u.subscription_status || 'active',
      subscription_ends_at: u.subscription_ends_at || null,
      total_credits: u.total_credits ?? 10,
      used_credits: u.used_credits ?? 0,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }))

    res.json({ users, total: countResult.rows[0].total, page, limit })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to load users' })
  }
}

function mergeKindeUser(user: KindeUser, localUser?: any) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    username: user.username || null,
    picture: user.picture || null,
    is_suspended: Boolean(user.is_suspended),
    total_sign_ins: user.total_sign_ins || 0,
    last_signed_in: user.last_signed_in || null,
    plan: localUser?.plan || 'free',
    subscription_status: localUser?.subscription_status || 'active',
    subscription_ends_at: localUser?.subscription_ends_at || null,
    total_credits: localUser?.total_credits ?? 10,
    used_credits: localUser?.used_credits ?? 0,
    created_at: user.created_on || localUser?.created_at || null,
    updated_at: localUser?.updated_at || null,
  }
}

export async function handleUpdateAdminSubscription(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.params
  const { email, plan, subscriptionStatus, subscriptionEndsAt, totalCredits, usedCredits } = req.body || {}

  if (!PLANS.has(plan)) return res.status(400).json({ error: 'Invalid plan' })
  if (!SUBSCRIPTION_STATUSES.has(subscriptionStatus)) return res.status(400).json({ error: 'Invalid subscription status' })
  if (!Number.isInteger(totalCredits) || totalCredits < 0) return res.status(400).json({ error: 'Total credits must be a non-negative integer' })
  if (!Number.isInteger(usedCredits) || usedCredits < 0 || usedCredits > totalCredits) {
    return res.status(400).json({ error: 'Used credits must be between zero and total credits' })
  }

  const endsAt = subscriptionEndsAt ? new Date(subscriptionEndsAt) : null
  if (endsAt && Number.isNaN(endsAt.getTime())) return res.status(400).json({ error: 'Invalid subscription end date' })

  try {
    if (typeof email !== 'string' || !email) return res.status(400).json({ error: 'A Kinde user email is required' })
    await db.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, '')
       ON CONFLICT (id) DO NOTHING`,
      [userId, email]
    )
    const { rows } = await db.query(
      `UPDATE users
       SET plan = $1, subscription_status = $2, subscription_ends_at = $3,
           total_credits = $4, used_credits = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, email, plan, subscription_status, subscription_ends_at,
                 total_credits, used_credits, created_at, updated_at`,
      [plan, subscriptionStatus, endsAt, totalCredits, usedCredits, userId]
    )

    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    res.json({ user: rows[0] })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to update subscription' })
  }
}
