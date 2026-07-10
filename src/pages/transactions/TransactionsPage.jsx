import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { formatCurrency } from '@/lib/format'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import './finai/transactions.css'

export default function TransactionsPage() {
  const { accounts, transactions, categories, addTransaction, updateTransaction, deleteTransaction } = useFinance()
  const [fWallet, setFWallet] = useState('all')
  const [fType, setFType] = useState('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTx, setEditTx] = useState(null) // transaction being edited, or null
  const [form, setForm] = useState({ type: 'expense' })
  const [errors, setErrors] = useState({})

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (fWallet !== 'all' && t.account_id !== fWallet) return false
      if (fType !== 'all' && t.type !== fType) return false
      if (search && !t.merchant.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, fWallet, fType, search])

  // When editing an expense on the same wallet it was originally posted to,
  // the original amount is already "out" of that wallet — so it counts back
  // toward what's available for this edit. Different wallet, or a fresh
  // transaction, gets no refund.
  function isEditingRefund() {
    if (!editTx || editTx.account_id !== form.account_id) return 0
    return editTx.type === 'expense' ? Number(editTx.amount) : -Number(editTx.amount)
  }

  const selectedAccount = accounts.find((a) => a.id === form.account_id)
  const availableBalance = selectedAccount ? Number(selectedAccount.balance) + isEditingRefund() : null
  const overBalance = form.type === 'expense' && form.amount && availableBalance !== null && Number(form.amount) > availableBalance

  function validate() {
    const e = {}
    if (!form.account_id) e.account_id = 'Select a wallet'
    if (!form.category) e.category = 'Select a category'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter an amount greater than 0'
    if (!e.amount && overBalance) e.amount = `Exceeds available balance (${formatCurrency(availableBalance)})`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    const { error } = await addTransaction({
      account_id: form.account_id,
      type: form.type,
      category: form.category,
      merchant: form.merchant?.trim() || form.category,
      amount: Number(form.amount),
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    })
    if (error) { setErrors({ save: error.message || 'Something went wrong.' }); return }
    setModalOpen(false)
    setForm({ type: 'expense' })
    setErrors({})
  }

  function openEdit(t) {
    setEditTx(t)
    setForm({
      type: t.type,
      account_id: t.account_id,
      category: t.category,
      merchant: t.merchant,
      amount: t.amount,
      date: t.date.slice(0, 10),
    })
    setErrors({})
  }

  async function handleSaveEdit() {
    if (!validate()) return
    const { error } = await updateTransaction(editTx.id, {
      account_id: form.account_id,
      type: form.type,
      category: form.category,
      merchant: form.merchant?.trim() || form.category,
      amount: Number(form.amount),
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    })
    if (error) { setErrors({ save: error.message || 'Something went wrong.' }); return }
    setEditTx(null)
    setForm({ type: 'expense' })
    setErrors({})
  }

  function closeModal() {
    setModalOpen(false)
    setEditTx(null)
    setForm({ type: 'expense' })
    setErrors({})
  }

  const isEditing = !!editTx
  const isOpen = modalOpen || isEditing

  return (
    <div className="finai-page">
      <PageHeader
        title="Transactions"
        subtitle="All your money movements in one place"
        actions={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>+ New Transaction</button>
        }
      />

      <div className="card">
        <div className="filters">
          <select className="filter-select" value={fWallet} onChange={(e) => setFWallet(e.target.value)}>
            <option value="all">All Wallets</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="filter-select" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <div className="search-input">
            <Search size={15} className="search-input-icon" />
            <input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="rt-list">
          {filtered.map((t) => (
            <div className="rt-row" key={t.id}>
              <div className="rt-info">
                <div className="rt-name">{t.merchant}</div>
              </div>
              <div className="rt-date">{new Date(t.date).toLocaleString()} <span className='rt-dot'>·</span> <span>{t.category}</span></div>
              <div className={`rt-amt ${t.type === 'income' ? 'pos' : 'neg'}`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </div>
              <button className="modal-close" onClick={() => openEdit(t)} aria-label="Edit transaction">✎</button>
              <button className="modal-close" onClick={() => deleteTransaction(t.id)} aria-label="Delete transaction">✕</button>
            </div>
          ))}
          {filtered.length === 0 && <p className="spending-total">No transactions found.</p>}
        </div>
      </div>

      <Modal open={isOpen} onClose={closeModal} title={isEditing ? 'Edit Transaction' : 'New Transaction'}>
        <div className="segmented">
          {['income', 'expense'].map((ty) => (
            <button
              key={ty}
              className={form.type === ty ? 'active' : ''}
              onClick={() => setForm({ ...form, type: ty, category: undefined })} // reset category on type switch
            >
              {ty[0].toUpperCase() + ty.slice(1)}
            </button>
          ))}
        </div>

        <FormField
          label="Wallet"
          type="select"
          value={form.account_id || ''}
          onChange={(e) => setForm({ ...form, account_id: e.target.value })}
          error={errors.account_id}
        >
          <option value="" disabled>Select…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </FormField>

        <div className="form-row">
          <FormField
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount || ''}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
          />
          <FormField
            label="Category"
            type="select"
            value={form.category || ''}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            error={errors.category}
          >
            <option value="" disabled>Select…</option>
            {(categories[form.type] || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </FormField>
        </div>

        {form.type === 'expense' && selectedAccount && (
          <div
            className="goal-deadline"
            style={{ margin: '-8px 0 12px', color: overBalance ? 'var(--red)' : undefined }}
          >
            Available in {selectedAccount.name}: {formatCurrency(availableBalance)}
          </div>
        )}

        {isEditing && (
          <FormField
            label="Date"
            type="date"
            value={form.date || ''}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        )}

        <FormField
          label="Merchant / Note"
          value={form.merchant || ''}
          onChange={(e) => setForm({ ...form, merchant: e.target.value })}
        />

        {errors.save && <p className="msg-banner error">{errors.save}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={closeModal}>Cancel</button>
          <button
            className="btn-primary"
            onClick={isEditing ? handleSaveEdit : handleSave}
            disabled={overBalance}
          >
            {isEditing ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
