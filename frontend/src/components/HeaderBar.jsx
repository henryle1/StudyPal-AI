import { useAuthContext } from '../context/AuthContext.jsx'

function HeaderBar({ title = 'Dashboard', subtitle }) {
  const { user, logout } = useAuthContext()

  return (
    <header className="content-header">
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{title}</h1>
        {subtitle ? (
          <p style={{ margin: '0.25rem 0 0', color: '#64748b' }}>{subtitle}</p>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {user?.name ?? 'Guest Student'}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Role: Student
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  )
}

export default HeaderBar
