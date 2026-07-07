# Wholesale Garment Platform — Phase 1

Project setup, routing, phone-OTP authentication, full database schema, and PWA config.

## What's in this phase

- Vite + React + TypeScript + Tailwind, with the white/black/gold premium theme
  from the brief (colors, fonts, buttons, cards already themed — see
  `tailwind.config.js` and `src/styles/index.css`).
- Phone number + OTP sign-in (`src/pages/auth`), backed by Supabase Auth.
- Role-based routing: retailer home at `/`, admin dashboard at `/admin`,
  guarded by `src/routes/guards.tsx`.
- **Single-device lock**: `src/lib/device.ts` + the device-check logic in
  `AuthContext.tsx` register one device per retailer automatically, and block
  sign-in from a second device unless the admin authorizes multi-device.
- **Simple activity counters**: every retailer app open calls the
  `record_app_open` Postgres function (see `supabase/schema.sql`), which keeps
  only `total_opens`, `opens_today`, and `last_open_at` — nothing more granular.
  `src/pages/admin/RetailerDeviceCard.tsx` shows both the device and these
  counters for a retailer (this component will get wired into the full
  retailer profile page in Phase 3).
- Full database schema for the *entire* platform (`supabase/schema.sql`) —
  retailers, products, orders, payments, inventory, settings — with Row Level
  Security so retailers can only ever see their own data and admins see
  everything.
- PWA config (`vite-plugin-pwa`) so it's installable on Android/iPhone/iPad.

## What's stubbed, and what you need to do

You told me you don't have a Supabase project yet, so:

1. **Create a Supabase project** at supabase.com (free tier is fine to start).
2. **Run the schema**: paste the contents of `supabase/schema.sql` into the
   Supabase SQL editor and run it. This creates every table and RLS policy for
   all phases, not just Phase 1 — so later phases just add UI, not schema.
3. **Enable the Phone provider** (Authentication → Providers → Phone) so phone
   numbers are accepted as a login identifier. We're using password login
   instead of OTP now, so you shouldn't need a working Twilio/SMS account —
   no text messages are ever sent in this flow. If Supabase's UI insists on
   SMS provider fields being filled in before it lets you save, placeholder
   values are fine there; they're never actually used.
4. **Copy `.env.example` to `.env.local`** and fill in your project URL and
   anon key (Project Settings → API).
5. **Create your first admin account** — login is phone + password now (no
   OTP), and retailers can only be created by an admin via the
   `create-retailer` Edge Function, which itself requires an existing admin.
   So for the very first account, create it directly in the Supabase
   dashboard:
   - **Authentication → Users → Add user** → enter your phone number and a
     password, and check "Auto Confirm" (or set phone as confirmed) so it
     doesn't wait on an SMS code.
   - Then in the **SQL Editor**, run:
     ```sql
     insert into profiles (id, role)
     values ('<the user id shown in the Users list>', 'admin');
     ```
   - You can now sign in at `/login` with that phone number and password and
     land on `/admin`.

## Retailer accounts: phone + password, no OTP

Retailers never self-register. The admin creates each retailer's login via
the `create-retailer` Edge Function in `supabase/functions/create-retailer`,
which uses the service role key (server-side only, never exposed to the
browser) to create a pre-confirmed phone+password account and the matching
`retailers` row in one call. Deploy it with:

```bash
supabase functions deploy create-retailer
```

The admin dashboard UI for calling this (a "create retailer" form) lands in
Phase 3 alongside the rest of retailer management. For now the function
exists and is ready to call once you have an admin session.

## Running locally

```bash
npm install
npm run dev
```

## Deploying to GitHub Pages

`vite.config.ts` has `base: "/garment-platform/"` — change this to match
whatever you name the GitHub repo (or to `"/"` if you're using a custom
domain / a `username.github.io` repo). Then:

```bash
npm run build
# push the contents of dist/ to a `gh-pages` branch, or use an action like
# peaceiris/actions-gh-pages in a GitHub Actions workflow
```

I can write that GitHub Actions workflow file in a later phase once you've
got the repo created, if you'd like it to auto-deploy on every push.

## Next: Phase 2

Retailer-facing product catalog, product page (with the pieces-per-set /
number-of-sets calculator), cart, and checkout.
