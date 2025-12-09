import { NavLink } from 'react-router-dom'

const links = [
  { to: '/app', label: 'Overview', end: true },
  { to: '/app/tasks', label: 'Tasks' },
  { to: '/app/ai', label: 'Planner' },
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
    </aside>
  )
}

export default NavSidebar
