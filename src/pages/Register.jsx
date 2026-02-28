import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { ZONES, findZoneById } from '../constants/zones'

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
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isCitizen = formValues.role === 'user'

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'role') {
      setFormValues((prev) => ({
        ...prev,
        role: value,
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

    if (
      isCitizen &&
      (!formValues.name || !formValues.zoneId || !formValues.ward)
    ) {
      setError('Name, zone, and ward are required for citizens.')
      return
    }

    try {
      setLoading(true)
      const normalizedEmail = formValues.email.trim().toLowerCase()
      const zoneMeta = isCitizen ? findZoneById(formValues.zoneId) : null
      const credentials = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        formValues.password,
      )

      await setDoc(doc(db, 'users', credentials.user.uid), {
        name: formValues.name,
        phone: formValues.phone,
        zoneId: isCitizen ? formValues.zoneId : '',
        zoneName: isCitizen ? zoneMeta?.name ?? '' : '',
        ward: isCitizen ? formValues.ward : '',
        address: formValues.address,
        email: normalizedEmail,
        role: formValues.role,
        createdAt: new Date(),
      })

      setSuccess('Registration successful. You can now sign in.')
      setFormValues(defaultForm)
      setTimeout(() => navigate('/', { replace: true }), 1000)
    } catch (err) {
      setError(err.message || 'Unable to register right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="portal-label">Madurai City Municipal Corporation</p>
        <h2>Citizen / Officer Registration</h2>
        <p className="form-subtitle">Create an account to access the Clean Madurai portal.</p>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <form onSubmit={handleSubmit} className="form-grid two-column">
          {isCitizen && (
            <>
              <label>
                Full Name
                <input name="name" value={formValues.name} onChange={handleChange} disabled={loading} />
              </label>
              <label>
                Phone Number
                <input name="phone" value={formValues.phone} onChange={handleChange} disabled={loading} />
              </label>
              <label>
                Zone
                <select name="zoneId" value={formValues.zoneId} onChange={handleChange} disabled={loading}>
                  <option value="">Select zone</option>
                  {ZONES.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ward
                <select
                  name="ward"
                  value={formValues.ward}
                  onChange={handleChange}
                  disabled={loading || !formValues.zoneId}
                >
                  <option value="">{formValues.zoneId ? 'Select ward' : 'Choose a zone first'}</option>
                  {wardOptions.map((ward) => (
                    <option key={ward} value={ward}>
                      {ward}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Address
                <input name="address" value={formValues.address} onChange={handleChange} disabled={loading} />
              </label>
            </>
          )}
          {!isCitizen && (
            <p className="full-width muted">
              Ward officers only need credentials. Citizen fields are hidden for this role.
            </p>
          )}
          <label>
            Email
            <input type="email" name="email" value={formValues.email} onChange={handleChange} disabled={loading} />
          </label>
          <label>
            Password
            <input type="password" name="password" value={formValues.password} onChange={handleChange} disabled={loading} />
          </label>
          <label>
            Role
            <select name="role" value={formValues.role} onChange={handleChange} disabled={loading}>
              <option value="user">Citizen User</option>
              <option value="officer">Ward Officer</option>
            </select>
          </label>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="form-footer">
          Already registered? <Link to="/">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
