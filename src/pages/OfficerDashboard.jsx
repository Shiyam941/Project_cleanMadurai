import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import resolveErrorMessage from '../utils/errorMessage'
import { useTranslation } from 'react-i18next'

function OfficerDashboard({ user }) {
  const { t } = useTranslation()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchComplaints = async () => {
      try {
        setLoading(true)
        const snapshot = await getDocs(
          query(collection(db, 'complaints'), where('ward', '==', user.ward)),
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
              fallbackMessage: 'Unable to load ward complaints right now.',
            }),
          )
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (user?.ward) {
      fetchComplaints()
    }

    return () => {
      isMounted = false
    }
  }, [user?.ward])

  const stats = useMemo(() => {
    const pending = complaints.filter((c) => c.status === 'Pending').length
    const progress = complaints.filter((c) => c.status === 'In Progress').length
    const resolved = complaints.filter((c) => c.status === 'Resolved').length
    return { pending, progress, resolved }
  }, [complaints])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t('dashboard.officerTitle')}</h2>
          <p>Ward responsibility: {user.ward}. Monitor and resolve sanitation grievances.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">{t('dashboard.pending')}</p>
          <p className="stat-value">{stats.pending}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('dashboard.inProgress')}</p>
          <p className="stat-value">{stats.progress}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('dashboard.resolved')}</p>
          <p className="stat-value">{stats.resolved}</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="panel">Loading ward complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="panel">No complaints filed for this ward yet.</div>
      ) : (
        <div className="panel">
          <div className="table">
            <div className="table-head">
              <span>{t('table.category')}</span>
              <span>{t('table.description')}</span>
              <span>Evidence</span>
              <span>{t('table.status')}</span>
              <span>AI</span>
              <span>{t('table.filed')}</span>
              <span>{t('table.action')}</span>
            </div>
            {complaints.map((complaint) => (
              <div key={complaint.id} className="table-row">
                <span data-label={t('table.category')}>{t(`categories.${complaint.category}`) || complaint.category}</span>
                <span data-label={t('table.description')}>{complaint.description}</span>
                <span data-label="Evidence">
                  {complaint.imageUrl ? (
                    <a href={complaint.imageUrl} target="_blank" rel="noreferrer">
                      <img src={complaint.imageUrl} alt="Complaint evidence" className="table-thumb" />
                    </a>
                  ) : (
                    '—'
                  )}
                </span>
                <span data-label={t('table.status')}>
                  <span className={`status ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                    {t(`dashboard.${complaint.status.replace(' ', '')}`) || complaint.status}
                  </span>
                </span>
                <span data-label="AI Verification">{complaint.aiVerified ? <span className="badge success">AI</span> : <span className="badge">Manual</span>}</span>
                <span data-label={t('table.filed')}>{complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString('en-IN') : '—'}</span>
                <span data-label={t('table.action')}>
                  <Link to={`/complaints/${complaint.id}`} className="btn ghost">
                    {t('table.view')}
                  </Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default OfficerDashboard
