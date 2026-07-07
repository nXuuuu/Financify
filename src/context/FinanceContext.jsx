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
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

const [error, setError] = useState(null)

const refresh = useCallback(async () => {
  if (!user) { setAccounts([]); setTransactions([]); setBudgets([]); setGoals([]); setLoading(false); return }
  setLoading(true)
  setError(null)
  try {
    const [accRes, txRes, budRes, goalRes] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('budgets').select('*'),
      supabase.from('goals').select('*').order('created_at', { ascending: true }),
    ])
    if (accRes.error || txRes.error) throw accRes.error || txRes.error
    setAccounts(accRes.data ?? [])
    setTransactions(txRes.data ?? [])
    setBudgets(budRes.data ?? [])
    setGoals(goalRes.data ?? [])
  } catch (e) {
    setError(e.message || 'Failed to load your data.')
  } finally {
    setLoading(false)
  }
}, [user])
// add `error` and `refresh` to the exported `value`

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

  const addGoal = async (input) => {
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...input, user_id: user.id })
      .select()
      .single()
    if (!error) setGoals((prev) => [...prev, data])
    return { data, error }
  }

  const updateGoal = async (id, patch) => {
    const { data, error } = await supabase
      .from('goals')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (!error) setGoals((prev) => prev.map((g) => (g.id === id ? data : g)))
    return { data, error }
  }

  const contributeToGoal = async (goalId, amount) => {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return { error: 'Goal not found' }
    const { error: cErr } = await supabase.from('goal_contributions').insert({ goal_id: goalId, amount, user_id: user.id })
    if (cErr) return { error: cErr }
    const { data, error } = await supabase
      .from('goals')
      .update({ saved_amount: Number(goal.saved_amount) + Number(amount) })
      .eq('id', goalId)
      .select()
      .single()
    if (!error) setGoals((prev) => prev.map((g) => (g.id === goalId ? data : g)))
    return { data, error }
  }

  const contributeToGoalFromWallet = async ({ account_id, goal_id, amount, date, note }) => {
    const acc = accounts.find((a) => a.id === account_id)
    const goal = goals.find((g) => g.id === goal_id)
    const amt = Number(amount)
    if (!acc) return { error: { message: 'Select a wallet.' } }
    if (!goal) return { error: { message: 'Select a savings goal.' } }
    if (!amt || amt <= 0) return { error: { message: 'Enter an amount greater than 0.' } }
    if (Number(acc.balance) < amt) {
      return { error: { message: `Insufficient balance in ${acc.name}. Available: $${Number(acc.balance).toLocaleString()}.` } }
    }
    const { error: txError } = await addTransaction({
      account_id,
      type: 'expense',
      category: 'Goal Contribution',
      merchant: `Goal: ${goal.name}`,
      amount: amt,
      date: date || new Date().toISOString(),
      notes: note || '',
    })
    if (txError) return { error: txError }
    const { data: updatedGoal, error: goalError } = await contributeToGoal(goal_id, amt)
    if (goalError) return { error: goalError }
    const completed = updatedGoal && Number(updatedGoal.saved_amount) >= Number(updatedGoal.target_amount)
    return { data: updatedGoal, completed }
  }

  const deleteGoal = async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (!error) setGoals((prev) => prev.filter((g) => g.id !== id))
    return { error }
  }

  const value = {
    accounts,
    transactions,
    budgets,
    goals,
    categories: DEFAULT_CATEGORIES,
    loading,
    error,
    refresh,
    addAccount,
    deleteAccount,
    addTransaction,
    deleteTransaction,
    upsertBudget,
    addGoal,
    updateGoal,
    contributeToGoal,
    contributeToGoalFromWallet,
    deleteGoal,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export const useFinance = () => useContext(FinanceContext)
