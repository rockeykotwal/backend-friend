import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { generateKeyPairSync, publicEncrypt, constants } from 'crypto'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import { _resetKeyCache, getPublicKey } from '../crypto/session.js'
import { resolveMetaKey, ProviderNotSupportedError } from '../utils/resolveClient.js'

// Voice input (/api/transcribe) and diagrams (/api/visualize) must run only on the
// user's own Meta key — never on a server key, and never for other providers.

const PEM = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey

function encrypt(apiKey: string) {
  const { publicKey, serverTime } = getPublicKey()
  return publicEncrypt(
    { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(`${serverTime}.${apiKey}`)
  ).toString('base64')
}

let server: Server
let base = ''

beforeAll(async () => {
  vi.stubEnv('BYOK_PRIVATE_KEY', Buffer.from(PEM).toString('base64'))
  // If any route still fell back to a server key, this would make it "work" — the tests prove it doesn't
  vi.stubEnv('META_MODEL_API_KEY', 'server-key-must-not-be-used')
  _resetKeyCache()
  const { default: app } = await import('../app.js')
  server = app.listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server?.close()
  vi.unstubAllEnvs()
})

const post = (path: string, body: object) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const visualBody = { problem: 'N+1 query', fix: 'use include', impact: '500 → 1 queries' }
const audioBody = { audio: Buffer.from('RIFF....WAVE').toString('base64') }

describe('resolveMetaKey', () => {
  it('returns the decrypted key for a Meta user', () => {
    expect(resolveMetaKey({ encryptedKey: encrypt('meta-user-key'), provider: 'meta' }, 'X')).toBe('meta-user-key')
  })

  it('refuses other providers with a clear message', () => {
    for (const provider of ['openai', 'anthropic', 'deepseek', undefined]) {
      expect(() => resolveMetaKey({ encryptedKey: encrypt('k'), provider }, 'Voice input'))
        .toThrow(ProviderNotSupportedError)
    }
    expect(() => resolveMetaKey({ encryptedKey: encrypt('k'), provider: 'openai' }, 'Voice input'))
      .toThrow('Voice input needs a Meta API key')
  })

  it('refuses a request with no key', () => {
    expect(() => resolveMetaKey({ provider: 'meta' }, 'X')).toThrow('No API key provided')
  })
})

describe('POST /api/visualize', () => {
  it('401 without a user key (no server-key fallback)', async () => {
    const res = await post('/api/visualize', visualBody)
    expect(res.status).toBe(401)
  })

  it('400 with a non-Meta key', async () => {
    const res = await post('/api/visualize', { ...visualBody, encryptedKey: encrypt('sk-openai'), provider: 'openai' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('The execution plan diagram needs a Meta API key')
  })

  it('401 with a tampered key', async () => {
    const res = await post('/api/visualize', { ...visualBody, encryptedKey: 'bm90LXZhbGlk', provider: 'meta' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/transcribe', () => {
  it('401 without a user key (no server-key fallback)', async () => {
    const res = await post('/api/transcribe', audioBody)
    expect(res.status).toBe(401)
    expect((await res.json()).text).toBe('')
  })

  it('400 with a non-Meta key', async () => {
    const res = await post('/api/transcribe', { ...audioBody, encryptedKey: encrypt('sk-ant'), provider: 'anthropic' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Voice input needs a Meta API key')
  })
})
