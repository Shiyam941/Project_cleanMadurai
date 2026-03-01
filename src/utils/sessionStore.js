const SESSION_KEY = 'cm_user_session'
const LEGACY_KEY = 'cm_user'
let memoryUser = null
let cachedSessionStorage = null
let sessionStorageChecked = false

const getSessionStorage = () => {
  if (cachedSessionStorage || sessionStorageChecked) {
    return cachedSessionStorage
  }
  sessionStorageChecked = true
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null
  }
  try {
    const testKey = '__cm_session_test__'
    window.sessionStorage.setItem(testKey, 'ok')
    window.sessionStorage.removeItem(testKey)
    cachedSessionStorage = window.sessionStorage
  } catch (err) {
    console.warn('Session storage unavailable, using memory-only for auth state.', err)
    cachedSessionStorage = null
  }
  return cachedSessionStorage
}

const parseUser = (raw) => {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch (err) {
    console.warn('Failed to parse stored session user', err)
    return null
  }
}

const migrateLegacyUser = (store) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY)
    if (!legacyRaw) {
      return null
    }
    const legacyUser = parseUser(legacyRaw)
    window.localStorage.removeItem(LEGACY_KEY)
    if (store && legacyUser) {
      store.setItem(SESSION_KEY, JSON.stringify(legacyUser))
    }
    return legacyUser
  } catch (err) {
    console.warn('Failed to migrate legacy session user', err)
    return null
  }
}

export const loadSessionUser = () => {
  const store = getSessionStorage()
  if (store) {
    const raw = store.getItem(SESSION_KEY)
    if (raw) {
      const parsed = parseUser(raw)
      memoryUser = parsed
      return parsed
    }
    const migrated = migrateLegacyUser(store)
    if (migrated) {
      memoryUser = migrated
      return migrated
    }
  }
  return memoryUser
}

export const saveSessionUser = (account) => {
  memoryUser = account ?? null
  const store = getSessionStorage()
  if (!store) {
    return
  }
  if (!account) {
    store.removeItem(SESSION_KEY)
    return
  }
  try {
    store.setItem(SESSION_KEY, JSON.stringify(account))
  } catch (err) {
    console.warn('Unable to persist session user', err)
  }
}

export const clearSessionUser = () => {
  memoryUser = null
  const store = getSessionStorage()
  if (store) {
    try {
      store.removeItem(SESSION_KEY)
    } catch (err) {
      console.warn('Failed to clear session storage', err)
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(LEGACY_KEY)
    } catch (err) {
      console.warn('Failed to clear legacy storage key', err)
    }
  }
}

export default {
  loadSessionUser,
  saveSessionUser,
  clearSessionUser,
}
