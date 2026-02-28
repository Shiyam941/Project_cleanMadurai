import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { db } from '../firebase'

const formatDateTime = (value) => {
  if (!value) {
    return '—'
  }
  try {
    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch (err) {
    return value
  }
}

const buildFilename = (extension) => `clean-madurai-complaints-${new Date().toISOString().slice(0, 10)}.${extension}`

function AdminPanel() {
  const [complaints, setComplaints] = useState([])
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assigning, setAssigning] = useState({})
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [complaintSnap, officerSnap] = await Promise.all([
          getDocs(collection(db, 'complaints')),
          getDocs(query(collection(db, 'users'), where('role', '==', 'officer'))),
        ])

        const complaintRows = complaintSnap.docs
          .map((docSnap) => {
            const data = docSnap.data()
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
            const assignedAt = data.assignedAt?.toDate ? data.assignedAt.toDate().toISOString() : data.assignedAt
            return {
              id: docSnap.id,
              ...data,
              createdAt,
              assignedAt,
            }
          })
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

        const officerRows = officerSnap.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .sort((a, b) => (a.ward || '').localeCompare(b.ward || ''))

        setComplaints(complaintRows)
        setOfficers(officerRows)
        setError('')
      } catch (err) {
        setError(err.message || 'Unable to load admin data right now.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const stats = useMemo(() => {
    const pending = complaints.filter((item) => item.status === 'Pending').length
    const inProgress = complaints.filter((item) => item.status === 'In Progress').length
    const resolved = complaints.filter((item) => item.status === 'Resolved').length
    const assigned = complaints.filter((item) => !!item.assignedOfficerId).length
    return {
      total: complaints.length,
      pending,
      inProgress,
      resolved,
      assigned,
    }
  }, [complaints])

  const officerPerformance = useMemo(() => {
    if (!officers.length) {
      return []
    }

    return officers
      .map((officer) => {
        const assignedComplaints = complaints.filter((c) => c.ward === officer.ward)
        const pending = assignedComplaints.filter((c) => c.status === 'Pending').length
        const inProgress = assignedComplaints.filter((c) => c.status === 'In Progress').length
        const resolved = assignedComplaints.filter((c) => c.status === 'Resolved').length
        const activelyHandled = complaints.filter((c) => c.assignedOfficerId === officer.id).length

        return {
          officerId: officer.id,
          name: officer.name || 'Unnamed Officer',
          ward: officer.ward || '—',
          phone: officer.phone || '—',
          pending,
          inProgress,
          resolved,
          activelyHandled,
          total: assignedComplaints.length,
        }
      })
      .sort((a, b) => b.activelyHandled - a.activelyHandled)
  }, [officers, complaints])

  const unassignedComplaints = useMemo(
    () => complaints.filter((complaint) => !complaint.assignedOfficerId),
    [complaints],
  )

  const latestComplaints = useMemo(() => complaints.slice(0, 8), [complaints])

  const buildExportRows = () =>
    complaints.map((complaint) => ({
      ID: complaint.id,
      Ward: complaint.ward,
      Category: complaint.category,
      Description: complaint.description,
      Status: complaint.status,
      AI_Verified: complaint.aiVerified ? 'Yes' : 'No',
      Assigned_Officer: complaint.assignedOfficerName || '',
      Latitude: complaint.latitude || '',
      Longitude: complaint.longitude || '',
      Image_URL: complaint.imageUrl || '',
      Created_At: formatDateTime(complaint.createdAt),
      Assigned_At: formatDateTime(complaint.assignedAt),
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
      link.download = buildFilename('csv')
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
      writeFile(workbook, buildFilename('xlsx'))
    } finally {
      setExporting(false)
    }
  }

  const handleAssignOfficer = async (complaintId, officerId) => {
    if (!officerId) {
      return
    }
    const officer = officers.find((entry) => entry.id === officerId)
    if (!officer) {
      setError('Officer record not found.')
      return
    }
    setAssigning((prev) => ({ ...prev, [complaintId]: true }))
    try {
      await updateDoc(doc(db, 'complaints', complaintId), {
        assignedOfficerId: officer.id,
        assignedOfficerName: officer.name || '',
        assignedAt: new Date(),
      })
      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint.id === complaintId
            ? {
                ...complaint,
                assignedOfficerId: officer.id,
                assignedOfficerName: officer.name || '',
                assignedAt: new Date().toISOString(),
              }
            : complaint,
        ),
      )
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to assign officer right now.')
    } finally {
      setAssigning((prev) => ({ ...prev, [complaintId]: false }))
    }
  }

  return (
    <div className="page admin-panel">
      <div className="page-header">
        <div>
          <h2>Admin Command Center</h2>
          <p>Track sanitation workloads, supervise ward officers, and orchestrate escalations.</p>
        </div>
        <div className="download-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={handleDownloadCSV}
            disabled={!complaints.length || exporting}
          >
            Download CSV
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleDownloadExcel}
            disabled={!complaints.length || exporting}
          >
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
        <div className="stat-card">
          <p className="stat-label">Assigned to Officers</p>
          <p className="stat-value">{stats.assigned}</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="panel">Compiling datasets...</div>
      ) : (
        <div className="admin-grid">
          <div className="panel">
            <div className="panel-heading">
              <h3>Officer Workboard</h3>
              <p className="panel-subtitle">Monitor ward-wise workloads and completions.</p>
            </div>
            <div className="table">
              <div className="table-head">
                <span>Officer</span>
                <span>Ward</span>
                <span>Contact</span>
                <span>Active Cases</span>
                <span>Pending</span>
                <span>In Progress</span>
                <span>Resolved</span>
              </div>
              {officerPerformance.length === 0 && (
                <div className="table-row">No officer records found.</div>
              )}
              {officerPerformance.map((officer) => (
                <div key={officer.officerId} className="table-row">
                  <span>{officer.name}</span>
                  <span>{officer.ward}</span>
                  <span>{officer.phone}</span>
                  <span>{officer.activelyHandled}</span>
                  <span>{officer.pending}</span>
                  <span>{officer.inProgress}</span>
                  <span>{officer.resolved}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h3>Latest Reports</h3>
              <p className="panel-subtitle">Fresh incidents needing review.</p>
            </div>
            <div className="latest-list">
              {latestComplaints.length === 0 && <p>No complaints filed yet.</p>}
              {latestComplaints.map((complaint) => (
                <article key={complaint.id} className="latest-card">
                  <div>
                    <p className="latest-category">{complaint.category}</p>
                    <p className={`status ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                      {complaint.status}
                    </p>
                  </div>
                  <p className="latest-description">{complaint.description}</p>
                  <div className="latest-meta">
                    <span>Ward {complaint.ward}</span>
                    <span>{formatDateTime(complaint.createdAt)}</span>
                  </div>
                  <div className="latest-actions">
                    <Link to={`/complaints/${complaint.id}`} className="btn ghost">
                      View Detail
                    </Link>
                    <span className="badge">
                      {complaint.assignedOfficerName ? `Assigned to ${complaint.assignedOfficerName}` : 'Unassigned'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <h3>Complaint Assignment Desk</h3>
          <p className="panel-subtitle">Assign field officers to unclaimed complaints.</p>
        </div>
        {unassignedComplaints.length === 0 ? (
          <p>All complaints currently have an assigned officer. Great job!</p>
        ) : (
          <div className="table">
            <div className="table-head">
              <span>Ward</span>
              <span>Category</span>
              <span>Description</span>
              <span>Filed</span>
              <span>Assign Officer</span>
            </div>
            {unassignedComplaints.map((complaint) => (
              <div key={complaint.id} className="table-row">
                <span>{complaint.ward}</span>
                <span>{complaint.category}</span>
                <span>{complaint.description}</span>
                <span>{formatDateTime(complaint.createdAt)}</span>
                <span>
                  <select
                    className="assignment-select"
                    value={complaint.assignedOfficerId || ''}
                    onChange={(event) => handleAssignOfficer(complaint.id, event.target.value)}
                    disabled={assigning[complaint.id]}
                  >
                    <option value="">Select officer</option>
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name || 'Unnamed'} — {officer.ward}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
