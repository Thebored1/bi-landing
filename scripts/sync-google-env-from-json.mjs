#!/usr/bin/env node
/**
 * Merges Google OAuth JSON `web` credentials into `.env.local`.
 * Project root = parent of `scripts/` (does not depend on shell cwd).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env.local')

function findDefaultJson() {
  let files = []
  try {
    files = fs.readdirSync(root)
  } catch {
    files = []
  }
  const hit = files.find((f) => /^client_secret.*\.json$/i.test(f))
  if (!hit) {
    console.error(
      'No client_secret*.json in project root. Pass the file path:\n  node scripts/sync-google-env-from-json.mjs ./your-download.json',
    )
    process.exit(1)
  }
  return path.join(root, hit)
}

const arg = process.argv[2]
const jsonPath = arg ? path.resolve(root, arg) : findDefaultJson()

let data
try {
  data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
} catch (e) {
  console.error('Could not read or parse JSON:', jsonPath)
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

const web = data.web || data.installed
if (!web?.client_id || !web?.client_secret) {
  console.error('JSON must contain web.client_id and web.client_secret (Web application client).')
  process.exit(1)
}

const id = String(web.client_id).trim()
const secret = String(web.client_secret).trim()

let lines = []
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8')
  // Strip UTF-8 BOM so line keys match
  lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/)
} else {
  lines = [
    '# Local secrets — gitignored',
    '',
    'NEXTAUTH_URL=http://localhost:3000',
    'NEXTAUTH_SECRET=',
    '',
  ]
}

function upsert(key, value) {
  const prefix = `${key}=`
  const row = `${prefix}${value}`
  const i = lines.findIndex((l) => l.startsWith(prefix))
  if (i >= 0) lines[i] = row
  else lines.push(row)
}

upsert('GOOGLE_CLIENT_ID', id)
upsert('GOOGLE_CLIENT_SECRET', secret)

const nLine = lines.find((l) => l.startsWith('NEXTAUTH_SECRET='))
const nSecret = nLine ? nLine.slice('NEXTAUTH_SECRET='.length).trim() : ''
if (!nSecret) {
  const { randomBytes } = await import('node:crypto')
  upsert('NEXTAUTH_SECRET', randomBytes(32).toString('base64'))
  console.log('Generated NEXTAUTH_SECRET (NextAuth requires a non-empty secret).')
}

const out = lines.join('\n').replace(/\n+$/, '') + '\n'
fs.writeFileSync(envPath, out, 'utf8')

// Verify without printing secrets
const verify = fs.readFileSync(envPath, 'utf8')
const secMatch = verify.match(/^GOOGLE_CLIENT_SECRET=(.*)$/m)
const secLen = secMatch && secMatch[1] ? secMatch[1].trim().length : 0
if (secLen < 8) {
  console.error('Write verification failed: GOOGLE_CLIENT_SECRET still empty or too short.')
  console.error(`Tried to write to: ${envPath}`)
  process.exit(1)
}

console.log(`Wrote: ${envPath}`)
console.log(`From:  ${jsonPath}`)
console.log(`OK — client id ${id.length} chars, client secret ${secLen} chars (values not shown).`)
console.log('If your editor still shows empty lines, reload the file from disk (discard stale buffer).')
