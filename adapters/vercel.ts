import 'dotenv/config'
import app from '../server/app'

// Vercel serverless adapter — exports the Express app as a handler.
// The core server lives in server/. This file is only needed for Vercel deployments.
// For any other host, use: npm start
export default app
