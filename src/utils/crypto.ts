export async function getEncryptedSession(apiKey: string): Promise<{ sessionToken: string; encryptedKey: string }> {
  const res = await fetch('/api/session-key')
  if (!res.ok) throw new Error('Failed to initialise secure session')
  const { sessionToken, publicKey: pemKey } = await res.json() as { sessionToken: string; publicKey: string }

  // Convert PEM string → DER ArrayBuffer for Web Crypto
  const pem = pemKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '')
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))

  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    der.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )

  // Encrypt — raw apiKey string is gone after this; only ciphertext leaves the browser
  const encoded = new TextEncoder().encode(apiKey)
  const encrypted = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, encoded)
  const encryptedKey = btoa(String.fromCharCode(...new Uint8Array(encrypted)))

  return { sessionToken, encryptedKey }
}
