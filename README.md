# Financify

**A personal finance management application for tracking wallets, transactions, budgets, and savings goals — backed by Supabase and built with React.**

*Every entry, accounted for.*

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Overview

Financify gives users a single place to manage multiple accounts, log income and expenses, set category budgets, and work toward savings goals, with analytics that surface trends without requiring manual reporting.

The application is designed around one guiding principle: **the numbers must always be trustworthy.** Every balance-affecting operation is validated and reconciled at the data layer, not just in the UI, so wallet balances, budget totals, and goal progress stay consistent even under concurrent or partial failures.

## Core Features

| Module | Capabilities |
|---|---|
| **Dashboard** | Balance overview, income/expense trends, category spending breakdown, recent activity, quick-entry actions |
| **Transactions** | Full CRUD ledger with wallet and type filters, search, and balance-aware validation |
| **Wallet** | Multiple account types (cash, bank, savings, credit), inter-wallet transfers, income/expense entry |
| **Budgets** | Per-category spending limits, live progress tracking, threshold alerts, historical performance |
| **Goals** | Savings targets with deadlines, direct wallet-to-goal funding, archive/retrieve workflow, full contribution history |
| **Analytics** | Balance trend (week/month/year), six-month cash flow, income and spending breakdowns, auto-generated financial insights |
| **Settings** | Profile and avatar management, email/password updates, dark mode |
| **Authentication** | Supabase email/password auth with session persistence and "remember me" |

## Data Integrity

All money movement is transactional and balance-checked server-side (`src/context/FinanceContext.jsx`):

- An expense can never be recorded if it exceeds the wallet's current balance.
- Goal contributions are automatically capped at the amount still needed to reach the target.
- If a balance update fails after a transaction is written, the transaction is rolled back — the ledger and the balances it implies never drift apart.
- Every table is protected by Postgres row-level security, scoping all reads and writes to the authenticated user.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19, React Router 7 |
| Build tooling | Vite 8 |
| Backend | Supabase (PostgreSQL, Auth, Row-Level Security) |
| Data visualization | Recharts |
| Icons | lucide-react |
| Linting | oxlint |

## Getting Started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/<your-org>/financify.git
cd financify
npm install
```

### 2. Provision the database

Open the SQL editor in your Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql). This provisions the `accounts`, `transactions`, `budgets`, `goals`, and `goal_contributions` tables, along with row-level security policies that scope every row to `auth.uid()`.

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint against the codebase |

## Project Structure

```
src/
  components/
    charts/       # Recharts wrappers (cash flow bar, spending donut)
    ui/            # Shared UI primitives (Card, Modal, FormField, Badge, StatCard, DropdownMenu, ...)
  context/
    AuthContext    # Supabase auth session + "confirmed this visit" gate
    FinanceContext # All financial data + mutations (accounts, transactions, budgets, goals)
    ThemeContext   # Light/dark theme, persisted to localStorage
  layouts/         # AppLayout (sidebar nav) and AuthLayout
  pages/
    dashboard/     # Overview: balances, spending donut, recent activity
    transactions/  # Transaction ledger
    wallet/        # Accounts + transfers
    goals/         # Savings goals
    budgets/       # Budget tracking
    analytics/     # Trends and insights
    settings/      # Profile, security, appearance
  router/          # ProtectedRoute
  lib/             # Supabase client, formatting helpers
  styles/          # Design tokens + shared component CSS
supabase/
  schema.sql       # Database schema + RLS policies
```

## Data Model

| Table | Description |
|---|---|
| `accounts` | A wallet (checking, saving, or credit) with a running balance |
| `transactions` | Income, expense, or transfer entries tied to an account |
| `budgets` | A spending limit per category, optionally scoped to a single wallet |
| `goals` | A savings target with an amount saved and an optional deadline |
| `goal_contributions` | A ledger of transfers from a wallet into a goal |

See [`supabase/schema.sql`](./supabase/schema.sql) for full column definitions and constraints.

## Contributing

Issues and pull requests are welcome. Before submitting a change, please run:

```bash
npm run lint
```

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.
