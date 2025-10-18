import { NavLink } from 'react-router-dom'

const links = [
  { to: '/app', label: 'Overview', end: true },
  { to: '/app/tasks', label: 'Tasks' },
  { to: '/app/ai', label: 'AI Planner' },
  { to: '/app/analytics', label: 'Analytics' },
  { to: '/app/settings', label: 'Settings' }
]

function NavSidebar() {
  return (
    <aside className="sidebar">
      <div>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
          StudyPal AI
        </h2>
        <p style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          Starter template · customise freely
        </p>
      </div>
      <nav>
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <footer style={{ marginTop: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>
        <p style={{ margin: 0 }}>Helpful hints</p>
        <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1rem' }}>
          <li>Swap to your colour palette</li>
          <li>Replace placeholder routes</li>
        </ul>
      </footer>
    </aside>
  )
}

export default NavSidebar
