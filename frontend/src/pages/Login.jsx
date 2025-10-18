import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import '../App.css'
import { useAuthContext } from '../context/AuthContext.jsx'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuthContext()
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    // TODO: Replace with API call.
    login({ id: 'demo-user', name: 'Demo User', email: form.email })
    navigate('/app', { replace: true })
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <header>
          <h1>Welcome back</h1>
          <p>Sign in to continue crafting your study plan.</p>
        </header>
        <form onSubmit={handleSubmit}>
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
          <button type="submit" className="primary-btn">
            Sign in
          </button>
        </form>
        <p className="link-text">
          New student? <Link to="/auth/register">Create an account</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
