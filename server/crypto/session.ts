import { createPrivateKey, createPublicKey, generateKeyPairSync, privateDecrypt, constants, type KeyObject } from 'crypto'

// ─── Bring-your-own-key encryption ────────────────────────────────────────────
// One fixed RSA key pair, loaded from BYOK_PRIVATE_KEY, shared by every serverless
// instance. (A per-session key held in memory breaks on Vercel: the request that
// fetched the public key and the request that sends the encrypted key can land on
// different instances.)
//
// The browser encrypts `${serverTime}.${apiKey}`, where serverTime comes from
// GET /api/public-key. Payloads older than MAX_AGE_MS are rejected, so a captured
// ciphertext can't be replayed later. Server time is used, not the browser clock,
// so a user with a wrong system clock is not locked out.
//
// Generate a key with: npm run byok:keygen

export const MAX_AGE_MS = 5 * 60 * 1000
const MAX_CLOCK_DRIFT_MS = 30 * 1000 // tolerate small drift between serverless instances

interface KeyPair {
  privateKey: KeyObject
  publicKeyPem: string
}

let cached: KeyPair | null = null

function parsePrivateKey(raw: string): KeyObject {
  const value = raw.trim()
  // Accept raw PEM (with real or escaped newlines) or single-line base64 of the PEM
  const pem = value.includes('-----BEGIN')
    ? value.replace(/\\n/g, '\n')
    : Buffer.from(value, 'base64').toString('utf8')
  return createPrivateKey(pem)
}

function loadKeyPair(): KeyPair {
  if (cached) return cached

  const raw = process.env.BYOK_PRIVATE_KEY
  let privateKey: KeyObject

  if (raw) {
    privateKey = parsePrivateKey(raw)
  } else if (process.env.VERCEL) {
    // Fail loudly in deployments — an ephemeral key would bring back the cross-instance bug
    throw new Error('BYOK_PRIVATE_KEY is not set. Generate one with `npm run byok:keygen` and add it to the Vercel environment.')
  } else {
    console.warn('⚠  BYOK_PRIVATE_KEY not set — using a temporary key for local development (run `npm run byok:keygen`).')
    privateKey = generateKeyPairSync('rsa', { modulusLength: 4096 }).privateKey
  }

  const publicKeyPem = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString()
  cached = { privateKey, publicKeyPem }
  return cached
}

export function getPublicKey(): { publicKey: string; serverTime: number } {
  return { publicKey: loadKeyPair().publicKeyPem, serverTime: Date.now() }
}

export function decryptApiKey(encryptedKeyB64: string, now: number = Date.now()): string {
  const { privateKey } = loadKeyPair()

  const plaintext = privateDecrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(encryptedKeyB64, 'base64')
  ).toString('utf8')

  const dot = plaintext.indexOf('.')
  const issuedAt = Number(plaintext.slice(0, dot))
  const apiKey = plaintext.slice(dot + 1)

  if (dot <= 0 || !Number.isFinite(issuedAt) || !apiKey) throw new Error('Malformed encrypted key')
  if (now - issuedAt > MAX_AGE_MS) throw new Error('Encrypted key expired')
  if (issuedAt - now > MAX_CLOCK_DRIFT_MS) throw new Error('Encrypted key timestamp is in the future')

  return apiKey
}

// Test-only: forget the loaded key so a test can swap BYOK_PRIVATE_KEY
export function _resetKeyCache() {
  cached = null
}
