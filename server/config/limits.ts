// ─── Layer 1: Request size caps ───────────────────────────────────────────────
// Rejects oversized payloads before they reach the model — prevents token abuse

export const MAX_BODY_SIZE = '50kb'             // analyze, github, visualize — text only
export const AGENT_MAX_BODY_SIZE = '500kb'      // folder scan — extracted ORM blocks from many files
export const TRANSCRIBE_MAX_BODY_SIZE = '1mb'   // audio base64 — ~24s of 16kHz mono WAV


// ─── Layer 2: IP rate limits ───────────────────────────────────────────────────
// All limits are per IP address. Adjust here — no other file needs changing.

export const RATE_LIMITS = {
  // How long each window lasts (milliseconds)
  WINDOW_MS: 15 * 60 * 1000,    // 15 minutes

  // Max requests per IP per window, per endpoint
  ANALYZE:    20,   // single query analysis   — model call per request
  GITHUB:      5,   // GitHub repo scan        — downloads files + model call (heavy)
  AGENT:       5,   // folder upload scan      — same cost as GitHub scan
  VISUALIZE:  20,   // execution plan image    — image generation per request
  TRANSCRIBE: 20,   // voice transcription     — lighter, short audio clips
} as const


// ─── Response sent when a limit is hit ────────────────────────────────────────

export const RATE_LIMIT_MESSAGE = {
  error: 'Too many requests — please wait a few minutes and try again.',
}
