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
  const [goalContributions, setGoalContributions] = useState([])
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setAccounts([]); setTransactions([]); setBudgets([]); setGoals([]); setGoalContributions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [accRes, txRes, budRes, goalRes, contribRes] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('budgets').select('*'),
        // Soft-deleted goals are excluded here, not just hidden by the UI —
        // once deleted_at is set, a goal never comes back from the server.
        supabase.from('goals').select('*').is('deleted_at', null).order('created_at', { ascending: true }),
        supabase.from('goal_contributions').select('*').order('created_at', { ascending: false }),
      ])
      const firstError = accRes.error || txRes.error || budRes.error || goalRes.error || contribRes.error
      if (firstError) throw firstError
      setAccounts(accRes.data ?? [])
      setTransactions(txRes.data ?? [])
      setBudgets(budRes.data ?? [])
      setGoals(goalRes.data ?? [])
      setGoalContributions(contribRes.data ?? [])
    } catch (e) {
      setError(e.message || 'Failed to load your data.')
    } finally {
      setLoading(false)
    }
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

  const updateAccount = async (id, patch) => {
    const { data, error } = await supabase
      .from('accounts')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (!error) setAccounts((prev) => prev.map((a) => (a.id === id ? data : a)))
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
  if (error) return { data: null, error }

  const delta = input.type === 'expense' ? -Number(input.amount) : Number(input.amount)
  const acc = accounts.find((a) => a.id === input.account_id)
  if (acc) {
    const { error: balError } = await supabase
      .from('accounts')
      .update({ balance: acc.balance + delta })
      .eq('id', acc.id)

    if (balError) {
      // Compensate: don't leave a transaction on record with no matching balance change.
      await supabase.from('transactions').delete().eq('id', data.id)
      return { data: null, error: { message: 'Could not update wallet balance, so the transaction was not saved. Please try again.' } }
    }
    setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, balance: a.balance + delta } : a)))
  }

  setTransactions((prev) => [data, ...prev])
  return { data, error: null }
}

const deleteTransaction = async (id) => {
  const tx = transactions.find((t) => t.id === id)
  if (!tx) return { error: { message: 'Transaction not found.' } }

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error }

  const delta = tx.type === 'expense' ? Number(tx.amount) : -Number(tx.amount)
  const acc = accounts.find((a) => a.id === tx.account_id)
  if (acc) {
    const { error: balError } = await supabase
      .from('accounts')
      .update({ balance: acc.balance + delta })
      .eq('id', acc.id)

    if (balError) {
      // Compensate: put the row back rather than leave the balance silently wrong.
      await supabase.from('transactions').insert(tx)
      return { error: { message: 'Could not update wallet balance, so the transaction was not deleted. Please try again.' } }
    }
    setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, balance: a.balance + delta } : a)))
  }

  setTransactions((prev) => prev.filter((t) => t.id !== id))
  return { error: null }
}

  const updateTransaction = async (id, patch) => {
    const original = transactions.find((t) => t.id === id)
    if (!original) return { error: { message: 'Transaction not found.' } }

    const next = { ...original, ...patch }
    const oldAcc = accounts.find((a) => a.id === original.account_id)
    const newAcc = accounts.find((a) => a.id === next.account_id)
    if (!newAcc) return { error: { message: 'Select a valid wallet.' } }

    const oldDelta = original.type === 'expense' ? -Number(original.amount) : Number(original.amount)
    const newDelta = next.type === 'expense' ? -Number(next.amount) : Number(next.amount)

    const { data, error } = await supabase
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error }

    async function applyBalances() {
      if (original.account_id === next.account_id) {
        const net = newDelta - oldDelta
        if (net === 0) return { error: null }
        return supabase.from('accounts').update({ balance: newAcc.balance + net }).eq('id', newAcc.id)
      }
      const revertOld = oldAcc
        ? await supabase.from('accounts').update({ balance: oldAcc.balance - oldDelta }).eq('id', oldAcc.id)
        : { error: null }
      if (revertOld.error) return revertOld
      return supabase.from('accounts').update({ balance: newAcc.balance + newDelta }).eq('id', newAcc.id)
    }

    const { error: balError } = await applyBalances()
    if (balError) {
      // Undo the row edit so it matches the (unchanged) balances.
      await supabase.from('transactions').update(original).eq('id', id)
      return { error: { message: 'Could not update wallet balance, so the edit was not saved. Please try again.' } }
    }

    setTransactions((prev) => prev.map((t) => (t.id === id ? data : t)))
    setAccounts((prev) => prev.map((a) => {
      if (original.account_id === next.account_id && a.id === newAcc.id) {
        return { ...a, balance: a.balance + (newDelta - oldDelta) }
      }
      if (original.account_id !== next.account_id) {
        if (a.id === oldAcc?.id) return { ...a, balance: a.balance - oldDelta }
        if (a.id === newAcc.id) return { ...a, balance: a.balance + newDelta }
      }
      return a
    }))
    return { data, error: null }
  }
  
const addBudget = async (input) => {
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...input, user_id: user.id })
      .select()
      .single()
    if (!error) setBudgets((prev) => [...prev, data])
    return { data, error }
  }

  const updateBudget = async (id, patch) => {
    const { data, error } = await supabase
      .from('budgets')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (!error) setBudgets((prev) => prev.map((b) => (b.id === id ? data : b)))
    return { data, error }
  }

  const deleteBudget = async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) setBudgets((prev) => prev.filter((b) => b.id !== id))
    return { error }
  }

  const duplicateBudget = async (budget) => {
    const { id, created_at, ...rest } = budget
    return addBudget({ ...rest, status: 'active' })
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

  // Generic patch used for editing (name/target/deadline) and the status
  // transitions below (archive, retrieve, auto-complete).
  const updateGoal = async (id, updates) => {
    // A target can never be edited down below what's already saved — that
    // would create money "saved" toward a goal that no longer needs it,
    // with no clear place for the excess to go. Equal is fine (goal is
    // exactly complete); only strictly lower is blocked.
    if (Object.prototype.hasOwnProperty.call(updates, 'target_amount')) {
      const goal = goals.find((g) => g.id === id)
      if (goal && Number(updates.target_amount) < Number(goal.saved_amount)) {
        return { error: { message: `Target can't be lower than the ${Number(goal.saved_amount).toLocaleString()} already saved.` } }
      }
    }
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) setGoals((prev) => prev.map((g) => (g.id === id ? data : g)))
    return { data, error }
  }

  // Only ever called on a goal that has already reached its target — moves
  // it out of Current and into Past Goals' Success filter.
  const archiveGoal = async (id) =>
    updateGoal(id, { archived_at: new Date().toISOString() })

  // Soft delete: only callable from Past Goals. The row is kept for
  // integrity, but refresh() excludes anything with deleted_at set, so it
  // never comes back — this isn't a "trash" the user can browse.
  const deleteGoal = async (id) => {
    const { data, error } = await supabase
      .from('goals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error) setGoals((prev) => prev.filter((g) => g.id !== id))
    return { data, error }
  }

  // Pulls a Past goal back into Current. Status is recalculated from actual
  // money saved (not just reset blindly). The deadline is intentionally left
  // untouched — if it's still in the past, the goal shows a "deadline
  // passed" warning in Current instead of being auto-failed again, since
  // retrieved_at is now set.
  const retrieveGoal = async (id) => {
    const goal = goals.find((g) => g.id === id)
    if (!goal) return { error: 'Goal not found' }
    const reached = Number(goal.saved_amount) >= Number(goal.target_amount)
    return updateGoal(id, {
      status: reached ? 'completed' : 'in_progress',
      archived_at: null,
      retrieved_at: new Date().toISOString(),
      completed_at: reached ? (goal.completed_at || new Date().toISOString()) : null,
    })
  }

  // accountId is optional so any older call sites without a wallet still work.
  const contributeToGoal = async (goalId, amount, accountId = null) => {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return { error: 'Goal not found' }

    const { data: contribution, error: cErr } = await supabase
      .from('goal_contributions')
      .insert({ goal_id: goalId, amount, account_id: accountId, user_id: user.id })
      .select()
      .single()
    if (cErr) return { error: cErr }
    setGoalContributions((prev) => [contribution, ...prev])

    const newSaved = Number(goal.saved_amount) + Number(amount)
    const updates = { saved_amount: newSaved }
    // Auto-complete: reaching the target always marks the goal finished
    // AND moves it straight to Past Goals (archived_at set immediately) —
    // it no longer waits for a manual archive click.
    if (goal.status === 'in_progress' && newSaved >= Number(goal.target_amount)) {
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
      updates.archived_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single()
    if (!error) setGoals((prev) => prev.map((g) => (g.id === goalId ? data : g)))
    return { data, error }
  }

  // The only way goals get funded: money moves out of a wallet and into the
  // goal, exactly like a transfer.
  const contributeToGoalFromWallet = async ({ account_id, goal_id, amount, date, note }) => {
    const acc = accounts.find((a) => a.id === account_id)
    const goal = goals.find((g) => g.id === goal_id)
    const requestedAmount = Number(amount)
    if (!acc) return { error: { message: 'Select a wallet.' } }
    if (!goal) return { error: { message: 'Select a savings goal.' } }
    if (!requestedAmount || requestedAmount <= 0) return { error: { message: 'Enter an amount greater than 0.' } }

    // Fallback cap: a contribution can never push a goal past its target,
    // regardless of what was typed or passed in. This is enforced here
    // (not just in the UI) so it holds for every caller.
    const needed = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount))
    if (needed <= 0) return { error: { message: 'This goal has already reached its target.' } }
    const amt = Math.min(requestedAmount, needed)
    const capped = amt < requestedAmount

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
    const { data: updatedGoal, error: goalError } = await contributeToGoal(goal_id, amt, account_id)
    if (goalError) return { error: goalError }
    const completed = updatedGoal?.status === 'completed'
    return { data: updatedGoal, completed, amountTransferred: amt, requestedAmount, capped }
  }

  const value = {
    accounts,
    transactions,
    budgets,
    goals,
    goalContributions,
    categories: DEFAULT_CATEGORIES,
    loading,
    error,
    refresh,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addBudget,
    updateBudget,
    deleteBudget,
    duplicateBudget,
    addGoal,
    updateGoal,
    archiveGoal,
    retrieveGoal,
    contributeToGoal,
    contributeToGoalFromWallet,
    deleteGoal,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export const useFinance = () => useContext(FinanceContext)