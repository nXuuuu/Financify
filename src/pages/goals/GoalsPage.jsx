import { useMemo, useState } from 'react'
import { useFinance } from '@/context/FinanceContext'
import { formatCurrency } from '@/lib/format'
import PageHeader from '@/components/ui/PageHeader'
import StatRow from '@/components/ui/StatRow'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import FormField from '@/components/ui/FormField'
import Badge from '@/components/ui/Badge'
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu'
import './finai/goals.css'

const todayStr = () => new Date().toISOString().slice(0, 10)
const initials = (name) => (name || '').trim().slice(0, 2).toUpperCase() || '?'

// A goal leaves Current the instant it's archived — whether that's the
// automatic archive on hitting its target, or a manual archive from the
// three-dot menu on a still-in-progress goal. Retrieving a goal clears
// archived_at, which is what brings it back to Current.
function isCurrent(goal) {
  if (goal.archived_at) return false
  if (goal.status === 'in_progress' && goal.deadline && goal.deadline < todayStr() && !goal.retrieved_at) return false
  return true
}
function outcome(goal) {
  return goal.status === 'completed' ? 'success' : 'failure'
}
function isOverdue(goal) {
  return goal.status === 'in_progress' && goal.deadline && goal.deadline < todayStr()
}

const PAST_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'failure', label: 'Failure' },
]

const MODAL_TITLES = {
  new: 'New Goal',
  edit: 'Update Goal',
  add: 'Add Money',
  details: 'Transaction Details',
}

export default function GoalsPage() {
  const {
    goals, accounts, goalContributions,
    addGoal, updateGoal, archiveGoal, retrieveGoal, deleteGoal, contributeToGoalFromWallet,
  } = useFinance()

  const [modal, setModal] = useState(null) // { type: 'new' | 'add' | 'edit' | 'details', goal? }
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState(null)
  const [form, setForm] = useState({})
  const [openMenu, setOpenMenu] = useState(null) // goal id
  const [menuAlign, setMenuAlign] = useState('down')
  const [pastFilter, setPastFilter] = useState('all')
  const [modalError, setModalError] = useState('')

  const grouped = useMemo(() => {
    const current = []
    const past = []
    for (const g of goals) (isCurrent(g) ? current : past).push(g)
    return { current, past }
  }, [goals])

  const filteredPast = useMemo(() => {
    const list = pastFilter === 'all' ? grouped.past : grouped.past.filter((g) => outcome(g) === pastFilter)
    // Stack order: whatever most recently landed in Past (archived, or
    // completed if archived_at is somehow missing) shows on top.
    return [...list].sort((a, b) => {
      const aTime = new Date(a.archived_at || a.completed_at || a.created_at).getTime()
      const bTime = new Date(b.archived_at || b.completed_at || b.created_at).getTime()
      return bTime - aTime
    })
  }, [grouped.past, pastFilter])

  const stats = useMemo(() => {
    const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0)
    const totalSaved = goals.reduce((s, g) => s + Number(g.saved_amount), 0)
    const avg = goals.length ? Math.round((totalSaved / (totalTarget || 1)) * 100) : 0

    const concluded = grouped.past.length
    const successful = grouped.past.filter((g) => outcome(g) === 'success').length
    const successRate = concluded ? Math.round((successful / concluded) * 100) : 0

    return { totalTarget, totalSaved, avg, successRate }
  }, [goals, grouped])

  function closeModal() {
    setModal(null)
    setForm({})
    setModalError('')
  }

  function toggleMenu(e, goalId) {
    if (openMenu === goalId) { setOpenMenu(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setMenuAlign(spaceBelow < 220 ? 'up' : 'down')
    setOpenMenu(goalId)
  }

  async function handleCreate() {
    const name = (form.name || '').trim()
    const target = Number(form.target)
    if (!name || !target) return
    await addGoal({ name, target_amount: target, saved_amount: 0, deadline: form.deadline || null })
    closeModal()
  }

  async function handleContribute() {
    if (!modal?.goal) return
    const amount = Number(form.amount)
    if (!form.account_id) { setModalError('Choose a wallet to transfer from.'); return }
    if (!amount || amount <= 0) { setModalError('Enter an amount greater than 0.'); return }
    setModalError('')
    const { error } = await contributeToGoalFromWallet({
      account_id: form.account_id,
      goal_id: modal.goal.id,
      amount,
    })
    if (error) { setModalError(error.message || 'Something went wrong.'); return }
    closeModal()
  }

  async function handleEdit() {
    if (!modal?.goal) return
    const goal = modal.goal
    const name = (form.name || '').trim()
    const target = Number(form.target)
    if (!name || !target) return
    const reached = Number(goal.saved_amount) >= target
    const { error } = await updateGoal(goal.id, {
      name,
      target_amount: target,
      deadline: form.deadline || null,
      status: reached ? 'completed' : 'in_progress',
      completed_at: reached ? (goal.completed_at || new Date().toISOString()) : null,
    })
    if (error) { setModalError(error.message || 'Something went wrong.'); return }
    closeModal()
  }

  async function handleArchive(goal) {
    await archiveGoal(goal.id)
    setOpenMenu(null)
  }

  async function handleRetrieve(goal) {
    await retrieveGoal(goal.id)
    setOpenMenu(null)
  }

  async function confirmDelete() {
    if (!confirmDeleteGoal) return
    await deleteGoal(confirmDeleteGoal.id)
    setConfirmDeleteGoal(null)
  }

  function openAdd(goal) {
    setForm({ account_id: accounts[0]?.id || '', amount: '', fillGoal: false })
    setModalError('')
    setModal({ type: 'add', goal })
  }
  function openEdit(goal) {
    setForm({ name: goal.name, target: goal.target_amount, deadline: goal.deadline || '' })
    setModalError('')
    setModal({ type: 'edit', goal })
    setOpenMenu(null)
  }
  function openDetails(goal) {
    setModal({ type: 'details', goal })
    setOpenMenu(null)
  }

  function contributionsFor(goalId) {
    return goalContributions.filter((c) => c.goal_id === goalId)
  }
  function walletName(accountId) {
    return accounts.find((a) => a.id === accountId)?.name || 'Unknown wallet'
  }

  function GoalCard({ goal, past }) {
    const pct = Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100))
    const isCompleted = goal.status === 'completed'
    const overdue = !past && isOverdue(goal)

    return (
      <div className="goal-card">
        <div className="goal-head">
          <div className={`goal-icon ${past ? (outcome(goal) === 'success' ? 'icon-completed' : 'icon-past') : 'icon-in_progress'}`}>
            {initials(goal.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="goal-name">{goal.name}</div>
            <div className="goal-deadline">{goal.deadline ? `Due ${goal.deadline}` : 'No deadline'}</div>
          </div>
          {past && (
            <div className="goal-badges">
              {outcome(goal) === 'success'
                ? <Badge status="success">✓ Success</Badge>
                : <Badge status="failed">Not reached</Badge>}
            </div>
          )}
          <DropdownMenu
            open={openMenu === goal.id}
            onClose={() => setOpenMenu(null)}
            align={menuAlign}
            trigger={
              <button
                type="button"
                className="goal-menu-btn"
                onClick={(e) => toggleMenu(e, goal.id)}
                aria-label="Goal actions"
              >
                ⋮
              </button>
            }
          >
            {!past && (
              <>
                <DropdownMenuItem onClick={() => openEdit(goal)}>Update goal</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchive(goal)}>Archive goal</DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => openDetails(goal)}>Transaction details</DropdownMenuItem>
            {past && (
              <DropdownMenuItem onClick={() => handleRetrieve(goal)}>Retrieve to current</DropdownMenuItem>
            )}
            {past && (
              <DropdownMenuItem danger onClick={() => { setConfirmDeleteGoal(goal); setOpenMenu(null) }}>
                Delete goal
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        </div>

        {!past && isCompleted && <div className="goal-badges"><Badge status="success">✓ Target reached</Badge></div>}
        {overdue && <div className="goal-badges"><Badge status="warning">Deadline passed</Badge></div>}


        <div className="goal-amounts">
          <span className="saved">{formatCurrency(goal.saved_amount)}</span>
          <span className="target">of {formatCurrency(goal.target_amount)}</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: pct + '%', background: past && outcome(goal) === 'failure' ? 'var(--red)' : undefined }}
          />
        </div>

        <div className="goal-foot">
          <span className="goal-pct">{pct}%</span>
          {!past && (
            <button type="button" className="goal-btn" onClick={() => openAdd(goal)}>Add Money</button>
          )}
        </div>
      </div>
    )
  }


  return (
    <div className="finai-page">
      <PageHeader
        title="Goals"
        subtitle="Track your savings targets"
        actions={
          <button type="button" className="btn-primary" onClick={() => setModal({ type: 'new' })}>+ New Goal</button>
        }
      />

      <StatRow>
        <StatCard label="Total Target" value={formatCurrency(stats.totalTarget)} />
        <StatCard label="Total Saved" value={formatCurrency(stats.totalSaved)} />
        <StatCard label="Avg Progress" value={`${stats.avg}%`} />
        <StatCard label="Success Rate" value={`${stats.successRate}%`} />
      </StatRow>

      <div className="card">
        <div className="section-title">
          <h2>In Progress
            <span className="section-count">{grouped.current.length}</span>
            {grouped.current.length === 0 && <span className="spending-total">No goals in progress yet.</span>}
          </h2>

        </div>
        <div className="goals-grid process-goals-grid">
          {grouped.current.map((g) => <GoalCard key={g.id} goal={g} past={false} />)}
          <div className="goal-card add-card" onClick={() => setModal({ type: 'new' })}>
            <div className="qi-icon">+</div>
            New Goal
          </div>

        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h2>Past Goals <span className="section-count">{grouped.past.length}</span></h2>
          <div className="segmented">
            {PAST_FILTERS.map((f) => (
              <button
                type="button"
                key={f.key}
                className={pastFilter === f.key ? 'active' : ''}
                onClick={() => setPastFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="goals-grid">
          {filteredPast.map((g) => <GoalCard key={g.id} goal={g} past />)}
          {filteredPast.length === 0 && <p className="spending-total">No past goals in this filter.</p>}
        </div>
      </div>

      <Modal open={!!modal} onClose={closeModal} title={modal ? MODAL_TITLES[modal.type] : ''}>
        {modal?.type === 'new' && (
          <>
            <FormField label="Goal Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="form-row">
              <FormField label="Target Amount" type="number" onChange={(e) => setForm({ ...form, target: e.target.value })} />
              <FormField label="Deadline" type="date" onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleCreate}>Create Goal</button>
            </div>
          </>
        )}

        {modal?.type === 'edit' && (
          <>
            <FormField label="Goal Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="form-row">
              <FormField
                label="Target Amount"
                type="number"
                min={modal.goal.saved_amount}
                value={form.target || ''}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
              />
              <FormField label="Deadline" type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            {modalError && <p className="msg-banner error">{modalError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleEdit}>Save Changes</button>
            </div>
          </>
        )}

        {modal?.type === 'add' && (() => {
          const goal = modal.goal
          const needed = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount))
          const selectedAccount = accounts.find((a) => a.id === form.account_id)
          const walletBalance = selectedAccount ? Number(selectedAccount.balance) : 0

          // Recomputes the auto-fill amount for whichever wallet is
          // selected, whenever "fill goal" is checked (or the wallet
          // changes while it's checked).
          function amountToFill(balance) {
            return Math.min(balance, needed)
          }

          function handleFillToggle(checked) {
            if (checked) {
              setForm({ ...form, fillGoal: true, amount: amountToFill(walletBalance) })
            } else {
              setForm({ ...form, fillGoal: false, amount: '' })
            }
          }

          function handleWalletChange(accId) {
            if (form.fillGoal) {
              const acc = accounts.find((a) => a.id === accId)
              setForm({ ...form, account_id: accId, amount: amountToFill(acc ? Number(acc.balance) : 0) })
            } else {
              setForm({ ...form, account_id: accId })
            }
          }

          // Clamps to `needed` the instant the typed value crosses it —
          // the field can never hold an amount higher than what the
          // goal actually needs, so Transfer can fire instantly with
          // no capping/notice step at submit time.
          function handleAmountChange(raw) {
            const num = Number(raw)
            if (raw !== '' && !Number.isNaN(num) && num > needed) {
              setForm({ ...form, amount: needed })
            } else {
              setForm({ ...form, amount: raw })
            }
          }

          return (
            <>
              <div className="form-group">
                <label className="form-label">From Wallet</label>
                {accounts.length === 0 ? (
                  <p className="spending-total">Add a wallet account first.</p>
                ) : (
                  <FormField
                    type="select"
                    value={form.account_id || ''}
                    onChange={(e) => handleWalletChange(e.target.value)}
                    options={accounts.map((a) => ({ value: a.id, label: `${a.name} — ${formatCurrency(a.balance)}` }))}
                    wrapperStyle={{ margin: 0 }}
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  className="form-input"
                  type="number"
                  max={needed}
                  value={form.amount ?? ''}
                  disabled={!!form.fillGoal}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
                <div className="goal-deadline" style={{ marginTop: 6 }}>
                  {Number(form.amount) === needed
                    ? `Only ${formatCurrency(needed)} is needed to complete this goal — that's what will be transferred.`
                    : `${formatCurrency(needed)} needed to complete this goal`}
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!form.fillGoal}
                    onChange={(e) => handleFillToggle(e.target.checked)}
                  />
                  Fill goal completely from this wallet
                </label>
              </div>

              {modalError && <p className="msg-banner error">{modalError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleContribute}
                  disabled={accounts.length === 0 || needed <= 0 || walletBalance <= 0}
                >
                  Transfer
                </button>
              </div>
            </>
          )
        })()}

        {modal?.type === 'details' && (() => {
          const goal = modal.goal
          const contributions = contributionsFor(goal.id)
          const totalsByWallet = contributions.reduce((acc, c) => {
            const key = c.account_id || 'unknown'
            acc[key] = (acc[key] || 0) + Number(c.amount)
            return acc
          }, {})

          return (
            <>
              <div className="form-group">
                <label className="form-label">Goal</label>
                <div className="s-title">{goal.name}</div>
                <div className="goal-deadline">{goal.deadline ? `Due ${goal.deadline}` : 'No deadline'} · {formatCurrency(goal.saved_amount)} of {formatCurrency(goal.target_amount)}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Transfers by wallet</label>
                {Object.keys(totalsByWallet).length === 0 && <p className="spending-total">No transfers yet.</p>}
                <div className="transfer-list">
                  {Object.entries(totalsByWallet).map(([accId, total]) => (
                    <div className="transfer-row" key={accId}>
                      <span className="transfer-wallet">{accId === 'unknown' ? 'Unknown wallet' : walletName(accId)}</span>
                      <span className="transfer-amount">{formatCurrency(total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {contributions.length > 0 && (
                <div className="form-group">
                  <label className="form-label">All transfers</label>
                  <div className="transfer-list scrollable">
                    {contributions.map((c) => (
                      <div className="transfer-row" key={c.id}>
                        <span className="transfer-wallet">{c.account_id ? walletName(c.account_id) : 'Unknown wallet'}</span>
                        <span className="transfer-date">{new Date(c.created_at).toLocaleDateString()}</span>
                        <span className="transfer-amount">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Close</button>
              </div>
            </>
          )
        })()}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteGoal}
        onClose={() => setConfirmDeleteGoal(null)}
        title="Delete goal"
        message={<>Delete <strong>{confirmDeleteGoal?.name}</strong>? This can't be undone — it will be removed for good.</>}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
