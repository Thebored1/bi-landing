/**
 * Remove Next caches. Retries on Windows when another process still holds files under `.next`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const targets = ['.next', path.join('node_modules', '.cache'), '.turbo']

async function rmWithRetry(dir, attempts = 8) {
  const full = path.join(root, dir)
  for (let i = 0; i < attempts; i++) {
    try {
      if (fs.existsSync(full)) {
        fs.rmSync(full, { recursive: true, force: true })
      }
      return
    } catch {
      if (i === attempts - 1) {
        throw new Error(`Could not remove ${full}. Stop all "next dev" / Node processes and retry.`)
      }
      await delay(200 + i * 150)
    }
  }
}

for (const t of targets) {
  await rmWithRetry(t)
}

console.log('Cleaned:', targets.join(', '))
console.log('If clean failed, stop every `next dev` / Node process using this folder, then retry.')
