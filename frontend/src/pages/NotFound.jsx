import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <header>
          <h1>Page not found</h1>
          <p>The screen you are after is still on the roadmap.</p>
        </header>
        <Link to="/app" className="primary-btn" style={{ textAlign: 'center' }}>
          Go back to dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFound
