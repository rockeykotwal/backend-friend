import { generateKeyPairSync, privateDecrypt, constants } from 'crypto'
import { randomUUID } from 'crypto'

interface SessionEntry {
  privateKey: string
  expiresAt: number
}

const store = new Map<string, SessionEntry>()
const TTL_MS = 5 * 60 * 1000

// Purge expired entries every minute — prevents unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [token, entry] of store) {
    if (entry.expiresAt < now) store.delete(token)
  }
}, 60_000).unref()

export function createSession(): { sessionToken: string; publicKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  const sessionToken = randomUUID()
  store.set(sessionToken, { privateKey, expiresAt: Date.now() + TTL_MS })
  return { sessionToken, publicKey }
}

export function decryptApiKey(sessionToken: string, encryptedKeyB64: string): string {
  const entry = store.get(sessionToken)
  if (!entry) throw new Error('Invalid or expired session token')
  if (entry.expiresAt < Date.now()) {
    store.delete(sessionToken)
    throw new Error('Session token expired')
  }
  store.delete(sessionToken) // single-use: private key gone after first decrypt
  const encrypted = Buffer.from(encryptedKeyB64, 'base64')
  const decrypted = privateDecrypt(
    { key: entry.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING },
    encrypted
  )
  return decrypted.toString('utf8')
}
