type KindeTokenResponse = { access_token?: string; expires_in?: number }

export type KindeUser = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  username?: string | null
  picture?: string | null
  is_suspended?: boolean
  total_sign_ins?: number
  last_signed_in?: string | null
  created_on?: string | null
}

let accessToken: string | null = null
let accessTokenExpiresAt = 0

function getKindeDomain() {
  const configuredDomain = process.env.KINDE_ISSUER_URL || process.env.KINDE_DOMAIN
  if (!configuredDomain) throw new Error('Kinde Management API is not configured. Set KINDE_ISSUER_URL.')
  return configuredDomain.replace(/\/$/, '')
}

async function getManagementAccessToken() {
  if (accessToken && Date.now() < accessTokenExpiresAt) return accessToken

  const clientId = process.env.KINDE_M2M_CLIENT_ID
  const clientSecret = process.env.KINDE_M2M_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Kinde Management API is not configured. Set KINDE_M2M_CLIENT_ID and KINDE_M2M_CLIENT_SECRET.')
  }

  const domain = getKindeDomain()
  const response = await fetch(`${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `${domain}/api`,
      scope: 'read:users',
    }),
  })

  if (!response.ok) throw new Error(`Unable to authenticate with Kinde (${response.status})`)
  const payload = await response.json() as KindeTokenResponse
  if (!payload.access_token) throw new Error('Kinde did not return a Management API access token')

  accessToken = payload.access_token
  accessTokenExpiresAt = Date.now() + Math.max(30, (payload.expires_in || 300) - 30) * 1000
  return accessToken
}
export async function getKindeUsers(search = ''): Promise<KindeUser[] | null> {
  const clientId = process.env.KINDE_M2M_CLIENT_ID
  const clientSecret = process.env.KINDE_M2M_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return null
  }

  try {
    const domain = getKindeDomain()
    const token = await getManagementAccessToken()
    const endpoint = search.trim()
      ? `${domain}/api/v1/search/users?${new URLSearchParams({ query: search.trim(), expand: 'identities,properties', page_size: '100' })}`
      : `${domain}/api/v1/users?${new URLSearchParams({ page_size: '100' })}`
    const response = await fetch(endpoint, {
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    })

    if (!response.ok) {
      console.warn(`[Kinde Service] Unable to fetch users from Kinde (${response.status})`)
      return null
    }
    const payload = await response.json() as { users?: KindeUser[]; results?: KindeUser[]; data?: KindeUser[] }
    return payload.users || payload.results || payload.data || []
  } catch (error: any) {
    console.warn(`[Kinde Service] Management API error: ${error.message}`)
    return null
  }
}
