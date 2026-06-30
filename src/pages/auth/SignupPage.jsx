import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function SignupPage() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp({ name, email, password })
    setLoading(false)
    if (error) return setError(error.message)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="mb-2 font-display text-2xl">Check your inbox</h2>
        <p className="text-sm text-muted">
          We sent a confirmation link to <span className="text-text">{email}</span>. Confirm your
          email to activate your account.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-brass hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl">Create your vault</h2>
      <p className="mb-6 text-sm text-muted">Start tracking in minutes.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          type="text"
          label="Full name"
          placeholder="Alex Mercer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <p className="text-xs text-negative">{error}</p>}
        <Button type="submit" full disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-brass hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
