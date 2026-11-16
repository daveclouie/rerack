# ReRack

A digital closet and clothing marketplace built with Next.js, Supabase, Gemini, and the open-source `rembg` project.

## Local setup

1. Install Node.js 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and add a Supabase project URL, anon key, service-role key, and site URL. Never expose the service-role key to the browser or commit `.env.local`.
3. For a new Supabase project, run `supabase/schema.sql` in the SQL Editor. If you already applied an earlier schema, run all unapplied migrations in timestamp order: `20261115220000_outfit_shop.sql`, `20261116150000_account_security.sql`, `20261116190000_email_only_auth.sql`, then `20261116193000_image_processing_limit.sql`.
4. In Supabase Auth, allow the local and production callback URLs: `/auth/callback`. Configure email delivery and OTP templates using `{{ .Token }}` for email signup, recovery, and account verification.
5. Run `npm run dev`.

Username and email lookups run on the server with the service-role key. Public signup and password actions use the Supabase anon client and authenticated session cookies. Phone signup, login, recovery, account changes, and listing contacts are disabled. Existing phone columns remain optional and dormant for a future re-enable; listing phone snapshots are cleared by the email-only migration. Shop listings hide seller email by default and provide a separate control to show or hide it.

The app uses Tailwind CSS v4 theme tokens in `src/app/globals.css`; cream is the default and the Settings theme control persists the selected mode in local storage.

The closet camera flow uses `rembg` for local background removal and Gemini for clothing attributes. Install Python 3.10+ and the CPU package with `python -m pip install -r python/requirements.txt`; the first background-removal request downloads the model. Set `PYTHON_BIN` if the Python executable is not on `PATH`. `GEMINI_API_KEY` is required for item recognition. Image processing allows up to 300 seconds and is limited to 20 requests per authenticated account per UTC day. Short-timeout serverless targets are not supported for this flow; use a long-running Python-capable container or move processing to a worker.

### Docker deployment

Build the standalone app with the public Supabase values available at build time:

```sh
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY -t rerack .
```

Run with `.env.local` mounted as runtime environment configuration. `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must only be supplied at runtime, never as build arguments. Keep `.env.local` out of the Docker image and Git. The container includes Python and `python/requirements.txt`; allow long-running requests for image processing.

```sh
docker run --env-file .env.local -p 3000:3000 rerack
```

The outfit generator only uses clean closet items, applies the selected vibe, and avoids warm/cool color-family clashes. `Wear This Today` increments wear counts atomically in Supabase. Seller email is exposed only for listings where the seller has opted in.

The closet archive, outfit builder, and shop placeholder are available at `/closet`, `/dashboard`, and `/shop`. Set `NEXT_PUBLIC_SHOP_URL` to redirect to the separate shop site when it is ready. The image action runs the local `python/process_image.py` worker before saving the normalized image to the private `closet-images` bucket.

## GitHub

The project remote is configured for `https://github.com/daveclouie/rerack.git`. After creating that repository and reviewing your changes, push with:

```sh
git add .
git commit -m "Build ReRack closet and shop"
git push -u origin main
```
