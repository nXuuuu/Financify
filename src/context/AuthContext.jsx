import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

// Supabase persists the session token itself (that part is safe and
// necessary). This flag is separate: it tracks whether the person has
// actually clicked through the login gate *during this browser tab's
// visit*. sessionStorage clears when the tab/window is closed, so a
// fresh visit always lands on /login — even with a still-valid session —
// while reloads/navigation within the same visit don't ask again.
const CONFIRM_KEY = 'financify-visit-confirmed'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(CONFIRM_KEY) === '1'
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const confirmSession = () => {
    sessionStorage.setItem(CONFIRM_KEY, '1')
    setConfirmed(true)
  }

  const signUp = async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    return { data, error }
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = () => {
    sessionStorage.removeItem(CONFIRM_KEY)
    setConfirmed(false)
    return supabase.auth.signOut()
  }

  const updateProfile = async (metadata) => {
    const { data, error } = await supabase.auth.updateUser({ data: metadata })
    if (!error) setSession((s) => ({ ...s, user: data.user }))
    return { data, error }
  }

  const updatePassword = async (password) => {
    return supabase.auth.updateUser({ password })
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    confirmed,
    confirmSession,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
