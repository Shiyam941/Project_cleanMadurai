import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

function OfficerDashboard({ user }) {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true)
        const snapshot = await getDocs(
          query(collection(db, 'complaints'), where('ward', '==', user.ward)),
        )

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
        setError(err.message || 'Unable to load ward complaints right now.')
      } finally {
        setLoading(false)
      }
    }

    if (user?.ward) {
      fetchComplaints()
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
          <h2>Officer Command Console</h2>
          <p>Ward responsibility: {user.ward}. Monitor and resolve sanitation grievances.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Pending</p>
          <p className="stat-value">{stats.pending}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">In Progress</p>
          <p className="stat-value">{stats.progress}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Resolved</p>
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
              <span>Category</span>
              <span>Description</span>
              <span>Evidence</span>
              <span>Status</span>
              <span>AI</span>
              <span>Filed</span>
              <span>Action</span>
            </div>
            {complaints.map((complaint) => (
              <div key={complaint.id} className="table-row">
                <span>{complaint.category}</span>
                <span>{complaint.description}</span>
                <span>
                  {complaint.imageUrl ? (
                    <a href={complaint.imageUrl} target="_blank" rel="noreferrer">
                      <img src={complaint.imageUrl} alt="Complaint evidence" className="table-thumb" />
                    </a>
                  ) : (
                    '—'
                  )}
                </span>
                <span>
                  <span className={`status ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                    {complaint.status}
                  </span>
                </span>
                <span>{complaint.aiVerified ? <span className="badge success">AI</span> : <span className="badge">Manual</span>}</span>
                <span>{complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString('en-IN') : '—'}</span>
                <span>
                  <Link to={`/complaints/${complaint.id}`} className="btn ghost">
                    View
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
