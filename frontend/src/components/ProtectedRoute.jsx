import { Navigate, Outlet } from 'react-router-dom'

import { useAuthContext } from '../context/AuthContext.jsx'

function ProtectedRoute() {
  const { isAuthenticated } = useAuthContext()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
