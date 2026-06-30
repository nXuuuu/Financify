import { useState } from 'react'
import { Modal } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { useFinance } from '@/context/FinanceContext'

export default function AddTransactionModal({ open, onClose }) {
  const { accounts, categories, addTransaction } = useFinance()
  const [type, setType] = useState('expense')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [category, setCategory] = useState('')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const list = type === 'income' ? categories.income : categories.expense

  const reset = () => {
    setType('expense')
    setCategory('')
    setMerchant('')
    setAmount('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!accountId) return setError('Add an account first.')
    setError('')
    setSaving(true)
    const { error } = await addTransaction({
      account_id: accountId,
      type,
      category: category || list[0],
      merchant,
      amount: Number(amount),
      date: new Date(date).toISOString(),
      status: 'cleared',
    })
    setSaving(false)
    if (error) return setError(error.message)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add transaction">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </Select>

        <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>

        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {list.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Input
          label="Merchant / description"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="0.01"
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        {error && <p className="text-xs text-negative">{error}</p>}

        <Button type="submit" full disabled={saving}>
          {saving ? 'Saving…' : 'Add transaction'}
        </Button>
      </form>
    </Modal>
  )
}
