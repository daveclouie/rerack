# ReRack

A digital closet and clothing marketplace built with Next.js, Supabase, Gemini, and the open-source `rembg` project.

## Local setup

1. Install Node.js 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and add a Supabase project URL, anon key, service-role key, and site URL. Never expose the service-role key to the browser or commit `.env.local`.
3. For a new Supabase project, run `supabase/schema.sql` in the SQL Editor. If you already applied an earlier schema, run all unapplied migrations in timestamp order: `20261115220000_outfit_shop.sql`, `20261116150000_account_security.sql`, `20261116190000_email_only_auth.sql`, `20261116193000_image_processing_limit.sql`, then `20261116230000_built_in_shop_and_outfits.sql`.
4. In Supabase Auth, allow the local and production callback URLs: `/auth/callback`. Configure email delivery and OTP templates using `{{ .Token }}` for email signup, recovery, and account verification.
5. Run `npm run dev`.

Username and email lookups run on the server with the service-role key. Public signup and password actions use the Supabase anon client and authenticated session cookies. Phone signup, login, recovery, account changes, and listing contacts are disabled. Existing phone columns remain optional and dormant for a future re-enable; listing phone snapshots are cleared by the email-only migration. Shop listings hide seller email by default and provide a separate control to show or hide it.

The app uses Tailwind CSS v4 theme tokens in `src/app/globals.css`; cream is the default and the Settings theme control persists the selected mode in local storage.

The landing page supports installation as a web app on compatible browsers. Android and desktop browsers can show a native install prompt; on iPhone and iPad, open the site in Safari and use Share > Add to Home Screen. Installation requires HTTPS except during local development. ReRack is not yet a native App Store or Google Play app, and the installable version requires an internet connection.

The closet camera flow uses `rembg` for background removal and the Gemini API model `gemini-3.5-flash-lite` for clothing attributes. This model accepts image input and has a free tier; check Google's current model and usage limits. Older `gemini-2.5-flash` API access is restricted to existing users, so a new API key may return HTTP 404 for it. Install Python 3.10+ and the CPU package with `python -m pip install -r python/requirements.txt`; the first background-removal run downloads the model. Set `PYTHON_BIN` if the Python executable is not on the `PATH`. `GEMINI_API_KEY` is required for item recognition. Images are resized before background removal and stored as optimized JPEGs. Processing is limited to 20 requests per authenticated account per UTC day. Without a worker, the local subprocess reloads the model for each photo, so processing can be slower.

For local model reuse or Vercel, run `python/worker.py` as a separate Python service with `REMBG_WORKER_TOKEN` set to a random secret of at least 32 characters. The worker defaults to rembg's smaller `u2netp` model instead of rembg's large current default, `bria-rmbg`; the lighter model trades some mask detail for quicker startup and lower memory use. For local development, set `REMBG_WORKER_URL=http://127.0.0.1:8080/process`; for production, use the worker's HTTPS `/process` URL. Set the same token in the Next.js server environment and keep it server-only. The worker loads the rembg model once into memory, serves `/process` and `/health`, accepts images up to 10 MB, and processes one image at a time to bound CPU and memory use. `/health` responds immediately with `model is loading` while the first model download/load runs, and `ok` when uploads are ready. Wait for `ok` before uploading. Check the chosen provider's free-tier memory, CPU, request-duration, and idle-sleep limits before relying on it; no worker has been deployed or selected for this project. The local subprocess remains available when both worker variables are unset. Background removal and Gemini identification are synchronous, so the Next.js host's function timeout must also allow for both stages.

On Windows, start the worker from a second PowerShell window:

```powershell
$env:REMBG_WORKER_TOKEN = "<same random secret as .env.local>"
python python\worker.py
```

If the worker is already running with an older version of the code, stop it with Ctrl+C in the worker terminal and run those commands again. Leave it running while you use the app.

### Docker deployment

Build the standalone app with the public Supabase values available at build time:

```sh
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY -t rerack .
```

Run with `.env.local` mounted as runtime environment configuration. `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must only be supplied at runtime, never as build arguments. Keep `.env.local` out of the Docker image and Git. The container includes Python and `python/requirements.txt`; allow long-running requests for image processing.

```sh
docker run --env-file .env.local -p 3000:3000 rerack
```

The outfit generator only uses clean closet items, applies the selected style, and avoids warm/cool color-family clashes. `Wear This Today` increments wear counts atomically in Supabase. Seller email is exposed only for listings where the seller has opted in.

The closet archive, outfit builder, and ReRack built-in shop are available at `/closet`, `/dashboard`, and `/shop`. The dashboard's “Browse our shop” placeholder is reserved for TheArchive, the separate thrifted-goods website; set `NEXT_PUBLIC_THEARCHIVE_URL` when its link is ready. ReRack shop listings are made from closet items and expose seller email only when the seller opts in.

## GitHub

The project remote is configured for `https://github.com/daveclouie/rerack.git`. After creating that repository and reviewing your changes, push with:

```sh
git add .
git commit -m "Build ReRack closet and shop"
git push -u origin main
```
