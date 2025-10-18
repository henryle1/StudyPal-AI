import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import '../App.css'
import { useAuthContext } from '../context/AuthContext.jsx'

function Register() {
  const navigate = useNavigate()
  const { login } = useAuthContext()
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    // TODO: Replace with API call to /api/auth/register
    login({ id: 'new-user', name: form.name || 'New Student', email: form.email })
    navigate('/app', { replace: true })
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <header>
          <h1>Create your StudyPal</h1>
          <p>We will guide you through tailored study plans and analytics.</p>
        </header>
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
          <button type="submit" className="primary-btn">
            Sign up
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
