import type { Request, Response } from 'express'
import { getPublicKey } from '../crypto/session.js'

export function publicKeyHandler(_req: Request, res: Response) {
  try {
    res.json(getPublicKey())
  } catch (err) {
    console.error('[public-key]', err instanceof Error ? err.message : err)
    res.status(500).json({ error: 'Secure key exchange is not configured on the server.' })
  }
}
