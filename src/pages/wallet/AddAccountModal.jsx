import { useState } from 'react'
import { Modal } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { useFinance } from '@/context/FinanceContext'

export default function AddAccountModal({ open, onClose }) {
  const { addAccount } = useFinance()
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [currency, setCurrency] = useState('USD')
  const [balance, setBalance] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { error } = await addAccount({
      name,
      type,
      currency,
      balance: Number(balance) || 0,
    })
    setSaving(false)
    if (error) return setError(error.message)
    setName('')
    setBalance('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Account name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="checking">Checking</option>
          <option value="saving">Saving</option>
          <option value="credit">Credit</option>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} required />
          <Input type="number" step="0.01" label="Starting balance" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
        <Button type="submit" full disabled={saving}>
          {saving ? 'Saving…' : 'Add account'}
        </Button>
      </form>
    </Modal>
  )
}
