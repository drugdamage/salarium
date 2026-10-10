# Salarium

A desktop app for logging the hours you actually worked and seeing what
you'll get paid, split into two payouts a month.

![Salarium — Work tab](screenshots/work-tab.png)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)
![Electron](https://img.shields.io/badge/Electron-29-47848F?logo=electron&logoColor=white)

Plain HTML/CSS/JS in a single `index.html`, no frameworks. Data is stored
in your own Supabase project (one key-value table over the REST API).
Interface in English and Russian.

---

## Features

- **Calendar of actual hours** — click a day, type the time worked as
  `HH:MM:SS` (e.g. `04:06:44`). Days with an entry get a dot.
- **Monthly goal** — shifts × hours per shift gives the hours target;
  × hourly rate × tax factor gives the net pay for the full goal. Shows
  hours worked and how much is left (or how much overtime).
- **Two payouts** — days 1–15 (paid on the 24th) and days 16–end of month
  (paid on the 9th of the next month), each with net and before-tax
  amounts, plus a month total. The payout badge turns amber when it's
  3 days away or less.
- **Day marks**:
  - *Holiday* — non-working day (red outline), never suggested by the
    schedule planner.
  - *Short day* — subtracts the hours you enter from the month's goal
    (amber outline).
  - *Extra shift* — the day is paid at its own hourly rate instead of the
    usual one (purple outline).
- **Schedule planner** — pick 5/2, 2/2, 7/0 or Flexible, and a small
  calendar highlights suggested working days to hit the shift count.
  Holidays are skipped; days off land on Sat/Sun where possible.
- **Break recommendations** — set your weekday and weekend working hours,
  get an hour-by-hour plan: a 5-minute break roughly every hour plus one
  15-minute break mid-shift.
- **Past months are locked** — read-only by default so a calculated salary
  can't be changed by accident. "Edit this month" under the calendar
  unlocks it temporarily.
- **Language switch** — English / Russian, applied instantly.
- **JSON backup** — export all data to a file and import it back.

Amounts are shown in rubles (₽).

---

## Requirements

- [Node.js](https://nodejs.org) 18+
- A free [Supabase](https://supabase.com) account

---

## Setup

### 1. Clone the repo

```sh
git clone https://github.com/drugdamage/salarium.git
cd salarium
```

### 2. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**
   (the free plan is enough).
2. Pick a name, set a database password, choose a region close to you,
   and wait for the project to finish provisioning.
3. Get the **Project URL**: click **Connect** at the top of the project
   dashboard (or go to **Project Settings → Data API**). It looks like
   `https://abcdefghijkl.supabase.co`.
4. Get the **key**: **Project Settings → API Keys**. Copy the
   **publishable** key (`sb_publishable_...`). On older projects use the
   **anon / public** key from the *Legacy API keys* tab instead.
   Never use the `secret` / `service_role` key.

### 3. Create the table

Open **SQL Editor** in the Supabase dashboard, paste this and click **Run**:

```sql
create table if not exists kv_store (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);
```

Then run this as well. It turns on Row Level Security and allows the app's
key to access only this one table (see [Security](#security) for why):

```sql
alter table kv_store enable row level security;

create policy "salarium single-user access"
  on kv_store for all
  to anon
  using (true)
  with check (true);

grant select, insert, update on kv_store to anon;
```

### 4. Add your keys

```sh
cp config.example.js config.js
```

Open `config.js` and fill in your values:

```js
window.SALARIUM_CONFIG = {
  SUPABASE_URL: 'https://abcdefghijkl.supabase.co',
  SUPABASE_KEY: 'sb_publishable_...',
};
```

`config.js` is in `.gitignore`, so it never gets committed. If it's
missing or still has placeholders, the app shows a message telling you to
create it instead of a blank screen.

### 5. Run without building

```sh
npm install
npm start
```

### 6. Build a standalone app

- **macOS** — double-click `SETUP.command`. If macOS refuses to open it,
  right-click → **Open** → confirm. The app ends up in
  `dist/mac-arm64/Salarium.app` (Apple Silicon).
- **Windows** — double-click `SETUP.bat`. The app ends up in
  `dist\win-unpacked\Salarium.exe`.

Both scripts check for Node.js and `config.js`, run `npm install`, then
build with electron-builder. Your `config.js` is bundled into the app, so
build *after* filling it in.

The macOS build targets `arm64` only. For an Intel Mac, change
`build.mac.target.arch` in `package.json` to `["x64"]` — the output then
goes to `dist/mac/`.

---

## Security

The Supabase key ships inside the app (`config.js` is bundled into the
build). Anyone who has your build or your `config.js` can read and write
your data. So:

- **The database should be personal.** Salarium is a single-user app — no
  login, no accounts. Use a separate Supabase project just for it, and
  don't share your build or `config.js`.
- **Use the publishable / anon key**, never `secret` / `service_role`.
- **About RLS.** Row Level Security decides what each API key can do with a
  table. With RLS enabled and the policy from step 3, the app's key can
  access `kv_store` and nothing else, and any table you add to the project
  later is closed by default. The policy is deliberately open
  (`using (true)`) because the app has no user accounts to filter by. It
  limits *which tables* the key can reach, but it won't protect the
  data from someone who already has the key.
- If the key leaks, rotate it in **Project Settings → API Keys** and update
  `config.js`.

---

## Data model

Everything lives in one table, `kv_store`: one row per key, with the value
stored as JSON.

| Key | Contents |
|---|---|
| `workData` | Hours worked per day: `{ "2026-08-04": "06:12:30", ... }` |
| `workSettings` | Per-month goal and planner settings: `{ "2026-08": { shifts, hoursPerShift, scheduleType } }` |
| `holidayAdj` | Day marks: `{ "2026-08-15": { type: "holiday" } }` or `{ type: "shortened", hours: 1 }` |
| `overtimeRate` | Custom hourly rate for extra-shift days: `{ "2026-08-20": 440 }` |
| `scheduleHours` | Working window: `{ weekdayFrom, weekdayTo, weekendFrom, weekendTo }` (`"HH:MM"`) |
| `dayHours` | Per-day working-window overrides `{ "2026-08-04": { from, to } }`. Read and backed up, but there's no UI for it yet |
| `payRate` | Hourly rate, number (default `220`) |
| `payTax` | Tax factor, net = gross × factor (default `0.87`) |
| `lang` | Interface language, `"en"` or `"ru"` |

On startup the app reads all keys. If any read fails, it stops and shows
a **Retry** screen rather than starting with empty data and overwriting
what's in the database.

---

## Backup

**Settings → Backup**:

- **Export to file** saves all of the keys above into one `.json` file.
- **Import from file** writes every key from such a file back into
  Supabase and reloads the app. Useful for moving to a new Supabase
  project.

The backup is a plain JSON file and doesn't depend on Supabase.

---

## Troubleshooting

**macOS: "Salarium can't be opened because Apple cannot check it for
malicious software" / "Salarium is damaged".**
The app isn't signed or notarized, so Gatekeeper blocks it. Right-click
the `.app` → **Open** → confirm. If macOS says it's damaged, clear the
quarantine attribute:

```sh
xattr -cr dist/mac-arm64/Salarium.app
```

**"Database not configured" screen.** `config.js` is missing or still has
the placeholder values. See [step 4](#4-add-your-keys).

**"Data not loaded" screen.** The app couldn't reach Supabase. Check your
internet connection, the URL and key in `config.js`, and that you ran
both SQL blocks from [step 3](#3-create-the-table). A missing table or
missing RLS policy also lands here.

**Windows SmartScreen warning.** Same reason as on macOS: the app isn't
signed. Click **More info → Run anyway**.

---

## Project structure

```text
salarium/
├── index.html           the whole app: UI, styles, logic, EN/RU strings
├── config.example.js    Supabase config template → copy to config.js
├── config.js            your keys (gitignored, you create it)
├── main.js              Electron main process: window, export/import dialogs
├── preload.js           exposes export/import to the page (contextBridge)
├── package.json         scripts and electron-builder config
├── SETUP.command        macOS: install + build
├── SETUP.bat            Windows: install + build
├── assets/
│   ├── logo.svg         icon source (isometric salt crystal)
│   ├── icon.icns        macOS icon
│   ├── icon.ico         Windows icon
│   └── icon.png         1024×1024
├── screenshots/
│   └── work-tab.png
├── LICENSE
└── README.md
```

---

## License

[MIT](LICENSE) © 2026 drugdamage

---

## На русском

**Salarium**: десктопное приложение для учёта фактически отработанных
часов и расчёта зарплаты. Есть цель на месяц (смены × часы × ставка ×
налоговый коэффициент), две выплаты (1–15 и 16–конец месяца), пометки
«праздник / сокращённый день / доп. смена», подбор графика (5/2, 2/2, 7/0,
гибкий) и рекомендации по перерывам. Прошлые месяцы заблокированы от
случайных правок, а все данные можно сохранить в JSON. Интерфейс на
русском и английском.

Быстрый старт:

1. Создайте проект в [Supabase](https://supabase.com) и выполните SQL из
   [шага 3](#3-create-the-table) в SQL Editor.
2. `cp config.example.js config.js` и впишите свой Project URL и
   publishable/anon key.
3. `npm install && npm start` для запуска, или `SETUP.command` (macOS) /
   `SETUP.bat` (Windows) для сборки.

Ключ хранится внутри приложения, поэтому база должна быть личной. Подробнее
об этом в разделе [Security](#security).
