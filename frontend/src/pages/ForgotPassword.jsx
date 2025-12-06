import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import '../App.css'
import { apiCall } from '../utils/api.js'

function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [devToken, setDevToken] = useState('')

  const [resetForm, setResetForm] = useState({
    token: searchParams.get('token') || '',
    password: '',
    confirm: ''
  })
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  useEffect(() => {
    const tokenFromParams = searchParams.get('token')
    if (tokenFromParams) {
      setResetForm((prev) => ({ ...prev, token: tokenFromParams }))
    }
  }, [searchParams])

  const handleRequestReset = async (event) => {
    event.preventDefault()
    setRequestError('')
    setRequestMessage('')
    setDevToken('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setRequestError('Please enter the email you registered with.')
      return
    }

    setRequestLoading(true)
    try {
      const data = await apiCall('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail })
      })
      setRequestMessage(data.message || 'Check your inbox for a reset link.')
      if (data.resetToken) {
        setDevToken(data.resetToken)
        setResetForm((prev) => ({ ...prev, token: data.resetToken }))
      }
    } catch (error) {
      setRequestError(error.message)
    } finally {
      setRequestLoading(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setResetError('')
    setResetMessage('')

    if (!resetForm.token.trim()) {
      setResetError('Paste the reset code you received.')
      return
    }

    if (resetForm.password.length < 8) {
      setResetError('New password must be at least 8 characters.')
      return
    }

    if (resetForm.password !== resetForm.confirm) {
      setResetError('Passwords do not match.')
      return
    }

    setResetLoading(true)
    try {
      const data = await apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetForm.token.trim(),
          password: resetForm.password
        })
      })
      setResetMessage(data.message || 'Password updated. You can sign in now.')
      setResetForm((prev) => ({ ...prev, password: '', confirm: '' }))
    } catch (error) {
      setResetError(error.message)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <header>
          <h1>Reset your password</h1>
          <p>We&apos;ll send a reset link and help you set a new password.</p>
        </header>

        <form className="auth-section" onSubmit={handleRequestReset}>
          <div>
            <h3>Send reset link</h3>
            <p className="auth-subtext">
              Enter the email you use for StudyPal. We&apos;ll email you a reset link.
            </p>
          </div>

          <div className="input-field">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              name="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {requestError && (
            <p className="form-error" role="alert">
              {requestError}
            </p>
          )}

          {requestMessage && (
            <p className="settings-success" role="status">
              {requestMessage}
            </p>
          )}

          {devToken && (
            <div className="token-hint" role="note">
              <strong>Dev reset token</strong>
              <small>This is returned in non-production environments to help testing.</small>
              <code>{devToken}</code>
            </div>
          )}

          <button type="submit" className="primary-btn" disabled={requestLoading}>
            {requestLoading ? 'Sending link…' : 'Send reset link'}
          </button>
        </form>

        <p className="divider-text">Already have a reset code?</p>

        <form className="auth-section" onSubmit={handleResetPassword}>
          <div>
            <h3>Set a new password</h3>
            <p className="auth-subtext">Paste the reset code and choose a new password.</p>
          </div>

          <div className="input-field">
            <label htmlFor="reset-token">Reset code</label>
            <input
              id="reset-token"
              name="reset-token"
              type="text"
              placeholder="Paste the reset code"
              value={resetForm.token}
              onChange={(event) => setResetForm((prev) => ({ ...prev, token: event.target.value }))}
              required
            />
          </div>

          <div className="input-field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              placeholder="********"
              value={resetForm.password}
              onChange={(event) => setResetForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
          </div>

          <div className="input-field">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={resetForm.confirm}
              onChange={(event) => setResetForm((prev) => ({ ...prev, confirm: event.target.value }))}
              required
            />
          </div>

          {resetError && (
            <p className="form-error" role="alert">
              {resetError}
            </p>
          )}

          {resetMessage && (
            <p className="settings-success" role="status">
              {resetMessage}
            </p>
          )}

          <button type="submit" className="primary-btn" disabled={resetLoading}>
            {resetLoading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="link-text">
          Remembered your password? <Link to="/auth/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
