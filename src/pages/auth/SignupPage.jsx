import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import styles from './finai/auth.module.css'

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
      <div className={styles.center}>
        <h2 className={styles.titleMb2}>Check your inbox</h2>
        <p className={styles.subtitleTight}>
          We sent a confirmation link to <span className={styles.textStrong}>{email}</span>. Confirm your
          email to activate your account.
        </p>
        <Link to="/login" className={styles.linkBlock}>
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className={styles.title}>Create your vault</h2>
      <p className={styles.subtitle}>Start tracking in minutes.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          type="text"
          aria-label="Full name"
          placeholder="Alex Mercer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          aria-label="Email address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          aria-label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <p className={styles.fieldError}>{error}</p>}
        <Button type="submit" full disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className={styles.footer}>
        Already have an account?{' '}
        <Link to="/login" className={styles.link}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
