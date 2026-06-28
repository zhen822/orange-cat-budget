# 💰 BudgetWise — Personal Budget Tracker

A complete, production-ready personal budgeting web application built with HTML5, CSS3, and Vanilla JavaScript (ES6+ modules). No build tools, no frameworks — just open and run.

---

## 📁 Project Structure

```
budget-app/
│
├── index.html              ← Main hub: Dashboard, Chat, Transactions
├── calendar.html           ← Monthly calendar + Meal tracker
├── reports.html            ← Analytics, charts, summaries
├── settings.html           ← Preferences, categories, recurring, goals
│
├── css/
│   ├── style.css           ← Global design tokens, reset, layout, components
│   ├── dashboard.css       ← Dashboard-specific styles
│   ├── calendar.css        ← Calendar grid and day-detail panel
│   ├── reports.css         ← Charts, tables, chat, settings components
│   └── darkmode.css        ← Dark mode supplemental overrides
│
├── js/
│   ├── app.js              ← Bootstrap, theme, routing, formatters, NL parser
│   ├── storage.js          ← IndexedDB abstraction layer (swap for backend)
│   ├── dashboard.js        ← Dashboard rendering logic
│   ├── chat.js             ← Chat-based expense entry + edit/delete
│   ├── calendar.js         ← Monthly calendar, day-detail panel
│   ├── charts.js           ← Chart.js integration (line, donut, bar)
│   ├── recurring.js        ← Recurring transaction CRUD
│   ├── meals.js            ← Meal photo capture, upload, gallery
│   └── settings.js         ← User preferences, categories, savings goals
│
├── assets/
│   ├── icons/              ← Custom icons (future use)
│   ├── images/             ← App images (future use)
│   └── fonts/              ← Local fonts if needed (currently via Google Fonts)
│
├── uploads/                ← Reserved for future backend file uploads
│
└── README.md               ← This file
```

---

## 🗂️ File Purposes

### HTML Pages

| File | Purpose |
|------|---------|
| `index.html` | Main hub — contains Dashboard, Chat, and Transactions as switchable sections |
| `calendar.html` | Monthly calendar showing daily totals + meal photo tracker |
| `reports.html` | Interactive analytics with line, donut, and bar charts |
| `settings.html` | Preferences, custom categories, recurring transactions, savings goals |

### JavaScript Modules

| File | Purpose |
|------|---------|
| `app.js` | App bootstrap, theme management, navigation, currency/date formatters, NL parser, toast/modal helpers |
| `storage.js` | All IndexedDB operations — the only file that touches the database. Swap this file to connect a backend |
| `dashboard.js` | Dashboard summary cards, today/week spending, recent transactions, upcoming recurring, savings progress |
| `chat.js` | Chat-style expense entry with NL parsing, confirmation cards, edit/delete bubbles |
| `calendar.js` | Monthly grid, prev/next navigation, day-detail slide panel |
| `charts.js` | Chart.js wrappers for spending trend, category donut, income-vs-expense bar chart |
| `recurring.js` | CRUD for recurring transactions + one-click "apply today" |
| `meals.js` | Camera capture via MediaDevices API, file upload, Base64 storage, gallery by date |
| `settings.js` | Cycle day, currency, theme, category CRUD, savings goals, JSON/CSV export |

### CSS Files

| File | Purpose |
|------|---------|
| `style.css` | Design tokens (CSS custom properties), reset, app shell, sidebar, cards, buttons, toasts, modals, responsive breakpoints |
| `dashboard.css` | Quick stats row, savings goals, upcoming recurring, two-column layout |
| `calendar.css` | 7-column grid, cell states (today, has-data), day-detail slide panel, meal gallery |
| `reports.css` | Period switcher, chart cards, transaction table, chat bubbles, confirm card, edit panel, settings sections |
| `darkmode.css` | Dark mode overrides for components that need adjustments beyond CSS variable swaps |

---

## 🚀 How to Run Locally

### Option 1 — VS Code Live Server (Recommended)
1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` → **Open with Live Server**
3. Browser opens at `http://127.0.0.1:5500`

### Option 2 — Python HTTP Server
```bash
cd budget-app
python -m http.server 8080
# Open http://localhost:8080
```

### Option 3 — Node.js HTTP Server
```bash
npm install -g http-server
cd budget-app
http-server -p 8080
# Open http://localhost:8080
```

### Option 4 — PHP
```bash
cd budget-app
php -S localhost:8080
```

> ⚠️ **Important:** The app uses ES6 modules (`type="module"`) and must be served over HTTP/HTTPS. Opening `index.html` directly as `file://` will fail due to CORS restrictions on modules.

---

## ✨ Core Features

### Chat-Based Entry
Type naturally in the chat:
- `"spent 45 on lunch"` → Expense, Food, RM 45
- `"paid 250 electricity bill"` → Expense, Bills, RM 250
- `"received 3500 salary"` → Income, Salary, RM 3500
- `"saved 500 emergency fund"` → Savings, Emergency Fund, RM 500

Use quick-buttons for one-tap common entries, or the **+ Add** modal for precise entry.

### Calendar
- Monthly grid with daily income (green) and expense (red) totals
- Click any date to open a slide panel with all transactions + meal photos
- Navigate months with prev/next buttons

### Recurring Transactions
- Define monthly or weekly recurring items (rent, salary, Netflix, etc.)
- Click **Apply** to instantly record a recurring item as today's transaction

### Meal Tracker
- Capture photos from device camera or upload images
- Photos stored as Base64 in IndexedDB — no server needed
- Gallery grouped by date, linkable to calendar view

### Reports
- Spending trend line chart (daily/weekly/monthly)
- Category breakdown donut chart
- Income vs Expenses bar chart (last 6 months)
- Cycle summary cards

### Custom Accounting Cycle
Set your cycle start day (e.g. 25th) in Settings. All summaries and reports respect this cycle instead of the calendar month.

---

## 💾 Data Storage

All data is stored in **IndexedDB** in the user's browser. The `storage.js` module is the sole entry point — all reads/writes go through it. To migrate to a backend:

1. Replace the functions in `storage.js` with `fetch()` calls to your API
2. The rest of the app requires no changes

Stores:
- `transactions` — all income, expense, savings entries
- `categories` — default + custom categories
- `recurring` — recurring transaction templates
- `meals` — meal entries with Base64 photo data
- `settings` — key-value preferences
- `savingsGoals` — savings targets

---

## 🎨 Design System

CSS custom properties drive the entire visual system. Key tokens:

```css
--color-primary: #5B6AF0      /* Indigo brand accent */
--color-income:  #16A34A      /* Green */
--color-expense: #DC2626      /* Red */
--color-savings: #2563EB      /* Blue */
--font-body: 'Plus Jakarta Sans'
--font-mono: 'JetBrains Mono'  /* Used for amounts */
```

Dark mode is toggled by setting `data-theme="dark"` on `<html>`.

---

## 🔮 Future Enhancements (Architecture Ready)

| Feature | Implementation Path |
|---------|-------------------|
| Cloud sync | Replace `storage.js` with REST/GraphQL API calls |
| Auth | Add JWT token header to storage API calls |
| OCR receipt scan | Integrate Google Vision API in `chat.js` |
| AI categorisation | Call Claude API in `parseNaturalLanguage()` |
| Push notifications | Add Service Worker + Push API |
| PDF reports | Use jsPDF in `charts.js` |
| Excel export | Use SheetJS in `settings.js` |
| Multi-currency | Extend `AppState` currency map + exchange rate API |
| Budget limits | Add a `budgets` store with alerts in `dashboard.js` |

---

## ✅ Best Practices Used

- **ES6 modules** — clean import/export, no global pollution
- **IndexedDB abstraction** — all DB code in one file, swap-ready
- **CSS custom properties** — theming without JavaScript
- **Semantic HTML** — proper `<nav>`, `<main>`, `<header>`, `<aside>`
- **Mobile-first responsive** — fluid grid, mobile nav, safe area insets
- **Accessible** — keyboard focus visible, ARIA-compatible structure
- **Reduced motion** — `prefers-reduced-motion` media query respected
- **No external dependencies** at runtime (except Chart.js via CDN)
- **Well-commented code** — every module and function documented
- **Error handling** — try/catch on all async storage operations
- **Toast feedback** — every user action confirms with a non-blocking toast

---

## 📋 Installation Summary

```bash
# 1. Download / unzip the project
# 2. Serve it (pick any method above)
# 3. Open in a modern browser (Chrome, Firefox, Edge, Safari)
# 4. No npm install, no build step, no configuration needed
```

First launch automatically seeds default categories. Your data stays in your browser — private, offline-capable, and instant.
