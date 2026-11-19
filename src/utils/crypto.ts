// Encrypts the user's API key in the browser before it leaves the page.
// The server's public key is fetched once and cached; the raw key is never stored.

interface ServerKey {
  publicKey: CryptoKey
  clockOffset: number // serverTime - browser time, so a wrong local clock doesn't matter
  fetchedAt: number
}

const CACHE_TTL_MS = 10 * 60 * 1000 // refetch periodically so a rotated server key is picked up

let cache: Promise<ServerKey> | null = null

async function fetchServerKey(): Promise<ServerKey> {
  const res = await fetch('/api/public-key')
  if (!res.ok) throw new Error('Failed to initialise secure session')
  const { publicKey: pemKey, serverTime } = await res.json() as { publicKey: string; serverTime: number }

  // Convert PEM string → DER ArrayBuffer for Web Crypto
  const pem = pemKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))

  const publicKey = await crypto.subtle.importKey(
    'spki',
    der.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )

  return { publicKey, clockOffset: serverTime - Date.now(), fetchedAt: Date.now() }
}

async function getServerKey(): Promise<ServerKey> {
  if (cache) {
    const cached = await cache.catch(() => null)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached
  }
  cache = fetchServerKey()
  cache.catch(() => { cache = null }) // don't cache failures
  return cache
}

export async function encryptApiKey(apiKey: string): Promise<{ encryptedKey: string }> {
  const { publicKey, clockOffset } = await getServerKey()

  // Server time is sealed inside the ciphertext so the server can reject replays
  const payload = `${Date.now() + clockOffset}.${apiKey}`
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, new TextEncoder().encode(payload))
  const encryptedKey = btoa(String.fromCharCode(...new Uint8Array(encrypted)))

  return { encryptedKey }
}

// Test-only
export function _resetServerKeyCache() {
  cache = null
}
