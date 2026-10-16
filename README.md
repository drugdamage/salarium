# Salarium

Log the hours you worked, see how much you'll get paid.

Any pay schedule: payouts on your own dates (from once to 31 times a
month) or every N days (daily, weekly, every two weeks). A monthly goal, a
shift planner with breaks, and a read-only lock on past months.
Light and dark mode, six languages (English, German, Spanish, French,
Russian, Ukrainian), any currency.

![Salarium](screenshots/work-tab.png)

## How to run it

### 1. Install Node.js

Download the **LTS** version from [nodejs.org](https://nodejs.org) and
install it (version 18 or newer). To check that it worked, open Terminal
(macOS) or Command Prompt (Windows) and run:

```sh
node -v
```

You should see something like `v22.x.x`.

### 2. Download Salarium

Either click **Code → Download ZIP** on this page and unzip it, or run:

```sh
git clone https://github.com/drugdamage/salarium.git
```

### 3. Create a free Supabase database

Your data is stored in your own free Supabase database.

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub login works).
2. Click **New project**.
3. Enter any name (e.g. `salarium`), make up a database password, and
   pick the region closest to you.
4. Click **Create new project** and wait 1–2 minutes until it's ready.

> If the Supabase site doesn't load or looks broken, turn off your ad
> blocker (uBlock etc.) for supabase.com.

### 4. Create the table

1. In your project, open **SQL Editor** from the left sidebar (the `>_` icon).
2. Paste this:

   ```sql
   create table if not exists kv_store (
     key text primary key,
     value jsonb,
     updated_at timestamptz default now()
   );
   alter table kv_store enable row level security;
   create policy "salarium" on kv_store for all to anon using (true) with check (true);
   ```

3. Click **Run**. You should see `Success. No rows returned`.

### 5. Connect the app to your database

1. In Supabase, click **Connect** at the top of the project page (or go to
   **Project Settings → API Keys**).
2. Copy two things:
   - **Project URL**, which looks like `https://abcdefghijkl.supabase.co`
   - **publishable key**, which starts with `sb_publishable_` (on older
     projects it's called the **anon** key)
3. In the Salarium folder, make a copy of `config.example.js` and name it
   `config.js`.
4. Open `config.js` in any text editor and paste your values in place of the
   placeholders:

   ```js
   window.SALARIUM_CONFIG = {
     SUPABASE_URL: 'https://abcdefghijkl.supabase.co',
     SUPABASE_KEY: 'sb_publishable_...',
   };
   ```

The key works like a password to your database, so don't share
`config.js` with anyone.

### 6. Start it

In Terminal / Command Prompt, go to the Salarium folder and run:

```sh
npm install
npm start
```

The first `npm install` takes a minute or two. After that, `npm start` is
enough.

Open **Settings** to pick your language, currency, theme, hourly rate, tax
and pay schedule.

### 7. Optional: build a real app

So you don't need the terminal every time:

- **macOS:** double-click `SETUP.command`. The app appears in
  `dist/mac-arm64/Salarium.app`. Drag it into Applications.
- **Windows:** double-click `SETUP.bat`. The app appears in
  `dist\win-unpacked\Salarium.exe`.

If macOS says the app **is damaged** or **can't be opened**, that's because
it isn't signed. Run this once in Terminal:

```sh
xattr -cr dist/mac-arm64/Salarium.app
```

## License

[MIT](LICENSE)
