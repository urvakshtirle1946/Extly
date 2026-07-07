'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

export interface DodoPaymentsOptions {
  amount: number
  credits: number
  planType: 'pro' | 'business'
  onSuccess?: () => void
  onError?: (error: string) => void
  onDismiss?: () => void
}

export function useDodoPayments() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)

  const openCheckout = useCallback(
    async ({
      amount,
      credits,
      planType,
      onSuccess,
      onError,
      onDismiss,
    }: DodoPaymentsOptions) => {
      setLoading(true)

      const token = await getToken()
      if (!token) {
        onError?.('You must be logged in to make a payment.')
        setLoading(false)
        return
      }

      try {
        const returnUrl = `${window.location.origin}/dashboard?tab=billing`
        const res = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount, credits, planType, returnUrl }),
        })

        if (!res.ok) {
          const err = await res.json()
          onError?.(err.error || 'Failed to create checkout session.')
          setLoading(false)
          return
        }

        const data = await res.json()
        if (data.checkout_url) {
          // Redirect the user to the Dodo Payments hosted checkout page
          window.location.href = data.checkout_url
        } else {
          onError?.('No checkout URL returned from payment gateway.')
        }
      } catch (err: any) {
        onError?.(err.message || 'Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [getToken]
  )

  return { openCheckout, loading }
}
