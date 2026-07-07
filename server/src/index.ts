import 'dotenv/config' 
import express from 'express'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import { initDb, db } from './config/db'
import { authMiddleware } from './middleware/auth.middleware'
import { 
  handleGetProjects, 
  handleGetProject, 
  handleCreateProject, 
  handleDeleteProject, 
  handleSaveFile,
  handleMessageFeedback,
  handleGetUsage,
  handleUpgradePlan,
  handleUpdateProjectSettings
} from './controllers/project.controller'
import { handleGenerate } from './controllers/ai.controller'
import { 
  handleStartPreview, 
  handleGetLogs, 
  handleStopPreview,
  handleAddLog
} from './controllers/preview.controller'
import { handleDownload } from './controllers/download.controller'
import { handleGetHistory, handleRollback } from './controllers/history.controller'
import { handleCreateOrder, handleVerifyPayment, handleRazorpayWebhook } from './controllers/payment.controller'
import { handleSaveUserByok, handleGetUserByok, handleDeleteUserByok } from './controllers/user.controller'

const app = express()
const port = process.env.PORT || 4000

// Enable CORS for frontend
// Dynamic check: allow localhost, any *.vercel.app preview URL, and custom domains
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||                          // Postman / server-to-server
        origin.includes('localhost') ||     // Local dev
        origin.includes('vercel.app') ||    // Any Vercel preview or production URL
        origin.includes('promptex.io')         // Future custom domain
      ) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`))
      }
    },
    credentials: true,
  })
)

// Parse JSON bodies, capturing raw body buffer for webhook signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf
  }
}))

console.log('[Server] CLERK_PUBLISHABLE_KEY is:', process.env.CLERK_PUBLISHABLE_KEY ? 'FOUND' : 'MISSING')
console.log('[Server] CLERK_SECRET_KEY is:', process.env.CLERK_SECRET_KEY ? 'FOUND' : 'MISSING')

// Clerk middleware (makes auth available on req.auth for all routes)
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY
}))

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ExtensionCraft Backend' })
})

// ============================================================================
// PROJECT CRUD ROUTES
// ============================================================================
app.get('/api/projects', authMiddleware as any, handleGetProjects as any)
app.get('/api/projects/:id', authMiddleware as any, handleGetProject as any)
app.post('/api/projects', authMiddleware as any, handleCreateProject as any)
app.delete('/api/projects/:id', authMiddleware as any, handleDeleteProject as any)
app.put('/api/projects/:id/files', authMiddleware as any, handleSaveFile as any)
app.put('/api/projects/:id/settings', authMiddleware as any, handleUpdateProjectSettings as any)
app.post('/api/projects/:id/messages/:messageId/feedback', authMiddleware as any, handleMessageFeedback as any)
app.get('/api/usage', authMiddleware as any, handleGetUsage as any)
app.post('/api/usage/upgrade', authMiddleware as any, handleUpgradePlan as any)
app.post('/api/user/byok', authMiddleware as any, handleSaveUserByok as any)
app.get('/api/user/byok', authMiddleware as any, handleGetUserByok as any)
app.delete('/api/user/byok', authMiddleware as any, handleDeleteUserByok as any)

// ============================================================================
// AI & GENERATION ROUTES
// ============================================================================
app.post('/api/ai/generate', authMiddleware as any, handleGenerate as any)

// ============================================================================
// PREVIEW ROUTES
// ============================================================================
app.post('/api/projects/:id/preview', authMiddleware as any, handleStartPreview as any)
app.post('/api/preview/:sessionId/log', handleAddLog as any)
app.get('/api/preview/:sessionId/logs', handleGetLogs as any)
app.delete('/api/preview/:sessionId', authMiddleware as any, handleStopPreview as any)

// ============================================================================
// DOWNLOAD ROUTES
// ============================================================================
app.post('/api/download', authMiddleware as any, handleDownload as any)

// ============================================================================
// VERSION HISTORY ROUTES
// ============================================================================
app.get('/api/projects/:id/history', authMiddleware as any, handleGetHistory as any)
app.post('/api/projects/:id/history/:genId/rollback', authMiddleware as any, handleRollback as any)

// ============================================================================
// PAYMENT ROUTES (Razorpay)
// ============================================================================
app.post('/api/payment/create-order', authMiddleware as any, handleCreateOrder as any)
app.post('/api/payment/verify', authMiddleware as any, handleVerifyPayment as any)
app.post('/api/payment/webhook', handleRazorpayWebhook as any)

// ============================================================================
// ADMIN ROUTES
// ============================================================================
const requireAdminKey = (req: any, res: any, next: any) => {
  const adminKey = req.headers['x-admin-key']
  const secretKey = process.env.ADMIN_SECRET_KEY || 'promptex_secret_admin_key_2026'
  if (!adminKey || adminKey !== secretKey) {
    return res.status(403).json({ error: 'Unauthorized: Invalid admin key' })
  }
  next()
}

app.post('/api/admin/users/:userId/credits', requireAdminKey as any, async (req: any, res: any) => {
  const { userId } = req.params
  const { total_credits } = req.body

  try {
    await db.query(
      `UPDATE users SET total_credits = $1 WHERE id = $2`,
      [total_credits, userId]
    )

    const { rows } = await db.query(
      'SELECT id, total_credits, used_credits FROM users WHERE id = $1',
      [userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ success: true, user: rows[0] })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Initialize Database and Start Server
initDb().then(() => {
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`[Server] Running on port ${port}`)
  })
}).catch((err) => {
  console.error('[Server] Database initialization failed:', err)
})
