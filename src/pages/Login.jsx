import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { ZONES, findZoneById, findZoneByWard } from '../constants/zones'
import resolveErrorMessage from '../utils/errorMessage'
import { useTranslation } from 'react-i18next'

const roleRedirect = {
  user: '/user',
  officer: '/officer',
  admin: '/admin',
}

function Login({ onLogin }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState({
    accessType: 'user',
    email: '',
    password: '',
    zoneId: '',
    ward: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isCitizenLogin = formValues.accessType === 'user'

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'accessType') {
      setFormValues((prev) => ({
        ...prev,
        accessType: value,
        zoneId: value === 'user' ? prev.zoneId : '',
        ward: value === 'user' ? prev.ward : '',
      }))
      return
    }

    if (name === 'zoneId') {
      const selectedZone = findZoneById(value)
      setFormValues((prev) => ({
        ...prev,
        zoneId: value,
        ward: selectedZone?.wards[0] ?? '',
      }))
      return
    }

    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const selectedZone = useMemo(
    () => (isCitizenLogin ? findZoneById(formValues.zoneId) : null),
    [isCitizenLogin, formValues.zoneId],
  )
  const wardOptions = selectedZone?.wards ?? []

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formValues.email || !formValues.password) {
      setError('Email and password are required.')
      return
    }

    if (isCitizenLogin && (!formValues.zoneId || !formValues.ward)) {
      setError('Please select your zone and ward.')
      return
    }

    try {
      setLoading(true)
      const credentials = await signInWithEmailAndPassword(
        auth,
        formValues.email.trim().toLowerCase(),
        formValues.password,
      )

      const profileSnap = await getDoc(doc(db, 'users', credentials.user.uid))

      if (!profileSnap.exists()) {
        throw new Error('Profile record missing. Please contact the civic helpdesk.')
      }

      const profile = profileSnap.data()

      if (isCitizenLogin && profile.role !== 'user') {
        throw new Error('This account is registered as an officer/admin. Choose Officer access type.')
      }

      if (!isCitizenLogin && profile.role === 'user') {
        throw new Error('This account belongs to a citizen. Choose Public access type.')
      }

      if (profile.role === 'officer' && profile.status === 'pending') {
        throw new Error(t('auth.accountPending'))
      }
      if (profile.role === 'officer' && profile.status === 'rejected') {
        throw new Error(t('auth.accountRejected'))
      }

      if (isCitizenLogin) {
        const storedZoneId = profile.zoneId || findZoneByWard(profile.ward)?.id || ''

        if (storedZoneId && storedZoneId !== formValues.zoneId) {
          throw new Error('Selected zone does not match your registered profile.')
        }

        if (profile.ward && profile.ward !== formValues.ward) {
          throw new Error('Selected ward does not match your registered profile.')
        }
      }
      const sessionUser = {
        id: credentials.user.uid,
        uid: credentials.user.uid,
        email: credentials.user.email,
        ...profile,
      }

      onLogin(sessionUser)
      navigate(roleRedirect[sessionUser.role] ?? '/user', { replace: true })
    } catch (err) {
      setError(
        resolveErrorMessage(err, {
          fallbackMessage: 'Unable to sign in right now.',
          overrides: {
            'auth/user-not-found': 'We could not find an account with that email.',
            'auth/wrong-password': 'Email or password is incorrect.',
            'auth/invalid-credential': 'Email or password is incorrect.',
            'auth/too-many-requests': 'Too many failed attempts. Please wait and try again.',
          },
        }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="portal-label">{t('app.title')}</p>
        <h2>{t('app.portalName')} Access</h2>
        <p className="form-subtitle">Sign in with your registered civic credentials.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            {t('auth.role')} Access Type
            <select
              name="accessType"
              value={formValues.accessType}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="user">{t('auth.citizenRole')}</option>
              <option value="officer">{t('auth.officerRole')} / Admin</option>
            </select>
          </label>
          <label>
            {t('auth.email')}
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              value={formValues.email}
              onChange={handleChange}
              disabled={loading}
            />
          </label>
          <label>
            {t('auth.password')}
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formValues.password}
              onChange={handleChange}
              disabled={loading}
            />
          </label>
          {isCitizenLogin && (
            <>
              <label>
                {t('auth.zone')}
                <select
                  name="zoneId"
                  value={formValues.zoneId}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">{t('common.selectZone')}</option>
                  {ZONES.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('auth.ward')}
                <select
                  name="ward"
                  value={formValues.ward}
                  onChange={handleChange}
                  disabled={loading || !formValues.zoneId}
                >
                  <option value="">{formValues.zoneId ? t('common.selectWard') : t('common.chooseZoneFirst')}</option>
                  {wardOptions.map((ward) => (
                    <option key={ward} value={ward}>
                      {ward}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Signing in...' : t('auth.submitLogin')}
          </button>
        </form>
        <p className="form-footer">
          {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
