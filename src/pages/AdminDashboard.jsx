import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { db } from '../firebase'
import resolveErrorMessage from '../utils/errorMessage'

function AdminDashboard() {
  const [complaints, setComplaints] = useState([])
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true)
        const [complaintSnap, officerSnap] = await Promise.all([
          getDocs(collection(db, 'complaints')),
          getDocs(query(collection(db, 'users'), where('role', '==', 'officer'))),
        ])

        const mappedComplaints = complaintSnap.docs
          .map((docSnap) => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            }
          })
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

        const mappedOfficers = officerSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))

        setComplaints(mappedComplaints)
        setOfficers(mappedOfficers)
        setError('')
      } catch (err) {
        setError(
          resolveErrorMessage(err, {
            fallbackMessage: 'Unable to load statewide complaints.',
          }),
        )
      } finally {
        setLoading(false)
      }
    }

    fetchComplaints()
  }, [])

  const stats = useMemo(() => {
    const pending = complaints.filter((c) => c.status === 'Pending').length
    const inProgress = complaints.filter((c) => c.status === 'In Progress').length
    const resolved = complaints.filter((c) => c.status === 'Resolved').length
    return {
      total: complaints.length,
      pending,
      inProgress,
      resolved,
    }
  }, [complaints])

  const officerPerformance = useMemo(() => {
    if (!officers.length) {
      return []
    }

    return officers
      .map((officer) => {
        const assigned = complaints.filter((complaint) => complaint.ward === officer.ward)
        const pending = assigned.filter((item) => item.status === 'Pending').length
        const inProgress = assigned.filter((item) => item.status === 'In Progress').length
        const resolved = assigned.filter((item) => item.status === 'Resolved').length

        return {
          officerId: officer.id,
          name: officer.name,
          ward: officer.ward || '—',
          phone: officer.phone || '—',
          pending,
          inProgress,
          resolved,
          total: assigned.length,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [officers, complaints])

  const buildExportRows = () =>
    complaints.map((complaint) => ({
      ID: complaint.id,
      Ward: complaint.ward,
      Category: complaint.category,
      Description: complaint.description,
      Status: complaint.status,
      AI_Verified: complaint.aiVerified ? 'Yes' : 'No',
      Latitude: complaint.latitude || '',
      Longitude: complaint.longitude || '',
      Image_URL: complaint.imageUrl || '',
      Created_At: complaint.createdAt
        ? new Date(complaint.createdAt).toLocaleString('en-IN')
        : '',
    }))

  const escapeCSVValue = (value) => {
    if (value === null || value === undefined) {
      return ''
    }
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const handleDownloadCSV = () => {
    if (!complaints.length || exporting) {
      return
    }
    setExporting(true)
    try {
      const rows = buildExportRows()
      if (!rows.length) {
        return
      }
      const headers = Object.keys(rows[0])
      const csvLines = [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCSVValue(row[header])).join(','))]
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      URL.revokeObjectURL(link.href)
      document.body.removeChild(link)
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadExcel = () => {
    if (!complaints.length || exporting) {
      return
    }
    setExporting(true)
    try {
      const rows = buildExportRows()
      if (!rows.length) {
        return
      }
      const worksheet = utils.json_to_sheet(rows)
      const workbook = utils.book_new()
      utils.book_append_sheet(workbook, worksheet, 'Complaints')
      writeFile(workbook, `complaints-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Administrative Overview</h2>
          <p>Monitor civic health indicators and escalation pipelines city-wide.</p>
        </div>
        <div className="download-actions">
          <button type="button" className="btn secondary" onClick={handleDownloadCSV} disabled={!complaints.length || exporting}>
            Download CSV
          </button>
          <button type="button" className="btn primary" onClick={handleDownloadExcel} disabled={!complaints.length || exporting}>
            Download Excel
          </button>
        </div>
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
          <p className="stat-label">In Progress</p>
          <p className="stat-value">{stats.inProgress}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Resolved</p>
          <p className="stat-value">{stats.resolved}</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="panel">Compiling complaint register...</div>
      ) : (
        <div className="panel">
          <div className="table">
            <div className="table-head">
              <span>Ward</span>
              <span>Category</span>
              <span>Status</span>
              <span>AI</span>
              <span>Filed</span>
              <span>Action</span>
            </div>
            {complaints.map((complaint) => (
              <div key={complaint.id} className="table-row">
                <span>{complaint.ward}</span>
                <span>{complaint.category}</span>
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

      {officerPerformance.length > 0 && (
        <div className="panel">
          <div className="table">
            <div className="table-head">
              <span>Officer</span>
              <span>Ward</span>
              <span>Contact</span>
              <span>Pending</span>
              <span>In Progress</span>
              <span>Resolved</span>
              <span>Total</span>
            </div>
            {officerPerformance.map((officer) => (
              <div key={officer.officerId} className="table-row">
                <span>{officer.name || 'Unnamed Officer'}</span>
                <span>{officer.ward}</span>
                <span>{officer.phone}</span>
                <span>{officer.pending}</span>
                <span>{officer.inProgress}</span>
                <span>{officer.resolved}</span>
                <span>{officer.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
