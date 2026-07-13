import { useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabase' // adjust path to match your project
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import Avatar from '@/components/ui/Avatar'
import './finai/settings.css'

function maskEmail(email) {
  if (!email) return ''
  const [name, domain] = email.split('@')
  if (!domain) return '•'.repeat(email.length)
  const visible = name.slice(0, 1)
  return `${visible}${'•'.repeat(Math.max(name.length - 1, 3))}@${domain}`
}

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const fileInputRef = useRef(null)
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [profile, setProfile] = useState({
    first_name: user?.user_metadata?.first_name || '',
    last_name: user?.user_metadata?.last_name || '',
  })
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  const [emailRevealed, setEmailRevealed] = useState(false)
  const [twoFA, setTwoFA] = useState(user?.user_metadata?.two_factor_enabled ?? false)

  const [modal, setModal] = useState(null) // null | 'reveal-email' | 'change-password'
  const [authPassword, setAuthPassword] = useState('')
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [modalError, setModalError] = useState('')
  const [modalBusy, setModalBusy] = useState(false)

  const [msg, setMsg] = useState(null) // { type, text }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U'

  function closeModal() {
    setModal(null)
    setAuthPassword('')
    setPwForm({ next: '', confirm: '' })
    setModalError('')
    setModalBusy(false)
  }

  async function verifyPassword(password) {
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password })
    return !error
  }

  // ---------- Avatar ----------
  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setMsg(null)

    // Preview immediately
    const previewUrl = URL.createObjectURL(file)
    setAvatarUrl(previewUrl)

    // Upload to a Supabase Storage bucket (e.g. "avatars"), then save the public URL.
    const path = `${user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) {
      setAvatarUploading(false)
      setMsg({ type: 'error', text: uploadError.message })
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error } = await updateProfile({ avatar_url: data.publicUrl })
    setAvatarUploading(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setAvatarUrl(data.publicUrl)
      setMsg({ type: 'success', text: 'Profile photo updated.' })
    }
  }

  // ---------- Name ----------
  async function toggleEditName() {
    if (!editingName) {
      setEditingName(true)
      return
    }
    setSavingName(true)
    const { error } = await updateProfile({
      first_name: profile.first_name,
      last_name: profile.last_name,
      full_name: `${profile.first_name} ${profile.last_name}`.trim(),
    })
    setSavingName(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setMsg({ type: 'success', text: 'Name updated.' })
      setEditingName(false)
    }
  }

  // ---------- Reveal email ----------
  async function confirmRevealEmail() {
    setModalBusy(true)
    setModalError('')
    const ok = await verifyPassword(authPassword)
    setModalBusy(false)
    if (!ok) {
      setModalError('Incorrect password.')
      return
    }
    setEmailRevealed(true)
    closeModal()
  }

  // ---------- Change password ----------
  async function submitChangePassword() {
    setModalError('')
    if (!authPassword) {
      setModalError('Enter your current password.')
      return
    }
    if (pwForm.next.length < 8) {
      setModalError('New password must be at least 8 characters.')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setModalError('New passwords do not match.')
      return
    }
    setModalBusy(true)
    const ok = await verifyPassword(authPassword)
    if (!ok) {
      setModalBusy(false)
      setModalError('Current password is incorrect.')
      return
    }
    const { error } = await updatePassword(pwForm.next)
    setModalBusy(false)
    if (error) {
      setModalError(error.message)
      return
    }
    setMsg({ type: 'success', text: 'Password changed.' })
    closeModal()
  }

  // ---------- 2FA ----------
  async function toggleTwoFA() {
    const next = !twoFA
    setTwoFA(next)
    // Full TOTP enrollment (QR code + verification code) uses supabase.auth.mfa.enroll()
    // and a follow-up challenge/verify step — wire that up here when ready.
    const { error } = await updateProfile({ two_factor_enabled: next })
    if (error) {
      setTwoFA(!next)
      setMsg({ type: 'error', text: error.message })
    }
  }

  // ---------- Sessions ----------
  async function handleLogout() {
    await signOut?.()
  }
  async function handleLogoutAll() {
    await supabase.auth.signOut({ scope: 'global' })
  }

  return (
    <div className="finai-page">
      <PageHeader title="Settings" subtitle="Manage your account and app preferences" />

      {msg && <p className={`msg-banner ${msg.type}`}>{msg.text}</p>}

      {/* ---------------- Account Settings ---------------- */}
      <div className="card">
        <div className="section-title">
          <div>
            <h2>Account Settings</h2>
            <p>Your profile, login, and security</p>
          </div>
        </div>

        {/* Profile photo */}
        <div className="setting-row">
          <div className="row-left-avatar">
            <Avatar initials={initials} url={avatarUrl} size="lg" />
            <div className="setting-info">
              <div className="s-title">Profile</div>
              {/* <div className="s-sub">JPG or PNG, at least 200x200px</div> */}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          {/* <button className="btn-ghost-sm" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
            {avatarUploading ? 'Uploading…' : 'Change photo'}
          </button> */}
          <button className="btn-ghost-sm disabled-btn" onClick={`() => fileInputRef.current?.click()`} disabled={avatarUploading}>
            {avatarUploading ? 'Uploading…' : 'Change photo'}
          </button>
        </div>

        {/* Name */}
        <div className="setting-row">
          <div className="setting-info" style={{ flex: 1 }}>
            <div className="s-title">Name</div>
            {editingName ? (
              <div className="name-edit-inputs">
                <FormField
                  value={profile.first_name}
                  placeholder="First name"
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  wrapperStyle={{ marginBottom: 0 }}
                />
                <FormField
                  value={profile.last_name}
                  placeholder="Last name"
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  wrapperStyle={{ marginBottom: 0 }}
                />
              </div>
            ) : (
              <div className="s-sub">{`${profile.first_name} ${profile.last_name}`.trim() || 'Not set'}</div>
            )}
          </div>
          <button className="btn-ghost-sm" onClick={toggleEditName} disabled={savingName}>
            {savingName ? 'Saving…' : editingName ? 'Save changes' : 'Change name'}
          </button>
        </div>

        {/* Email */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="s-title">Email address</div>
            <div className="s-sub masked-text">{emailRevealed ? user?.email : maskEmail(user?.email)}</div>
          </div>
          {!emailRevealed && (
            <button className="btn-ghost-sm" onClick={() => setModal('reveal-email')}>
              Show
            </button>
          )}
        </div>

        {/* Password */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="s-title">Password</div>
            <div className="s-sub masked-text">••••••••••</div>
          </div>
          <button className="btn-ghost-sm" onClick={() => setModal('change-password')}>
            Change password
          </button>
        </div>

        {/* 2FA */}
        {/* <div className="setting-row">
          <div className="setting-info">
            <div className="s-title">Two-step verification</div>
            <div className="s-sub">Require a code from your authenticator app when signing in</div>
          </div>
          <button className={`toggle ${twoFA ? 'on' : ''} disabled-btn`} onClick={`toggleTwoFA`} aria-label="Toggle two-step verification" />
        </div> */}

        {/* Sessions */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="s-title">Sessions</div>
            <div className="s-sub">Sign out of this device or everywhere</div>
          </div>
          <div className='session-actions'>
            <button className="btn-ghost-sm" onClick={handleLogout}>Log out</button>
            <button className="btn-danger" onClick={handleLogoutAll}>Log out all devices</button>
          </div>
        </div>
      </div>

      {/* ---------------- App Settings ---------------- */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-title">
          <div>
            <h2>App Settings</h2>
            <p>Appearance</p>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="s-title">Dark mode</div>
            <div className="s-sub">Switch between light and dark theme</div>
          </div>
          <button
            className={`toggle${isDark ? ' on' : ''}`}
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
          />
        </div>
      </div>

      {/* ---------------- Modals ---------------- */}
      <Modal open={modal === 'reveal-email'} onClose={closeModal} title="Confirm your password" size="sm">
        <p className="s-sub" style={{ marginBottom: 14 }}>Enter your password to view your full email address.</p>
        <FormField
          type="password"
          placeholder="Password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          autoFocus
        />
        {modalError && <p className="msg-banner error">{modalError}</p>}
        <div className="modal-actions">
          <button className="btn-ghost-sm" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={confirmRevealEmail} disabled={modalBusy}>
            {modalBusy ? 'Checking…' : 'Confirm'}
          </button>
        </div>
      </Modal>

      <Modal open={modal === 'change-password'} onClose={closeModal} title="Change password" size="sm">
        <FormField
          label="Current password"
          type="password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          autoFocus
        />
        <FormField
          label="New password"
          type="password"
          value={pwForm.next}
          onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
        />
        <FormField
          label="Confirm new password"
          type="password"
          value={pwForm.confirm}
          onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
        />
        {modalError && <p className="msg-banner error">{modalError}</p>}
        <div className="modal-actions">
          <button className="btn-ghost-sm" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={submitChangePassword} disabled={modalBusy}>
            {modalBusy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
