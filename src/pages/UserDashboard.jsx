import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import resolveErrorMessage from '../utils/errorMessage'
import { useTranslation } from 'react-i18next'

function UserDashboard({ user }) {
  const { t } = useTranslation()
  const userId = user?.id || user?.uid
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchComplaints = async () => {
      try {
        setLoading(true)
        const snapshot = await getDocs(
          query(collection(db, 'complaints'), where('userId', '==', userId)),
        )

        if (!isMounted) return

        const mapped = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            }
          })
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

        setComplaints(mapped)
        setError('')
      } catch (err) {
        if (isMounted)
          setError(
            resolveErrorMessage(err, {
              fallbackMessage: 'Unable to load complaints right now.',
              overrides: {
                'permission-denied': 'You do not have permission to view these complaints.',
                'unavailable': 'Complaint service is temporarily unavailable. Please try again shortly.',
              },
            }),
          )
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (userId) {
      fetchComplaints()
    }

    return () => {
      isMounted = false
    }
  }, [userId])

  const stats = useMemo(() => {
    const pending = complaints.filter((c) => c.status === 'Pending').length
    const resolved = complaints.filter((c) => c.status === 'Resolved').length
    return {
      total: complaints.length,
      pending,
      resolved,
    }
  }, [complaints])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t('dashboard.userTitle')}</h2>
          <p>Track sanitation grievances raised within ward {user.ward}.</p>
        </div>
        <Link to="/report" className="btn primary">
          Report Complaint
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">{t('dashboard.totalComplaints')}</p>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('dashboard.pending')}</p>
          <p className="stat-value">{stats.pending}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('dashboard.resolved')}</p>
          <p className="stat-value">{stats.resolved}</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="panel">Loading your complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="panel">No complaints filed yet. Use the Report button to raise one.</div>
      ) : (
        <div className="panel">
          <div className="table">
            <div className="table-head">
              <span>{t('table.category')}</span>
              <span>{t('table.description')}</span>
              <span>{t('table.status')}</span>
              <span>AI Verified</span>
              <span>{t('table.filed')}</span>
            </div>
            {complaints.map((complaint) => (
              <div key={complaint.id} className="table-row">
                <span data-label={t('table.category')}>{t(`categories.${complaint.category}`) || complaint.category}</span>
                <span data-label={t('table.description')}>{complaint.description}</span>
                <span data-label={t('table.status')}>
                  <span className={`status ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                    {t(`dashboard.${complaint.status.replace(' ', '')}`) || complaint.status}
                  </span>
                </span>
                <span data-label="AI Verification">
                  {complaint.aiVerified ? <span className="badge success">AI Verified</span> : <span className="badge">Pending AI</span>}
                </span>
                <span data-label={t('table.filed')}>{complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString('en-IN') : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDashboard
