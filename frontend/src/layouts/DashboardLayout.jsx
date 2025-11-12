import { Outlet } from 'react-router-dom'

import HeaderBar from '../components/HeaderBar.jsx'
import NavSidebar from '../components/NavSidebar.jsx'

function DashboardLayout() {
  return (
    <div className="dashboard-shell">
      <NavSidebar />
      <div className="content-area">
        <HeaderBar title="Study Assistant Overview"/>
        <main className="content-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
