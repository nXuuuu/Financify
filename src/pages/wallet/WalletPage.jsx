import { useMemo, useState } from 'react'
import { MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, monthKey } from '@/lib/format'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import StatRow from '@/components/ui/StatRow'
import StatCard from '@/components/ui/StatCard'
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu'
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

export default function WalletPage() {
  const { accounts, transactions, addAccount, addTransaction, updateAccount, deleteAccount } = useFinance()
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  const [modal, setModal] = useState(null)
  const [presetWalletId, setPresetWalletId] = useState(null)
  const [form, setForm] = useState({})
  const [openMenu, setOpenMenu] = useState(null)
  const [renameWalletId, setRenameWalletId] = useState(null)

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

  async function handleRename() {
    const newName = (form.name || '').trim()
    if (!newName || !renameWalletId) return
    await updateAccount(renameWalletId, { name: newName })
    setRenameWalletId(null)
    setForm({})
  }

  async function handleDelete(walletId) {
    await deleteAccount(walletId)
    setOpenMenu(null)
  }

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
    const walletName = (form.name || '').trim()
    if (!walletName) return
    await addAccount({
      name: walletName,
      type: form.type === 'Bank Account' ? 'checking' : form.type === 'Savings' ? 'saving' : 'checking',
      balance: Number(form.balance) || 0,
      currency: 'USD',
    })
    closeModal()
  }

  const modalTitle = modal === 'new-wallet' ? 'New Wallet' : modal === 'income' ? 'Add Income' : modal === 'expense' ? 'Add Expense' : 'Transfer'

  return (
    <div className="finai-page">
      <PageHeader
        showAvatar
        avatarName={name}
        title="Wallet"
        subtitle="Manage where your money lives"
        actions={
          <button className="btn-primary" onClick={() => openModal('income')}>+ New Transaction</button>
        }
      />

      <div className="dashboard-grid">
        <div className="col-left">
          <StatRow variant="stat-row-4">
            <StatCard label="Total Balance" value={formatCurrency(total)} />
            <StatCard label="Total Wallets" value={accounts.length} />
            <StatCard label="Income (Month)" value={formatCurrency(monthIncome)} />
            <StatCard label="Expense (Month)" value={formatCurrency(monthExpense)} />
          </StatRow>

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
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="wallet-name">{w.name}</div>
                          <div className="wallet-type">{w.type}</div>
                        </div>
                        <DropdownMenu
                          open={openMenu === w.id}
                          onClose={() => setOpenMenu(null)}
                          trigger={
                            <button type="button" className="goal-menu-btn" aria-label="Wallet actions" onClick={() => setOpenMenu(openMenu === w.id ? null : w.id)}>
                              <MoreVertical size={15} />
                            </button>
                          }
                        >
                          <DropdownMenuItem onClick={() => { setRenameWalletId(w.id); setForm({ name: w.name }); setOpenMenu(null) }}><Edit2 size={14} /> Rename</DropdownMenuItem>
                          {Number(w.balance) === 0 && (
                            <DropdownMenuItem danger onClick={() => handleDelete(w.id)}><Trash2 size={14} /> Delete</DropdownMenuItem>
                          )}
                        </DropdownMenu>
                      </div>
                      <div className="wallet-balance">{formatCurrency(w.balance)}</div>
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
                    {a.type === 'income' ? '+' : '-'}{formatCurrency(a.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={!!modal} onClose={closeModal} title={modalTitle}>
        {modal === 'new-wallet' ? (
          <>
            <FormField label="Wallet Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="form-row">
              <FormField label="Type" type="select" onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option>Physical Cash</option><option>Bank Account</option><option>Savings</option>
              </FormField>
              <FormField label="Starting Balance" type="number" onChange={(e) => setForm({ ...form, balance: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateWallet}>Create Wallet</button>
            </div>
          </>
        ) : (
          <>
            {modal === 'transfer' ? (
              <FormField
                label="From Wallet"
                type="select"
                defaultValue={presetWalletId || ''}
                onChange={(e) => setForm({ ...form, fromId: e.target.value })}
              >
                {accounts.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
              </FormField>
            ) : (
              <FormField
                label="Wallet"
                type="select"
                defaultValue={presetWalletId || ''}
                onChange={(e) => setForm({ ...form, walletId: e.target.value })}
              >
                {accounts.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
              </FormField>
            )}
            {modal === 'transfer' && (
              <FormField label="To Wallet" type="select" onChange={(e) => setForm({ ...form, toId: e.target.value })}>
                <option value="">Select…</option>
                {accounts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </FormField>
            )}
            <div className="form-row">
              <FormField label="Amount" type="number" onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              {modal === 'income' && (
                <FormField label="Source" onChange={(e) => setForm({ ...form, source: e.target.value })} />
              )}
              {modal === 'expense' && (
                <FormField label="Category" type="select" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option>Food & Dining</option><option>Transport</option><option>Shopping</option><option>Bills</option><option>Other</option>
                </FormField>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
          </>
        )}
      </Modal>

      {renameWalletId && (
        <Modal open={!!renameWalletId} onClose={() => { setRenameWalletId(null); setForm({}) }} title="Rename Wallet">
          <FormField label="Wallet Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => { setRenameWalletId(null); setForm({}) }}>Cancel</button>
            <button className="btn-primary" onClick={handleRename}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
