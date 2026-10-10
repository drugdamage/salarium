# Salarium

Log the hours you worked, see how much you'll get paid.

![Salarium](screenshots/work-tab.png)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)
![Electron](https://img.shields.io/badge/Electron-29-47848F?logo=electron&logoColor=white)

## What it does

- Calendar: click a day, enter the hours you worked
- Monthly goal: shifts × hours × rate × tax factor = what you'll get
- Two payouts: days 1–15 (paid on the 24th) and 16–end (paid on the 9th)
- Mark days as holiday, short day, or extra shift with its own rate
- Schedule planner (5/2, 2/2, 7/0, flexible) and break suggestions
- Past months are locked so you don't change them by accident
- English / Russian, JSON backup in Settings

## Setup

You need [Node.js](https://nodejs.org) 18+ and a free
[Supabase](https://supabase.com) account (that's where your data is
stored).

1. **Clone**

   ```sh
   git clone https://github.com/drugdamage/salarium.git
   cd salarium
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com)
   (New project → any name and password → wait a minute).

3. **Create the table.** In Supabase open **SQL Editor**, paste this, click **Run**:

   ```sql
   create table if not exists kv_store (
     key text primary key,
     value jsonb,
     updated_at timestamptz default now()
   );
   alter table kv_store enable row level security;
   create policy "salarium" on kv_store for all to anon using (true) with check (true);
   ```

4. **Add your keys.** In Supabase, click **Connect** at the top of the
   project page and copy the **Project URL** and the **publishable** (or
   **anon**) key (also in **Project Settings → API Keys**). Then:

   ```sh
   cp config.example.js config.js
   ```

   and paste both values into `config.js`.

5. **Run**

   ```sh
   npm install
   npm start
   ```

## Build an app

- **macOS:** double-click `SETUP.command` → `dist/mac-arm64/Salarium.app`
- **Windows:** double-click `SETUP.bat` → `dist\win-unpacked\Salarium.exe`

Fill in `config.js` first, since it gets built into the app.

**macOS says the app is damaged or can't be opened?** It's not signed.
Right-click → Open, or run:

```sh
xattr -cr dist/mac-arm64/Salarium.app
```

## Good to know

- The key in `config.js` works like a password to your database. Don't
  share it or the built app. `config.js` is never committed to git.
- One database = one person. There are no accounts or logins.
- Data keys in the table: `workData`, `workSettings`, `holidayAdj`,
  `overtimeRate`, `scheduleHours`, `dayHours`, `payRate`, `payTax`, `lang`.

## License

[MIT](LICENSE)

---

## На русском

Salarium записывает отработанные часы и считает зарплату: цель на месяц,
две выплаты (1–15 и 16–конец месяца), праздники, сокращённые дни и доп.
смены, подбор графика.

Как запустить: создайте проект в Supabase, выполните SQL из шага 3,
скопируйте `config.example.js` в `config.js`, впишите туда Project URL и
ключ, затем выполните `npm install && npm start`. Ключ из `config.js`
работает как пароль к вашей базе, никому его не передавайте.
