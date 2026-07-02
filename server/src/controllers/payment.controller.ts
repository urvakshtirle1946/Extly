import { Response } from 'express'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { db } from '../config/db'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_T8VDrPsIxLDRBL',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '60aylIzahkwbV3MVyu41YBi7',
})

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// Body: { amount: number (INR), currency?: string }
// Returns: { order_id, amount, currency }
// ──────────────────────────────────────────────────────────────────────────────
export async function handleCreateOrder(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { amount, currency = 'INR' } = req.body

  // amount must be provided in INR (we convert to paise)
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A valid amount (in INR) is required' })
  }

  const amountInPaise = Math.round(amount * 100)

  if (amountInPaise < 100) {
    return res.status(400).json({ error: 'Amount must be at least ₹1 (100 paise)' })
  }

  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `receipt_${userId}_${Date.now()}`,
    })

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (error: any) {
    console.error('[Payment] Create order failed:', error)
    if (error?.statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed' })
    }
    return res.status(500).json({ error: error.message || 'Failed to create order' })
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payment/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Returns: { success: true } or 400
// ──────────────────────────────────────────────────────────────────────────────
export async function handleVerifyPayment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required payment fields' })
  }

  try {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '60aylIzahkwbV3MVyu41YBi7')
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      console.warn('[Payment] Signature mismatch for order:', razorpay_order_id)
      return res.status(400).json({ error: 'Payment verification failed: signature mismatch' })
    }

    // ✅ Signature verified — payment is genuine
    const orderDetails: any = await razorpay.orders.fetch(razorpay_order_id)
    const amountInPaise = orderDetails.amount || 0
    const amountInINR = amountInPaise / 100

    // Determine purchased credits based on price
    let creditsToGrant = 20
    if (amountInINR === 5) creditsToGrant = 20
    else if (amountInINR === 24) creditsToGrant = 100
    else if (amountInINR === 49) creditsToGrant = 200
    else if (amountInINR === 99) creditsToGrant = 400
    else if (amountInINR === 199) creditsToGrant = 800
    else if (amountInINR === 299) creditsToGrant = 1200
    else if (amountInINR === 499) creditsToGrant = 2000
    else if (amountInINR === 749) creditsToGrant = 3000
    else if (amountInINR === 999) creditsToGrant = 4000
    else if (amountInINR === 1249) creditsToGrant = 5000
    else if (amountInINR === 1849) creditsToGrant = 7500
    // Business tiers
    else if (amountInINR === 50) creditsToGrant = 100
    else if (amountInINR === 99) creditsToGrant = 200
    else if (amountInINR === 249) creditsToGrant = 500
    else if (amountInINR === 499) creditsToGrant = 1000
    else if (amountInINR === 999) creditsToGrant = 2000
    // Fallback if price doesn't match standard packages
    else creditsToGrant = Math.round(amountInINR * 4)

    // Update user plan and add credits balance
    await db.query(
      `UPDATE users 
       SET plan = 'pro', 
           total_credits = COALESCE(total_credits, 0) + $1, 
           used_credits = 0 
       WHERE id = $2`,
      [creditsToGrant, userId]
    )

    return res.status(200).json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    })
  } catch (error: any) {
    console.error('[Payment] Verify payment failed:', error)
    return res.status(500).json({ error: error.message || 'Failed to verify payment' })
  }
}
