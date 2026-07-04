import crypto from 'crypto'

const ENCRYPTION_KEY = (process.env.KEY_ENCRYPTION_SECRET || 'promptex-default-32-char-secret!').slice(0, 32)

export function encryptKey(apiKey: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptKey(encryptedKey: string): string {
  const [ivHex, contentHex] = encryptedKey.split(':')
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(ivHex, 'hex')
  )
  return Buffer.concat([
    decipher.update(Buffer.from(contentHex, 'hex')),
    decipher.final()
  ]).toString('utf8')
}
