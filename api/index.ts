// Vercel entry point — Vercel requires serverless functions to live in api/.
// This file is intentionally thin. All application logic is in server/.
// For non-Vercel deployments (Docker, VPS, etc.) this file is never used — run: npm start
import 'dotenv/config'
import app from '../server/app'

export default app
