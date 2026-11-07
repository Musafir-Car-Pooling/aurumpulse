# Aurumpulse

Create a live real-time gold xauusd signal and technical analysis provider , once i press the button signal now that time check the market and provide the signal of that time or for next hour or during an hour.

This project was built with [Lovable](https://lovable.dev).

**Launch address**: https://aurumpulsefx.netlify.app

## Netlify deployment

The repository includes `netlify.toml` and Nitro's `netlify` preset. Import the
GitHub repository into Netlify, use `npm run build`, publish `dist`, and use
Node 22. Nitro generates server functions and routing: do not add a catch-all
redirect to `index.html` or publish only Vite's client output.

### Required configuration before launch

This is a full-stack application, not a static-only website. GitHub sync does
not transfer hosted authentication settings, private secrets, or schedules.

- Set the browser build variables `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` and matching server variables `SUPABASE_URL`
  and `SUPABASE_PUBLISHABLE_KEY` for the backend being used. Publishable keys
  are public; private keys must never be prefixed with `VITE_`.
- **External-hosting blocker:** privileged scan persistence, payment submission,
  webhook activation and MT5 endpoints use the generated admin client, which
  requires `SUPABASE_SERVICE_ROLE_KEY` at runtime. The managed Lovable Cloud
  service-role key is not exportable. Do not invent a value or try to retrieve
  it from the browser. Either keep the full app hosted on Lovable, or migrate
  to an independently managed backend using the self-hosting guide and its
  migration/export process. This repository alone does not make these server
  features operational on Netlify.
- Preserve database migrations, RLS, protected role checks, private payment
  storage and transactional activation/scan functions during any migration.
- Verify the auth site URL and allowed email/OAuth redirects include
  `https://aurumpulsefx.netlify.app`; preview and existing live URLs may still
  be needed. Verify Google sign-in's authorized origins with the provider.
- For crypto payments, configure `NOWPAYMENTS_API_KEY` and
  `NOWPAYMENTS_IPN_SECRET` as server-only secrets, and point NOWPayments IPN
  callbacks at `https://aurumpulsefx.netlify.app/api/public/nowpayments`.
  Without these, crypto checkout is not live.
- The existing managed minute-by-minute scanner continues targeting the
  managed application; adding Netlify does not move it. If migrating the
  backend, configure an authenticated scheduler to POST `{"kind":"market-scan"}`
  to `/api/public/jobs/scan-markets` every minute with a server-only bearer
  secret matching `LOVABLE_CRON_SECRET`. Do not enable duplicate scanners
  against the same database.
- For the MT5 EA, change its base URL and WebRequest allowlist to
  `https://aurumpulsefx.netlify.app` only after authenticated bridge requests
  have been verified on that deployment.

Self-hosting guide: https://docs.lovable.dev/tips-tricks/self-hosting

### Home-screen installation (PWA)

The app has a standalone manifest, matching 192/512px icons, a maskable icon,
Apple touch icon and favicon. Chrome/Edge can show a native install dialog
when the browser offers it. The app also has an Install app button; Safari
shows Share → Add to Home Screen instructions. Installed apps stop showing
the install offer. No service worker or offline market caching is enabled.
Signals need internet; installation does not add background push notifications.

### Launch verification checklist

After redeploying, check `/`, `/auth`, `/packages`, `/admin`, and `/mt5` with a
direct navigation and refresh. Confirm the manifest and icon URLs return 200.
Then verify email/Google sign-in, a real saved market scan, manual proof upload
and admin approval, and MT5 polling on a demo account. Crypto callbacks require
the provider secrets and a verified payment. Native app installation must be
checked in an eligible browser on the HTTPS deployment; the preview is not
evidence that the Netlify installation or backend works.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c8c090ea-6d76-47eb-84d5-e821be6528e6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
