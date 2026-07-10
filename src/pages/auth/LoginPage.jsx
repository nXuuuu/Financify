import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import styles from './finai/auth.module.css'

const REMEMBER_KEY = 'financify-remembered-email'

export default function LoginPage() {
  const { user, signIn, confirmSession } = useAuth()
  const navigate = useNavigate()
  const passwordRef = useRef(null)

  const remembered = typeof window !== 'undefined' ? localStorage.getItem(REMEMBER_KEY) : null
  // A valid Supabase session already exists for the remembered email (e.g.
  // it hasn't expired and they didn't sign out) — safe to skip retyping
  // the password entirely, since Supabase already verified their identity.
  const hasLiveSession = !!user && user.email === remembered

  const [email, setEmail] = useState(remembered || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(!!remembered)
  const [welcomeBack, setWelcomeBack] = useState(!!remembered)

  useEffect(() => {
    if (!welcomeBack) passwordRef.current?.focus()
  }, [welcomeBack])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn({ email, password })
    setLoading(false)
    if (error) return setError(error.message)

    if (remember) localStorage.setItem(REMEMBER_KEY, email)
    else localStorage.removeItem(REMEMBER_KEY)

    confirmSession()
    navigate('/dashboard')
  }

  const signInInstantly = () => {
    confirmSession()
    navigate('/dashboard')
  }

  const forgetMe = () => {
    localStorage.removeItem(REMEMBER_KEY)
    setEmail('')
    setRemember(false)
    setWelcomeBack(false)
  }

  if (welcomeBack) {
    return (
      <div>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Sign in to your vault.</p>

        <div className={styles.welcomeCard}>
          <p className={styles.welcomeText}>
            {hasLiveSession ? 'Signed in as' : 'Continue as'}{' '}
            <span className={styles.welcomeEmail}>{email}</span>
          </p>
          <Button
            full
            className={styles.pillButton}
            onClick={hasLiveSession ? signInInstantly : () => setWelcomeBack(false)}
          >
            {hasLiveSession ? 'Sign in instantly' : 'Continue'}
          </Button>
          <button type="button" className={styles.forgetLink} onClick={forgetMe}>
            Not you? Forget me
          </button>
        </div>

        <p className={styles.footer}>
          Don't have an account?{' '}
          <Link to="/signup" className={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className={styles.title}>Welcome back</h2>
      <p className={styles.subtitle}>Sign in to your vault.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          type="email"
          aria-label="Email address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          ref={passwordRef}
          type="password"
          aria-label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className={styles.rememberRow}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me
        </label>
        {error && <p className={styles.fieldError}>{error}</p>}
        <Button type="submit" full disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className={styles.footer}>
        Don't have an account?{' '}
        <Link to="/signup" className={styles.link}>
          Create one
        </Link>
      </p>
    </div>
  )
}
