import { useMemo, useState } from 'react'
import { useFinance } from '@/context/FinanceContext'
import { monthKey } from '@/lib/format'
import './finai/wallet.css'

const ICONS = {
  'Physical Cash': '💵',
  'Bank Account': '🏦',
  Savings: '🐷',
  Credit: '💳',
}
const STYLES = [
  { bg: '#d9f2e2', color: '#16a34a' },
  { bg: '#bfdbfe', color: '#1e40af' },
  { bg: '#fde68a', color: '#92400e' },
  { bg: '#e9d5ff', color: '#6b21a8' },
]
const fmt = (n) => '$' + Number(n).toLocaleString()

export default function WalletPage() {
  const { accounts, transactions, addAccount, addTransaction } = useFinance()
  const [modal, setModal] = useState(null)
  const [presetWalletId, setPresetWalletId] = useState(null)
  const [form, setForm] = useState({})

  const thisMonth = monthKey(new Date().toISOString())
  const { total, monthIncome, monthExpense, activity } = useMemo(() => {
    const total = accounts.reduce((s, a) => s + Number(a.balance), 0)
    const monthTx = transactions.filter((t) => monthKey(t.date) === thisMonth)
    const monthIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const monthExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { total, monthIncome, monthExpense, activity: transactions.slice(0, 6) }
  }, [accounts, transactions, thisMonth])

  function openModal(type, walletId = null) {
    setForm({})
    setPresetWalletId(walletId)
    setModal(type)
  }
  function closeModal() { setModal(null) }

  async function handleSave() {
    const amount = Number(form.amount)
    if (!amount) return
    if (modal === 'income' || modal === 'expense') {
      const accountId = form.walletId || presetWalletId || accounts[0]?.id
      if (!accountId) return
      await addTransaction({
        account_id: accountId,
        type: modal,
        category: modal === 'income' ? form.source || 'Income' : form.category || 'Other',
        merchant: modal === 'income' ? form.source || 'Income' : form.category || 'Other',
        amount,
        date: new Date().toISOString(),
      })
    } else if (modal === 'transfer') {
      const fromId = form.fromId || presetWalletId || accounts[0]?.id
      const toId = form.toId
      if (!fromId || !toId || fromId === toId) return
      await addTransaction({ account_id: fromId, type: 'expense', category: 'Transfer', merchant: 'Transfer out', amount, date: new Date().toISOString() })
      await addTransaction({ account_id: toId, type: 'income', category: 'Transfer', merchant: 'Transfer in', amount, date: new Date().toISOString() })
    }
    closeModal()
  }

  async function handleCreateWallet() {
    const name = (form.name || '').trim()
    if (!name) return
    await addAccount({
      name,
      type: form.type === 'Bank Account' ? 'checking' : form.type === 'Savings' ? 'saving' : 'checking',
      balance: Number(form.balance) || 0,
      currency: 'USD',
    })
    closeModal()
  }

  return (
    <div className="finai-page">
      <div className="topbar">
        <div className="greeting">
          <div className="avatar">D</div>
          <div><h1>Wallet</h1><p>Manage where your money lives</p></div>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary" onClick={() => openModal('income')}>+ New Transaction</button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="col-left">
          <div className="stat-row">
            <div className="card balance-card">
              <div>
                <div className="label">Total Balance</div>
                <div className="amount">{fmt(total)}</div>
              </div>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Total Wallets</span>
              <div className="stat-amount">{accounts.length}</div>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Income (Month)</span>
              <div className="stat-amount">{fmt(monthIncome)}</div>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Expense (Month)</span>
              <div className="stat-amount">{fmt(monthExpense)}</div>
            </div>
          </div>

          <div className="card">
            <div className="section-title"><h2>Your Wallets</h2></div>
            <div className="wallets-grid">
              {accounts.map((w, i) => {
                const st = STYLES[i % STYLES.length]
                return (
                  <div className="wallet-card" key={w.id}>
                    <div>
                      <div className="wallet-head">
                        <div className="wallet-icon" style={{ background: st.bg, color: st.color }}>{ICONS[w.type] || '💰'}</div>
                        <div><div className="wallet-name">{w.name}</div><div className="wallet-type">{w.type}</div></div>
                      </div>
                      <div className="wallet-balance">{fmt(w.balance)}</div>
                    </div>
        
                    <div className="wallet-actions">
                      <button className="add-btn" onClick={() => openModal('income', w.id)}>Add Money</button>
                      <button className="send-btn" onClick={() => openModal('transfer', w.id)}>Send</button>
                    </div>
                  </div>
                )
              })}
              <div className="wallet-card add-card" onClick={() => openModal('new-wallet')}>+ Add New Wallet</div>
            </div>
          </div>
        </div>

        <div className="col-right">
          <div className="card">
            <div className="section-title"><h2>Quick Actions</h2></div>
            <div className="quick-grid">
              <div className="quick-item" onClick={() => openModal('income')}>Add Income</div>
              <div className="quick-item" onClick={() => openModal('expense')}>Add Expense</div>
              <div className="quick-item" style={{ gridColumn: 'span 2' }} onClick={() => openModal('transfer')}>Transfer Money</div>
            </div>
          </div>
          <div className="card">
            <div className="section-title"><h2>Recent Activity</h2></div>
            <div className="rt-list">
              {activity.map((a) => (
                <div className="rt-row" key={a.id}>
                  <div className="rt-info">
                    <div className="rt-name">{a.merchant}</div>
                    <div className="rt-date">{new Date(a.date).toLocaleString()}</div>
                  </div>
                  <div className={`rt-amt ${a.type === 'income' ? 'pos' : 'neg'}`}>
                    {a.type === 'income' ? '+' : '-'}{fmt(a.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>{modal === 'new-wallet' ? 'New Wallet' : modal === 'income' ? 'Add Income' : modal === 'expense' ? 'Add Expense' : 'Transfer'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {modal === 'new-wallet' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Wallet Name</label>
                  <input className="form-input" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option>Physical Cash</option><option>Bank Account</option><option>Savings</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Starting Balance</label>
                    <input className="form-input" type="number" onChange={(e) => setForm({ ...form, balance: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button className="btn-primary" onClick={handleCreateWallet}>Create Wallet</button>
                </div>
              </>
            ) : (
              <>
                {modal === 'transfer' ? (
                  <div className="form-group">
                    <label className="form-label">From Wallet</label>
                    <select className="form-select" defaultValue={presetWalletId || ''} onChange={(e) => setForm({ ...form, fromId: e.target.value })}>
                      {accounts.map((w) => <option key={w.id} value={w.id}>{w.name} ({fmt(w.balance)})</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Wallet</label>
                    <select className="form-select" defaultValue={presetWalletId || ''} onChange={(e) => setForm({ ...form, walletId: e.target.value })}>
                      {accounts.map((w) => <option key={w.id} value={w.id}>{w.name} ({fmt(w.balance)})</option>)}
                    </select>
                  </div>
                )}
                {modal === 'transfer' && (
                  <div className="form-group">
                    <label className="form-label">To Wallet</label>
                    <select className="form-select" onChange={(e) => setForm({ ...form, toId: e.target.value })}>
                      <option value="">Select…</option>
                      {accounts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input className="form-input" type="number" onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  {modal === 'income' && (
                    <div className="form-group">
                      <label className="form-label">Source</label>
                      <input className="form-input" onChange={(e) => setForm({ ...form, source: e.target.value })} />
                    </div>
                  )}
                  {modal === 'expense' && (
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-select" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        <option>Food & Dining</option><option>Transport</option><option>Shopping</option><option>Bills</option><option>Other</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button className="btn-primary" onClick={handleSave}>Save</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
