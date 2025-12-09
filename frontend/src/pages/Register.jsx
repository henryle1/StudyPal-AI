import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import '../App.css'
import { useAuthContext } from '../context/AuthContext.jsx'
import { apiCall } from '../utils/api.js'

function Register() {
  const navigate = useNavigate()
  const { login } = useAuthContext()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      })

      // Store token in sessionStorage so each tab can stay isolated
      sessionStorage.setItem('token', data.token)
      localStorage.removeItem('token')

      // Update auth context
      login(data.user)

      // Navigate to dashboard
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <header>
          <h1>Create your StudyPal</h1>
          <p>We will guide you through tailored study plans and analytics.</p>
        </header>
        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ada Lovelace"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign up'}
          </button>
        </form>
        <p className="link-text">
          Already registered? <Link to="/auth/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
