<p align="center">
  <img src="assets/icons/logo-icon.svg" width="96" height="96" alt="橘猫记账 logo">
</p>

<h1 align="center">橘猫记账 · OrangeCat Budget</h1>

<p align="center">
  A complete, bilingual personal finance app — built with pure HTML, CSS, and Vanilla JavaScript.<br>
  No build tools. No frameworks. No account required. Just open and use.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Language-EN%20%7C%20中文-orange?style=flat-square" alt="Languages">
  <img src="https://img.shields.io/badge/Storage-IndexedDB-blue?style=flat-square" alt="Storage">
  <img src="https://img.shields.io/badge/Charts-Chart.js-pink?style=flat-square" alt="Charts">
  <img src="https://img.shields.io/badge/Dependencies-0-green?style=flat-square" alt="Dependencies">
</p>

---

## ✨ Features at a Glance

| Feature | Description |
|---------|-------------|
| 💬 **Chat-Based Entry** | Record expenses in plain language — English or Chinese |
| 🎯 **Budget Planning** | Set per-category budgets with traffic-light progress bars and daily safe-spend indicators |
| 📅 **Calendar View** | Monthly grid showing daily income, expenses, and meal photos |
| 📊 **Reports & Charts** | Spending trend, category donut, income vs expense, budget vs actual |
| 🔄 **Recurring Transactions** | Monthly/weekly bills with one-tap "apply today" |
| 🍱 **Meal Tracker** | Camera capture or photo upload, gallery grouped by date |
| 🌐 **Bilingual UI** | Full English / 简体中文 support, switchable without page reload |
| 🌙 **Dark Mode** | System-aware + manual toggle, mascot swaps automatically |
| 📆 **Custom Cycle** | Set any start day (e.g. 25th → 24th) for all summaries and budgets |
| 💾 **Local-First** | All data in IndexedDB — private, offline, instant |

---

## 📁 Project Structure

```
budget-app/
│
├── index.html              ← Dashboard, Chat, and Transactions (hash-routed)
├── budget.html             ← Budget Planning — category budgets, charts, alerts
├── calendar.html           ← Monthly calendar + Meal photo tracker
├── reports.html            ← Analytics: spending trends, category breakdown
├── settings.html           ← Preferences, language, recurring, categories, goals
│
├── css/
│   ├── style.css           ← Design tokens, reset, app shell, all shared components
│   ├── dashboard.css       ← Quick stats row, savings goals, two-column layout
│   ├── calendar.css        ← 7-column grid, day-detail slide panel, meal gallery
│   ├── reports.css         ← Period switcher, chart cards, transaction table, chat UI
│   ├── budget.css          ← Budget cards, traffic-light bars, summary grid, alerts
│   └── darkmode.css        ← Dark mode overrides beyond CSS variable swaps
│
├── js/
│   ├── app.js              ← Bootstrap, theme, i18n proxy, formatters, modal/toast helpers
│   ├── i18n.js             ← Translation engine: t(), tc(), applyToDOM(), bilingual NL parser
│   ├── storage.js          ← IndexedDB abstraction layer — the only file touching the DB
│   ├── budget-engine.js    ← Pure budget calculations: stats, summary, trend, alerts (no DOM)
│   ├── budget.js           ← Budget page UI: CRUD, charts, dashboard widget
│   ├── dashboard.js        ← Dashboard rendering: cards, recent tx, recurring, savings
│   ├── chat.js             ← Chat entry: NL parse → confirm card → save → bubble
│   ├── calendar.js         ← Monthly grid, prev/next, day-detail slide panel
│   ├── charts.js           ← Chart.js wrappers: trend, donut, income vs expense
│   ├── recurring.js        ← Recurring transaction CRUD + apply-today
│   ├── meals.js            ← Camera capture, file upload, Base64 storage, gallery
│   └── settings.js         ← Preferences, language switcher, categories, goals, export
│
├── locales/
│   ├── en.json             ← English strings (334 keys across all features)
│   └── zh-CN.json          ← Simplified Chinese strings (334 keys, identical structure)
│
├── assets/
│   └── icons/
│       ├── logo-icon.svg           ← App icon — orange tabby face, light mode
│       ├── logo-icon-dark.svg      ← App icon — dark background variant
│       ├── logo-horizontal-light.svg ← Wordmark lockup, light bg
│       ├── logo-horizontal-dark.svg  ← Wordmark lockup, dark bg
│       └── favicon.svg             ← 32×32 browser tab icon
│
└── README.md
```

---

## 🗂️ File Reference

### Pages

| File | What it does |
|------|-------------|
| `index.html` | Main hub. Three sections in one page — Dashboard, Chat, and Transactions — switched via URL hash (`#chat`, `#transactions`). No reload. |
| `budget.html` | Budget Planning. Set per-category budgets, view progress bars, see budget vs actual charts, and get daily safe-spend guidance. |
| `calendar.html` | Monthly calendar grid. Click any day to see all transactions and meal photos for that date in a slide-out panel. |
| `reports.html` | Analytics page. Period-selector (daily/weekly/monthly), spending trend line, category donut, 6-month income vs expenses bar chart. |
| `settings.html` | All preferences. Language, theme, accounting cycle start day, currency, recurring transactions, custom categories, savings goals, JSON/CSV export. |

### JavaScript Modules

| File | Purpose |
|------|---------|
| `app.js` | Bootstraps the app. Calls `initDB`, `seedCategories`, `initI18n`, then `applyTheme` and navigation setup. Re-exports `t()`, `tc()`, `setLang()`, and `applyToDOM()` so every other module imports i18n from one place. |
| `i18n.js` | The translation engine. Loads locale JSON files on demand, provides `t(key, vars)` for string lookup, `tc(categoryName)` for bilingual category names, `applyToDOM()` to stamp `data-i18n` elements, fires `langchange` CustomEvent on switch. Also contains the bilingual NL parser that understands Chinese and English input. |
| `storage.js` | Every IndexedDB read and write. The only file that knows the database exists. Swap this file's functions for `fetch()` calls to migrate to a backend — nothing else changes. Manages 7 stores: `transactions`, `categories`, `recurring`, `meals`, `settings`, `savingsGoals`, `categoryBudgets`. |
| `budget-engine.js` | Pure calculation functions with zero DOM access: `getCycleMeta()`, `computeCategoryStats()`, `computeSummary()`, `buildTrendData()`, `generateAlerts()`. Fully testable in isolation. |
| `budget.js` | Budget UI. Reads from `storage.js` and `budget-engine.js`, renders the summary card, alerts strip, per-category budget cards with traffic-light bars, three Chart.js charts, and the dashboard widget. |
| `dashboard.js` | Dashboard rendering. Summary cards, today/week spending, recent transactions list, upcoming recurring bills, savings goals progress. |
| `chat.js` | Chat interface. Passes user input to `parseNaturalLanguage()`, shows a confirm card with editable fields, then saves the transaction and renders a bubble. Supports edit and delete on any bubble. |
| `calendar.js` | Monthly calendar grid with translated weekday headers. Clicking a date opens a slide panel showing all transactions and meal photos for that day. |
| `charts.js` | All Chart.js wrappers. Destroys and recreates instances cleanly on period switch or language change to avoid canvas state bugs. |
| `recurring.js` | Full CRUD for recurring transaction templates. "Apply today" creates a real transaction from a template in one click. |
| `meals.js` | Meal photo entry. Accesses `navigator.mediaDevices` for camera capture, reads uploaded files as Base64 DataURLs, stores in IndexedDB, renders gallery grouped by date. |
| `settings.js` | All settings logic. Language switcher calls `setLang()` which triggers a `langchange` event and re-renders every dynamic section without a page reload. |

### CSS Files

| File | Purpose |
|------|---------|
| `style.css` | Design token system (CSS custom properties for both light and dark modes), reset, app shell, sidebar, topbar, cards, buttons, modals, toasts, progress bars, tags, mobile nav, responsive breakpoints. |
| `dashboard.css` | Quick stats row, savings goal items, upcoming recurring rows, two-column dashboard layout. |
| `calendar.css` | 7-column CSS grid, cell state variants (today, has-data), day-detail slide-in panel, meal thumbnail gallery. |
| `reports.css` | Period switcher tabs, chart card layout, transaction table, chat bubbles, confirm card, edit slide panel, settings section styling, recurring and meal cards. |
| `budget.css` | Traffic-light CSS variables (`--budget-ok`, `--budget-warning`, `--budget-danger`, `--budget-over`), budget summary grid, per-category budget cards, progress bars, alert strips, dashboard widget rows. |
| `darkmode.css` | Overrides for components that need more than a variable swap: logo image swap, calendar highlight tint, scrollbar styling. |

### Locale Files

| File | Contents |
|------|---------|
| `locales/en.json` | 334 English strings covering nav, dashboard, chat, transactions, calendar, meals, reports, budget, settings, categories, toast messages, and confirm dialogs. |
| `locales/zh-CN.json` | 334 Simplified Chinese strings in identical structure. All keys match `en.json` exactly — adding a third language means creating a new file only. |

---

## 🌐 Live Demo

**[→ Open OrangeCat Budget](https://zhen822.github.io/orange-cat-budget)**

> Replace the link above with your actual GitHub Pages URL after enabling it below.

---

## 🚀 Deployment — GitHub Pages (Free)

Since the project is already on GitHub, one setting is all it takes to get a public link.

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Branch**, select `main` and folder `/ (root)`
4. Click **Save**

Your live URL appears at the top of the Pages settings within about a minute:
```
https://zhen822.github.io/orange-cat-budget
```

Share that link — anyone can open it in a browser, no install required.

> ⚠️ Make sure `index.html` is at the **root** of the repo, not inside a subfolder. If it's inside a folder like `budget-app/`, move the contents up one level or point the Pages source at that subfolder.

---

## 🛠️ Running Locally

The app uses ES6 modules (`type="module"`) which require HTTP. **Do not open `index.html` directly as a `file://` URL** — the browser will block module imports.

### VS Code Live Server (quickest)
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → **Open with Live Server**
3. Opens at `http://127.0.0.1:5500`

### Python
```bash
python -m http.server 8080
# → http://localhost:8080
```

### Node.js
```bash
npx http-server -p 8080
# → http://localhost:8080
```

No `npm install`. No build step. No environment variables. First launch seeds default categories automatically.

---

## 💬 Chat — Natural Language Entry

The chat interface understands both English and Chinese input. Type anything that contains an amount and the parser figures out the rest.

**English examples**
```
spent 45 on lunch          → Expense · Food · 45
paid 200 electricity bill  → Expense · Bills · 200
received 3500 salary       → Income · Salary · 3500
saved 500 emergency fund   → Savings · Emergency Fund · 500
```

**Chinese examples**
```
午餐花了35        → 支出 · 餐饮 · 35
电费200           → 支出 · 账单 · 200
收到工资3500      → 收入 · 工资 · 3500
存入应急基金500   → 储蓄 · 应急基金 · 500
```

After parsing, a confirm card appears with editable fields (amount, category, date, note) before saving. Every saved transaction shows as a chat bubble with edit ✏️ and delete 🗑️ controls.

---

## 🎯 Budget Planning

Set a monthly budget for any expense category, then the app tracks it against your custom accounting cycle.

**Per-category stats**
- Budget amount, amount spent, amount remaining
- Percentage used with a traffic-light progress bar
- Average daily spending so far this cycle
- Recommended safe daily spend for the rest of the cycle

**Traffic-light thresholds**

| Color | Range | Meaning |
|-------|-------|---------|
| 🟢 Green | 0–60% | On track |
| 🟡 Yellow | 60–85% | Watch spending |
| 🟠 Orange | 85–100% | Near limit |
| 🔴 Red | > 100% | Over budget |

**Dashboard widget** — The "Safe to Spend Today" card on the dashboard shows the combined recommended daily amount across all budgeted categories, with an emoji status indicator.

**Alerts** — Inline warnings appear at 80%, 90%, and 100%+ for each category.

**Three budget charts**
1. Budget vs Actual — grouped bar chart per category
2. Spending by Category — donut chart of actual spend
3. Cumulative Spending vs Ideal Pace — line chart overlaying actual vs a straight-line ideal trajectory through the cycle

---

## 🌐 Bilingual Support (i18n)

Switch between **English** and **简体中文** in Settings → Language. The switch is instant — no page reload.

**How it works**
- `locales/en.json` and `locales/zh-CN.json` contain all UI strings
- `js/i18n.js` loads the selected locale on startup, exposes `t(key)` for string lookup
- Static HTML text uses `data-i18n="key"` attributes; `applyToDOM()` stamps them on load and on language change
- Dynamic content (transaction lists, budget cards, charts) re-renders via a `langchange` CustomEvent
- `tc(categoryName)` translates system category names while leaving user-created categories unchanged
- The NL parser in `i18n.js` handles both languages in the same function — keywords from both locales are checked simultaneously

**Adding a third language**
1. Create `locales/xx.json` with the same 334 keys
2. Add `'xx': './locales/xx.json'` to the `LOCALES` map in `i18n.js`
3. Add an `<option value="xx">` to the language selector in `settings.html`

---

## 💾 Data Storage

All data lives in **IndexedDB** in the user's browser — no server, no account, no sync. `storage.js` is the single gateway; no other module accesses the database directly.

**Stores (DB version 2)**

| Store | Contents |
|-------|---------|
| `transactions` | All income, expense, and savings entries |
| `categories` | Default and user-created categories |
| `recurring` | Recurring transaction templates |
| `meals` | Meal entries with Base64 photo data |
| `settings` | Key-value preferences (theme, lang, currency, cycle start day) |
| `savingsGoals` | Savings targets |
| `categoryBudgets` | Per-category budget amounts and enabled/disabled state |

**Migrating to a backend** — replace the functions in `storage.js` with `fetch()` calls to your API. Every other file remains unchanged because nothing else knows where data comes from.

---

## 🎨 Design System

All visual decisions live in CSS custom properties on `:root`, with a full set of dark mode overrides on `[data-theme="dark"]`.

```css
/* Brand */
--color-primary:  #5B6AF0   /* Indigo */

/* Semantic */
--color-income:   #16A34A   /* Green */
--color-expense:  #DC2626   /* Red */
--color-savings:  #2563EB   /* Blue */

/* Budget traffic-light */
--budget-ok:      #16A34A
--budget-warning: #CA8A04
--budget-danger:  #EA580C
--budget-over:    #DC2626

/* Typography */
--font-body: 'Plus Jakarta Sans', -apple-system, sans-serif
--font-mono: 'JetBrains Mono', monospace  /* all currency amounts */
```

Dark mode is activated by `document.documentElement.setAttribute('data-theme', 'dark')`. The mascot logo (`logo-icon.svg` / `logo-icon-dark.svg`) swaps automatically via both a `<picture>` `prefers-color-scheme` source and a JS `applyTheme()` call for the in-app toggle.

---

## 🔮 Architecture — Ready for These Extensions

| Enhancement | Where to plug in |
|-------------|-----------------|
| Cloud sync | Replace `storage.js` functions with `fetch()` API calls |
| User auth | Add JWT header injection in `storage.js` |
| OCR receipt scan | Add a file input handler in `chat.js`, call a Vision API |
| AI expense categorisation | Replace `parseNLBilingual()` in `i18n.js` with an LLM call |
| AI budgeting summary | Add a summary panel in `budget.js` calling an LLM with cycle data |
| Push notifications | Add a Service Worker that checks budget thresholds on sync |
| PDF export | Import jsPDF in `charts.js`, capture canvas + summary data |
| Excel export | Import SheetJS in `settings.js`, dump `getAllTransactions()` |
| Multi-currency | Add an exchange rate fetch in `app.js`, convert amounts in `formatCurrency()` |
| A third language | Add `locales/xx.json` + one line in `i18n.js` LOCALES map |

---

## ✅ Engineering Decisions

**ES6 modules throughout** — clean import/export, no global scope pollution, clear dependency graph.

**IndexedDB behind a single abstraction** — `storage.js` is the only file that knows the database exists. This is the swap point for a backend without touching any UI logic.

**i18n engine decoupled from app logic** — `i18n.js` knows nothing about budgets or transactions. `app.js` re-exports `t()` so every module imports from one place. Locale files are plain JSON — no runtime bundling needed.

**Budget engine is pure functions** — `budget-engine.js` has zero DOM access and zero storage calls. It takes data in, returns computed stats out. This makes the calculations easy to test and reuse across the budget page and the dashboard widget without duplication.

**No-reload language switch** — `setLang()` loads the new locale, fires `langchange`, and each module's own listener re-renders its own section. The URL, scroll position, and open panels are all preserved.

**CSS custom property theming** — dark mode is a single attribute on `<html>`. No class toggling across components, no JavaScript-driven style overrides.

**Chart.js instance management** — every chart is stored in a `chartInstances` map and explicitly destroyed before recreation. This prevents canvas memory leaks when switching periods or languages.

---

## 📋 Get Started

**Easiest — use the live link (GitHub Pages):**

1. Enable GitHub Pages in your repo Settings → Pages → Branch: `main`
2. Share `https://zhen822.github.io/orange-cat-budget` with anyone

**First time using the app:**

1. Open the link in any modern browser
2. Go to **Settings** to choose your language (English / 简体中文), currency, and cycle start day
3. Go to **Budget** to set monthly limits for each expense category
4. Use **Chat** to record your first expense in plain language — try *"lunch 15"* or *"午餐15"*
5. Check **Dashboard** for today's safe daily spend indicator

---

*橘猫记账 — Your money, your language, your pace.*
