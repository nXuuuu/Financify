-- Run this in the Supabase SQL editor for your project.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text not null default 'checking' check (type in ('checking', 'saving', 'credit')),
  currency text not null default 'USD',
  balance numeric not null default 0,
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  account_id uuid references accounts on delete cascade not null,
  date timestamptz not null default now(),
  type text not null check (type in ('income', 'expense', 'transfer')),
  category text not null,
  merchant text not null default '',
  amount numeric not null,
  status text not null default 'cleared' check (status in ('cleared', 'pending')),
  notes text default '',
  created_at timestamptz default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  category text not null,
  limit_amount numeric not null,
  created_at timestamptz default now(),
  unique (user_id, category)
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  target_amount numeric not null,
  saved_amount numeric not null default 0,
  deadline date,
  icon text default 'save',
  created_at timestamptz default now()
);

create table goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  goal_id uuid references goals on delete cascade not null,
  amount numeric not null,
  created_at timestamptz default now()
);

alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

create policy "Users manage own accounts" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own budgets" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table goals enable row level security;
alter table goal_contributions enable row level security;

create policy "Users manage own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own goal contributions" on goal_contributions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
