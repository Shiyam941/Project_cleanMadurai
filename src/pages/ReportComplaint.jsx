import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDoc, collection } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase'
import { loadGoogleMaps } from '../utils/loadGoogleMaps'
import { ZONES, findZoneById, findZoneByWard } from '../constants/zones'

const categories = [
  'Garbage Accumulation',
  'Sewage Blockage',
  'Drain Overflow',
  'River Pollution',
  'Stray Animal Issue',
]

function ReportComplaint({ user }) {
  const navigate = useNavigate()
  const mapContainerRef = useRef(null)
  const markerRef = useRef(null)
  const mapRef = useRef(null)
  const reporterId = user?.id || user?.uid

  const [formValues, setFormValues] = useState(() => {
    const derivedZoneId = user?.zoneId || findZoneByWard(user?.ward)?.id || ''
    return {
      category: 'Garbage Accumulation',
      description: '',
      zoneId: derivedZoneId,
      ward: user?.ward || (findZoneById(derivedZoneId)?.wards[0] ?? ''),
      latitude: '',
      longitude: '',
    }
  })
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    const derivedZoneId = user?.zoneId || findZoneByWard(user?.ward)?.id || ''
    const derivedZone = findZoneById(derivedZoneId)
    setFormValues((prev) => ({
      ...prev,
      zoneId: derivedZoneId,
      ward: user?.ward || (derivedZone?.wards[0] ?? ''),
    }))
  }, [user?.zoneId, user?.ward])

  const selectedZone = useMemo(() => findZoneById(formValues.zoneId), [formValues.zoneId])
  const wardOptions = selectedZone?.wards ?? []

  const handleZoneChange = (event) => {
    const zoneId = event.target.value
    const zone = findZoneById(zoneId)
    setFormValues((prev) => ({
      ...prev,
      zoneId,
      ward: zone?.wards.includes(prev.ward) ? prev.ward : zone?.wards[0] ?? '',
    }))
  }

  const handleWardChange = (event) => {
    setFormValues((prev) => ({ ...prev, ward: event.target.value }))
  }

  const placeMarker = (position) => {
    if (!mapRef.current || !window.google?.maps) {
      return
    }
    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
      })
    } else {
      markerRef.current.setPosition(position)
    }
    mapRef.current.panTo(position)
  }

  useEffect(() => {
    let isMounted = true

    const initMap = async () => {
      try {
        const maps = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_KEY)
        if (!isMounted || !mapContainerRef.current) {
          return
        }
        const defaultCenter = { lat: 9.9252, lng: 78.1198 }
        mapRef.current = new maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 13,
          streetViewControl: false,
          mapTypeControl: false,
        })

        mapRef.current.addListener('click', (event) => {
          const position = { lat: event.latLng.lat(), lng: event.latLng.lng() }
          placeMarker(position)
          setFormValues((prev) => ({
            ...prev,
            latitude: position.lat.toFixed(6),
            longitude: position.lng.toFixed(6),
          }))
        })
      } catch (mapError) {
        setError(mapError.message || 'Google Maps failed to load. Check API key.')
      }
    }

    initMap()

    return () => {
      isMounted = false
    }
  }, [])

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.')
      return
    }
    if (!mapRef.current) {
      setError('Map is still loading. Please wait a moment.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        placeMarker(coords)
        setFormValues((prev) => ({
          ...prev,
          latitude: coords.lat.toFixed(6),
          longitude: coords.lng.toFixed(6),
        }))
        setLocating(false)
        setError('')
      },
      (geoError) => {
        setError(geoError.message || 'Unable to fetch current location.')
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!reporterId) {
      setError('Session expired. Please sign in again.')
      return
    }

    if (
      !formValues.zoneId ||
      !formValues.ward ||
      !formValues.description ||
      !formValues.latitude ||
      !formValues.longitude
    ) {
      setError('Zone, ward, description, and map location are required.')
      return
    }

    try {
      setLoading(true)
      let imageUrl = ''

      if (imageFile) {
        const storagePath = `complaints/${reporterId}/${Date.now()}-${imageFile.name}`
        const imageRef = ref(storage, storagePath)
        await uploadBytes(imageRef, imageFile)
        imageUrl = await getDownloadURL(imageRef)
      }

      const keywords = ['garbage', 'waste', 'sewage', 'drain']
      const aiVerified = keywords.some((keyword) =>
        formValues.description.toLowerCase().includes(keyword),
      )

      const zoneMeta = findZoneById(formValues.zoneId)

      await addDoc(collection(db, 'complaints'), {
        userId: reporterId,
        zoneId: formValues.zoneId,
        zoneName: zoneMeta?.name ?? '',
        category: formValues.category,
        description: formValues.description,
        imageUrl,
        latitude: formValues.latitude,
        longitude: formValues.longitude,
        ward: formValues.ward,
        status: 'Pending',
        aiVerified,
        createdAt: new Date(),
      })

      setSuccess('Complaint submitted successfully.')
      setTimeout(() => navigate('/user', { replace: true }), 1200)
    } catch (err) {
      setError(err.message || 'Unable to submit complaint.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Report Sanitation Complaint</h2>
          <p>Provide details with precise map coordinates to alert field teams.</p>
        </div>
      </div>

      <div className="panel">
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        <form className="form-grid two-column" onSubmit={handleSubmit}>
          <label>
            Category
            <select name="category" value={formValues.category} onChange={(e) => setFormValues((prev) => ({ ...prev, category: e.target.value }))}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Zone
            <select name="zoneId" value={formValues.zoneId} onChange={handleZoneChange}>
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
              onChange={handleWardChange}
              disabled={!formValues.zoneId}
            >
              <option value="">{formValues.zoneId ? 'Select ward' : 'Choose a zone first'}</option>
              {wardOptions.map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Description
            <textarea
              name="description"
              rows="4"
              placeholder="Describe the sanitation issue"
              value={formValues.description}
              onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>
          <label>
            Upload Evidence Image
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="map-field">
            <p>Select Location on Map</p>
            <div ref={mapContainerRef} className="map-container" />
            <div className="map-actions">
              <button type="button" className="btn secondary" onClick={handleUseCurrentLocation} disabled={locating}>
                {locating ? 'Detecting location…' : 'Use My Location'}
              </button>
            </div>
            <div className="coord-grid">
              <label>
                Latitude
                <input value={formValues.latitude} readOnly />
              </label>
              <label>
                Longitude
                <input value={formValues.longitude} readOnly />
              </label>
            </div>
          </div>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ReportComplaint
