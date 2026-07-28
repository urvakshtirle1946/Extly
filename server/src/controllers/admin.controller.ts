import { Response } from 'express'
import { db } from '../config/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

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
    const filter = search ? 'WHERE id ILIKE $1 OR email ILIKE $1' : ''
    const values = search ? [`%${search}%`, limit, offset] : [limit, offset]
    const limitIndex = search ? '$2' : '$1'
    const offsetIndex = search ? '$3' : '$2'

    const [users, count] = await Promise.all([
      db.query(
        `SELECT id, email, plan, subscription_status, subscription_ends_at,
                total_credits, used_credits, created_at, updated_at
         FROM users ${filter}
         ORDER BY created_at DESC LIMIT ${limitIndex} OFFSET ${offsetIndex}`,
        values
      ),
      db.query(`SELECT COUNT(*)::int AS count FROM users ${filter}`, search ? [`%${search}%`] : [])
    ])

    res.json({ users: users.rows, total: count.rows[0].count, page, limit })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to load users' })
  }
}

export async function handleUpdateAdminSubscription(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.params
  const { plan, subscriptionStatus, subscriptionEndsAt, totalCredits, usedCredits } = req.body || {}

  if (!PLANS.has(plan)) return res.status(400).json({ error: 'Invalid plan' })
  if (!SUBSCRIPTION_STATUSES.has(subscriptionStatus)) return res.status(400).json({ error: 'Invalid subscription status' })
  if (!Number.isInteger(totalCredits) || totalCredits < 0) return res.status(400).json({ error: 'Total credits must be a non-negative integer' })
  if (!Number.isInteger(usedCredits) || usedCredits < 0 || usedCredits > totalCredits) {
    return res.status(400).json({ error: 'Used credits must be between zero and total credits' })
  }

  const endsAt = subscriptionEndsAt ? new Date(subscriptionEndsAt) : null
  if (endsAt && Number.isNaN(endsAt.getTime())) return res.status(400).json({ error: 'Invalid subscription end date' })

  try {
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
