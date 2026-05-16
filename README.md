# WealthWise

A client-side personal finance dashboard: budgeting (50-30-20), expense tracking with charts, EMI calculator, live currency conversion, learning cards, and a rule-based finance advisor chat.

## Quick start

```bash
cd WealthWise
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). The currency converter needs network access to fetch live rates.

## Project structure

| File | Purpose |
|------|---------|
| `index.html` | Semantic layout, forms, accessibility labels |
| `style.css` | Design tokens, layout, responsive UI |
| `script.js` | App logic (IIFE modules: auth, charts, calculators, chat) |

## Features

- **Learn** — Expandable topic cards (data-driven from `LEARN_TOPICS`)
- **Planner** — Salary split, expense tracker, risk-based suggestions; data saved per user
- **EMI** — Monthly payment, total payable, total interest
- **Currency** — INR → USD/EUR/GBP/JPY/AUD via [exchangerate-api.com](https://www.exchangerate-api.com/)
- **AI Advisor** — Dedicated sidebar page with chat (keyword-matched replies, not a real LLM)

## Security note

Authentication uses `localStorage` with Base64-encoded passwords. This is **for learning and demos only**. Do not use for real financial data without a proper backend and password hashing.

Legacy keys (`user`, `pass`) are migrated automatically on first load.

## Manual testing

1. Register → dashboard appears; open **AI Advisor** from the sidebar to chat
2. Calculate salary → refresh → values and chart restore
3. Sidebar → only one section visible; active item highlighted
4. Invalid EMI inputs → error styling on result panel
5. Logout → sign-in screen returns
