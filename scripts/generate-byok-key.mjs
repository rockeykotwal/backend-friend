// Generates the RSA key pair used to encrypt users' API keys in the browser.
// Prints the private key as one base64 line — paste it as BYOK_PRIVATE_KEY in
// Vercel (Project → Settings → Environment Variables) and, optionally, local .env.
// Keep it secret. Rotating it only requires replacing the env var and redeploying.
import { generateKeyPairSync } from 'crypto'

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

console.log('BYOK_PRIVATE_KEY=' + Buffer.from(privateKey).toString('base64'))
