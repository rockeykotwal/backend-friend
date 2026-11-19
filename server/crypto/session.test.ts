import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateKeyPairSync, publicEncrypt, constants } from 'crypto'
import { decryptApiKey, getPublicKey, MAX_AGE_MS, _resetKeyCache } from './session.js'
import { encryptApiKey, _resetServerKeyCache } from '../../src/utils/crypto.js'
import { resolveClient } from '../utils/resolveClient.js'

const API_KEY = 'sk-proj-' + 'a'.repeat(156) // long OpenAI project key (~164 chars)

function newPemKey() {
  return generateKeyPairSync('rsa', {
    modulusLength: 4096,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey
}

// Serves GET /api/public-key from the real server code, like the deployed endpoint
function stubPublicKeyEndpoint(serverTimeShift = 0) {
  const fetchMock = vi.fn(async () => {
    const body = getPublicKey()
    return new Response(JSON.stringify({ ...body, serverTime: body.serverTime + serverTimeShift }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const PEM = newPemKey()

describe('BYOK encryption (browser → server)', () => {
  beforeEach(() => {
    vi.stubEnv('BYOK_PRIVATE_KEY', Buffer.from(PEM).toString('base64'))
    _resetKeyCache()
    _resetServerKeyCache()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('round-trips a long API key encrypted by the browser code', async () => {
    stubPublicKeyEndpoint()
    const { encryptedKey } = await encryptApiKey(API_KEY)
    expect(decryptApiKey(encryptedKey)).toBe(API_KEY)
  })

  it('works across instances: any instance with the same env key can decrypt', async () => {
    stubPublicKeyEndpoint()
    const { encryptedKey } = await encryptApiKey(API_KEY)
    _resetKeyCache() // simulate a different (cold) serverless instance
    expect(decryptApiKey(encryptedKey)).toBe(API_KEY)
  })

  it('accepts raw PEM in the env var too (real or escaped newlines)', async () => {
    vi.stubEnv('BYOK_PRIVATE_KEY', PEM.replace(/\n/g, '\\n'))
    _resetKeyCache()
    stubPublicKeyEndpoint()
    const { encryptedKey } = await encryptApiKey(API_KEY)
    expect(decryptApiKey(encryptedKey)).toBe(API_KEY)
  })

  it('caches the public key: one fetch for several encryptions', async () => {
    const fetchMock = stubPublicKeyEndpoint()
    await encryptApiKey(API_KEY)
    await encryptApiKey(API_KEY)
    await encryptApiKey(API_KEY)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a replayed ciphertext older than 5 minutes', async () => {
    stubPublicKeyEndpoint()
    const { encryptedKey } = await encryptApiKey(API_KEY)
    expect(() => decryptApiKey(encryptedKey, Date.now() + MAX_AGE_MS + 1000)).toThrow('expired')
  })

  it('accepts a ciphertext still inside the 5 minute window', async () => {
    stubPublicKeyEndpoint()
    const { encryptedKey } = await encryptApiKey(API_KEY)
    expect(decryptApiKey(encryptedKey, Date.now() + MAX_AGE_MS - 5000)).toBe(API_KEY)
  })

  it('uses server time, so a browser clock that is 2 hours off still works', async () => {
    stubPublicKeyEndpoint()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() - 2 * 60 * 60 * 1000) // browser clock 2h behind
    // getPublicKey() runs under the same fake clock, so shift the stubbed server time back to real time
    stubPublicKeyEndpoint(2 * 60 * 60 * 1000)
    const { encryptedKey } = await encryptApiKey(API_KEY)
    vi.useRealTimers()
    expect(decryptApiKey(encryptedKey)).toBe(API_KEY)
  })

  it('rejects a timestamp from the future', () => {
    const { publicKey } = getPublicKey()
    const forged = publicEncrypt(
      { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      Buffer.from(`${Date.now() + 10 * 60 * 1000}.${API_KEY}`)
    ).toString('base64')
    expect(() => decryptApiKey(forged)).toThrow('future')
  })

  it('rejects a payload without a timestamp (old client format)', () => {
    const { publicKey } = getPublicKey()
    const legacy = publicEncrypt(
      { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      Buffer.from('sk-noTimestamp')
    ).toString('base64')
    expect(() => decryptApiKey(legacy)).toThrow()
  })

  it('rejects a ciphertext made for a different server key', async () => {
    stubPublicKeyEndpoint()
    const { encryptedKey } = await encryptApiKey(API_KEY)
    vi.stubEnv('BYOK_PRIVATE_KEY', Buffer.from(newPemKey()).toString('base64'))
    _resetKeyCache()
    expect(() => decryptApiKey(encryptedKey)).toThrow()
  })

  it('refuses to run on Vercel without BYOK_PRIVATE_KEY (no silent ephemeral key)', () => {
    vi.stubEnv('BYOK_PRIVATE_KEY', '')
    vi.stubEnv('VERCEL', '1')
    _resetKeyCache()
    expect(() => getPublicKey()).toThrow('BYOK_PRIVATE_KEY is not set')
  })

  it('resolveClient builds a provider from an encrypted key and rejects a missing one', async () => {
    stubPublicKeyEndpoint()
    const { encryptedKey } = await encryptApiKey(API_KEY)
    expect(resolveClient({ encryptedKey, provider: 'openai' }).resolveModel('balanced')).toBe('gpt-4o-mini')
    expect(() => resolveClient({})).toThrow('No API key provided')
  })
})
