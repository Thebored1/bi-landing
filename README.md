# Scopo (bi-landing)

AI-powered business lookup and profile hub for agencies.  
Paste a company URL, extract structured business intel with Gemini, save profiles, and ask follow-up business questions.

## Tech stack

- `Next.js` App Router
- `NextAuth` (Google OAuth)
- `Prisma` + `SQLite`
- `Gemini API` (`@google/genai`)

## Prerequisites

- Node.js `18+` (Node `20+` recommended)
- npm
- Google OAuth Web App credentials
- Gemini API key

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Copy `.env.example` to `.env.local` and fill required values:

```bash
# PowerShell
Copy-Item .env.example .env.local

# macOS/Linux
cp .env.example .env.local
```

Required in `.env.local`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `GEMINI_API_KEY`
- `DATABASE_URL` (default already set to `file:./prisma/dev.db`)

Optional:

- `GEMINI_MODEL` (default is `gemini-2.5-flash`)
- `NEXTAUTH_URL` (usually leave unset; app resolves host dynamically)

## 3) Setup Google OAuth

In Google Cloud Console (OAuth client type: **Web application**), add every origin you use:

- Authorized JavaScript origins:  
  - `http://localhost:3000`
  - `https://<your-ngrok-subdomain>.ngrok-free.app` (if used)
- Authorized redirect URIs:  
  - `http://localhost:3000/api/auth/callback/google`
  - `https://<your-ngrok-subdomain>.ngrok-free.app/api/auth/callback/google`

## 4) Run database migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

For a fresh local DB in development, you can also use:

```bash
npx prisma migrate dev
```

## 5) Start the app

```bash
npm run dev:fast
```

Open: [http://localhost:3000](http://localhost:3000)

## Useful scripts

- `npm run dev:fast` - start dev server (no clean step)
- `npm run dev` - clean `.next` then run dev server
- `npm run build` - production build
- `npm run preview` - build + start production server
- `npm run env:nextauth-secret` - generate a NextAuth secret
- `npm run env:sync-google` - sync Google credentials from local JSON helper

## Troubleshooting

- **Redirects to login on refresh**
  - Confirm you are on the same host you authenticated with (`localhost` vs `ngrok`).
  - Ensure that host is added in Google OAuth origins + redirect URIs.

- **Gemini model errors**
  - Use a valid model ID in `GEMINI_MODEL` (example: `gemini-2.5-flash`).
  - Do not include a `models/` prefix.

- **`better-sqlite3` Node ABI mismatch**
  - Rebuild native module for your active Node version:
    ```bash
    npm rebuild better-sqlite3
    npx prisma generate
    ```

- **Stale dev assets / missing chunks**
  - Stop all dev servers, then run:
    ```bash
    npm run clean
    npm run dev:fast
    ```

