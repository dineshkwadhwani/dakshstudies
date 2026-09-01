import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function DocumentTitle() {
  const { profile } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const publicTitles = {
      '/contact': 'Contact Us — Tenth Ki Padhai',
      '/terms': 'Terms and Conditions — Tenth Ki Padhai',
      '/privacy': 'Privacy Policy — Tenth Ki Padhai',
      '/refund-policy': 'Cancellation and Refund Policy — Tenth Ki Padhai',
    }
    if (publicTitles[location.pathname]) {
      document.title = publicTitles[location.pathname]
    } else if (profile?.role === 'student') {
      const firstName = profile.full_name?.trim().split(/\s+/)[0] || 'Student'
      document.title = `${firstName}'s Study Lab — Tenth Ki Padhai`
    } else if (profile?.role === 'super_admin') {
      document.title = 'SuperAdmin — Tenth Ki Padhai'
    } else if (profile?.role === 'account_manager') {
      document.title = 'Account Manager — Tenth Ki Padhai'
    } else {
      document.title = 'Tenth Ki Padhai — CBSE Class 10'
    }
  }, [profile, location.pathname])

  return null
}
