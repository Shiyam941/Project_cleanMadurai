import { useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import AdminPanel from './pages/AdminPanel'
import ComplaintDetail from './pages/ComplaintDetail'
import Login from './pages/Login'
import OfficerDashboard from './pages/OfficerDashboard'
import Register from './pages/Register'
import ReportComplaint from './pages/ReportComplaint'
import UserDashboard from './pages/UserDashboard'
import { auth } from './firebase'
import './App.css'

const roleRedirect = {
  user: '/user',
  officer: '/officer',
  admin: '/admin',
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cm_user')
      return stored ? JSON.parse(stored) : null
    } catch (err) {
      console.warn('Failed to parse saved session', err)
      return null
    }
  })

  const handleLogin = (account) => {
    localStorage.setItem('cm_user', JSON.stringify(account))
    setUser(account)
  }

  const handleLogout = () => {
    signOut(auth).catch((err) => console.warn('Failed to sign out user', err))
    localStorage.removeItem('cm_user')
    setUser(null)
  }

  const defaultRedirect = useMemo(() => (user ? roleRedirect[user.role] ?? '/user' : '/'), [user])

  return (
    <BrowserRouter>
      {user && <Header user={user} onLogout={handleLogout} />}
      <main className={user ? 'layout' : 'layout public'}>
        <Routes>
          <Route
            path="/"
            element={
              user ? <Navigate to={defaultRedirect} replace /> : <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/register"
            element={user ? <Navigate to={defaultRedirect} replace /> : <Register />}
          />
          <Route
            path="/user"
            element={
              <ProtectedRoute user={user} allowedRoles={['user']}>
                <UserDashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute user={user} allowedRoles={['user']}>
                <ReportComplaint user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer"
            element={
              <ProtectedRoute user={user} allowedRoles={['officer']}>
                <OfficerDashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints/:complaintId"
            element={
              <ProtectedRoute user={user} allowedRoles={['officer', 'admin']}>
                <ComplaintDetail user={user} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
