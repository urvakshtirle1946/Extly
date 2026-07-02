'use client'

import { useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'

declare global {
  interface Window {
    Razorpay: any
  }
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== 'undefined') {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export interface RazorpayOptions {
  /** Amount in INR (e.g. 499 for ₹499) */
  amount: number
  currency?: string
  name?: string
  description?: string
  onSuccess?: (data: { payment_id: string; order_id: string }) => void
  onError?: (error: string) => void
  onDismiss?: () => void
}

export function useRazorpay() {
  const { getToken } = useAuth()

  const openCheckout = useCallback(
    async ({
      amount,
      currency = 'INR',
      name = 'Extly',
      description = 'Pro Plan Upgrade',
      onSuccess,
      onError,
      onDismiss,
    }: RazorpayOptions) => {
      // 1. Load the Razorpay script
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        onError?.('Failed to load Razorpay. Please check your internet connection.')
        return
      }

      // 2. Get auth token
      const token = await getToken()
      if (!token) {
        onError?.('You must be logged in to make a payment.')
        return
      }

      // 3. Create order on the backend
      let order: { order_id: string; amount: number; currency: string }
      try {
        const res = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount, currency }),
        })

        if (!res.ok) {
          const err = await res.json()
          onError?.(err.error || 'Failed to create payment order.')
          return
        }

        order = await res.json()
      } catch (err: any) {
        onError?.(err.message || 'Network error. Please try again.')
        return
      }

      // 4. Open Razorpay modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_T8VDrPsIxLDRBL',
        amount: order.amount,
        currency: order.currency,
        name,
        description,
        order_id: order.order_id,
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          // 5. Verify payment signature on the backend
          try {
            const verifyRes = await fetch(`${BACKEND_URL}/api/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            if (!verifyRes.ok) {
              const err = await verifyRes.json()
              onError?.(err.error || 'Payment verification failed.')
              return
            }

            onSuccess?.({
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
            })
          } catch (err: any) {
            onError?.(err.message || 'Verification network error.')
          }
        },
        modal: {
          ondismiss: () => onDismiss?.(),
        },
        prefill: {},
        theme: {
          color: '#ffffff',
        },
      }

      const rzp = new window.Razorpay(options)

      rzp.on('payment.failed', (response: any) => {
        onError?.(
          response?.error?.description || 'Payment failed. Please try again.'
        )
      })

      rzp.open()
    },
    [getToken]
  )

  return { openCheckout }
}
