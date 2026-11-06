import type { Request, Response } from 'express'
import { createSession } from '../crypto/session.js'

export function sessionKeyHandler(_req: Request, res: Response) {
  const { sessionToken, publicKey } = createSession()
  res.json({ sessionToken, publicKey })
}
