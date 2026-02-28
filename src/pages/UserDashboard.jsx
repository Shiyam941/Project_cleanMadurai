import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

function UserDashboard({ user }) {
  const userId = user?.id || user?.uid
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true)
        const snapshot = await getDocs(
          query(collection(db, 'complaints'), where('userId', '==', userId)),
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
        setError(err.message || 'Unable to load complaints right now.')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchComplaints()
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
          <h2>Citizen Dashboard</h2>
          <p>Track sanitation grievances raised within ward {user.ward}.</p>
        </div>
        <Link to="/report" className="btn primary">
          Report Complaint
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total Complaints</p>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pending</p>
          <p className="stat-value">{stats.pending}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Resolved</p>
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
              <span>Category</span>
              <span>Description</span>
              <span>Status</span>
              <span>AI Verified</span>
              <span>Filed On</span>
            </div>
            {complaints.map((complaint) => (
              <div key={complaint.id} className="table-row">
                <span>{complaint.category}</span>
                <span>{complaint.description}</span>
                <span>
                  <span className={`status ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                    {complaint.status}
                  </span>
                </span>
                <span>
                  {complaint.aiVerified ? <span className="badge success">AI Verified</span> : <span className="badge">Pending AI</span>}
                </span>
                <span>{complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString('en-IN') : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDashboard
