# ReRack

A digital closet and clothing marketplace built with Next.js, Supabase, Gemini, and the open-source `rembg` project.

## Local setup

1. Install Node.js 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and add a Supabase project URL, anon key, service-role key, and site URL. Never expose the service-role key to the browser or commit `.env.local`.
3. For a new Supabase project, run `supabase/schema.sql` in the SQL Editor. If you already applied the Part 1 schema, run `supabase/migrations/20261115220000_outfit_shop.sql` instead.
4. In Supabase Auth, allow the local and production callback URLs: `/auth/callback`. Configure email delivery for email signup/recovery. Phone signup and recovery also require an SMS provider configured in Supabase.
5. Run `npm run dev`.

Username and contact lookups run on the server with the service-role key. Public signup and password actions use the Supabase anon client and authenticated session cookies. Listing a closet item requires explicit consent to display the seller's saved email and/or phone number publicly.

The app uses Tailwind CSS v4 theme tokens in `src/app/globals.css`; cream is the default and the Settings theme control persists the selected mode in local storage.

The closet camera flow uses `rembg` for local background removal and Gemini for clothing attributes. Install Python 3.10+ and the CPU package with `python -m pip install -r python/requirements.txt`; the first background-removal request downloads the model. Set `PYTHON_BIN` if the Python executable is not on `PATH`. `GEMINI_API_KEY` is required for item recognition. The Next.js server must have Python and the `rembg` dependencies available; serverless targets with short execution limits may need a separate Python worker.

The outfit generator only uses clean closet items, applies the selected vibe, and avoids warm/cool color-family clashes. `Wear This Today` increments wear counts atomically in Supabase. Shop contact details are exposed only for listings where the seller has opted in.

The closet archive, outfit builder, and shop are available at `/closet`, `/dashboard`, and `/shop`. The image action runs the local `python/process_image.py` worker before saving the normalized image to the private `closet-images` bucket.

## GitHub

The project remote is configured for `https://github.com/daveclouie/rerack.git`. After creating that repository and reviewing your changes, push with:

```sh
git add .
git commit -m "Build ReRack closet and shop"
git push -u origin main
```
