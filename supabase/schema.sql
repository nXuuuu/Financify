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

alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

create policy "Users manage own accounts" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own budgets" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
