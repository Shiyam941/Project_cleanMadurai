import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { loadGoogleMaps } from '../utils/loadGoogleMaps'

function ComplaintDetail({ user }) {
  const { complaintId } = useParams()
  const navigate = useNavigate()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        setLoading(true)
        const snapshot = await getDoc(doc(db, 'complaints', complaintId))

        if (!snapshot.exists()) {
          setError('Complaint not found.')
          setComplaint(null)
        } else {
          const data = snapshot.data()
          setComplaint({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          })
          setError('')
        }
      } catch (err) {
        setError(err.message || 'Unable to load complaint details.')
      } finally {
        setLoading(false)
      }
    }

    fetchComplaint()
  }, [complaintId])

  useEffect(() => {
    if (!complaint?.latitude || !complaint?.longitude) {
      return
    }

    let isMounted = true

    const renderMap = async () => {
      try {
        const maps = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_KEY)
        if (!isMounted || !mapContainerRef.current) {
          return
        }
        const position = {
          lat: parseFloat(complaint.latitude),
          lng: parseFloat(complaint.longitude),
        }
        mapRef.current = new maps.Map(mapContainerRef.current, {
          center: position,
          zoom: 15,
          disableDefaultUI: true,
        })
        markerRef.current = new maps.Marker({ position, map: mapRef.current })
      } catch (mapErr) {
        setError((prev) => prev || mapErr.message)
      }
    }

    renderMap()

    return () => {
      isMounted = false
    }
  }, [complaint?.latitude, complaint?.longitude])

  const handleStatusUpdate = async (status) => {
    if (!complaint) {
      return
    }

    try {
      setUpdating(true)
      await updateDoc(doc(db, 'complaints', complaint.id), { status })

      setComplaint((prev) => ({ ...prev, status }))
    } catch (err) {
      setError(err.message || 'Unable to update status.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="page">Loading complaint details...</div>
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert error">{error}</div>
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    )
  }

  if (!complaint) {
    return null
  }

  const canUpdate = user.role === 'officer' || user.role === 'admin'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Complaint Detail</h2>
          <p>Filed on {complaint.createdAt ? new Date(complaint.createdAt).toLocaleString('en-IN') : '—'}</p>
        </div>
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div className="panel detail-grid">
        <div>
          <p className="detail-label">Category</p>
          <p className="detail-value">{complaint.category}</p>
        </div>
        <div>
          <p className="detail-label">Ward</p>
          <p className="detail-value">{complaint.ward}</p>
        </div>
        <div>
          <p className="detail-label">Status</p>
          <p className={`status ${complaint.status.toLowerCase().replace(' ', '-')}`}>{complaint.status}</p>
        </div>
        <div>
          <p className="detail-label">AI Validation</p>
          <p>{complaint.aiVerified ? 'Pass' : 'Pending'}</p>
        </div>
        <div className="full-width">
          <p className="detail-label">Description</p>
          <p>{complaint.description}</p>
        </div>
        {complaint.imageUrl && (
          <div className="full-width">
            <p className="detail-label">Evidence</p>
            <img src={complaint.imageUrl} alt="Complaint evidence" className="detail-image" />
          </div>
        )}
        <div className="full-width">
          <p className="detail-label">Location</p>
          <div ref={mapContainerRef} className="map-container" />
        </div>
      </div>

      {canUpdate && (
        <div className="action-bar">
          <button type="button" className="btn secondary" disabled={updating} onClick={() => handleStatusUpdate('In Progress')}>
            Mark In Progress
          </button>
          <button type="button" className="btn primary" disabled={updating} onClick={() => handleStatusUpdate('Resolved')}>
            Mark Resolved
          </button>
        </div>
      )}
    </div>
  )
}

export default ComplaintDetail
