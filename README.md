# Target Tracker

Personal daily & weekly target tracker. A static Next.js (React, TypeScript, Tailwind) app that stores everything **on the device** (browser storage). No server, no database, no account.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build & host
`npm run build` writes the finished site to `out/`. Upload that folder to any static host once (Netlify Drop, Vercel, Cloudflare Pages, GitHub Pages) to get an HTTPS address, open it in Chrome on Android, then **⋮ → Install app**. After installing it works fully offline; the host is only needed to install or update.

To update the installed app later, rebuild, re-upload `out/`, and open the app twice (it updates in the background).

## Your data
- Stored in the phone's browser storage for the installed app; it never goes to the host.
- Use **History → Backup & restore** to save a JSON backup and restore it (also how you move to a new phone). Clearing site data or uninstalling the app erases the data.
- Daily and weekly targets are kept separately; nothing carries over between days/weeks unless you tap *Copy over* or *Move to…*.

## Layout
- `src/app` — pages (`/`, `/daily`, `/weekly`, `/history`) and the manifest
- `src/lib/api.ts` — the on-device data layer (targets, summaries, backup)
- `src/components`, `src/lib` — UI and helpers
- `public/sw.js` — offline-first service worker
