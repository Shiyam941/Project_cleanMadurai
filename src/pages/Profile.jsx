import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import resolveErrorMessage from '../utils/errorMessage'
import { saveSessionUser } from '../utils/sessionStore'
import { useTranslation } from 'react-i18next'

export default function Profile({ user, onLogout }) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        address: user?.address || '',
        photoURL: user?.photoURL || ''
    })
    const [photoFile, setPhotoFile] = useState(null)
    const [photoPreview, setPhotoPreview] = useState(user?.photoURL || null)

    useEffect(() => {
        let isMounted = true

        const loadProfile = async () => {
            try {
                const docRef = doc(db, 'users', user.uid)
                const docSnap = await getDoc(docRef)
                if (!isMounted) return

                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setProfileData({
                        name: data.name || '',
                        phone: data.phone || '',
                        address: data.address || '',
                        photoURL: data.photoURL || ''
                    })
                    setPhotoPreview(data.photoURL || null)
                }
            } catch (err) {
                console.error("Failed to load profile:", err)
            }
        }

        if (user?.uid) {
            loadProfile()
        }

        return () => {
            isMounted = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    const loadProfile = async () => {
        try {
            const docRef = doc(db, 'users', user.uid)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                const data = docSnap.data()
                setProfileData({
                    name: data.name || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    photoURL: data.photoURL || ''
                })
                setPhotoPreview(data.photoURL || null)
            }
        } catch (err) {
            console.error("Failed to load profile:", err)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setProfileData(prev => ({ ...prev, [name]: value }))
    }

    const handlePhotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setPhotoFile(file)
            setPhotoPreview(URL.createObjectURL(file))
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            let currentPhotoURL = profileData.photoURL

            if (photoFile) {
                const fileRef = ref(storage, `profiles/${user.uid}`)
                await uploadBytes(fileRef, photoFile)
                currentPhotoURL = await getDownloadURL(fileRef)
            }

            const userRef = doc(db, 'users', user.uid)
            await updateDoc(userRef, {
                name: profileData.name,
                phone: profileData.phone,
                address: profileData.address,
                photoURL: currentPhotoURL
            })

            setProfileData(prev => ({ ...prev, photoURL: currentPhotoURL }))
            setSuccess('Profile updated successfully!')
            setIsEditing(false)

            // Update local storage so the session persists changes
            const updatedUser = { ...user, ...profileData, photoURL: currentPhotoURL }
            saveSessionUser(updatedUser)

            // Force reload to update header state
            setTimeout(() => window.location.reload(), 1000)

        } catch (err) {
            setError(
                resolveErrorMessage(err, {
                    fallbackMessage: 'Failed to update profile.',
                }),
            )
        } finally {
            setLoading(false)
        }
    }

    if (!user) return null

    return (
        <div className="page">
            <div className="page-header">
                <h2>{t('common.myProfile')}</h2>
                <div className="action-bar">
                    {!isEditing ? (
                        <button className="btn primary" onClick={() => setIsEditing(true)}>Edit Profile</button>
                    ) : (
                        <button className="btn secondary" onClick={() => { setIsEditing(false); loadProfile(); }}>Cancel</button>
                    )}
                    <button className="btn secondary" onClick={onLogout} style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
                        Logout
                    </button>
                </div>
            </div>

            <div className="panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                {error && <div className="alert error">{error}</div>}
                {success && <div className="alert success">{success}</div>}

                <form onSubmit={handleSave} className="form-grid">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem', gridColumn: '1 / -1' }}>
                        {photoPreview ? (
                            <img
                                src={photoPreview}
                                alt="Profile Preview"
                                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', border: '3px solid var(--color-primary)' }}
                            />
                        ) : (
                            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '1rem', border: '3px solid var(--color-primary)' }}>
                                {profileData.name ? profileData.name[0].toUpperCase() : 'U'}
                            </div>
                        )}

                        {isEditing && (
                            <label className="btn secondary" style={{ cursor: 'pointer', display: 'inline-block', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                                Change Photo
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        )}
                    </div>

                    <label className="full-width">
                        {t('auth.fullName')}
                        <input
                            name="name"
                            value={profileData.name}
                            onChange={handleChange}
                            disabled={!isEditing || loading}
                            required
                        />
                    </label>

                    <label>
                        {t('auth.email')}
                        <input
                            value={user.email}
                            disabled
                            style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text-muted)' }}
                        />
                    </label>

                    <label>
                        {t('auth.role')}
                        <input
                            value={user.role === 'user' ? t('auth.citizenRole') : t('auth.officerRole')}
                            disabled
                            style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}
                        />
                    </label>

                    <label className="full-width">
                        {t('auth.phone')}
                        <input
                            name="phone"
                            value={profileData.phone}
                            onChange={handleChange}
                            disabled={!isEditing || loading}
                            placeholder=""
                        />
                    </label>

                    {user.role === 'user' && (
                        <label className="full-width">
                            {t('auth.address')}
                            <textarea
                                name="address"
                                value={profileData.address}
                                onChange={handleChange}
                                disabled={!isEditing || loading}
                                rows="3"
                            />
                        </label>
                    )}

                    {isEditing && (
                        <div className="full-width" style={{ marginTop: '1rem', textAlign: 'right' }}>
                            <button type="submit" className="btn primary" disabled={loading}>
                                {loading ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}
