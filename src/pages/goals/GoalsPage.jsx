import { useMemo, useState } from 'react'
import { useFinance } from '@/context/FinanceContext'
import './finai/goals.css'

const fmt = (n) => '$' + Number(n).toLocaleString()
const todayStr = () => new Date().toISOString().slice(0, 10)
const initials = (name) => (name || '').trim().slice(0, 2).toUpperCase() || '?'

function categorize(goal) {
  if (goal.status === 'completed') return 'completed'
  if (goal.deadline && goal.deadline < todayStr()) return 'past'
  return 'in_progress'
}

export default function GoalsPage() {
  const { goals, addGoal, contributeToGoal, updateGoal, deleteGoal } = useFinance()

  const [modal, setModal] = useState(null) // { type: 'new' | 'add' | 'edit', goal? }
  const [form, setForm] = useState({})
  const [openMenu, setOpenMenu] = useState(null) // goal id

  const grouped = useMemo(() => {
    const g = { in_progress: [], completed: [], past: [] }
    for (const goal of goals) g[categorize(goal)].push(goal)
    return g
  }, [goals])

  const stats = useMemo(() => {
    const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0)
    const totalSaved = goals.reduce((s, g) => s + Number(g.saved_amount), 0)
    const avg = goals.length ? Math.round((totalSaved / (totalTarget || 1)) * 100) : 0

    const concluded = grouped.completed.length + grouped.past.length
    const successful =
      grouped.completed.length + grouped.past.filter((g) => g.saved_amount >= g.target_amount).length
    const successRate = concluded ? Math.round((successful / concluded) * 100) : 0

    return { totalTarget, totalSaved, avg, successRate }
  }, [goals, grouped])

  function closeModal() {
    setModal(null)
    setForm({})
  }

  async function handleCreate() {
    const name = (form.name || '').trim()
    const target = Number(form.target)
    if (!name || !target) return
    await addGoal({ name, target_amount: target, saved_amount: 0, deadline: form.deadline || null })
    closeModal()
  }

  async function handleContribute() {
    const amount = Number(form.amount)
    if (!amount || !modal?.goal) return
    await contributeToGoal(modal.goal.id, amount)
    closeModal()
  }

  async function handleEdit() {
    if (!modal?.goal) return
    const name = (form.name || '').trim()
    const target = Number(form.target)
    if (!name || !target) return
    await updateGoal(modal.goal.id, { name, target_amount: target, deadline: form.deadline || null })
    closeModal()
  }

  async function finishGoal(goal, { force = false } = {}) {
    const isForced = force || goal.saved_amount < goal.target_amount
    await updateGoal(goal.id, {
      status: 'completed',
      force_completed: isForced,
      completed_at: new Date().toISOString(),
    })
    setOpenMenu(null)
  }

  async function handleDelete(goal) {
    await deleteGoal(goal.id)
    setOpenMenu(null)
  }

  function openAdd(goal) {
    setModal({ type: 'add', goal })
  }
  function openEdit(goal) {
    setForm({ name: goal.name, target: goal.target_amount, deadline: goal.deadline || '' })
    setModal({ type: 'edit', goal })
    setOpenMenu(null)
  }

  function GoalCard({ goal }) {
    const pct = Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100))
    const cat = categorize(goal)
    const reachedTarget = goal.saved_amount >= goal.target_amount
    const canFinish = cat === 'in_progress' && reachedTarget

    return (
      <div className="goal-card">
        <div className="goal-head">
          <div className={`goal-icon icon-${cat}`}>{initials(goal.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="goal-name">{goal.name}</div>
            <div className="goal-deadline">{goal.deadline ? `Due ${goal.deadline}` : 'No deadline'}</div>
          </div>

          <div className="goal-menu-wrap">
            <button
              className="goal-menu-btn"
              onClick={() => setOpenMenu(openMenu === goal.id ? null : goal.id)}
              aria-label="Goal actions"
            >
              ⋮
            </button>
            {openMenu === goal.id && (
              <>
                <div className="goal-menu-backdrop" onClick={() => setOpenMenu(null)} />
                <div className="goal-menu">
                  <button onClick={() => openEdit(goal)}>Update goal</button>
                  {cat !== 'completed' && (
                    <button onClick={() => finishGoal(goal, { force: true })}>Mark as finished</button>
                  )}
                  <button className="danger" onClick={() => handleDelete(goal)}>Delete goal</button>
                </div>
              </>
            )}
          </div>
        </div>

        {(cat === 'completed' || cat === 'past') && (
          <div className="goal-badges">
            {cat === 'completed' && goal.force_completed && <span className="badge badge-force">Force completed</span>}
            {cat === 'completed' && !goal.force_completed && <span className="badge badge-success">✓ Completed</span>}
            {cat === 'past' && reachedTarget && <span className="badge badge-success">Reached target</span>}
            {cat === 'past' && !reachedTarget && <span className="badge badge-failed">Not reached</span>}
          </div>
        )}

        <div className="goal-amounts">
          <span className="saved">{fmt(goal.saved_amount)}</span>
          <span className="target">of {fmt(goal.target_amount)}</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: pct + '%', background: cat === 'past' && !reachedTarget ? 'var(--red)' : undefined }}
          />
        </div>

        <div className="goal-foot">
          <span className="goal-pct">{pct}%</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {cat !== 'completed' && (
              <button className="goal-btn" onClick={() => openAdd(goal)}>Add Money</button>
            )}
            {canFinish && (
              <button className="goal-btn goal-btn-finish" onClick={() => finishGoal(goal)}>Finish</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  function Section({ title, items, emptyText, showAddCard }) {
    return (
      <div className="card">
        <div className="section-title">
          <h2>{title} <span className="section-count">{items.length}</span></h2>
        </div>
        <div className="goals-grid">
          {items.map((g) => <GoalCard key={g.id} goal={g} />)}
          {showAddCard && (
            <div className="goal-card add-card" onClick={() => setModal({ type: 'new' })}>
              <div className="qi-icon">+</div>
              New Goal
            </div>
          )}
          {items.length === 0 && !showAddCard && <p className="spending-total">{emptyText}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="finai-page">
      <div className="topbar">
        <div className="greeting"><div><h1>Goals</h1><p>Track your savings targets</p></div></div>
        <div className="topbar-actions">
          <button className="btn-primary" onClick={() => setModal({ type: 'new' })}>+ New Goal</button>
        </div>
      </div>

      <div className="stat-row">
        <div className="card stat-card"><span className="stat-label">Total Target</span><div className="stat-amount">{fmt(stats.totalTarget)}</div></div>
        <div className="card stat-card"><span className="stat-label">Total Saved</span><div className="stat-amount">{fmt(stats.totalSaved)}</div></div>
        <div className="card stat-card"><span className="stat-label">Avg Progress</span><div className="stat-amount">{stats.avg}%</div></div>
        <div className="card stat-card"><span className="stat-label">Success Rate</span><div className="stat-amount">{stats.successRate}%</div></div>
      </div>

      <Section title="In Progress" items={grouped.in_progress} showAddCard emptyText="No goals in progress yet." />
      <Section title="Finished / Success" items={grouped.completed} emptyText="Nothing finished yet." />
      <Section title="Past Goals" items={grouped.past} emptyText="No past goals." />

      {modal && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>{modal.type === 'new' ? 'New Goal' : modal.type === 'edit' ? 'Update Goal' : 'Add Money'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {modal.type === 'new' && (
              <>
                <div className="form-group"><label className="form-label">Goal Name</label><input className="form-input" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Target Amount</label><input className="form-input" type="number" onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Deadline</label><input className="form-input" type="date" onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button className="btn-primary" onClick={handleCreate}>Create Goal</button>
                </div>
              </>
            )}

            {modal.type === 'edit' && (
              <>
                <div className="form-group"><label className="form-label">Goal Name</label><input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Target Amount</label><input className="form-input" type="number" value={form.target || ''} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Deadline</label><input className="form-input" type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button className="btn-primary" onClick={handleEdit}>Save Changes</button>
                </div>
              </>
            )}

            {modal.type === 'add' && (
              <>
                <div className="form-group"><label className="form-label">Amount</label><input className="form-input" type="number" onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button className="btn-primary" onClick={handleContribute}>Add</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}