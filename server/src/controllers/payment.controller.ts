import { Response } from 'express'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { db } from '../config/db'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_TAZA36HWyd2Qxt',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'Tk6HZp6lwNaTig2C3e4cYWr7',
})

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// Body: { amount: number, credits: number, planType: string }
// Returns: { order_id, amount, currency }
// ──────────────────────────────────────────────────────────────────────────────
export async function handleCreateOrder(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const userEmail = req.user?.email
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { amount, credits, planType } = req.body

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A valid amount is required' })
  }

  const amountInPaise = Math.round(amount * 100)

  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: {
        user_id: userId,
        credits: String(credits || 0),
        plan: planType || 'pro',
        amount: String(amount),
      }
    })

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (error: any) {
    console.error('[Razorpay] Create order failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to create Razorpay order' })
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payment/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Returns: { success: true, payment_id, order_id, credits_granted }
// ──────────────────────────────────────────────────────────────────────────────
export async function handleVerifyPayment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required payment verification fields' })
  }

  try {
    console.log('[Razorpay] Verifying payment for order:', razorpay_order_id, 'payment:', razorpay_payment_id)
    // 1. Verify Razorpay Signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const secret = process.env.RAZORPAY_KEY_SECRET || 'KW30ceEC4P2nSbQimNZzo96M'
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    console.log('[Razorpay] Signature check:', {
      received: razorpay_signature,
      expected: expectedSignature,
      secretUsed: secret.substring(0, 4) + '...'
    })

    if (expectedSignature !== razorpay_signature) {
      console.warn('[Razorpay] Signature mismatch for order:', razorpay_order_id)
      return res.status(400).json({ error: 'Payment verification failed: signature mismatch' })
    }

    // 2. Check processed payments for idempotency
    const existing = await db.query(
      'SELECT * FROM processed_payments WHERE order_id = $1',
      [razorpay_order_id]
    )

    if (existing.rows.length > 0) {
      return res.status(200).json({
        success: true,
        credits_granted: existing.rows[0].credits,
        message: 'Payment already processed'
      })
    }

    // 3. Fetch order from Razorpay to get notes (credits count, target user ID)
    const orderDetails: any = await razorpay.orders.fetch(razorpay_order_id)
    const notes = orderDetails.notes || {}
    const targetUserId = notes.user_id || userId
    const creditsToGrant = parseInt(notes.credits || '0', 10)
    const amountInINR = (orderDetails.amount || 0) / 100

    // Begin Database transaction to avoid race conditions
    await db.query('BEGIN')

    // Double check with LOCK to prevent race conditions
    const checkAgain = await db.query(
      'SELECT * FROM processed_payments WHERE order_id = $1 FOR UPDATE',
      [razorpay_order_id]
    )

    if (checkAgain.rows.length > 0) {
      await db.query('ROLLBACK')
      return res.status(200).json({
        success: true,
        credits_granted: checkAgain.rows[0].credits,
        message: 'Payment already processed'
      })
    }

    // Insert record
    await db.query(
      `INSERT INTO processed_payments (order_id, payment_id, user_id, amount, credits, status)
       VALUES ($1, $2, $3, $4, $5, 'completed')`,
      [razorpay_order_id, razorpay_payment_id, targetUserId, amountInINR, creditsToGrant]
    )

    // Update user credits
    await db.query(
      `UPDATE users 
       SET plan = 'pro', 
           total_credits = COALESCE(total_credits, 0) + $1, 
           used_credits = 0 
       WHERE id = $2`,
      [creditsToGrant, targetUserId]
    )

    await db.query('COMMIT')

    return res.status(200).json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      credits_granted: creditsToGrant
    })
  } catch (error: any) {
    await db.query('ROLLBACK').catch(() => {})
    console.error('[Razorpay] Verify payment failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to verify payment' })
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// Request headers: x-razorpay-signature
// Request body: raw buffer parsed under verify config
// ──────────────────────────────────────────────────────────────────────────────
export async function handleRazorpayWebhook(req: any, res: Response) {
  const signature = req.headers['x-razorpay-signature'] as string
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!signature || !secret) {
    console.warn('[Webhook] Missing Razorpay webhook signature or secret key')
    return res.status(400).json({ error: 'Webhook configuration incomplete' })
  }

  try {
    // Access request body buffer
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body)

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.warn('[Webhook] Webhook signature verification failed')
      return res.status(400).json({ error: 'Signature mismatch' })
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event

    console.log(`[Webhook] Razorpay event received: ${event}`)

    if (event === 'order.paid') {
      const orderData = payload.payload.order.entity
      const paymentData = payload.payload.payment.entity
      const orderId = orderData.id
      const paymentId = paymentData.id
      const amountInINR = orderData.amount / 100
      const notes = orderData.notes || {}
      const targetUserId = notes.user_id
      const creditsToGrant = parseInt(notes.credits || '0', 10)

      if (!targetUserId) {
        console.warn('[Webhook] No user_id found in order notes:', orderId)
        return res.status(200).json({ received: true, error: 'No user_id in notes' })
      }

      // 1. Idempotency: Check if already processed
      const existing = await db.query(
        'SELECT * FROM processed_payments WHERE order_id = $1',
        [orderId]
      )

      if (existing.rows.length > 0) {
        console.log('[Webhook] Order already processed:', orderId)
        return res.status(200).json({ success: true, message: 'Already processed' })
      }

      // 2. Transactional locking and updates
      await db.query('BEGIN')

      const checkAgain = await db.query(
        'SELECT * FROM processed_payments WHERE order_id = $1 FOR UPDATE',
        [orderId]
      )

      if (checkAgain.rows.length > 0) {
        await db.query('ROLLBACK')
        console.log('[Webhook] Order already processed under lock:', orderId)
        return res.status(200).json({ success: true, message: 'Already processed' })
      }

      // Insert record
      await db.query(
        `INSERT INTO processed_payments (order_id, payment_id, user_id, amount, credits, status)
         VALUES ($1, $2, $3, $4, $5, 'completed')`,
        [orderId, paymentId, targetUserId, amountInINR, creditsToGrant]
      )

      // Grant credits and set plan
      await db.query(
        `UPDATE users 
         SET plan = 'pro', 
             total_credits = COALESCE(total_credits, 0) + $1, 
             used_credits = 0 
         WHERE id = $2`,
        [creditsToGrant, targetUserId]
      )

      await db.query('COMMIT')
      console.log(`[Webhook] Webhook order ${orderId} processed successfully. Granted ${creditsToGrant} credits to user ${targetUserId}`)
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    await db.query('ROLLBACK').catch(() => {})
    console.error('[Webhook] Webhook processing failed:', error)
    return res.status(500).json({ error: error.message || 'Webhook processing failed' })
  }
}
