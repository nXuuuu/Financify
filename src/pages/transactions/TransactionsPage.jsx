import { useMemo, useState } from 'react'
import { useFinance } from '@/context/FinanceContext'
import { formatCurrency } from '@/lib/format'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import './finai/transactions.css'

export default function TransactionsPage() {
  const { accounts, transactions, categories, addTransaction, deleteTransaction } = useFinance()
  const [fWallet, setFWallet] = useState('all')
  const [fType, setFType] = useState('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
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

  function validate() {
    const e = {}
    if (!form.account_id) e.account_id = 'Select a wallet'
    if (!form.category) e.category = 'Select a category'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter an amount greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    await addTransaction({
      account_id: form.account_id,
      type: form.type,
      category: form.category,
      merchant: form.merchant?.trim() || form.category,
      amount: Number(form.amount),
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    })
    setModalOpen(false)
    setForm({ type: 'expense' })
    setErrors({})
  }

  function closeModal() {
    setModalOpen(false)
  }

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
          <input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <button className="modal-close" onClick={() => deleteTransaction(t.id)}>✕</button>
            </div>
          ))}
          {filtered.length === 0 && <p className="spending-total">No transactions found.</p>}
        </div>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title="New Transaction">
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

        <FormField
          label="Merchant / Note"
          value={form.merchant || ''}
          onChange={(e) => setForm({ ...form, merchant: e.target.value })}
        />

        <div className="modal-actions">
          <button className="btn-ghost" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </Modal>
    </div>
  )
}
