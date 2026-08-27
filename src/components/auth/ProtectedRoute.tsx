import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { canAccessRoute } from '../../lib/route-permissions'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUser } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !currentUser) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based route permissions
  if (!canAccessRoute(currentUser.role, location.pathname)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
