import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

const FinanceContext = createContext(null)

const DEFAULT_CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investments', 'Other Income'],
  expense: ['Housing', 'Groceries', 'Dining Out', 'Utilities', 'Transport', 'Entertainment', 'Shopping'],
}

export function FinanceProvider({ children }) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setAccounts([])
      setTransactions([])
      setBudgets([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [accRes, txRes, budRes] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('budgets').select('*'),
    ])
    setAccounts(accRes.data ?? [])
    setTransactions(txRes.data ?? [])
    setBudgets(budRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const addAccount = async (input) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...input, user_id: user.id })
      .select()
      .single()
    if (!error) setAccounts((prev) => [...prev, data])
    return { data, error }
  }

  const deleteAccount = async (id) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (!error) setAccounts((prev) => prev.filter((a) => a.id !== id))
    return { error }
  }

  const addTransaction = async (input) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...input, user_id: user.id })
      .select()
      .single()
    if (!error) {
      setTransactions((prev) => [data, ...prev])
      // keep account balance in sync
      const delta = input.type === 'expense' ? -input.amount : input.amount
      const acc = accounts.find((a) => a.id === input.account_id)
      if (acc) {
        await supabase.from('accounts').update({ balance: acc.balance + delta }).eq('id', acc.id)
        setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, balance: a.balance + delta } : a)))
      }
    }
    return { data, error }
  }

  const deleteTransaction = async (id) => {
    const tx = transactions.find((t) => t.id === id)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      if (tx) {
        const delta = tx.type === 'expense' ? tx.amount : -tx.amount
        const acc = accounts.find((a) => a.id === tx.account_id)
        if (acc) {
          await supabase.from('accounts').update({ balance: acc.balance + delta }).eq('id', acc.id)
          setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, balance: a.balance + delta } : a)))
        }
      }
    }
    return { error }
  }

  const upsertBudget = async (category, limit_amount) => {
    const existing = budgets.find((b) => b.category === category)
    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ limit_amount })
        .eq('id', existing.id)
        .select()
        .single()
      if (!error) setBudgets((prev) => prev.map((b) => (b.id === existing.id ? data : b)))
      return { data, error }
    }
    const { data, error } = await supabase
      .from('budgets')
      .insert({ category, limit_amount, user_id: user.id })
      .select()
      .single()
    if (!error) setBudgets((prev) => [...prev, data])
    return { data, error }
  }

  const value = {
    accounts,
    transactions,
    budgets,
    categories: DEFAULT_CATEGORIES,
    loading,
    refresh,
    addAccount,
    deleteAccount,
    addTransaction,
    deleteTransaction,
    upsertBudget,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export const useFinance = () => useContext(FinanceContext)
