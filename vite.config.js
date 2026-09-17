import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: odds are now fetched via netlify/functions/odds.js (server-side key),
// not proxied directly to api.the-odds-api.com from the browser. For local dev
// with working odds/AI-analysis/injury-report calls, run `netlify dev` (which
// serves this Vite app AND the Netlify functions together) instead of `vite`
// directly — plain `vite` has no Netlify Functions runtime to hit.
export default defineConfig({
  plugins: [react()],
})
