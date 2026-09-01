import { useAuth } from '../auth/AuthContext.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import Home from './Home.jsx'

export default function Dashboard() {
  const { profile } = useAuth()
  if (profile?.role === 'super_admin' || profile?.role === 'account_manager') {
    return <AdminDashboard />
  }
  return <Home />
}

