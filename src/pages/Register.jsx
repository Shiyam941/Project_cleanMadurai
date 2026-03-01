import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../firebase'
import { ZONES, findZoneById } from '../constants/zones'
import resolveErrorMessage from '../utils/errorMessage'
import { useTranslation } from 'react-i18next'

const defaultForm = {
  name: '',
  phone: '',
  zoneId: '',
  ward: '',
  address: '',
  email: '',
  password: '',
  role: 'user',
}

function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [badgeFile, setBadgeFile] = useState(null)

  const isCitizen = formValues.role === 'user'

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'role') {
      setFormValues((prev) => ({
        ...prev,
        role: value,
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setBadgeFile(e.target.files[0])
    }
  }

  const selectedZone = findZoneById(formValues.zoneId)
  const wardOptions = selectedZone?.wards ?? []

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!formValues.email || !formValues.password) {
      setError('Email and password are mandatory.')
      return
    }

    if (!formValues.name || !formValues.zoneId || !formValues.ward) {
      setError('Name, zone, and ward are required.')
      return
    }

    if (!isCitizen && !badgeFile) {
      setError('Officer ID / Badge is required for officer registration.')
      return
    }

    try {
      setLoading(true)
      const normalizedEmail = formValues.email.trim().toLowerCase()
      const zoneMeta = findZoneById(formValues.zoneId)
      const credentials = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        formValues.password,
      )

      let badgeUrl = ''
      if (!isCitizen && badgeFile) {
        const fileRef = ref(storage, `officer_docs/${credentials.user.uid}`)
        await uploadBytes(fileRef, badgeFile)
        badgeUrl = await getDownloadURL(fileRef)
      }

      await setDoc(doc(db, 'users', credentials.user.uid), {
        name: formValues.name,
        phone: formValues.phone,
        zoneId: formValues.zoneId,
        zoneName: zoneMeta?.name ?? '',
        ward: formValues.ward,
        address: formValues.address,
        email: normalizedEmail,
        role: formValues.role,
        ...(!isCitizen && { status: 'pending', badgeUrl }),
        createdAt: new Date(),
      })

      if (!isCitizen) {
        setSuccess(t('auth.pendingApproval'))
      } else {
        setSuccess('Registration successful. You can now sign in.')
      }

      setFormValues(defaultForm)
      setBadgeFile(null)
      setTimeout(() => navigate('/', { replace: true }), 2500)
    } catch (err) {
      setError(
        resolveErrorMessage(err, {
          fallbackMessage: 'Unable to register right now.',
          overrides: {
            'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
            'auth/weak-password': 'Choose a stronger password (at least 6 characters).',
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
        <h2>{t('auth.register')} / Access</h2>
        <p className="form-subtitle">Create an account to access the portal.</p>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <form onSubmit={handleSubmit} className="form-grid two-column">
          <label>
            {t('auth.fullName')}
            <input name="name" value={formValues.name} onChange={handleChange} disabled={loading} />
          </label>
          <label>
            {t('auth.phone')}
            <input name="phone" value={formValues.phone} onChange={handleChange} disabled={loading} />
          </label>
          <label>
            {t('auth.zone')}
            <select name="zoneId" value={formValues.zoneId} onChange={handleChange} disabled={loading}>
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
          {isCitizen && (
            <label className="full-width">
              {t('auth.address')}
              <input name="address" value={formValues.address} onChange={handleChange} disabled={loading} />
            </label>
          )}
          {!isCitizen && (
            <label className="full-width">
              {t('auth.uploadBadge')}
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={loading} className="file-input" style={{ padding: '0.4rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
            </label>
          )}
          <label className="full-width">
            {t('auth.email')}
            <input type="email" name="email" value={formValues.email} onChange={handleChange} disabled={loading} />
          </label>
          <label>
            {t('auth.password')}
            <input type="password" name="password" value={formValues.password} onChange={handleChange} disabled={loading} />
          </label>
          <label>
            {t('auth.role')}
            <select name="role" value={formValues.role} onChange={handleChange} disabled={loading}>
              <option value="user">{t('auth.citizenRole')}</option>
              <option value="officer">{t('auth.officerRole')}</option>
            </select>
          </label>
          <button type="submit" className="btn primary full-width" disabled={loading} style={{ gridColumn: '1 / -1' }}>
            {loading ? 'Registering...' : t('auth.submitRegister')}
          </button>
        </form>
        <p className="form-footer">
          {t('auth.hasAccount')} <Link to="/">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
