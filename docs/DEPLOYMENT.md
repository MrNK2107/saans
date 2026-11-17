# Deployment

Saans deploys to **Vercel** with no extra configuration. [`vercel.json`](../vercel.json) pins the function
region to Mumbai (`bom1`), close to the people it serves.

## Environment variables

| Variable                                                                 | Where       | Purpose                                                                        |
| ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------ |
| `GEMINI_API_KEYS`                                                        | server only | One Gemini key, or several separated by commas (rotated on a quota error)      |
| `AI_PROVIDER`                                                            | server only | `gemini`, `ollama` or `mock`. Defaults to Gemini when a key is present         |
| `GEMINI_MODELS`                                                          | server only | Optional comma-separated model chain                                           |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | public      | Firebase web config. Public by design; access is enforced by `firestore.rules` |
| `NEXT_PUBLIC_SITE_URL`                                                   | public      | Canonical origin for the sitemap and metadata                                  |

Without any AI configured the app still works: the plan is computed by code and the summary is simply absent.
Without Firebase config the sign-in button is hidden and the household stays on the device.

## Steps

1. Import the repository in Vercel (framework: Next.js).
2. Add the environment variables above. Paste the same comma-separated Gemini value you keep locally.
3. In Firebase, enable Google sign-in, add the Vercel domain under Authentication, authorised domains, and
   publish the rules: `firebase deploy --only firestore:rules`.
4. Deploy. Check `/api/health` returns `{"ok":true}`.

## Local development with your keys

```bash
npm install
node scripts/load-keys.mjs   # copies ~/.secrets/gemini.keys into .env.local, never printing a key
npm run dev
```

For a local model instead, run Ollama and set `AI_PROVIDER=ollama` and `OLLAMA_MODEL` in `.env.local`.

## Alternative: Render

The app is a standard Next.js server (`npm run build`, `npm start`), so a Render web service works with the
same environment variables.
